import express from 'express';
import Opportunity from '../../model/crm/Opportunity.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';
import UserModel from '../../model/userModel.mjs';

const router = express.Router();

// Valid pipeline stages
const VALID_STAGES = ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'];

// Stage transition rules (to prevent going backwards after closing)
const TERMINAL_STAGES = ['won', 'lost'];
const VALID_TRANSITIONS = {
  'lead': ['qualified', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'],
  'qualified': ['lead', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'],
  'opportunity': ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
  'proposal': ['lead', 'qualified', 'opportunity', 'negotiation', 'won', 'lost'],
  'negotiation': ['lead', 'qualified', 'opportunity', 'proposal', 'won', 'lost'],
  'won': ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'lost'],
  'lost': ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'won']
};

// Probability defaults for each stage
const STAGE_PROBABILITY = {
  'lead': 10,
  'qualified': 35,
  'opportunity': 60,
  'proposal': 75,
  'negotiation': 85,
  'won': 100,
  'lost': 0
};

// Validation helper
const validateStageTransition = (currentStage, newStage) => {
  if (!VALID_STAGES.includes(newStage)) {
    return { valid: false, message: `Invalid stage: ${newStage}` };
  }
  
  if (!VALID_TRANSITIONS[currentStage].includes(newStage)) {
    return { valid: false, message: `Cannot transition from ${currentStage} to ${newStage}` };
  }
  
  return { valid: true };
};

// Ownership filter — team owner sees all member opportunities, others see own
async function buildOwnerFilter(user, requestedTeamId = null) {
  const role = user?.crmRole || user?.role;
  const userId = user?._id || user?.id || user?.userId;
  
  if (requestedTeamId) {
    const team = await SalesTeam.findById(requestedTeamId).lean();
    if (team) {
      const isManager = team.managerId?.toString() === userId?.toString();
      const isMember = team.memberIds?.some(m => m?.toString() === userId?.toString());
      if (role === 'Admin' || isManager || isMember) {
        return { ownerId: { $in: team.memberIds || [] } };
      }
    }
  }

  if (role === 'Admin') return {};
  if (!userId) return {};

  const ownedTeams = await SalesTeam.find({ managerId: userId }).lean();
  let visibleUserIds = [userId];

  if (ownedTeams && ownedTeams.length > 0) {
    ownedTeams.forEach(team => {
      if (team.memberIds) {
        visibleUserIds = [...visibleUserIds, ...team.memberIds];
      }
    });
  }

  visibleUserIds = [...new Set(visibleUserIds.map(id => id?.toString()))];
  return { ownerId: { $in: visibleUserIds } };
}

// GET /api/crm/opportunities
router.get('/', async (req, res) => {
  try {
    const { stage, forecastCategory, teamId } = req.query;
    const query = { ...(await buildOwnerFilter(req.user, teamId)) };
    if (stage) query.stage = stage;
    if (forecastCategory) query.forecastCategory = forecastCategory;

    const opportunities = await Opportunity.find(query)
      .populate('accountId', 'name')
      .populate('ownerId', 'username first_name last_name')
      .sort({ createdAt: -1 });
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/opportunities/board
router.get('/board', async (req, res) => {
  try {
    const ownerFilter = await buildOwnerFilter(req.user);
    const opportunities = await Opportunity.find(ownerFilter)
      .populate('accountId', 'name')
      .populate('ownerId', 'username');
    const board = {
      'lead': [],
      'qualified': [],
      'opportunity': [],
      'proposal': [],
      'negotiation': [],
      'won': [],
      'lost': []
    };
    
    opportunities.forEach(opp => {
      if (board[opp.stage]) {
        board[opp.stage].push(opp);
      }
    });

    res.json(board);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/opportunities/:id
router.get('/:id', async (req, res) => {
  try {
    const opp = await Opportunity.findOne({ _id: req.params.id })
      .populate('accountId', 'name')
      .populate('primaryContactId')
      .populate('ownerId', 'username');
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });
    res.json(opp);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/opportunities
router.post('/', async (req, res) => {
  try {
    const newOpp = new Opportunity({ ...req.body });
    await newOpp.save();
    res.status(201).json(newOpp);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/opportunities/:id
// Updated to validate stage transitions
router.put('/:id', async (req, res) => {
  try {
    const { stage, probability, ...otherData } = req.body;
    
    const opportunity = await Opportunity.findOne({ _id: req.params.id });
    if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    // If stage is being changed, validate the transition
    if (stage && stage !== opportunity.stage) {
      const validation = validateStageTransition(opportunity.stage, stage);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      // Update stage history
      const lastHistory = opportunity.stageHistory[opportunity.stageHistory.length - 1];
      if (lastHistory && !lastHistory.exitedAt) {
        lastHistory.exitedAt = new Date();
      }
      
      opportunity.stageHistory.push({
        stage: stage,
        enteredAt: new Date()
      });

      opportunity.stage = stage;
      
      // Auto-set probability based on stage if not provided
      if (!probability) {
        opportunity.probability = STAGE_PROBABILITY[stage];
      }
      
      // Update forecast category for terminal stages
      if (stage === 'won') {
        opportunity.forecastCategory = 'closed';
      } else if (TERMINAL_STAGES.includes(opportunity.stage) && stage !== 'lost') {
        // If moving out of lost (shouldn't happen due to validation above)
        opportunity.forecastCategory = 'pipeline';
      }
    } else if (probability !== undefined) {
      // Update probability if not changing stage
      opportunity.probability = Math.min(100, Math.max(0, probability));
    }

    // Update other allowed fields
    const { newRemark, ...otherDataToAssign } = otherData;
    Object.assign(opportunity, otherDataToAssign);

    // Handle new remark if provided
    if (newRemark && newRemark.trim()) {
      let userName = req.body.userName;
      if (!userName) {
        const user = await UserModel.findById(req.user?._id).lean();
        userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'System';
      }
      
      opportunity.remarks.push({
        text: newRemark.trim(),
        userId: req.user?._id,
        userName: userName,
        createdAt: new Date()
      });
    }
    
    const updatedOpp = await opportunity.save();
    res.json({ success: true, data: updatedOpp });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/opportunities/:id/stage
router.patch('/:id/stage', async (req, res) => {
  try {
    const { stage, probability } = req.body;
    const opp = await Opportunity.findOne({ _id: req.params.id });
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

    // Update history
    const lastHistory = opp.stageHistory[opp.stageHistory.length - 1];
    if (lastHistory) {
      lastHistory.exitedAt = new Date();
    }
    opp.stageHistory.push({ stage, enteredAt: new Date() });
    
    opp.stage = stage;
    if (probability !== undefined) opp.probability = probability;
    
    // Update forecast category automatically for terminal stages
    if (stage === 'won') opp.forecastCategory = 'closed';

    await opp.save();
    res.json(opp);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/opportunities/:id/close
router.patch('/:id/close', async (req, res) => {
  try {
    const { status, closeReason } = req.body; // status: 'won' or 'lost'
    if (!['won', 'lost'].includes(status)) {
      return res.status(400).json({ message: 'Invalid close status' });
    }
    if (!closeReason) {
      return res.status(400).json({ message: 'Close reason is required' });
    }

    const opp = await Opportunity.findOne({ _id: req.params.id });
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

    // Update history
    const lastHistory = opp.stageHistory[opp.stageHistory.length - 1];
    if (lastHistory) {
      lastHistory.exitedAt = new Date();
    }
    opp.stageHistory.push({ stage: status, enteredAt: new Date() });

    opp.stage = status;
    opp.closeReason = closeReason;
    opp.probability = status === 'won' ? 100 : 0;
    opp.forecastCategory = status === 'won' ? 'closed' : 'pipeline'; // lost is usually out of active pipeline but kept for history

    await opp.save();
    res.json(opp);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/opportunities/:id/remarks/:remarkId (Edit Remark)
router.put('/:id/remarks/:remarkId', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Remark text is required' });

    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });

    const remark = opportunity.remarks.id(req.params.remarkId);
    if (!remark) return res.status(404).json({ message: 'Remark not found' });

    // Check ownership: only creator or admin
    const isAdmin = req.user?.role === 'Admin' || req.user?.crmRole === 'Admin';
    if (!isAdmin && remark.userId?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ message: 'Unauthorized to edit this remark' });
    }

    remark.text = text;
    remark.updatedAt = new Date();
    await opportunity.save();

    res.json({ success: true, data: opportunity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/crm/opportunities/:id/remarks/:remarkId (Delete Remark)
router.delete('/:id/remarks/:remarkId', async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });

    const remark = opportunity.remarks.id(req.params.remarkId);
    if (!remark) return res.status(404).json({ message: 'Remark not found' });

    // Check ownership
    const isAdmin = req.user?.role === 'Admin' || req.user?.crmRole === 'Admin';
    if (!isAdmin && remark.userId?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this remark' });
    }

    // Use pull to remove from array
    opportunity.remarks.pull({ _id: req.params.remarkId });
    await opportunity.save();

    res.json({ success: true, data: opportunity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/crm/opportunities/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Opportunity.findOneAndDelete({ _id: req.params.id });
    if (!deleted) return res.status(404).json({ message: 'Opportunity not found' });
    res.json({ success: true, message: 'Opportunity deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

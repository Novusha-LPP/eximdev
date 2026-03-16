import express from 'express';
import Opportunity from '../../model/crm/Opportunity.mjs';
import { requireTenant } from './middleware/tenant.mjs';

const router = express.Router();
router.use(requireTenant);

// GET /api/crm/opportunities
router.get('/', async (req, res) => {
  try {
    const { stage, ownerId, forecastCategory } = req.query;
    const query = { tenantId: req.tenantId };
    if (stage) query.stage = stage;
    if (ownerId) query.ownerId = ownerId;
    if (forecastCategory) query.forecastCategory = forecastCategory;

    const opportunities = await Opportunity.find(query)
      .populate('accountId', 'name')
      .populate('ownerId', 'username')
      .sort({ createdAt: -1 });
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/opportunities/board
router.get('/board', async (req, res) => {
  try {
    const opportunities = await Opportunity.find({ tenantId: req.tenantId })
      .populate('accountId', 'name')
      .populate('ownerId', 'username');
    
    // Group by pipeline stage for Kanban board (lowercase as per blueprint)
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
    const opp = await Opportunity.findOne({ _id: req.params.id, tenantId: req.tenantId })
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
    const newOpp = new Opportunity({ ...req.body, tenantId: req.tenantId });
    await newOpp.save();
    res.status(201).json(newOpp);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/opportunities/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedOpp = await Opportunity.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true }
    );
    if (!updatedOpp) return res.status(404).json({ message: 'Opportunity not found' });
    res.json(updatedOpp);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/opportunities/:id/stage
router.patch('/:id/stage', async (req, res) => {
  try {
    const { stage, probability } = req.body;
    const opp = await Opportunity.findOne({ _id: req.params.id, tenantId: req.tenantId });
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

    const opp = await Opportunity.findOne({ _id: req.params.id, tenantId: req.tenantId });
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

// DELETE /api/crm/opportunities/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Opportunity.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!deleted) return res.status(404).json({ message: 'Opportunity not found' });
    res.json({ success: true, message: 'Opportunity deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

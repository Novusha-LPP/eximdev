import express from 'express';
import mongoose from 'mongoose';
import Opportunity from '../../model/crm/Opportunity.mjs';
import Lead from '../../model/crm/Lead.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';
import UserModel from '../../model/userModel.mjs';
import SalesIncentive from '../../model/crm/SalesIncentive.mjs';
import PricingRequest from '../../model/crm/PricingRequest.mjs';
import Task from '../../model/crm/Task.mjs';

// Helper to create a sales incentive when a deal is won
async function createIncentiveOnWin(opportunity, tenantId) {
  try {
    if (!opportunity.ownerId) return;

    // Check if an incentive already exists for this opportunity to prevent double creation
    const existing = await SalesIncentive.findOne({ opportunityId: opportunity._id });
    if (existing) return;

    const dealValue = opportunity.value || 0;
    const percentage = 2; // Default 2%
    const incentiveAmount = Math.round(dealValue * (percentage / 100));

    // Get current YYYY-MM period
    const payoutPeriod = new Date().toISOString().substring(0, 7);

    const incentive = new SalesIncentive({
      tenantId: tenantId || opportunity.tenantId,
      userId: opportunity.ownerId,
      opportunityId: opportunity._id,
      dealValue,
      incentiveAmount,
      calculatedPercentage: percentage,
      status: 'pending',
      payoutPeriod
    });

    await incentive.save();
    console.log(`Generated incentive of INR ${incentiveAmount} for opportunity ${opportunity._id}`);
  } catch (err) {
    console.error(`Error generating incentive for opportunity ${opportunity._id}:`, err);
  }
}

const router = express.Router();

// Valid pipeline stages
const VALID_STAGES = ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'];

// Stage transition rules (to prevent going backwards after closing)
const TERMINAL_STAGES = ['won', 'lost'];
const VALID_TRANSITIONS = {
  'lead': ['qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'],
  'qualified': ['lead', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'],
  'opportunity': ['lead', 'qualified', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'],
  'sales_visit': ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'],
  'proposal': ['lead', 'qualified', 'opportunity', 'sales_visit', 'negotiation', 'won', 'lost'],
  'negotiation': ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'won', 'lost'],
  'won': ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'lost'],
  'lost': ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won']
};

// Probability defaults for each stage
const STAGE_PROBABILITY = {
  'lead': 10,
  'qualified': 35,
  'opportunity': 60,
  'sales_visit': 70,
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
async function buildOwnerFilter(user, requestedTeamId = null, req = null) {
  const role = user?.crmRole || user?.role || req?.headers?.['user-role'];
  const userRole = user?.role || req?.headers?.['user-role'];
  const userId = user?._id || user?.id || user?.userId || req?.headers?.['user-id'];

  const isHOD = userRole === 'HOD' || userRole === 'Head_of_Department' || (typeof userRole === 'string' && (userRole.toLowerCase() === 'hod' || userRole.toLowerCase() === 'head_of_department'));
  const isCrmAdmin = role === 'Admin' || (typeof role === 'string' && role.toLowerCase() === 'admin');
  const isSystemAdmin = userRole === 'Admin' || (typeof userRole === 'string' && userRole.toLowerCase() === 'admin');
  const isAdmin = (isCrmAdmin || isSystemAdmin) && !isHOD;

  const seeAll = req?.query?.all === 'true' || req?.query?.forSelect === 'true' || req?.query?.seeAll === 'true';

  if (!userId) return {};

  const objectIdUserId = new mongoose.Types.ObjectId(userId.toString());

  const userDoc = await UserModel.findById(userId).select('isHod crmManagedTeams').lean();
  const managedTeamIds = (userDoc?.crmManagedTeams || []).map(id => id.toString());
  const isHodUser = isHOD || Boolean(userDoc?.isHod);

  if (requestedTeamId && requestedTeamId !== 'all' && mongoose.Types.ObjectId.isValid(requestedTeamId)) {
    const team = await SalesTeam.findById(requestedTeamId).lean();
    if (team) {
      const isManager = team.managerId?.toString() === userId?.toString();
      const isMember = team.memberIds?.some(m => m?.toString() === userId?.toString());
      const isHodForTeam = isHodUser && managedTeamIds.includes(team._id.toString());
      if (isAdmin || isManager || isMember || isHodForTeam || seeAll) {
        const objectIdMemberIds = (team.memberIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
        if (team.managerId) {
          objectIdMemberIds.push(new mongoose.Types.ObjectId(team.managerId.toString()));
        }
        const reqTeamObjectId = new mongoose.Types.ObjectId(requestedTeamId);
        const orConditions = [
          { ownerId: { $in: objectIdMemberIds } },
          { createdBy: { $in: objectIdMemberIds } },
          { referredByUserId: { $in: objectIdMemberIds } },
          { referredFromTeamId: reqTeamObjectId },
          { referredToTeamId: reqTeamObjectId }
        ];
        return { $or: orConditions };
      }
    }
  }

  if (seeAll || isAdmin) return {};

  const teamOrConditions = [
    { managerId: userId },
    { memberIds: userId }
  ];
  if (managedTeamIds.length > 0) {
    teamOrConditions.push({ _id: { $in: managedTeamIds } });
  }

  const myTeams = await SalesTeam.find({
    $or: teamOrConditions
  }).lean();

  const myTeamIds = myTeams.map(t => t._id);
  let visibleUserIds = [objectIdUserId];

  if (myTeams && myTeams.length > 0) {
    myTeams.forEach(team => {
      if (team.memberIds) {
        team.memberIds.forEach(m => visibleUserIds.push(new mongoose.Types.ObjectId(m.toString())));
      }
      if (team.managerId) {
        visibleUserIds.push(new mongoose.Types.ObjectId(team.managerId.toString()));
      }
    });
  }

  const uniqueUserIds = [...new Map(visibleUserIds.map(id => [id.toString(), id])).values()];

  const orConditions = [
    { ownerId: { $in: uniqueUserIds } },
    { createdBy: { $in: uniqueUserIds } },
    { referredByUserId: { $in: uniqueUserIds } },
    { stage: 'sales_visit' },
    { plannedVisits: { $elemMatch: { isCompleted: false, isCancelled: { $ne: true } } } }
  ];

  const taskOppIds = await Task.find({
    assignedTo: objectIdUserId,
    'relatedTo.model': 'Opportunity'
  }).distinct('relatedTo.id');

  if (taskOppIds && taskOppIds.length > 0) {
    const validTaskOppObjectIds = taskOppIds
      .filter(id => id && mongoose.Types.ObjectId.isValid(id.toString()))
      .map(id => new mongoose.Types.ObjectId(id.toString()));
    if (validTaskOppObjectIds.length > 0) {
      orConditions.push({ _id: { $in: validTaskOppObjectIds } });
    }
  }

  if (myTeamIds.length > 0) {
    orConditions.push({ referredFromTeamId: { $in: myTeamIds } });
    orConditions.push({ referredToTeamId: { $in: myTeamIds } });
  }

  return { $or: orConditions };
}

// GET /api/crm/opportunities/suggestions
// Returns distinct existing locations (location, pol, pod) and hsn codes for autocomplete
router.get('/suggestions', async (req, res) => {
  try {
    const ownerFilter = await buildOwnerFilter(req.user, null, req);
    const query = { ...ownerFilter };

    const [oppLocations, oppPols, oppPods, oppHsns] = await Promise.all([
      Opportunity.find(query).distinct('location'),
      Opportunity.find(query).distinct('pol'),
      Opportunity.find(query).distinct('pod'),
      Opportunity.find(query).distinct('hsnCode')
    ]);

    const cleanLocations = [...new Set(
      [...oppLocations, ...oppPols, ...oppPods]
        .filter(Boolean)
        .map(s => String(s).trim())
        .filter(s => s.length > 0 && s !== '-')
    )].sort((a, b) => a.localeCompare(b));

    const cleanHsns = [...new Set(
      oppHsns
        .filter(Boolean)
        .map(s => String(s).trim())
        .filter(s => s.length > 0 && s !== '-')
    )].sort((a, b) => a.localeCompare(b));

    res.json({
      locations: cleanLocations,
      hsnCodes: cleanHsns
    });
  } catch (error) {
    console.error('Error fetching opportunity suggestions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/opportunities
router.get('/', async (req, res) => {
  try {
    const { stage, forecastCategory, teamId, ownerId, startDate, endDate, period, dateField, accountId, source, createdBy, businessVertical, location, hsnCode } = req.query;
    const ownerFilter = await buildOwnerFilter(req.user, teamId, req);
    const query = { ...ownerFilter };
    if (businessVertical && businessVertical !== 'all') {
      query.businessVertical = businessVertical;
    }
    if (accountId) query.accountId = accountId;
    if (source) query.source = source;
    if (createdBy) query.createdBy = createdBy;
    if (hsnCode && hsnCode.trim()) {
      query.hsnCode = { $regex: hsnCode.trim(), $options: 'i' };
    }
    if (location && location.trim()) {
      const locRegex = { $regex: location.trim(), $options: 'i' };
      const locCondition = [
        { location: locRegex },
        { pol: locRegex },
        { pod: locRegex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: locCondition }];
        delete query.$or;
      } else {
        query.$or = locCondition;
      }
    }

    if (ownerId && ownerId !== 'all') {
      const objectIdOwnerId = new mongoose.Types.ObjectId(ownerId);
      if (query.ownerId) {
        const allowedIds = query.ownerId.$in.map(id => id.toString());
        if (allowedIds.includes(ownerId.toString())) {
          query.ownerId = objectIdOwnerId;
        } else {
          return res.json([]);
        }
      } else if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { ownerId: objectIdOwnerId }
        ];
        delete query.$or;
      } else {
        query.ownerId = objectIdOwnerId;
      }
    }

    const filterField = dateField === 'last_updated' || dateField === 'updatedAt' ? 'updatedAt' : 'createdAt';

    // Parse date range
    let wonLostStart = null;
    let wonLostEnd = null;
    const dateQuery = {};
    if (startDate && endDate) {
      wonLostStart = new Date(`${startDate}T00:00:00.000Z`);
      wonLostEnd = new Date(`${endDate}T23:59:59.999Z`);
      dateQuery[filterField] = { $gte: wonLostStart, $lte: wonLostEnd };
    } else if (period) {
      const [year, month] = period.split('-');
      wonLostStart = new Date(year, parseInt(month) - 1, 1);
      wonLostEnd = new Date(year, parseInt(month), 0, 23, 59, 59, 999);
      dateQuery.period = period;
    } else if (!accountId) {
      const now = new Date();
      wonLostStart = new Date(now.getFullYear(), now.getMonth(), 1);
      wonLostEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateQuery.period = new Date().toISOString().substring(0, 7);
    }

    // Helper: get the date when an opportunity entered its current won/lost stage
    const getWonLostEntryDate = (opp) => {
      if (opp.stageHistory && opp.stageHistory.length > 0) {
        const entry = [...opp.stageHistory].reverse().find(h => h.stage === opp.stage);
        if (entry && entry.enteredAt) return new Date(entry.enteredAt);
      }
      return opp.updatedAt ? new Date(opp.updatedAt) : new Date(opp.createdAt);
    };

    let opportunities;

    if (stage) {
      if (stage === 'sales_visit') {
        query.$or = [
          { stage: 'sales_visit' },
          { plannedVisits: { $elemMatch: { isCompleted: false, isCancelled: { $ne: true } } } }
        ];
        opportunities = await Opportunity.find(query)
          .populate('accountId', 'name')
          .populate('ownerId', 'username first_name last_name')
          .populate('createdBy', 'username first_name last_name')
          .populate('referredFromTeamId', 'nameCode teamName name')
          .populate('referredToTeamId', 'nameCode teamName name')
          .populate('referredByUserId', 'username first_name last_name')
          .sort({ createdAt: -1 })
          .lean();
      } else if ((stage === 'won' || stage === 'lost') && wonLostStart && wonLostEnd) {
        // For won/lost, use stageHistory.enteredAt
        query.stage = stage;
        const wonLostResults = await Opportunity.find({
          ...query,
          'stageHistory.stage': stage,
          'stageHistory.enteredAt': { $gte: wonLostStart, $lte: wonLostEnd }
        })
          .populate('accountId', 'name')
          .populate('ownerId', 'username first_name last_name')
          .populate('createdBy', 'username first_name last_name')
          .populate('referredFromTeamId', 'nameCode teamName name')
          .populate('referredToTeamId', 'nameCode teamName name')
          .populate('referredByUserId', 'username first_name last_name')
          .sort({ createdAt: -1 })
          .lean();

        // Legacy fallback
        const legacyFilter = { ...query, updatedAt: { $gte: wonLostStart, $lte: wonLostEnd } };
        const legacyStageCheck = { $or: [{ stageHistory: { $exists: false } }, { stageHistory: { $size: 0 } }] };
        if (query.$or) {
          legacyFilter.$and = [{ $or: query.$or }, legacyStageCheck];
          delete legacyFilter.$or;
        } else {
          Object.assign(legacyFilter, legacyStageCheck);
        }
        const wonLostLegacy = await Opportunity.find(legacyFilter)
          .populate('accountId', 'name')
          .populate('ownerId', 'username first_name last_name')
          .populate('createdBy', 'username first_name last_name')
          .populate('referredFromTeamId', 'nameCode teamName name')
          .populate('referredToTeamId', 'nameCode teamName name')
          .populate('referredByUserId', 'username first_name last_name')
          .sort({ createdAt: -1 })
          .lean();

        // Filter precisely and deduplicate
        const filtered = wonLostResults.filter(opp => {
          const entryDate = getWonLostEntryDate(opp);
          return entryDate >= wonLostStart && entryDate <= wonLostEnd;
        });
        const seenIds = new Set();
        opportunities = [];
        [...filtered, ...wonLostLegacy].forEach(opp => {
          const id = opp._id.toString();
          if (!seenIds.has(id)) { seenIds.add(id); opportunities.push(opp); }
        });
      } else {
        query.stage = stage;
        opportunities = await Opportunity.find(query)
          .populate('accountId', 'name')
          .populate('ownerId', 'username first_name last_name')
          .populate('createdBy', 'username first_name last_name')
          .populate('referredFromTeamId', 'nameCode teamName name')
          .populate('referredToTeamId', 'nameCode teamName name')
          .populate('referredByUserId', 'username first_name last_name')
          .sort({ createdAt: -1 })
          .lean();
      }
    } else if (forecastCategory) {
      query.forecastCategory = forecastCategory;
      if (forecastCategory === 'closed') {
        Object.assign(query, dateQuery);
      }
      opportunities = await Opportunity.find(query)
        .populate('accountId', 'name')
        .populate('ownerId', 'username first_name last_name')
        .populate('createdBy', 'username first_name last_name')
        .populate('referredFromTeamId', 'nameCode teamName name')
        .populate('referredToTeamId', 'nameCode teamName name')
        .populate('referredByUserId', 'username first_name last_name')
        .sort({ createdAt: -1 })
        .lean();
    } else {
      // No stage filter: show all pipeline deals + won/lost from the period
      if (wonLostStart && wonLostEnd) {
        const pipelineQuery = { ...query, stage: { $nin: ['won', 'lost'] } };
        const pipelineResults = await Opportunity.find(pipelineQuery)
          .populate('accountId', 'name')
          .populate('ownerId', 'username first_name last_name')
          .populate('createdBy', 'username first_name last_name')
          .populate('referredFromTeamId', 'nameCode teamName name')
          .populate('referredToTeamId', 'nameCode teamName name')
          .populate('referredByUserId', 'username first_name last_name')
          .sort({ createdAt: -1 })
          .lean();

        const wonLostQuery = { ...query, stage: { $in: ['won', 'lost'] } };
        const wonLostResults = await Opportunity.find({
          ...wonLostQuery,
          'stageHistory.stage': { $in: ['won', 'lost'] },
          'stageHistory.enteredAt': { $gte: wonLostStart, $lte: wonLostEnd }
        })
          .populate('accountId', 'name')
          .populate('ownerId', 'username first_name last_name')
          .populate('createdBy', 'username first_name last_name')
          .populate('referredFromTeamId', 'nameCode teamName name')
          .populate('referredToTeamId', 'nameCode teamName name')
          .populate('referredByUserId', 'username first_name last_name')
          .sort({ createdAt: -1 })
          .lean();

        const legacyFilter2 = { ...wonLostQuery, updatedAt: { $gte: wonLostStart, $lte: wonLostEnd } };
        const legacyStageCheck2 = { $or: [{ stageHistory: { $exists: false } }, { stageHistory: { $size: 0 } }] };
        if (wonLostQuery.$or) {
          legacyFilter2.$and = [{ $or: wonLostQuery.$or }, legacyStageCheck2];
          delete legacyFilter2.$or;
        } else {
          Object.assign(legacyFilter2, legacyStageCheck2);
        }
        const wonLostLegacy = await Opportunity.find(legacyFilter2)
          .populate('accountId', 'name')
          .populate('ownerId', 'username first_name last_name')
          .populate('createdBy', 'username first_name last_name')
          .populate('referredFromTeamId', 'nameCode teamName name')
          .populate('referredToTeamId', 'nameCode teamName name')
          .populate('referredByUserId', 'username first_name last_name')
          .sort({ createdAt: -1 })
          .lean();

        const filteredWonLost = wonLostResults.filter(opp => {
          const entryDate = getWonLostEntryDate(opp);
          return entryDate >= wonLostStart && entryDate <= wonLostEnd;
        });

        const seenIds = new Set();
        opportunities = [];
        [...pipelineResults, ...filteredWonLost, ...wonLostLegacy].forEach(opp => {
          const id = opp._id.toString();
          if (!seenIds.has(id)) { seenIds.add(id); opportunities.push(opp); }
        });
      } else {
        opportunities = await Opportunity.find(query)
          .populate('accountId', 'name')
          .populate('ownerId', 'username first_name last_name')
          .populate('createdBy', 'username first_name last_name')
          .populate('referredFromTeamId', 'nameCode teamName name')
          .populate('referredToTeamId', 'nameCode teamName name')
          .populate('referredByUserId', 'username first_name last_name')
          .sort({ createdAt: -1 })
          .lean();
      }
    }

    let targetPeriod = period;
    if (!targetPeriod && startDate) {
      targetPeriod = startDate.substring(0, 7);
    }
    if (!targetPeriod) {
      targetPeriod = new Date().toISOString().substring(0, 7);
    }

    const processedOpps = opportunities.map(opp => {
      if (opp.period && opp.period !== targetPeriod && !['won', 'lost'].includes(opp.stage)) {
        return {
          ...opp,
          carry_forward: true,
          origin_month: opp.period
        };
      }
      return opp;
    });

    const oppIds = processedOpps.map(opp => opp._id);
    const leadIds = processedOpps.filter(opp => opp.convertedFromLead).map(opp => opp.convertedFromLead);

    const pricingRequests = await PricingRequest.find({
      $or: [
        { 'relatedTo.model': 'Opportunity', 'relatedTo.id': { $in: oppIds } },
        { 'relatedTo.model': 'Lead', 'relatedTo.id': { $in: leadIds } }
      ]
    }).lean();

    const tasks = await Task.find({
      'relatedTo.model': 'Opportunity',
      'relatedTo.id': { $in: oppIds },
      status: { $in: ['open', 'in_progress'] }
    }).populate('assignedTo', 'username first_name last_name').lean();

    processedOpps.forEach(opp => {
      opp.pricingRequests = pricingRequests.filter(pr =>
        (pr.relatedTo.model === 'Opportunity' && pr.relatedTo.id.toString() === opp._id.toString()) ||
        (pr.relatedTo.model === 'Lead' && opp.convertedFromLead && pr.relatedTo.id.toString() === opp.convertedFromLead.toString())
      );
      opp.tasks = tasks.filter(t => t.relatedTo?.id?.toString() === opp._id.toString());
    });

    res.json(processedOpps);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/opportunities/board
router.get('/board', async (req, res) => {
  try {
    const { startDate, endDate, period, dateField, source, teamId, ownerId, location, hsnCode } = req.query;
    const ownerFilter = await buildOwnerFilter(req.user, teamId, req);
    const query = { ...ownerFilter };
    if (source) query.source = source;
    if (hsnCode && hsnCode.trim()) {
      query.hsnCode = { $regex: hsnCode.trim(), $options: 'i' };
    }
    if (location && location.trim()) {
      const locRegex = { $regex: location.trim(), $options: 'i' };
      const locCondition = [
        { location: locRegex },
        { pol: locRegex },
        { pod: locRegex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: locCondition }];
        delete query.$or;
      } else {
        query.$or = locCondition;
      }
    }

    if (ownerId && ownerId !== 'all') {
      const objectIdOwnerId = new mongoose.Types.ObjectId(ownerId);
      if (query.ownerId) {
        const allowedIds = query.ownerId.$in.map(id => id.toString());
        if (allowedIds.includes(ownerId.toString())) {
          query.ownerId = objectIdOwnerId;
        } else {
          return res.json({
            lead: [], qualified: [], opportunity: [], sales_visit: [],
            proposal: [], negotiation: [], won: [], lost: [],
            aggregates: {
              lead: { totalValue: 0, count: 0 },
              qualified: { totalValue: 0, count: 0 },
              opportunity: { totalValue: 0, count: 0 },
              sales_visit: { totalValue: 0, count: 0 },
              proposal: { totalValue: 0, count: 0 },
              negotiation: { totalValue: 0, count: 0 },
              won: { totalValue: 0, count: 0 },
              lost: { totalValue: 0, count: 0 }
            }
          });
        }
      } else if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { ownerId: objectIdOwnerId }
        ];
        delete query.$or;
      } else {
        query.ownerId = objectIdOwnerId;
      }
    }

    const filterField = dateField === 'last_updated' || dateField === 'updatedAt' ? 'updatedAt' : 'createdAt';

    // Parse date range for won/lost filtering
    let wonLostStart = null;
    let wonLostEnd = null;
    if (startDate && endDate) {
      wonLostStart = new Date(`${startDate}T00:00:00.000Z`);
      wonLostEnd = new Date(`${endDate}T23:59:59.999Z`);
    } else if (period) {
      const [year, month] = period.split('-');
      wonLostStart = new Date(year, parseInt(month) - 1, 1);
      wonLostEnd = new Date(year, parseInt(month), 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      wonLostStart = new Date(now.getFullYear(), now.getMonth(), 1);
      wonLostEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Fetch all active pipeline deals (non-won/lost) — no date filter
    const pipelineQuery = { ...query, stage: { $nin: ['won', 'lost'] } };
    if (source) pipelineQuery.source = source;

    const pipelineOpps = await Opportunity.find(pipelineQuery)
      .populate('accountId', 'name')
      .populate('ownerId', 'username first_name last_name')
      .populate('createdBy', 'username first_name last_name')
      .populate('referredFromTeamId', 'nameCode teamName name')
      .populate('referredToTeamId', 'nameCode teamName name')
      .populate('referredByUserId', 'username first_name last_name')
      .lean();

    // Fetch won/lost deals using stageHistory.enteredAt
    const wonLostQuery = { ...query, stage: { $in: ['won', 'lost'] } };
    if (source) wonLostQuery.source = source;

    const wonLostOpps = await Opportunity.find({
      ...wonLostQuery,
      'stageHistory.stage': { $in: ['won', 'lost'] },
      'stageHistory.enteredAt': { $gte: wonLostStart, $lte: wonLostEnd }
    })
      .populate('accountId', 'name')
      .populate('ownerId', 'username first_name last_name')
      .populate('createdBy', 'username first_name last_name')
      .populate('referredFromTeamId', 'nameCode teamName name')
      .populate('referredToTeamId', 'nameCode teamName name')
      .populate('referredByUserId', 'username first_name last_name')
      .lean();

    // Legacy won/lost data fallback (no stageHistory)
    const legacyWonLostFilter = {
      ...wonLostQuery,
      updatedAt: { $gte: wonLostStart, $lte: wonLostEnd }
    };
    const legacyStageCheck = { $or: [{ stageHistory: { $exists: false } }, { stageHistory: { $size: 0 } }] };
    if (wonLostQuery.$or) {
      legacyWonLostFilter.$and = [{ $or: wonLostQuery.$or }, legacyStageCheck];
      delete legacyWonLostFilter.$or;
    } else {
      Object.assign(legacyWonLostFilter, legacyStageCheck);
    }
    const wonLostLegacy = await Opportunity.find(legacyWonLostFilter)
      .populate('accountId', 'name')
      .populate('ownerId', 'username first_name last_name')
      .populate('createdBy', 'username first_name last_name')
      .populate('referredFromTeamId', 'nameCode teamName name')
      .populate('referredToTeamId', 'nameCode teamName name')
      .populate('referredByUserId', 'username first_name last_name')
      .lean();

    // Helper: get the date when an opportunity entered its current won/lost stage
    const getWonLostEntryDate = (opp) => {
      if (opp.stageHistory && opp.stageHistory.length > 0) {
        const entry = [...opp.stageHistory].reverse().find(h => h.stage === opp.stage);
        if (entry && entry.enteredAt) return new Date(entry.enteredAt);
      }
      return opp.updatedAt ? new Date(opp.updatedAt) : new Date(opp.createdAt);
    };

    // Filter won/lost precisely by the last relevant stageHistory entry
    const filteredWonLost = wonLostOpps.filter(opp => {
      const entryDate = getWonLostEntryDate(opp);
      return entryDate >= wonLostStart && entryDate <= wonLostEnd;
    });

    // Combine and deduplicate
    const seenIds = new Set();
    const opportunities = [];
    [...pipelineOpps, ...filteredWonLost, ...wonLostLegacy].forEach(opp => {
      const id = opp._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        opportunities.push(opp);
      }
    });

    let targetPeriod = period;
    if (!targetPeriod && startDate) {
      targetPeriod = startDate.substring(0, 7);
    }
    if (!targetPeriod) {
      targetPeriod = new Date().toISOString().substring(0, 7);
    }

    const processedOpps = opportunities.map(opp => {
      if (opp.period && opp.period !== targetPeriod && !['won', 'lost'].includes(opp.stage)) {
        return {
          ...opp,
          carry_forward: true,
          origin_month: opp.period
        };
      }
      return opp;
    });

    const oppIds = processedOpps.map(opp => opp._id);
    const leadIds = processedOpps.filter(opp => opp.convertedFromLead).map(opp => opp.convertedFromLead);

    const pricingRequests = await PricingRequest.find({
      $or: [
        { 'relatedTo.model': 'Opportunity', 'relatedTo.id': { $in: oppIds } },
        { 'relatedTo.model': 'Lead', 'relatedTo.id': { $in: leadIds } }
      ]
    }).lean();

    const tasks = await Task.find({
      'relatedTo.model': 'Opportunity',
      'relatedTo.id': { $in: oppIds },
      status: { $in: ['open', 'in_progress', 'completed'] }
    })
    .populate('assignedTo', 'username first_name last_name')
    .populate('createdBy', 'username first_name last_name')
    .lean();

    processedOpps.forEach(opp => {
      opp.pricingRequests = pricingRequests.filter(pr =>
        (pr.relatedTo.model === 'Opportunity' && pr.relatedTo.id.toString() === opp._id.toString()) ||
        (pr.relatedTo.model === 'Lead' && opp.convertedFromLead && pr.relatedTo.id.toString() === opp.convertedFromLead.toString())
      );
      opp.tasks = tasks.filter(t => t.relatedTo?.id?.toString() === opp._id.toString());
    });

    const board = {
      'lead': [],
      'qualified': [],
      'opportunity': [],
      'sales_visit': [],
      'proposal': [],
      'negotiation': [],
      'won': [],
      'lost': []
    };

    const aggregates = {
      'lead': { totalValue: 0, count: 0 },
      'qualified': { totalValue: 0, count: 0 },
      'opportunity': { totalValue: 0, count: 0 },
      'sales_visit': { totalValue: 0, count: 0 },
      'proposal': { totalValue: 0, count: 0 },
      'negotiation': { totalValue: 0, count: 0 },
      'won': { totalValue: 0, count: 0 },
      'lost': { totalValue: 0, count: 0 }
    };

    processedOpps.forEach(opp => {
      if (board[opp.stage]) {
        board[opp.stage].push(opp);
        aggregates[opp.stage].totalValue += opp.value || 0;
        aggregates[opp.stage].count += 1;
      }
      const hasIncompleteVisit = (opp.plannedVisits || []).some(v => !v.isCompleted && !v.isCancelled);
      if (hasIncompleteVisit && opp.stage !== 'sales_visit') {
        board['sales_visit'].push(opp);
        aggregates['sales_visit'].totalValue += opp.value || 0;
        aggregates['sales_visit'].count += 1;
      }
    });

    board.aggregates = aggregates;

    res.json(board);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/opportunities/planned-visits
router.get('/planned-visits', async (req, res) => {
  try {
    const { startDate, endDate, teamId, userId, ownerId, status, seeAll } = req.query;
    const ownerFilter = await buildOwnerFilter(req.user, teamId, req);
    const query = { ...ownerFilter };

    const targetUserId = userId || ownerId;
    if (targetUserId && targetUserId !== 'all' && mongoose.Types.ObjectId.isValid(targetUserId)) {
      const objectIdTarget = new mongoose.Types.ObjectId(targetUserId);
      const userCondition = [
        { ownerId: objectIdTarget },
        { createdBy: objectIdTarget },
        { referredByUserId: objectIdTarget }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: userCondition }];
        delete query.$or;
      } else {
        query.$or = userCondition;
      }
    }

    query['plannedVisits.0'] = { $exists: true };

    const opportunities = await Opportunity.find(query)
      .populate('accountId', 'name industry phone website address')
      .populate('ownerId', 'username first_name last_name email')
      .populate('primaryContactId', 'name phone email designation')
      .select('name value stage businessVertical accountId ownerId primaryContactId plannedVisits createdAt updatedAt')
      .lean();

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const visits = [];
    opportunities.forEach(opp => {
      (opp.plannedVisits || []).forEach(visit => {
        if (!visit.visitDate) return;
        const vDate = new Date(visit.visitDate);
        if (start && vDate < start) return;
        if (end && vDate > end) return;

        const isCompleted = Boolean(visit.isCompleted);
        const isCancelled = Boolean(visit.isCancelled);

        if (status === 'completed' && !isCompleted) return;
        if (status === 'pending' && (isCompleted || isCancelled)) return;
        if (status === 'cancelled' && !isCancelled) return;

        const ownerFullName = opp.ownerId 
          ? `${opp.ownerId.first_name || ''} ${opp.ownerId.last_name || ''}`.trim() || opp.ownerId.username 
          : '';

        visits.push({
          _id: visit._id?.toString() || `${opp._id}_${visit.visitDate}`,
          visitId: visit._id?.toString(),
          opportunityId: opp._id?.toString(),
          title: `Visit: ${opp.name}`,
          subject: `Visit: ${opp.name}`,
          dealName: opp.name,
          dealValue: opp.value || 0,
          stage: opp.stage,
          activityDate: visit.visitDate,
          dueDate: visit.visitDate,
          visitDate: visit.visitDate,
          isCompleted,
          isCancelled,
          status: isCompleted ? 'completed' : isCancelled ? 'cancelled' : 'pending',
          completedAt: visit.completedAt,
          cancelledAt: visit.cancelledAt,
          createdAt: visit.createdAt,
          type: 'visit',
          _eventType: 'visit',
          businessVertical: opp.businessVertical,
          accountName: opp.accountId?.name || opp.name,
          contactName: opp.primaryContactId?.name || '',
          contactPhone: opp.primaryContactId?.phone || '',
          contactEmail: opp.primaryContactId?.email || '',
          ownerName: ownerFullName,
          ownerId: opp.ownerId?._id || opp.ownerId,
          relatedTo: {
            model: 'Opportunity',
            id: opp._id,
            name: opp.name
          },
          opportunity: opp
        });
      });
    });

    visits.sort((a, b) => new Date(a.visitDate) - new Date(b.visitDate));
    res.json(visits);
  } catch (error) {
    console.error('Error fetching planned visits:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/opportunities/:id
router.get('/:id', async (req, res) => {
  try {
    const opp = await Opportunity.findOne({ _id: req.params.id })
      .populate('accountId', 'name')
      .populate('primaryContactId')
      .populate('ownerId', 'username first_name last_name')
      .populate('createdBy', 'username first_name last_name')
      .populate('referredFromTeamId', 'nameCode teamName')
      .populate('referredToTeamId', 'nameCode teamName')
      .populate('referredByUserId', 'username first_name last_name');
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

    const pricingRequests = await PricingRequest.find({
      'relatedTo.model': 'Opportunity',
      'relatedTo.id': opp._id
    }).lean();

    const tasks = await Task.find({
      'relatedTo.model': 'Opportunity',
      'relatedTo.id': opp._id,
      status: { $in: ['open', 'in_progress', 'completed'] }
    }).populate('assignedTo', 'username first_name last_name').lean();

    const oppObj = opp.toObject();
    oppObj.pricingRequests = pricingRequests;
    oppObj.tasks = tasks;

    res.json(oppObj);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/opportunities/:id/refer - Transfer/Refer opportunity/deal to internal team or individual
router.put('/:id/refer', async (req, res) => {
  try {
    const { targetTeamId, targetUserId, targetOwnerId, fromTeamId } = req.body;
    const userId = req.user?._id || req.user?.id || req.headers['user-id'];

    const opp = await Opportunity.findById(req.params.id);
    if (!opp) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const assignedTargetUser = targetUserId || targetOwnerId;

    // Determine referring team (Team A)
    let referringTeamId = fromTeamId;
    if (!referringTeamId && userId && mongoose.Types.ObjectId.isValid(userId)) {
      const referringTeam = await SalesTeam.findOne({
        $or: [
          { managerId: userId },
          { memberIds: userId }
        ]
      }).lean();
      if (referringTeam) {
        referringTeamId = referringTeam._id;
      }
    }

    // Determine target team (Team B) and target owner
    let receivingTeamId = targetTeamId;
    if (assignedTargetUser && mongoose.Types.ObjectId.isValid(assignedTargetUser)) {
      opp.ownerId = assignedTargetUser;
      if (!receivingTeamId) {
        const targetTeam = await SalesTeam.findOne({
          $or: [
            { managerId: assignedTargetUser },
            { memberIds: assignedTargetUser }
          ]
        }).lean();
        if (targetTeam) {
          receivingTeamId = targetTeam._id;
        }
      }
    } else if (receivingTeamId && mongoose.Types.ObjectId.isValid(receivingTeamId)) {
      const targetTeam = await SalesTeam.findById(receivingTeamId).lean();
      if (targetTeam && targetTeam.managerId && !opp.ownerId) {
        opp.ownerId = targetTeam.managerId;
      }
    }

    if (!receivingTeamId && !assignedTargetUser) {
      return res.status(400).json({ success: false, message: 'Target team or target user is required' });
    }

    if (referringTeamId) opp.referredFromTeamId = referringTeamId;
    if (receivingTeamId) opp.referredToTeamId = receivingTeamId;
    if (userId) opp.referredByUserId = userId;
    opp.isReferral = true;
    opp.referredAt = new Date();
    opp.lastActivityAt = new Date();

    await opp.save();

    const updatedOpp = await Opportunity.findById(opp._id)
      .populate('accountId', 'name')
      .populate('ownerId', 'username first_name last_name')
      .populate('createdBy', 'username first_name last_name')
      .populate('referredFromTeamId', 'nameCode teamName name')
      .populate('referredToTeamId', 'nameCode teamName name')
      .populate('referredByUserId', 'username first_name last_name');

    res.json({ success: true, message: 'Opportunity referred successfully. Deal is now visible to both referring and target teams.', opportunity: updatedOpp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to find a SalesTeam matching the selected service(s) (e.g. E-Lock, DGFT)
async function findTeamForServices(services) {
  if (!services || !Array.isArray(services) || services.length === 0) return null;
  const normalizedServices = services.map(s => String(s).toLowerCase().trim());

  if (normalizedServices.some(s => s.includes('e-lock') || s.includes('elock'))) {
    const team = await SalesTeam.findOne({
      isActive: true,
      name: { $regex: /e-?lock/i }
    }).lean();
    if (team) return team;
  }

  if (normalizedServices.some(s => s.includes('dgft'))) {
    const team = await SalesTeam.findOne({
      isActive: true,
      name: { $regex: /dgft/i }
    }).lean();
    if (team) return team;
  }

  if (normalizedServices.some(s => s.includes('freight forwarding') || s.includes('forwarding'))) {
    const team = await SalesTeam.findOne({
      isActive: true,
      name: { $regex: /freight/i }
    }).lean();
    if (team) return team;
  }

  return null;
}

// POST /api/crm/opportunities
router.post('/', async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.headers['user-id'];
    const oppData = {
      ...req.body,
      createdBy: req.body.createdBy || req.user?._id || userId,
      ownerId: req.body.ownerId || userId,
      lastActivityAt: new Date()
    };
    if (Array.isArray(oppData.services) && oppData.services.some(s => typeof s === 'string' && s.toLowerCase().includes('auto rack'))) {
      if (!oppData.businessVertical || oppData.businessVertical === 'all') {
        oppData.businessVertical = 'Paramount';
      }
    }

    // Auto-link to specialized team (e.g. E-Lock, DGFT) based on selected services
    if (!oppData.referredToTeamId && Array.isArray(oppData.services) && oppData.services.length > 0) {
      const targetTeam = await findTeamForServices(oppData.services);
      if (targetTeam) {
        if (!oppData.referredFromTeamId && userId && mongoose.Types.ObjectId.isValid(userId)) {
          const creatorTeam = await SalesTeam.findOne({
            isActive: true,
            $or: [{ managerId: userId }, { memberIds: userId }]
          }).lean();
          if (creatorTeam && creatorTeam._id.toString() !== targetTeam._id.toString()) {
            oppData.referredFromTeamId = creatorTeam._id;
          }
        }
        const isAlreadyInTeam = targetTeam.managerId?.toString() === userId?.toString() ||
          (targetTeam.memberIds || []).some(m => m?.toString() === userId?.toString());
        if (!isAlreadyInTeam) {
          oppData.referredToTeamId = targetTeam._id;
          oppData.isReferral = true;
          oppData.referredAt = new Date();
          if (userId) oppData.referredByUserId = userId;
        }
      }
    } else if (oppData.isReferral || oppData.referredToTeamId) {
      oppData.isReferral = true;
      if (!oppData.referredAt) oppData.referredAt = new Date();
    }

    const newOpp = new Opportunity(oppData);
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

      const isProposalOrAfter = ['proposal', 'negotiation', 'won'].includes(stage);
      if (isProposalOrAfter) {
        const dealValue = otherData.value !== undefined ? Number(otherData.value) : opportunity.value;
        if (!dealValue || dealValue <= 0) {
          return res.status(400).json({ success: false, message: 'Deal value must be greater than 0 before transitioning to the Proposal or subsequent stages.' });
        }
      }

      if (stage === 'lost') {
        if (!req.body.closeReason) {
          return res.status(400).json({ success: false, message: 'Close reason is required when marking opportunity as Lost' });
        }
        opportunity.closeReason = req.body.closeReason;
        opportunity.closeNotes = req.body.closeNotes || '';
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
      if (stage === 'won' || stage === 'lost') {
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
    const { newRemark, closeReason, closeNotes, plannedVisits, createdBy: _stripCreatedBy, ...otherDataToAssign } = otherData;
    Object.assign(opportunity, otherDataToAssign);
    opportunity.lastActivityAt = new Date();
    if (closeReason) opportunity.closeReason = closeReason;
    if (closeNotes !== undefined) opportunity.closeNotes = closeNotes;

    // Sync companyType and garudaTeamMemberName back to Lead if this opportunity was converted from a lead
    if (opportunity.convertedFromLead) {
      const leadUpdates = {};
      if (otherDataToAssign.companyType !== undefined) leadUpdates.companyType = otherDataToAssign.companyType;
      if (otherDataToAssign.garudaTeamMemberName !== undefined) leadUpdates.garudaTeamMemberName = otherDataToAssign.garudaTeamMemberName;
      if (Object.keys(leadUpdates).length > 0) {
        await Lead.findByIdAndUpdate(opportunity.convertedFromLead, leadUpdates);
      }
    }

    // Auto-link to specialized team (e.g. E-Lock) if not already referred
    if (!opportunity.referredToTeamId && Array.isArray(opportunity.services) && opportunity.services.length > 0) {
      const targetTeam = await findTeamForServices(opportunity.services);
      if (targetTeam) {
        const userId = req.user?._id || req.user?.id || req.headers['user-id'];
        const isAlreadyInTeam = targetTeam.managerId?.toString() === userId?.toString() ||
          (targetTeam.memberIds || []).some(m => m?.toString() === userId?.toString());
        if (!isAlreadyInTeam) {
          opportunity.referredToTeamId = targetTeam._id;
          opportunity.isReferral = true;
          if (userId && !opportunity.referredByUserId) opportunity.referredByUserId = userId;
        }
      }
    }

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
    if (updatedOpp.stage === 'won') {
      await createIncentiveOnWin(updatedOpp, req.tenantId);
    }
    res.json({ success: true, data: updatedOpp });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/opportunities/:id/stage
router.patch('/:id/stage', async (req, res) => {
  try {
    const { stage, probability, closeReason, closeNotes } = req.body;
    const opp = await Opportunity.findOne({ _id: req.params.id });
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

    const isProposalOrAfter = ['proposal', 'negotiation', 'won'].includes(stage);
    if (isProposalOrAfter) {
      if (!opp.value || opp.value <= 0) {
        return res.status(400).json({ message: 'Deal value must be greater than 0 before transitioning to the Proposal or subsequent stages.' });
      }
    }

    if (stage === 'lost') {
      if (!closeReason) {
        return res.status(400).json({ message: 'Close reason is required when marking opportunity as Lost' });
      }
      opp.closeReason = closeReason;
      opp.closeNotes = closeNotes || '';
      if (req.body.competitor) opp.competitor = req.body.competitor;
      opp.lostStageBeforeLoss = req.body.lostFromStage || opp.stage || 'lead';
    }

    // Update history
    const lastHistory = opp.stageHistory[opp.stageHistory.length - 1];
    if (lastHistory) {
      lastHistory.exitedAt = new Date();
    }
    opp.stageHistory.push({ stage, enteredAt: new Date() });

    opp.stage = stage;
    if (probability !== undefined) opp.probability = probability;

    // Update forecast category automatically for terminal stages
    if (stage === 'won' || stage === 'lost') opp.forecastCategory = 'closed';

    opp.lastActivityAt = new Date();
    await opp.save();
    if (opp.stage === 'won') {
      await createIncentiveOnWin(opp, req.tenantId);
    }
    res.json(opp);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/opportunities/:id/close
router.patch('/:id/close', async (req, res) => {
  try {
    const { status, closeReason, closeNotes } = req.body; // status: 'won' or 'lost'
    if (!['won', 'lost'].includes(status)) {
      return res.status(400).json({ message: 'Invalid close status' });
    }
    if (status === 'lost' && !closeReason) {
      return res.status(400).json({ message: 'Close reason is required when marking opportunity as Lost' });
    }

    const opp = await Opportunity.findOne({ _id: req.params.id });
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

    if (status === 'won') {
      if (!opp.value || opp.value <= 0) {
        return res.status(400).json({ message: 'Deal value must be greater than 0 before transitioning to the Won stage.' });
      }
    }

    // Update history
    const lastHistory = opp.stageHistory[opp.stageHistory.length - 1];
    if (lastHistory) {
      lastHistory.exitedAt = new Date();
    }
    opp.stageHistory.push({ stage: status, enteredAt: new Date() });

    opp.stage = status;
    opp.closeReason = closeReason;
    opp.closeNotes = closeNotes || '';
    if (status === 'lost') {
      if (req.body.competitor) opp.competitor = req.body.competitor;
      opp.lostStageBeforeLoss = req.body.lostFromStage || opp.stageHistory[opp.stageHistory.length - 2]?.stage || 'lead';
    }
    opp.probability = status === 'won' ? 100 : 0;
    opp.forecastCategory = 'closed';

    opp.lastActivityAt = new Date();
    await opp.save();
    if (opp.stage === 'won') {
      await createIncentiveOnWin(opp, req.tenantId);
    }
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
    opportunity.lastActivityAt = new Date();
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
    opportunity.lastActivityAt = new Date();
    await opportunity.save();

    res.json({ success: true, data: opportunity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/opportunities/:id/planned-visits
router.post('/:id/planned-visits', async (req, res) => {
  try {
    const { visitDate } = req.body;
    if (!visitDate) {
      return res.status(400).json({ success: false, message: 'Visit date is required' });
    }

    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    opportunity.plannedVisits.push({
      visitDate: new Date(visitDate),
      isCompleted: false,
      createdAt: new Date()
    });

    opportunity.lastActivityAt = new Date();
    await opportunity.save();
    res.json({ success: true, data: opportunity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/opportunities/:id/planned-visits/:visitId/complete
router.patch('/:id/planned-visits/:visitId/complete', async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    const visit = opportunity.plannedVisits.id(req.params.visitId);
    if (!visit) return res.status(404).json({ success: false, message: 'Planned visit not found' });

    visit.isCompleted = true;
    visit.completedAt = new Date();

    opportunity.lastActivityAt = new Date();
    await opportunity.save();
    res.json({ success: true, data: opportunity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/opportunities/:id/planned-visits/:visitId/cancel
router.patch('/:id/planned-visits/:visitId/cancel', async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    const visit = opportunity.plannedVisits.id(req.params.visitId);
    if (!visit) return res.status(404).json({ success: false, message: 'Planned visit not found' });

    visit.isCancelled = true;
    visit.cancelledAt = new Date();

    opportunity.lastActivityAt = new Date();
    await opportunity.save();
    res.json({ success: true, data: opportunity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/opportunities/:id/planned-visits/:visitId/postpone
router.patch('/:id/planned-visits/:visitId/postpone', async (req, res) => {
  try {
    const { visitDate } = req.body;
    if (!visitDate) {
      return res.status(400).json({ success: false, message: 'New visit date is required' });
    }

    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    const visit = opportunity.plannedVisits.id(req.params.visitId);
    if (!visit) return res.status(404).json({ success: false, message: 'Planned visit not found' });

    visit.visitDate = new Date(visitDate);
    visit.isCancelled = false;
    visit.cancelledAt = undefined;
    visit.isCompleted = false;
    visit.completedAt = undefined;

    opportunity.lastActivityAt = new Date();
    await opportunity.save();
    res.json({ success: true, data: opportunity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/crm/opportunities/:id/planned-visits/:visitId
router.delete('/:id/planned-visits/:visitId', async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ success: false, message: 'Opportunity not found' });

    opportunity.plannedVisits.pull({ _id: req.params.visitId });
    opportunity.lastActivityAt = new Date();
    await opportunity.save();
    res.json({ success: true, data: opportunity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/opportunities/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await Opportunity.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Original opportunity not found' });

    const { name, services, value, expectedCloseDate, stage } = req.body;

    const duplicated = new Opportunity({
      accountId: original.accountId,
      primaryContactId: original.primaryContactId,
      ownerId: original.ownerId,
      createdBy: req.user?._id,
      name: name || `${original.name} - Copy`,
      value: value !== undefined ? value : original.value,
      stage: stage || original.stage,
      services: services || original.services || [],
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : original.expectedCloseDate,
      probability: original.probability,
      crateSize: original.crateSize,
      source: original.source,
      convertedFromLead: original.convertedFromLead,
      stageHistory: [{ stage: stage || original.stage, enteredAt: new Date() }]
    });

    await duplicated.save();
    res.status(201).json({ success: true, data: duplicated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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

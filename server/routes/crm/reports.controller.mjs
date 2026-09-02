import express from 'express';
import Opportunity from '../../model/crm/Opportunity.mjs';
import Lead from '../../model/crm/Lead.mjs';
import Task from '../../model/crm/Task.mjs';
import Activity from '../../model/crm/Activity.mjs';
import Contact from '../../model/crm/Contact.mjs';
import Account from '../../model/crm/Account.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';
import UserModel from '../../model/userModel.mjs';
import mongoose from 'mongoose';

const router = express.Router();

function extractAllowedUserIds(ownerFilter) {
  if (!ownerFilter || Object.keys(ownerFilter).length === 0) {
    return null; // Admin: unrestricted
  }
  let ids = [];
  if (ownerFilter.ownerId && ownerFilter.ownerId.$in) {
    ids = ownerFilter.ownerId.$in.map(id => id.toString());
  } else if (ownerFilter.$or && Array.isArray(ownerFilter.$or)) {
    ownerFilter.$or.forEach(cond => {
      if (cond.ownerId && cond.ownerId.$in) {
        cond.ownerId.$in.forEach(id => ids.push(id.toString()));
      }
      if (cond.createdBy && cond.createdBy.$in) {
        cond.createdBy.$in.forEach(id => ids.push(id.toString()));
      }
    });
  }
  return ids.length > 0 ? [...new Set(ids)] : null;
}

function buildBusinessVerticalFilter(verticalStr) {
  if (!verticalStr || verticalStr === 'all') return null;
  const normalized = verticalStr.trim();
  return { businessVertical: new RegExp(`^${normalized}$`, 'i') };
}

async function buildOwnerFilter(user, requestedTeamId = null, req = null) {
  const role = user?.crmRole || user?.role || req?.headers?.['user-role'];
  const userRole = user?.role || req?.headers?.['user-role'];
  const userId = user?._id || user?.id || user?.userId || req?.headers?.['user-id'];

  const isHOD = userRole === 'HOD' || userRole === 'Head_of_Department' || (typeof userRole === 'string' && (userRole.toLowerCase() === 'hod' || userRole.toLowerCase() === 'head_of_department'));
  const isCrmAdmin = role === 'Admin' || (typeof role === 'string' && role.toLowerCase() === 'admin');
  const isSystemAdmin = userRole === 'Admin' || (typeof userRole === 'string' && userRole.toLowerCase() === 'admin');
  const isAdmin = (isCrmAdmin || isSystemAdmin) && !isHOD;

  if (!userId) return {};

  const objectIdUserId = new mongoose.Types.ObjectId(userId.toString());

  if (requestedTeamId && requestedTeamId !== 'all' && mongoose.Types.ObjectId.isValid(requestedTeamId)) {
    const team = await SalesTeam.findById(requestedTeamId).lean();
    if (team) {
      const isManager = team.managerId?.toString() === userId?.toString();
      const isMember = team.memberIds?.some(m => m?.toString() === userId?.toString());
      if (isAdmin || isManager || isMember) {
        const objectIdMemberIds = (team.memberIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
        if (team.managerId) {
          objectIdMemberIds.push(new mongoose.Types.ObjectId(team.managerId.toString()));
        }
        const orConditions = [
          { ownerId: { $in: objectIdMemberIds } },
          { createdBy: { $in: objectIdMemberIds } }
        ];
        return { $or: orConditions };
      }
    }
  }

  if (isAdmin) return {};

  const myTeams = await SalesTeam.find({
    $or: [
      { managerId: userId },
      { memberIds: userId }
    ]
  }).lean();

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
    { createdBy: { $in: uniqueUserIds } }
  ];

  return { $or: orConditions };
}

async function buildActivityFilter(user, requestedTeamId = null, req = null) {
  const role = user?.crmRole || user?.role || req?.headers?.['user-role'];
  const userRole = user?.role || req?.headers?.['user-role'];
  const userId = user?._id || user?.id || user?.userId || req?.headers?.['user-id'];

  const isHOD = userRole === 'HOD' || userRole === 'Head_of_Department' || (typeof userRole === 'string' && (userRole.toLowerCase() === 'hod' || userRole.toLowerCase() === 'head_of_department'));
  const isCrmAdmin = role === 'Admin' || (typeof role === 'string' && role.toLowerCase() === 'admin');
  const isAdmin = isCrmAdmin && !isHOD;

  if (requestedTeamId && mongoose.Types.ObjectId.isValid(requestedTeamId)) {
    const team = await SalesTeam.findById(requestedTeamId).lean();
    if (team) {
      const isManager = team.managerId?.toString() === userId?.toString();
      const isMember = team.memberIds?.some(m => m?.toString() === userId?.toString());
      if (isAdmin || isManager || isMember) {
        const objectIdMemberIds = (team.memberIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
        if (team.managerId) {
          objectIdMemberIds.push(new mongoose.Types.ObjectId(team.managerId.toString()));
        }
        return { userId: { $in: objectIdMemberIds } };
      }
    }
  }

  if (isAdmin) return {};
  if (!userId) return {};

  const myTeams = await SalesTeam.find({
    $or: [
      { managerId: userId },
      { memberIds: userId }
    ]
  }).lean();
  let visibleUserIds = [userId.toString()];

  if (myTeams && myTeams.length > 0) {
    myTeams.forEach(team => {
      if (team.memberIds) {
        visibleUserIds = [...visibleUserIds, ...team.memberIds.map(id => id.toString())];
      }
      if (team.managerId) {
        visibleUserIds.push(team.managerId.toString());
      }
    });
  }

  visibleUserIds = [...new Set(visibleUserIds)];
  const objectIdUserIds = visibleUserIds.map(id => new mongoose.Types.ObjectId(id));
  return { userId: { $in: objectIdUserIds } };
}

// GET /api/crm/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { teamId, businessVertical, ownerId, period, startDate, endDate } = req.query;
    const ownerFilter = await buildOwnerFilter(req.user, teamId, req);
    const matchFilter = { ...ownerFilter };

    const currentPeriod = new Date().toISOString().substring(0, 7);
    let start = null;
    let end = null;
    let targetPeriod = null;

    if (startDate && endDate) {
      start = new Date(`${startDate}T00:00:00.000Z`);
      end = new Date(`${endDate}T23:59:59.999Z`);
    } else if (period === 'this_month' || period === 'current' || !period) {
      targetPeriod = currentPeriod;
    } else if (period && period !== 'all') {
      targetPeriod = period;
    }

    if (targetPeriod) {
      const [year, month] = targetPeriod.split('-');
      start = new Date(year, parseInt(month) - 1, 1);
      end = new Date(year, parseInt(month), 0, 23, 59, 59, 999);
    }

    const verticalFilter = buildBusinessVerticalFilter(businessVertical);
    const baseQuery = { ...ownerFilter };

    if (verticalFilter) {
      if (baseQuery.$or) {
        baseQuery.$and = [
          { $or: baseQuery.$or },
          verticalFilter
        ];
        delete baseQuery.$or;
      } else {
        Object.assign(baseQuery, verticalFilter);
      }
    }

    if (ownerId && ownerId !== 'all') {
      const targetUserId = new mongoose.Types.ObjectId(ownerId);
      const userTeam = await SalesTeam.findOne({
        $or: [
          { managerId: targetUserId },
          { memberIds: targetUserId }
        ]
      }).lean();

      const memberIds = [targetUserId];
      if (userTeam) {
        if (userTeam.memberIds) userTeam.memberIds.forEach(m => memberIds.push(new mongoose.Types.ObjectId(m.toString())));
        if (userTeam.managerId) memberIds.push(new mongoose.Types.ObjectId(userTeam.managerId.toString()));
      }
      const uniqueMemberIds = [...new Map(memberIds.map(id => [id.toString(), id])).values()];
      const verticals = userTeam ? [userTeam.businessVertical, userTeam.name?.trim()].filter(Boolean) : [];

      const ownerCond = {
        $or: [
          { ownerId: { $in: uniqueMemberIds } },
          { createdBy: { $in: uniqueMemberIds } }
        ]
      };

      if (verticals.length === 0 || verticals.some(v => v.toLowerCase() === 'paramount')) {
        ownerCond.$or.push(
          { businessVertical: new RegExp('^paramount$', 'i') },
          { businessVertical: null },
          { businessVertical: { $exists: false } },
          { businessVertical: '' }
        );
      } else {
        ownerCond.$or.push({ businessVertical: { $in: verticals.map(v => new RegExp(`^${v.trim()}$`, 'i')) } });
      }

      if (baseQuery.$and) {
        baseQuery.$and.push(ownerCond);
      } else if (baseQuery.$or) {
        baseQuery.$and = [
          { $or: baseQuery.$or },
          ownerCond
        ];
        delete baseQuery.$or;
      } else {
        baseQuery.$or = ownerCond.$or;
      }
    }

    // Query opportunities list
    let opportunities = [];
    if (start && end) {
      // 1. Fetch active pipeline deals (no date constraint)
      const pipelineQuery = { ...baseQuery, stage: { $nin: ['won', 'lost'] } };
      const pipelineOpps = await Opportunity.find(pipelineQuery).lean();

      // 2. Fetch won/lost deals in the period using stageHistory.enteredAt
      const wonLostQuery = { ...baseQuery, stage: { $in: ['won', 'lost'] } };
      const wonLostOpps = await Opportunity.find({
        ...wonLostQuery,
        'stageHistory.stage': { $in: ['won', 'lost'] },
        'stageHistory.enteredAt': { $gte: start, $lte: end }
      }).lean();

      // Legacy won/lost data fallback (no stageHistory)
      const legacyFilter = {
        ...wonLostQuery,
        updatedAt: { $gte: start, $lte: end }
      };
      const legacyStageCheck = { $or: [{ stageHistory: { $exists: false } }, { stageHistory: { $size: 0 } }] };
      if (wonLostQuery.$or) {
        legacyFilter.$and = [{ $or: wonLostQuery.$or }, legacyStageCheck];
        delete legacyFilter.$or;
      } else {
        Object.assign(legacyFilter, legacyStageCheck);
      }
      const wonLostLegacy = await Opportunity.find(legacyFilter).lean();

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
        return entryDate >= start && entryDate <= end;
      });

      // Combine and deduplicate
      const seenIds = new Set();
      [...pipelineOpps, ...filteredWonLost, ...wonLostLegacy].forEach(opp => {
        const id = opp._id.toString();
        if (!seenIds.has(id)) {
          seenIds.add(id);
          opportunities.push(opp);
        }
      });
    } else {
      // Period is 'all' - fetch all without date range
      opportunities = await Opportunity.find(baseQuery).lean();
    }

    // 1. Pipeline Health (Total value in each stage)
    const stagesList = ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'];
    const byStage = stagesList.map(stage => {
      const stageDeals = opportunities.filter(o => o.stage === stage);
      return {
        stage,
        value: stageDeals.reduce((sum, o) => sum + (o.value || 0), 0),
        count: stageDeals.length
      };
    });

    // 2. Weighted Sales Forecast (expected revenue based on probability)
    const activeDeals = opportunities.filter(o => !['won', 'lost'].includes(o.stage));
    const totalExpectedRevenue = activeDeals.reduce((sum, o) => {
      return sum + ((o.value || 0) * (o.probability || 0) / 100);
    }, 0);

    // 3. Lead Conversion Stats (counts only closed-won as Converted, in-pipeline as Open, and closed-lost/dead/duplicate as Lost)
    const DEAD_STATUSES = ['lost', 'rejected', 'duplicate', 'cancelled', 'junk'];

    // Find all opportunities converted from leads and their stages
    const oppMap = {};
    opportunities.forEach(opp => {
      if (opp.convertedFromLead) {
        oppMap[opp.convertedFromLead.toString()] = opp.stage;
      }
    });

    // Filter leads by date if period/date range is selected
    const leadFilter = { ...baseQuery };
    if (start && end) {
      leadFilter.createdAt = { $gte: start, $lte: end };
    }
    const allLeads = await Lead.find(leadFilter).select('_id status').lean();

    let convertedCount = 0;
    let lostCount = 0;
    let openCount = 0;
    let duplicateCount = 0;

    allLeads.forEach(lead => {
      const status = (lead.status || '').toLowerCase().trim();
      if (status === 'converted') {
        const stage = oppMap[lead._id.toString()];
        if (stage === 'won') {
          convertedCount++;
        } else if (stage === 'lost') {
          lostCount++;
        } else {
          openCount++;
        }
      } else if (status === 'duplicate') {
        duplicateCount++;
        lostCount++;
      } else if (DEAD_STATUSES.includes(status)) {
        lostCount++;
      } else {
        openCount++;
      }
    });

    const totalLeads = allLeads.length;
    const conversionRate = totalLeads > 0 ? Number(((convertedCount / totalLeads) * 100).toFixed(2)) : 0;

    // 4. Tasks Status (Tasks has assignedTo instead of ownerId)
    const taskFilter = {};
    if (baseQuery.ownerId) {
      taskFilter.assignedTo = baseQuery.ownerId;
    } else if (ownerFilter.ownerId) {
      taskFilter.assignedTo = ownerFilter.ownerId;
    }
    const tasksCount = await Task.countDocuments({ ...taskFilter, status: { $ne: 'completed' } });

    res.json({
      byStage,
      weightedForecast: totalExpectedRevenue,
      leadStats: {
        total: totalLeads,
        converted: convertedCount,
        lost: lostCount,
        open: openCount,
        duplicate: duplicateCount,
        conversionRate: conversionRate
      },
      pendingTasks: tasksCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/reports/performance
router.get('/performance', async (req, res) => {
  try {
    const { startDate, endDate, period, teamId, ownerId, businessVertical } = req.query;

    const ownerFilter = await buildOwnerFilter(req.user, teamId, req);
    const query = { ...ownerFilter };
    if (businessVertical && businessVertical !== 'all') {
      query.businessVertical = businessVertical;
    }
    if (ownerId) {
      if (ownerFilter.ownerId) {
        const allowedIds = ownerFilter.ownerId.$in.map(id => id.toString());
        if (allowedIds.includes(ownerId.toString())) {
          query.ownerId = ownerId;
        } else {
          return res.json({
            success: true,
            performanceData: [],
            weekWise: [],
            summary: {
              totalDeals: 0,
              totalValue: 0,
              weightedPipelineValue: 0
            }
          });
        }
      } else {
        query.ownerId = ownerId;
      }
    }

    // Parse date range
    let start = null;
    let end = null;
    if (startDate && endDate) {
      start = new Date(`${startDate}T00:00:00.000Z`);
      end = new Date(`${endDate}T23:59:59.999Z`);
    } else if (period) {
      const [year, month] = period.split('-');
      start = new Date(year, parseInt(month) - 1, 1);
      end = new Date(year, parseInt(month), 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Helper: get the date when an opportunity entered its current won/lost stage
    const getWonLostEntryDate = (opp) => {
      if (opp.stageHistory && opp.stageHistory.length > 0) {
        // Find the last stageHistory entry for the current stage (won or lost)
        const entry = [...opp.stageHistory]
          .reverse()
          .find(h => h.stage === opp.stage);
        if (entry && entry.enteredAt) {
          return new Date(entry.enteredAt);
        }
      }
      // Fallback to updatedAt if no stageHistory (shouldn't happen for new deals)
      return opp.updatedAt ? new Date(opp.updatedAt) : new Date(opp.createdAt);
    };

    // Query 1: Active pipeline deals (non-won/lost) created in the period
    const pipelineOpportunities = await Opportunity.find({
      ...query,
      stage: { $nin: ['won', 'lost'] },
      createdAt: { $gte: start, $lte: end }
    }).lean();

    // Query 2: Won/Lost deals where stageHistory shows they entered won/lost in the period
    // We use stageHistory.enteredAt to find deals that were won/lost during this period
    const wonLostOpportunities = await Opportunity.find({
      ...query,
      stage: { $in: ['won', 'lost'] },
      'stageHistory.stage': { $in: ['won', 'lost'] },
      'stageHistory.enteredAt': { $gte: start, $lte: end }
    }).lean();

    // For won/lost deals without stageHistory (legacy data), fall back to updatedAt
    const legacyFilter = {
      stage: { $in: ['won', 'lost'] },
      updatedAt: { $gte: start, $lte: end }
    };
    // Safely combine $or conditions using $and to avoid overwriting ownerFilter's $or
    const legacyStageCheck = { $or: [{ stageHistory: { $exists: false } }, { stageHistory: { $size: 0 } }] };
    if (query.$or) {
      legacyFilter.$and = [{ $or: query.$or }, legacyStageCheck];
      const { $or: _, ...queryWithoutOr } = query;
      Object.assign(legacyFilter, queryWithoutOr);
    } else {
      Object.assign(legacyFilter, query, legacyStageCheck);
    }
    const wonLostLegacy = await Opportunity.find(legacyFilter).lean();

    // Filter won/lost deals more precisely: ensure the LAST won/lost entry in stageHistory falls within the period
    const filteredWonLost = wonLostOpportunities.filter(opp => {
      const entryDate = getWonLostEntryDate(opp);
      return entryDate >= start && entryDate <= end;
    });

    // Combine: deduplicate by _id
    const seenIds = new Set();
    const opportunities = [];
    [...pipelineOpportunities, ...filteredWonLost, ...wonLostLegacy].forEach(opp => {
      const id = opp._id.toString();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        opportunities.push(opp);
      }
    });

    const stages = ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'];
    const performanceData = stages.map(stage => {
      const stageDeals = opportunities.filter(o => o.stage === stage);
      const count = stageDeals.length;
      const totalValue = stageDeals.reduce((sum, o) => sum + (o.value || 0), 0);
      const avgProbability = stageDeals.length > 0
        ? Math.round(stageDeals.reduce((sum, o) => sum + (o.probability || 0), 0) / stageDeals.length)
        : 0;
      const weightedValue = stageDeals.reduce((sum, o) => sum + ((o.value || 0) * (o.probability || 0) / 100), 0);

      const newDealsCount = stageDeals.length;
      let movedForwardCount = 0;

      // Calculate Lost deals and their reasons
      let lostPriceCount = 0;
      let lostProductCount = 0;
      let lostNoReplyCount = 0;

      if (stage === 'lost') {
        stageDeals.forEach(o => {
          if (o.closeReason === 'Price Lost') lostPriceCount++;
          else if (o.closeReason === 'Product Lost') lostProductCount++;
          else if (o.closeReason === 'No Reply / No Response') lostNoReplyCount++;
        });
      }

      return {
        stage,
        count,
        value: totalValue,
        probability: avgProbability,
        weightedValue,
        newDeals: newDealsCount,
        movedForward: movedForwardCount,
        lostBreakdown: {
          price: lostPriceCount,
          product: lostProductCount,
          noReply: lostNoReplyCount,
          total: lostPriceCount + lostProductCount + lostNoReplyCount
        }
      };
    });

    // Group week-wise (Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22+)
    // For won/lost deals, use the stage entry date; for others, use createdAt
    const getRelevantDate = (opp) => {
      if (opp.stage === 'won' || opp.stage === 'lost') {
        return getWonLostEntryDate(opp);
      }
      return new Date(opp.createdAt);
    };

    const getWeekIndex = (dateObj) => {
      const day = dateObj.getDate();
      if (day <= 7) return 0;
      if (day <= 14) return 1;
      if (day <= 21) return 2;
      return 3;
    };

    const weekWise = [
      { name: 'Week 1', value: 0, count: 0 },
      { name: 'Week 2', value: 0, count: 0 },
      { name: 'Week 3', value: 0, count: 0 },
      { name: 'Week 4', value: 0, count: 0 }
    ];

    opportunities.forEach(o => {
      const relevantDate = getRelevantDate(o);
      const weekIdx = getWeekIndex(relevantDate);
      weekWise[weekIdx].value += o.value || 0;
      weekWise[weekIdx].count += 1;
    });

    res.json({
      success: true,
      performanceData,
      weekWise,
      summary: {
        totalDeals: opportunities.length,
        totalValue: opportunities.reduce((sum, o) => sum + (o.value || 0), 0),
        weightedPipelineValue: opportunities.reduce((sum, o) => sum + ((o.value || 0) * (o.probability || 0) / 100), 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/reports/stage-analysis
router.get('/stage-analysis', async (req, res) => {
  try {
    const { stage, startDate, endDate, period, teamId, ownerId, source, businessVertical } = req.query;

    const ownerFilter = await buildOwnerFilter(req.user, teamId, req);
    const query = { ...ownerFilter };
    if (businessVertical && businessVertical !== 'all') {
      query.businessVertical = businessVertical;
    }
    if (stage && stage !== 'all') {
      query.stage = stage;
    }
    if (ownerId) {
      if (ownerFilter.ownerId) {
        const allowedIds = ownerFilter.ownerId.$in.map(id => id.toString());
        if (allowedIds.includes(ownerId.toString())) {
          query.ownerId = ownerId;
        } else {
          return res.json({
            success: true,
            deals: [],
            summary: {
              totalDeals: 0,
              totalValue: 0,
              totalWeightedValue: 0,
              averageDaysInStage: 0,
              conversionRate: 0
            },
            sourceBreakdown: [],
            allStagesSummary: []
          });
        }
      } else {
        query.ownerId = ownerId;
      }
    }
    if (source) {
      query.source = source;
    }

    // Date/Time Filters
    let start = null;
    let end = null;
    if (startDate && endDate) {
      start = new Date(`${startDate}T00:00:00.000Z`);
      end = new Date(`${endDate}T23:59:59.999Z`);
    } else if (period) {
      const [year, month] = period.split('-');
      start = new Date(year, parseInt(month) - 1, 1);
      end = new Date(year, parseInt(month), 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Helper: get the date when an opportunity entered its current won/lost stage
    const getWonLostEntryDate = (opp) => {
      if (opp.stageHistory && opp.stageHistory.length > 0) {
        const entry = [...opp.stageHistory]
          .reverse()
          .find(h => h.stage === opp.stage);
        if (entry && entry.enteredAt) {
          return new Date(entry.enteredAt);
        }
      }
      return opp.updatedAt ? new Date(opp.updatedAt) : new Date(opp.createdAt);
    };

    const isWonLostQuery = stage === 'won' || stage === 'lost';
    const isAllStagesQuery = !stage || stage === 'all';
    const isActivePipelineQuery = !isWonLostQuery && !isAllStagesQuery;

    let opportunities;

    if (isActivePipelineQuery) {
      // Querying only an active pipeline stage — filter by createdAt/period
      if (startDate && endDate) {
        query.createdAt = { $gte: start, $lte: end };
      } else if (period) {
        query.period = period;
      } else {
        query.period = new Date().toISOString().substring(0, 7);
      }
      opportunities = await Opportunity.find(query)
        .populate('accountId', 'name')
        .populate('primaryContactId', 'firstName lastName email phone')
        .populate('ownerId', 'username first_name last_name')
        .lean();
    } else if (isWonLostQuery) {
      // Querying only won or lost — filter by stageHistory enteredAt
      const wonLostQuery = { ...query };
      const wonLostResults = await Opportunity.find({
        ...wonLostQuery,
        'stageHistory.stage': { $in: ['won', 'lost'] },
        'stageHistory.enteredAt': { $gte: start, $lte: end }
      })
        .populate('accountId', 'name')
        .populate('primaryContactId', 'firstName lastName email phone')
        .populate('ownerId', 'username first_name last_name')
        .lean();

      // Legacy data fallback — safely combine $or conditions
      const legacyFilter1 = {
        ...wonLostQuery,
        updatedAt: { $gte: start, $lte: end }
      };
      const legacyStageCheck1 = { $or: [{ stageHistory: { $exists: false } }, { stageHistory: { $size: 0 } }] };
      if (wonLostQuery.$or) {
        legacyFilter1.$and = [{ $or: wonLostQuery.$or }, legacyStageCheck1];
        delete legacyFilter1.$or;
      } else {
        Object.assign(legacyFilter1, legacyStageCheck1);
      }
      const wonLostLegacy = await Opportunity.find(legacyFilter1)
        .populate('accountId', 'name')
        .populate('primaryContactId', 'firstName lastName email phone')
        .populate('ownerId', 'username first_name last_name')
        .lean();

      // Filter precisely by the last relevant stageHistory entry
      const filtered = wonLostResults.filter(opp => {
        const entryDate = getWonLostEntryDate(opp);
        return entryDate >= start && entryDate <= end;
      });

      const seenIds = new Set();
      opportunities = [];
      [...filtered, ...wonLostLegacy].forEach(opp => {
        const id = opp._id.toString();
        if (!seenIds.has(id)) {
          seenIds.add(id);
          opportunities.push(opp);
        }
      });
    } else {
      // 'all' stages: fetch active pipeline by createdAt AND won/lost by stageHistory
      const pipelineQuery = { ...query, stage: { $nin: ['won', 'lost'] } };
      if (startDate && endDate) {
        pipelineQuery.createdAt = { $gte: start, $lte: end };
      } else if (period) {
        pipelineQuery.period = period;
      } else {
        pipelineQuery.period = new Date().toISOString().substring(0, 7);
      }

      const pipelineResults = await Opportunity.find(pipelineQuery)
        .populate('accountId', 'name')
        .populate('primaryContactId', 'firstName lastName email phone')
        .populate('ownerId', 'username first_name last_name')
        .lean();

      const wonLostQuery = { ...query, stage: { $in: ['won', 'lost'] } };
      const wonLostResults = await Opportunity.find({
        ...wonLostQuery,
        'stageHistory.stage': { $in: ['won', 'lost'] },
        'stageHistory.enteredAt': { $gte: start, $lte: end }
      })
        .populate('accountId', 'name')
        .populate('primaryContactId', 'firstName lastName email phone')
        .populate('ownerId', 'username first_name last_name')
        .lean();

      const legacyFilter2 = {
        ...wonLostQuery,
        updatedAt: { $gte: start, $lte: end }
      };
      const legacyStageCheck2 = { $or: [{ stageHistory: { $exists: false } }, { stageHistory: { $size: 0 } }] };
      if (wonLostQuery.$or) {
        legacyFilter2.$and = [{ $or: wonLostQuery.$or }, legacyStageCheck2];
        delete legacyFilter2.$or;
      } else {
        Object.assign(legacyFilter2, legacyStageCheck2);
      }
      const wonLostLegacy = await Opportunity.find(legacyFilter2)
        .populate('accountId', 'name')
        .populate('primaryContactId', 'firstName lastName email phone')
        .populate('ownerId', 'username first_name last_name')
        .lean();

      const filteredWonLost = wonLostResults.filter(opp => {
        const entryDate = getWonLostEntryDate(opp);
        return entryDate >= start && entryDate <= end;
      });

      const seenIds = new Set();
      opportunities = [];
      [...pipelineResults, ...filteredWonLost, ...wonLostLegacy].forEach(opp => {
        const id = opp._id.toString();
        if (!seenIds.has(id)) {
          seenIds.add(id);
          opportunities.push(opp);
        }
      });
    }

    const deals = opportunities.map(o => {
      let stageEntryDate = o.createdAt;
      if (o.stageHistory && o.stageHistory.length > 0) {
        const currentStageHistory = [...o.stageHistory]
          .reverse()
          .find(h => h.stage === o.stage);
        if (currentStageHistory) {
          stageEntryDate = currentStageHistory.enteredAt || stageEntryDate;
        }
      }

      const daysInStage = Math.max(0, Math.ceil((new Date() - new Date(stageEntryDate)) / (1000 * 60 * 60 * 24)));
      const weightedValue = Math.round(((o.value || 0) * (o.probability || 0)) / 100);

      return {
        ...o,
        weightedValue,
        stageEntryDate,
        daysInStage
      };
    });

    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalWeightedValue = deals.reduce((sum, d) => sum + (d.weightedValue || 0), 0);
    const averageDaysInStage = totalDeals > 0
      ? Math.round(deals.reduce((sum, d) => sum + (d.daysInStage || 0), 0) / totalDeals)
      : 0;

    const wonCount = deals.filter(d => d.stage === 'won').length;
    const conversionRate = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0;

    const sourceMap = {};
    deals.forEach(d => {
      const src = d.source || 'Unknown';
      if (!sourceMap[src]) {
        sourceMap[src] = { count: 0, value: 0 };
      }
      sourceMap[src].count += 1;
      sourceMap[src].value += d.value || 0;
    });

    const sourceBreakdown = Object.keys(sourceMap).map(src => {
      return {
        source: src,
        count: sourceMap[src].count,
        value: sourceMap[src].value,
        percentage: totalValue > 0 ? Math.round((sourceMap[src].value / totalValue) * 100) : 0
      };
    });

    const stagesList = ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'];
    const allStagesSummary = stagesList.map(st => {
      const stageDeals = deals.filter(d => d.stage === st);
      const sCount = stageDeals.length;
      const sValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const sWeighted = stageDeals.reduce((sum, d) => sum + (d.weightedValue || 0), 0);
      const sAvgDays = sCount > 0
        ? Math.round(stageDeals.reduce((sum, d) => sum + (d.daysInStage || 0), 0) / sCount)
        : 0;
      const sPercent = totalValue > 0 ? Math.round((sValue / totalValue) * 100) : 0;

      return {
        stage: st,
        count: sCount,
        value: sValue,
        weightedValue: sWeighted,
        avgDaysInStage: sAvgDays,
        percentage: sPercent
      };
    });

    res.json({
      success: true,
      deals,
      summary: {
        totalDeals,
        totalValue,
        totalWeightedValue,
        averageDaysInStage,
        conversionRate
      },
      sourceBreakdown,
      allStagesSummary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/reports/activity-report
router.get('/activity-report', async (req, res) => {
  try {
    const { startDate, endDate, period, type, userId, teamId } = req.query;

    const activityFilter = await buildActivityFilter(req.user, teamId, req);
    const query = { ...activityFilter };
    if (type && type !== 'all') {
      query.type = type.toLowerCase();
    }
    if (userId) {
      if (activityFilter.userId) {
        const allowedIds = activityFilter.userId.$in.map(id => id.toString());
        if (allowedIds.includes(userId.toString())) {
          query.userId = userId;
        } else {
          return res.json({
            success: true,
            activities: [],
            summary: {
              totalCount: 0,
              typeBreakdown: { call: 0, email: 0, meeting: 0, demo: 0, note: 0 },
              outcomeBreakdown: { positive: 0, neutral: 0, negative: 0 }
            }
          });
        }
      } else {
        query.userId = userId;
      }
    }

    // Parse date range
    let start = null;
    let end = null;
    if (startDate && endDate) {
      start = new Date(`${startDate}T00:00:00.000Z`);
      end = new Date(`${endDate}T23:59:59.999Z`);
    } else if (period) {
      const [year, month] = period.split('-');
      start = new Date(year, parseInt(month) - 1, 1);
      end = new Date(year, parseInt(month), 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    query.activityDate = { $gte: start, $lte: end };

    // Fetch activities populated with user details
    const activities = await Activity.find(query)
      .populate('userId', 'username email first_name last_name')
      .sort({ activityDate: -1 })
      .lean();

    // Populate relatedTo fields (Lead, Contact, Opportunity, Account name)
    const leadIds = [];
    const contactIds = [];
    const opportunityIds = [];
    const accountIds = [];

    activities.forEach(act => {
      if (act.relatedTo && act.relatedTo.id) {
        if (act.relatedTo.model === 'Lead') leadIds.push(act.relatedTo.id);
        if (act.relatedTo.model === 'Contact') contactIds.push(act.relatedTo.id);
        if (act.relatedTo.model === 'Opportunity') opportunityIds.push(act.relatedTo.id);
        if (act.relatedTo.model === 'Account') accountIds.push(act.relatedTo.id);
      }
    });

    const [leads, contacts, opportunities, accounts] = await Promise.all([
      leadIds.length > 0 ? Lead.find({ _id: { $in: leadIds } }).select('name firstName lastName').lean() : [],
      contactIds.length > 0 ? Contact.find({ _id: { $in: contactIds } }).select('firstName lastName').lean() : [],
      opportunityIds.length > 0 ? Opportunity.find({ _id: { $in: opportunityIds } }).select('name').lean() : [],
      accountIds.length > 0 ? Account.find({ _id: { $in: accountIds } }).select('name').lean() : []
    ]);

    const leadMap = new Map(leads.map(l => [l._id.toString(), l.name || `${l.firstName} ${l.lastName || ''}`.trim()]));
    const contactMap = new Map(contacts.map(c => [c._id.toString(), `${c.firstName} ${c.lastName || ''}`.trim()]));
    const opportunityMap = new Map(opportunities.map(o => [o._id.toString(), o.name]));
    const accountMap = new Map(accounts.map(a => [a._id.toString(), a.name]));

    const enrichedActivities = activities.map(act => {
      let relatedName = 'N/A';
      if (act.relatedTo && act.relatedTo.id) {
        const idStr = act.relatedTo.id.toString();
        if (act.relatedTo.model === 'Lead') relatedName = leadMap.get(idStr) || 'Unknown Lead';
        if (act.relatedTo.model === 'Contact') relatedName = contactMap.get(idStr) || 'Unknown Contact';
        if (act.relatedTo.model === 'Opportunity') relatedName = opportunityMap.get(idStr) || 'Unknown Opportunity';
        if (act.relatedTo.model === 'Account') relatedName = accountMap.get(idStr) || 'Unknown Account';
      }

      return {
        ...act,
        relatedName
      };
    });

    const totalCount = enrichedActivities.length;
    const typeBreakdown = { call: 0, email: 0, meeting: 0, demo: 0, note: 0 };
    const outcomeBreakdown = { positive: 0, neutral: 0, negative: 0 };

    enrichedActivities.forEach(act => {
      const t = (act.type || '').toLowerCase();
      if (typeBreakdown[t] !== undefined) {
        typeBreakdown[t]++;
      }
      const o = (act.outcome || '').toLowerCase();
      if (o && outcomeBreakdown[o] !== undefined) {
        outcomeBreakdown[o]++;
      }
    });

    res.json({
      success: true,
      activities: enrichedActivities,
      summary: {
        totalCount,
        typeBreakdown,
        outcomeBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/reports/reps-overview
router.get('/reps-overview', async (req, res) => {
  try {
    const ownerFilter = await buildOwnerFilter(req.user, null, req);
    const matchFilter = { ...ownerFilter };

    // Fetch active users. If user list is scoped by ownerFilter, use it.
    const userQuery = { isActive: { $ne: false } };
    if (ownerFilter.ownerId) {
      userQuery._id = ownerFilter.ownerId;
    }

    const usersList = await UserModel.find(userQuery)
      .select('username first_name last_name role isActive')
      .lean();

    const allTeams = await SalesTeam.find({ isActive: true }).lean();

    // Aggregate Opportunity stats
    const oppStats = await Opportunity.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$ownerId',
          totalDeals: { $sum: 1 },
          pipelineValue: { $sum: { $cond: [{ $in: ['$stage', ['won', 'lost']] }, 0, '$value'] } },
          wonValue: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, '$value', 0] } }
        }
      }
    ]);

    // Aggregate Lead stats
    const leadStats = await Lead.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$ownerId',
          totalLeads: { $sum: 1 }
        }
      }
    ]);

    // Aggregate Task stats (pending tasks only)
    const taskFilter = {};
    if (ownerFilter.ownerId) {
      taskFilter.assignedTo = ownerFilter.ownerId;
    }
    const taskStats = await Task.aggregate([
      { $match: { ...taskFilter, status: { $ne: 'completed' } } },
      {
        $group: {
          _id: '$assignedTo',
          pendingTasks: { $sum: 1 }
        }
      }
    ]);

    // Map stats
    const oppMap = new Map(oppStats.map(o => [o._id?.toString(), o]));
    const leadMap = new Map(leadStats.map(l => [l._id?.toString(), l]));
    const taskMap = new Map(taskStats.map(t => [t._id?.toString(), t]));

    const getUserTeams = (uId) => {
      const uIdStr = uId.toString();
      return allTeams
        .filter(t => t.managerId?.toString() === uIdStr || t.memberIds?.some(m => m?.toString() === uIdStr))
        .map(t => t.name);
    };

    const repsOverview = usersList.map(u => {
      const uIdStr = u._id.toString();
      const opp = oppMap.get(uIdStr) || { totalDeals: 0, pipelineValue: 0, wonValue: 0 };
      const lead = leadMap.get(uIdStr) || { totalLeads: 0 };
      const task = taskMap.get(uIdStr) || { pendingTasks: 0 };
      const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;

      return {
        userId: u._id,
        username: u.username,
        name: fullName,
        role: u.role || 'Representative',
        teams: getUserTeams(u._id),
        pipelineValue: opp.pipelineValue || 0,
        wonValue: opp.wonValue || 0,
        totalDeals: opp.totalDeals || 0,
        totalLeads: lead.totalLeads || 0,
        pendingTasks: task.pendingTasks || 0
      };
    });

    // Clean list to only include users with a sales footprint
    const filteredReps = repsOverview.filter(r => {
      if (ownerFilter.ownerId) return true;
      return r.totalDeals > 0 || r.totalLeads > 0 || r.pendingTasks > 0 || r.teams.length > 0;
    });

    res.json({ success: true, representatives: filteredReps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

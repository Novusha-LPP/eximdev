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

async function buildOwnerFilter(user, requestedTeamId = null, req = null) {
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
        const filter = { ownerId: { $in: objectIdMemberIds } };
        if (team.businessVertical) {
          filter.businessVertical = team.businessVertical;
        }
        return filter;
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
  let visibleVerticals = [];

  if (myTeams && myTeams.length > 0) {
    myTeams.forEach(team => {
      if (team.memberIds) {
        visibleUserIds = [...visibleUserIds, ...team.memberIds.map(id => id.toString())];
      }
      if (team.managerId) {
        visibleUserIds.push(team.managerId.toString());
      }
      if (team.businessVertical) {
        visibleVerticals.push(team.businessVertical);
      }
    });
  }

  visibleUserIds = [...new Set(visibleUserIds)];
  visibleVerticals = [...new Set(visibleVerticals)];

  const objectIdUserIds = visibleUserIds.map(id => new mongoose.Types.ObjectId(id));
  const finalFilter = { ownerId: { $in: objectIdUserIds } };
  if (visibleVerticals.length > 0) {
    finalFilter.businessVertical = { $in: visibleVerticals };
  }
  return finalFilter;
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
    const { teamId, businessVertical, ownerId } = req.query;
    const ownerFilter = await buildOwnerFilter(req.user, teamId, req);
    const matchFilter = { ...ownerFilter };
    if (businessVertical && businessVertical !== 'all') {
      matchFilter.businessVertical = businessVertical;
    }

    if (ownerId && ownerId !== 'all') {
      if (ownerFilter.ownerId) {
        const allowedIds = ownerFilter.ownerId.$in.map(id => id.toString());
        if (allowedIds.includes(ownerId.toString())) {
          matchFilter.ownerId = new mongoose.Types.ObjectId(ownerId);
        } else {
          return res.json({
            byStage: [],
            weightedForecast: 0,
            leadStats: { total: 0, converted: 0, lost: 0, open: 0 },
            pendingTasks: 0
          });
        }
      } else {
        matchFilter.ownerId = new mongoose.Types.ObjectId(ownerId);
      }
    }

    // 1. Pipeline Health (Total value in each stage)
    const byStage = await Opportunity.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$stage', value: { $sum: '$value' }, count: { $sum: 1 } } },
      { $project: { _id: 0, stage: '$_id', value: 1, count: 1 } }
    ]);

    // 2. Weighted Sales Forecast (expected revenue based on probability)
    const forecast = await Opportunity.aggregate([
      { $match: { ...matchFilter, stage: { $nin: ['won', 'lost'] } } },
      { $project: { weightedRevenue: { $multiply: ['$value', { $divide: ['$probability', 100] }] } } },
      { $group: { _id: null, totalExpectedRevenue: { $sum: '$weightedRevenue' } } }
    ]);

    // 3. Lead Conversion Stats (revised — counts only closed-won as Converted, in-pipeline as Open, and closed-lost/dead as Lost)
    const DEAD_STATUSES = ['lost', 'rejected', 'duplicate', 'cancelled'];

    // Find all opportunities converted from leads and their stages
    const convertedOpps = await Opportunity.find({
      ...matchFilter,
      convertedFromLead: { $ne: null }
    }).select('convertedFromLead stage').lean();

    const oppMap = {};
    convertedOpps.forEach(opp => {
      if (opp.convertedFromLead) {
        oppMap[opp.convertedFromLead.toString()] = opp.stage;
      }
    });

    const allLeads = await Lead.find(matchFilter).select('_id status').lean();

    let convertedCount = 0;
    let lostCount = 0;
    let openCount = 0;

    allLeads.forEach(lead => {
      if (lead.status === 'converted') {
        const stage = oppMap[lead._id.toString()];
        if (stage === 'won') {
          convertedCount++;
        } else if (stage === 'lost') {
          lostCount++;
        } else {
          // If the opportunity is still active in the pipeline, it's considered in progress/open
          openCount++;
        }
      } else if (DEAD_STATUSES.includes(lead.status)) {
        lostCount++;
      } else {
        openCount++;
      }
    });

    const totalLeads = allLeads.length;
    const convertedLeads = convertedCount;
    const lostLeads = lostCount;
    const openLeads = openCount;

    // 4. Tasks Status (Tasks has assignedTo instead of ownerId)
    const taskFilter = {};
    if (matchFilter.ownerId) {
      taskFilter.assignedTo = matchFilter.ownerId;
    } else if (ownerFilter.ownerId) {
      taskFilter.assignedTo = ownerFilter.ownerId;
    }
    const tasksCount = await Task.countDocuments({ ...taskFilter, status: { $ne: 'completed' } });

    res.json({
      byStage,
      weightedForecast: forecast[0]?.totalExpectedRevenue || 0,
      leadStats: { total: totalLeads, converted: convertedLeads, lost: lostLeads, open: openLeads },
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

    // Query opportunities within period
    const opportunities = await Opportunity.find({
      ...query,
      createdAt: { $gte: start, $lte: end }
    }).lean();

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
    const getWeekIndex = (dateStr) => {
      const day = new Date(dateStr).getDate();
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
      const weekIdx = getWeekIndex(o.createdAt);
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
      query.createdAt = { $gte: start, $lte: end };
    } else if (period) {
      query.period = period;
    } else {
      query.period = new Date().toISOString().substring(0, 7);
    }

    const opportunities = await Opportunity.find(query)
      .populate('accountId', 'name')
      .populate('primaryContactId', 'firstName lastName email phone')
      .populate('ownerId', 'username first_name last_name')
      .lean();

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

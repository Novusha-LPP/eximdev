import express from 'express';
import Opportunity from '../../model/crm/Opportunity.mjs';
import Lead from '../../model/crm/Lead.mjs';
import Task from '../../model/crm/Task.mjs';

const router = express.Router();

// GET /api/crm/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // 1. Pipeline Health (Total value in each stage)
    const byStage = await Opportunity.aggregate([
      { $group: { _id: '$stage', value: { $sum: '$value' }, count: { $sum: 1 } } },
      { $project: { _id: 0, stage: '$_id', value: 1, count: 1 } }
    ]);
    
    // 2. Weighted Sales Forecast (expected revenue based on probability)
    const forecast = await Opportunity.aggregate([
      { $match: { stage: { $nin: ['won', 'lost'] } } },
      { $project: { weightedRevenue: { $multiply: ['$value', { $divide: ['$probability', 100] }] } } },
      { $group: { _id: null, totalExpectedRevenue: { $sum: '$weightedRevenue' } } }
    ]);
    
    // 3. Lead Conversion Stats
    const totalLeads = await Lead.countDocuments({});
    const convertedLeads = await Lead.countDocuments({ status: 'converted' });
 
    // 4. Tasks Status
    const tasksCount = await Task.countDocuments({ status: { $ne: 'completed' } });

    res.json({
      byStage,
      weightedForecast: forecast[0]?.totalExpectedRevenue || 0,
      leadStats: { total: totalLeads, converted: convertedLeads },
      pendingTasks: tasksCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/reports/performance
router.get('/performance', async (req, res) => {
  try {
    const { startDate, endDate, period, teamId, ownerId } = req.query;
    
    // Build filter query based on owner, team
    const query = {};
    if (ownerId) {
      query.ownerId = ownerId;
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

    const stages = ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'];
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
    const { stage, startDate, endDate, period, teamId, ownerId, source } = req.query;
    
    const query = {};
    if (stage && stage !== 'all') {
      query.stage = stage;
    }
    if (ownerId) {
      query.ownerId = ownerId;
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

    const stagesList = ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'];
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

export default router;

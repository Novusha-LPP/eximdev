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

export default router;

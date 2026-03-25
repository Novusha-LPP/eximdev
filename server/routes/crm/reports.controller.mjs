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

export default router;

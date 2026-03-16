import express from 'express';
import Opportunity from '../../model/crm/Opportunity.mjs';
import Lead from '../../model/crm/Lead.mjs';
import Task from '../../model/crm/Task.mjs';
import { requireTenant } from './middleware/tenant.mjs';

const router = express.Router();
router.use(requireTenant);

// GET /api/crm/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    // 1. Pipeline Health (Total value in each stage)
    const pipelineHealth = await Opportunity.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$stage', totalValue: { $sum: '$value' }, count: { $sum: 1 } } }
    ]);
    
    // 2. Weighted Sales Forecast (expected revenue based on probability)
    const forecast = await Opportunity.aggregate([
      { $match: { tenantId, stage: { $nin: ['won', 'lost'] } } },
      { $project: { weightedRevenue: { $multiply: ['$value', { $divide: ['$probability', 100] }] } } },
      { $group: { _id: null, totalExpectedRevenue: { $sum: '$weightedRevenue' } } }
    ]);
    
    // 3. Lead Conversion Stats
    const totalLeads = await Lead.countDocuments({ tenantId });
    const convertedLeads = await Lead.countDocuments({ tenantId, status: 'converted' });

    // 4. Tasks Status
    const tasksCount = await Task.countDocuments({ tenantId, status: { $ne: 'completed' } });

    res.json({
      pipelineHealth,
      weightedForecast: forecast[0]?.totalExpectedRevenue || 0,
      leadStats: { total: totalLeads, converted: convertedLeads },
      pendingTasks: tasksCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

import express from 'express';
import mongoose from 'mongoose';
import SalesIncentive from '../../model/crm/SalesIncentive.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';
import UserModel from '../../model/userModel.mjs';
import { requireTenant } from './middleware/tenant.mjs';

const router = express.Router();

// Apply requireTenant middleware to enforce multi-tenancy
router.use(requireTenant);

// Helper to check if user has manager/admin permissions
const isManagerOrAdmin = (user) => {
  const role = user?.crmRole || user?.role;
  return role === 'Admin' || role === 'Manager';
};

// GET /api/crm/incentives/my
// Returns current user's incentive logs and summaries
router.get('/my', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const incentives = await SalesIncentive.find({
      tenantId: req.tenantId,
      userId: userId
    })
      .populate('opportunityId', 'name value')
      .sort({ createdAt: -1 })
      .lean();

    // Summarize individual metrics
    const summary = {
      pending: 0,
      approved: 0,
      paid: 0,
      total: 0
    };

    incentives.forEach(item => {
      const amt = item.incentiveAmount || 0;
      if (item.status === 'pending') summary.pending += amt;
      else if (item.status === 'approved') summary.approved += amt;
      else if (item.status === 'paid') summary.paid += amt;
      summary.total += amt;
    });

    res.json({
      success: true,
      summary,
      incentives
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/incentives/all
// Returns tenant-wide incentives dashboard metrics (Admins/Managers only)
router.get('/all', async (req, res) => {
  try {
    if (!isManagerOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. Managers/Admins only.' });
    }

    const incentives = await SalesIncentive.find({ tenantId: req.tenantId })
      .populate('userId', 'username first_name last_name email')
      .populate('opportunityId', 'name value')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate aggregated metrics
    const stats = {
      totalPending: 0,
      totalApproved: 0,
      totalPaid: 0,
      totalLiability: 0
    };

    const userIncentivesMap = {};

    incentives.forEach(item => {
      const amt = item.incentiveAmount || 0;
      if (item.status === 'pending') stats.totalPending += amt;
      else if (item.status === 'approved') stats.totalApproved += amt;
      else if (item.status === 'paid') stats.totalPaid += amt;
      stats.totalLiability += amt;

      // Group for leaderboard
      const u = item.userId;
      if (u) {
        const uId = u._id.toString();
        const displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
        if (!userIncentivesMap[uId]) {
          userIncentivesMap[uId] = {
            userId: uId,
            name: displayName,
            email: u.email,
            pending: 0,
            approved: 0,
            paid: 0,
            total: 0
          };
        }
        if (item.status === 'pending') userIncentivesMap[uId].pending += amt;
        else if (item.status === 'approved') userIncentivesMap[uId].approved += amt;
        else if (item.status === 'paid') userIncentivesMap[uId].paid += amt;
        userIncentivesMap[uId].total += amt;
      }
    });

    // Convert map to leaderboard sorted by total earnings
    const leaderboard = Object.values(userIncentivesMap)
      .sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      stats,
      leaderboard,
      incentives
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/incentives/:id/status
// Update incentive status/amount (Admins/Managers only)
router.put('/:id/status', async (req, res) => {
  try {
    if (!isManagerOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. Managers/Admins only.' });
    }

    const { status, incentiveAmount } = req.body;
    if (status && !['pending', 'approved', 'paid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const incentive = await SalesIncentive.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!incentive) {
      return res.status(404).json({ success: false, message: 'Incentive not found' });
    }

    if (incentiveAmount !== undefined) {
      incentive.incentiveAmount = incentiveAmount;
    }

    if (status) {
      incentive.status = status;
      if (status === 'approved') {
        incentive.approvedBy = req.user?._id;
        incentive.approvedAt = new Date();
      } else if (status === 'paid') {
        incentive.paidAt = new Date();
        if (!incentive.approvedAt) {
          incentive.approvedBy = req.user?._id;
          incentive.approvedAt = new Date();
        }
      }
    }

    await incentive.save();
    res.json({ success: true, message: 'Incentive updated successfully', incentive });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;

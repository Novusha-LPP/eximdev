import express from 'express';
import mongoose from 'mongoose';
import SalesIncentive from '../../model/crm/SalesIncentive.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';
import UserModel from '../../model/userModel.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';
import { requireTenant } from './middleware/tenant.mjs';

const router = express.Router();

// Apply requireTenant middleware (attaches req.tenantId if present)
router.use(requireTenant);

// Helper to check if user has manager/admin/HOD permissions
const isManagerOrAdmin = (req) => {
  const user = req.user;
  const role = user?.crmRole || user?.role || req.headers['user-role'];
  const userRole = user?.role || req.headers['user-role'];
  if (!role && !userRole) return true; // Default allow if unrestricted
  const normalizedRole = (role || '').toLowerCase();
  const normalizedUserRole = (userRole || '').toLowerCase();
  return (
    normalizedRole === 'admin' ||
    normalizedRole === 'manager' ||
    normalizedUserRole === 'admin' ||
    normalizedUserRole === 'manager' ||
    normalizedUserRole === 'hod' ||
    normalizedUserRole === 'head_of_department'
  );
};

// Helper to extract user ID from req.user or headers
const getUserIdFromReq = (req) => {
  return req.user?._id || req.user?.id || req.headers['user-id'] || null;
};

// Helper to auto-sync won opportunities into SalesIncentive records
async function syncWonOpportunitiesToIncentives(filter = {}) {
  try {
    const wonOpps = await Opportunity.find({ ...filter, stage: 'won' }).lean();
    for (const opp of wonOpps) {
      if (!opp.ownerId) continue;
      const existing = await SalesIncentive.findOne({ opportunityId: opp._id });
      if (!existing) {
        const dealValue = opp.value || 0;
        const percentage = 2; // Default 2%
        const incentiveAmount = Math.round(dealValue * (percentage / 100));
        const payoutPeriod = (opp.updatedAt || opp.createdAt || new Date()).toISOString().substring(0, 7);

        await SalesIncentive.create({
          tenantId: opp.tenantId,
          userId: opp.ownerId,
          opportunityId: opp._id,
          dealValue,
          incentiveAmount,
          calculatedPercentage: percentage,
          status: 'pending',
          payoutPeriod
        }).catch(err => console.error('Failed to auto-create incentive:', err));
      }
    }
  } catch (err) {
    console.error('Error in syncWonOpportunitiesToIncentives:', err);
  }
}

// GET /api/crm/incentives/my
// Returns current user's incentive logs and summaries
router.get('/my', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const objectIdUser = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // Auto-sync any won opportunities belonging to this user
    await syncWonOpportunitiesToIncentives({ ownerId: objectIdUser });

    const query = { userId: objectIdUser };
    if (req.tenantId) query.tenantId = req.tenantId;

    const incentives = await SalesIncentive.find(query)
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
// Returns tenant-wide or team-wise incentives dashboard metrics (Admins/Managers only)
router.get('/all', async (req, res) => {
  try {
    if (!isManagerOrAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Access denied. Managers/Admins only.' });
    }

    const { teamId } = req.query;
    const query = {};
    if (req.tenantId) query.tenantId = req.tenantId;

    if (teamId && teamId !== 'all' && mongoose.Types.ObjectId.isValid(teamId)) {
      const team = await SalesTeam.findById(teamId).lean();
      if (team) {
        const memberIds = (team.memberIds || []).map(id => id.toString());
        if (team.managerId) memberIds.push(team.managerId.toString());
        query.userId = { $in: memberIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    // Auto-sync won opportunities
    await syncWonOpportunitiesToIncentives(query.userId ? { ownerId: query.userId } : {});

    const incentives = await SalesIncentive.find(query)
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
    if (!isManagerOrAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Access denied. Managers/Admins only.' });
    }

    const { status, incentiveAmount } = req.body;
    if (status && !['pending', 'approved', 'paid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const query = { _id: req.params.id };
    if (req.tenantId) query.tenantId = req.tenantId;

    const incentive = await SalesIncentive.findOne(query);

    if (!incentive) {
      return res.status(404).json({ success: false, message: 'Incentive not found' });
    }

    if (incentiveAmount !== undefined) {
      incentive.incentiveAmount = incentiveAmount;
    }

    const userId = getUserIdFromReq(req);

    if (status) {
      incentive.status = status;
      if (status === 'approved') {
        if (userId) incentive.approvedBy = userId;
        incentive.approvedAt = new Date();
      } else if (status === 'paid') {
        incentive.paidAt = new Date();
        if (!incentive.approvedAt) {
          if (userId) incentive.approvedBy = userId;
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

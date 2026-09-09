import express from 'express';
import mongoose from 'mongoose';
import Activity from '../../model/crm/Activity.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';
import Lead from '../../model/crm/Lead.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';

const router = express.Router();

async function updateEntityActivityTimestamp(relatedTo, activityType) {
  if (!relatedTo || !relatedTo.model || !relatedTo.id) return;
  const now = new Date();
  try {
    if (relatedTo.model === 'Lead') {
      const updateData = { lastActivityAt: now };
      if (['visit', 'meeting'].includes(activityType?.toLowerCase())) {
        updateData.hasPlannedVisit = true;
      }
      await Lead.findByIdAndUpdate(relatedTo.id, updateData);
    } else if (relatedTo.model === 'Opportunity') {
      await Opportunity.findByIdAndUpdate(relatedTo.id, { lastActivityAt: now });
    }
  } catch (err) {
    console.error('Error updating activity timestamp on related entity:', err);
  }
}

async function buildActivityFilter(user, requestedTeamId = null, req = null) {
  const role = user?.crmRole || user?.role || req?.headers?.['user-role'];
  const userId = user?._id || user?.id || user?.userId || req?.headers?.['user-id'];

  if (requestedTeamId) {
    const team = await SalesTeam.findById(requestedTeamId).lean();
    if (team) {
      const isManager = team.managerId?.toString() === userId?.toString();
      const isMember = team.memberIds?.some(m => m?.toString() === userId?.toString());
      if (role === 'Admin' || isManager || isMember) {
        const objectIdMemberIds = (team.memberIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
        if (team.managerId) {
          objectIdMemberIds.push(new mongoose.Types.ObjectId(team.managerId.toString()));
        }
        return { userId: { $in: objectIdMemberIds } };
      }
    }
  }

  if (role === 'Admin') return {};
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

// GET /api/crm/activities
router.get('/', async (req, res) => {
  try {
    const { type, userId, relatedModel, relatedId, startDate, endDate, teamId } = req.query;
    const activityFilter = await buildActivityFilter(req.user, teamId, req);
    const query = { ...activityFilter };
    if (type) query.type = type.toLowerCase();
    
    if (userId) {
      if (!query.userId) {
        query.userId = userId;
      } else {
        const allowed = query.userId.$in.map(id => id.toString());
        if (allowed.includes(userId.toString())) {
          query.userId = userId;
        } else {
          return res.json([]);
        }
      }
    }

    if (relatedModel && relatedId) {
      query['relatedTo.model'] = relatedModel;
      query['relatedTo.id'] = relatedId;
    }
    if (startDate && endDate) {
      query.activityDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const activities = await Activity.find(query)
      .populate('userId', 'username email first_name last_name')
      .sort({ activityDate: -1 });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/activities/:id
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findOne({ _id: req.params.id })
      .populate('userId', 'username email first_name last_name');
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/activities
router.post('/', async (req, res) => {
  try {
    const newActivity = new Activity({ 
      ...req.body, 
      userId: req.user?._id || req.body.userId // Use current user ID or ID from body
    });
    await newActivity.save();
    await updateEntityActivityTimestamp(newActivity.relatedTo, newActivity.type);
    res.status(201).json(newActivity);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/activities/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await Activity.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Activity not found' });
    await updateEntityActivityTimestamp(updated.relatedTo, updated.type);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/crm/activities/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Activity.findOneAndDelete({ _id: req.params.id });
    if (!deleted) return res.status(404).json({ message: 'Activity not found' });
    res.json({ success: true, message: 'Activity deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

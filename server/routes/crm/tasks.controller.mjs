import express from 'express';
import mongoose from 'mongoose';
import Task from '../../model/crm/Task.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';

const router = express.Router();

async function buildTaskFilter(user, requestedTeamId = null, req = null) {
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
        return { assignedTo: { $in: objectIdMemberIds } };
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
  return { assignedTo: { $in: objectIdUserIds } };
}

// GET /api/crm/tasks
router.get('/', async (req, res) => {
  try {
    const { status, priority, assignedTo, startDate, endDate, teamId } = req.query;
    const taskFilter = await buildTaskFilter(req.user, teamId, req);
    const query = { ...taskFilter };
    if (status) query.status = status.toLowerCase();
    if (priority) query.priority = priority.toLowerCase();
    
    if (assignedTo) {
      if (!query.assignedTo) {
        query.assignedTo = assignedTo;
      } else {
        const allowed = query.assignedTo.$in.map(id => id.toString());
        if (allowed.includes(assignedTo.toString())) {
          query.assignedTo = assignedTo;
        } else {
          return res.json([]);
        }
      }
    }

    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'username email first_name last_name role department')
      .populate('createdBy', 'username email first_name last_name role department')
      .populate('reassignmentHistory.fromUser', 'username first_name last_name')
      .populate('reassignmentHistory.toUser', 'username first_name last_name')
      .sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/tasks/my
router.get('/my', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { assignedTo: req.user?._id };
    
    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      query.status = { $ne: 'completed' };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'username email first_name last_name')
      .populate('createdBy', 'username email first_name last_name')
      .populate('reassignmentHistory.fromUser', 'username first_name last_name')
      .populate('reassignmentHistory.toUser', 'username first_name last_name')
      .sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id })
      .populate('assignedTo', 'username email first_name last_name')
      .populate('createdBy', 'username email first_name last_name')
      .populate('reassignmentHistory.fromUser', 'username first_name last_name')
      .populate('reassignmentHistory.toUser', 'username first_name last_name');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/tasks
router.post('/', async (req, res) => {
  try {
    if (req.body.relatedTo && (!req.body.relatedTo.model || !req.body.relatedTo.id)) {
      req.body.relatedTo = null;
    }
    if (req.body.dueDate === '') {
      req.body.dueDate = null;
    }

    const newTask = new Task({ 
      ...req.body, 
      createdBy: req.user?._id
    });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    if (req.body.relatedTo && (!req.body.relatedTo.model || !req.body.relatedTo.id)) {
      req.body.relatedTo = null;
    }
    if (req.body.dueDate === '') {
      req.body.dueDate = null;
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const originalAssignee = task.assignedTo?.toString();
    const newAssignee = req.body.assignedTo?.toString();

    // Check if reassigned
    if (newAssignee && originalAssignee && originalAssignee !== newAssignee) {
      task.reassignmentHistory.push({
        fromUser: originalAssignee,
        toUser: newAssignee,
        assignedBy: req.user?._id || null,
        timestamp: new Date()
      });

      // Dispatch alert / system notification
      try {
        const CRMNotification = mongoose.model('CRMNotification');
        if (CRMNotification) {
          const notif = new CRMNotification({
            userId: newAssignee,
            title: 'Task Reassigned',
            message: `You have been reassigned the task: "${req.body.title || task.title}" by ${req.user?.username || 'System'}.`,
            relatedId: task._id,
            relatedModel: 'Task'
          });
          await notif.save();
        }
      } catch (notifErr) {
        console.error('Failed to create in-app notification:', notifErr);
      }
    }

    // Update fields
    Object.assign(task, req.body);
    const saved = await task.save();

    const populated = await Task.findById(saved._id)
      .populate('assignedTo', 'username email first_name last_name role department')
      .populate('createdBy', 'username email first_name last_name role department')
      .populate('reassignmentHistory.fromUser', 'username first_name last_name')
      .populate('reassignmentHistory.toUser', 'username first_name last_name');

    res.json(populated);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/tasks/:id/complete
router.patch('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id },
      { status: 'completed' },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;

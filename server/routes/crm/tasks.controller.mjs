import express from 'express';
import Task from '../../model/crm/Task.mjs';
import { requireTenant } from './middleware/tenant.mjs';

const router = express.Router();
router.use(requireTenant);

// GET /api/crm/tasks
router.get('/', async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.query;
    const query = { tenantId: req.tenantId };
    if (status) query.status = status.toLowerCase();
    if (priority) query.priority = priority.toLowerCase();
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')
      .sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/tasks/my
router.get('/my', async (req, res) => {
  try {
    const tasks = await Task.find({ 
      tenantId: req.tenantId, 
      assignedTo: req.user?._id,
      status: { $ne: 'completed' }
    }).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('assignedTo', 'username email');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/tasks
router.post('/', async (req, res) => {
  try {
    const newTask = new Task({ 
      ...req.body, 
      tenantId: req.tenantId,
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
    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Task not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/tasks/:id/complete
router.patch('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
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

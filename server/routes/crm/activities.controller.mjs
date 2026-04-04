import express from 'express';
import Activity from '../../model/crm/Activity.mjs';

const router = express.Router();

// GET /api/crm/activities
router.get('/', async (req, res) => {
  try {
    const { type, userId, relatedModel, relatedId } = req.query;
    const query = {};
    if (type) query.type = type.toLowerCase();
    if (userId) query.userId = userId;
    if (relatedModel && relatedId) {
      query['relatedTo.model'] = relatedModel;
      query['relatedTo.id'] = relatedId;
    }

    const activities = await Activity.find(query)
      .populate('userId', 'username email')
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
      .populate('userId', 'username email');
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
      userId: req.user?._id // Use current user ID
    });
    await newActivity.save();
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

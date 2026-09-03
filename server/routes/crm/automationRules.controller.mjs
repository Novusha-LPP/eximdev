import express from 'express';
import AutomationRule from '../../model/crm/AutomationRule.mjs';
import Lead from '../../model/crm/Lead.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';

const router = express.Router();

// CREATE automation rule
router.post('/', async (req, res) => {
  try {
    const { name, description, type, trigger, actions, scope, isTemplate } = req.body;

    if (!name || !type || !trigger || !actions) {
      return res.status(400).json({ message: 'Name, type, trigger, and actions are required' });
    }

    const newRule = new AutomationRule({
      name,
      description,
      type,
      trigger,
      actions,
      scope: scope || { appliesToAll: true },
      isTemplate,
      createdBy: req.userId
    });

    await newRule.save();
    res.status(201).json(newRule);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET all rules
router.get('/', async (req, res) => {
  try {
    const { type, isActive = true, page = 1, limit = 20 } = req.query;
    let query = {};

    if (type) query.type = type;
    if (isActive !== 'all') query.isActive = isActive === 'true';

    const rules = await AutomationRule.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await AutomationRule.countDocuments(query);

    res.json({
      rules,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single rule
router.get('/:id', async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({ _id: req.params.id })
      .populate('createdBy');

    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE rule
router.put('/:id', async (req, res) => {
  try {
    const updated = await AutomationRule.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    ).populate('createdBy');

    if (!updated) return res.status(404).json({ message: 'Rule not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE rule
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await AutomationRule.findOneAndDelete({ _id: req.params.id });
    if (!deleted) return res.status(404).json({ message: 'Rule not found' });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Execute rule manually
router.post('/:id/execute', async (req, res) => {
  try {
    const { recordIds = [] } = req.body;
    const rule = await AutomationRule.findOne({ _id: req.params.id });

    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    let executionCount = 0;
    const results = [];

    for (const recordId of recordIds) {
      try {
        // Execute actions for this record
        await executeRuleActions(rule, recordId, req.userId);
        executionCount++;
        results.push({ recordId, status: 'success' });
      } catch (err) {
        results.push({ recordId, status: 'failed', error: err.message });
      }
    }

    // Update rule stats
    rule.stats.totalExecutions += executionCount;
    rule.stats.successfulExecutions += executionCount;
    rule.stats.lastExecutedAt = new Date();
    await rule.save();

    res.json({
      success: true,
      message: `Executed ${executionCount} actions`,
      results,
      ruleStats: rule.stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle rule active status
router.put('/:id/toggle', async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({ _id: req.params.id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    rule.isActive = !rule.isActive;
    await rule.save();

    res.json({
      success: true,
      message: `Rule ${rule.isActive ? 'enabled' : 'disabled'}`,
      rule
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get templates
router.get('/templates/list', async (req, res) => {
  try {
    const templates = await AutomationRule.find({
      isTemplate: true,
      isActive: true
    }).select('name description type');

    res.json(templates);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to execute rule actions
async function executeRuleActions(rule, recordId, userId) {
  for (const action of rule.actions) {
    switch (action.type) {
      case 'assign_to':
        if (rule.type === 'lead') {
          await Lead.findByIdAndUpdate(recordId, { ownerId: action.params.assigneeId });
        } else if (rule.type === 'opportunity') {
          await Opportunity.findByIdAndUpdate(recordId, { ownerId: action.params.assigneeId });
        }
        break;

      case 'change_field':
        if (rule.type === 'lead') {
          await Lead.findByIdAndUpdate(recordId, { [action.params.fieldName]: action.params.fieldValue });
        }
        break;

      case 'create_task':
        // TODO: Create task (references TaskModel)
        break;

      case 'send_email':
        // TODO: Send email notification
        break;

      case 'add_tag':
        if (rule.type === 'lead') {
          await Lead.findByIdAndUpdate(recordId, { $addToSet: { tags: { $each: action.params.tags } } });
        }
        break;

      case 'move_to_stage':
        if (rule.type === 'opportunity') {
          await Opportunity.findByIdAndUpdate(recordId, { stage: action.params.stageName });
        }
        break;

      default:
        break;
    }

    action.executionCount = (action.executionCount || 0) + 1;
    action.lastExecuted = new Date();
  }
}

export default router;

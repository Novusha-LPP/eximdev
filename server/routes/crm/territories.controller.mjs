import express from 'express';
import Territory from '../../model/crm/Territory.mjs';
import Lead from '../../model/crm/Lead.mjs';
import Account from '../../model/crm/Account.mjs';

const router = express.Router();

// CREATE territory
router.post('/', async (req, res) => {
  try {
    const { name, description, type, boundaries, industries, customerSize, assignedTeamId, assignedOwnerId, leadRoutingRules } = req.body;

    if (!name) return res.status(400).json({ message: 'Territory name is required' });

    const newTerritory = new Territory({
      name,
      description,
      type,
      boundaries,
      industries,
      customerSize,
      assignedTeamId,
      assignedOwnerId,
      leadRoutingRules
    });

    await newTerritory.save();
    res.status(201).json(newTerritory);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET all territories
router.get('/', async (req, res) => {
  try {
    const { type, isActive = true, page = 1, limit = 20 } = req.query;
    let query = {};

    if (type) query.type = type;
    if (isActive !== 'all') query.isActive = isActive === 'true';

    const territories = await Territory.find(query)
      .populate('assignedTeamId', 'name')
      .populate('assignedOwnerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Territory.countDocuments(query);

    res.json({
      territories,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single territory
router.get('/:id', async (req, res) => {
  try {
    const territory = await Territory.findOne({ _id: req.params.id })
      .populate('assignedTeamId')
      .populate('assignedOwnerId')
      .populate('memberIds');

    if (!territory) return res.status(404).json({ message: 'Territory not found' });
    res.json(territory);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE territory
router.put('/:id', async (req, res) => {
  try {
    const updatedTerritory = await Territory.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    ).populate('assignedTeamId assignedOwnerId');

    if (!updatedTerritory) return res.status(404).json({ message: 'Territory not found' });
    res.json(updatedTerritory);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE territory
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Territory.findOneAndDelete({ _id: req.params.id });
    if (!deleted) return res.status(404).json({ message: 'Territory not found' });
    res.json({ success: true, message: 'Territory deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign leads to territory
router.post('/:id/assign-leads', async (req, res) => {
  try {
    const { leadsToAssign, territory } = req.body; // Template-based assignment

    const updatedLeads = await Promise.all(
      leadsToAssign.map(leadId =>
        Lead.findOneAndUpdate(
          { _id: leadId },
          { assignedTerritoryId: req.params.id, assignedTeamId: territory.assignedTeamId },
          { new: true }
        )
      )
    );

    res.json({
      message: `Assigned ${updatedLeads.length} leads to territory`,
      assignedCount: updatedLeads.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get territory performance
router.get('/:id/performance', async (req, res) => {
  try {
    const territory = await Territory.findOne({ _id: req.params.id });
    if (!territory) return res.status(404).json({ message: 'Territory not found' });

    // Get accounts in territory
    const accounts = await Account.find({
      assignedTerritoryId: req.params.id
    });

    // Calculate metrics
    const stats = {
      accountCount: accounts.length,
      totalRevenue: accounts.reduce((sum, acc) => sum + (acc.totalRevenue || 0), 0),
      avgDealSize: accounts.length ? accounts.reduce((sum, acc) => sum + (acc.avgDealSize || 0), 0) / accounts.length : 0,
      winRate: territory.metrics.winRate || 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

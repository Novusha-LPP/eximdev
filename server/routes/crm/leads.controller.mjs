import express from 'express';
import Lead from '../../model/crm/Lead.mjs';
import Account from '../../model/crm/Account.mjs';
import Contact from '../../model/crm/Contact.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// OWNERSHIP FILTER
// - Admin → all leads
// - Team owner (managerId on a SalesTeam) → all team members' leads
// - Everyone else → only their own leads
// ─────────────────────────────────────────────────────────────────────────────
async function buildOwnerFilter(user, requestedTeamId = null) {
  const role = user?.crmRole || user?.role;
  const userId = user?._id || user?.id || user?.userId;
  
  // If specifically requesting a team's data
  if (requestedTeamId) {
    const team = await SalesTeam.findById(requestedTeamId).lean();
    if (team) {
      // If admin, or user is manager, or user is member -> show team's data
      const isManager = team.managerId?.toString() === userId?.toString();
      const isMember = team.memberIds?.some(m => m?.toString() === userId?.toString());
      if (role === 'Admin' || isManager || isMember) {
        return { ownerId: { $in: team.memberIds || [] } };
      }
    }
  }

  // Default fallback (no specific team requested)
  if (role === 'Admin') return {};
  if (!userId) return {};

  // Find ALL teams this user manages
  const ownedTeams = await SalesTeam.find({ managerId: userId }).lean();
  let visibleUserIds = [userId];

  if (ownedTeams && ownedTeams.length > 0) {
    ownedTeams.forEach(team => {
      if (team.memberIds) {
        visibleUserIds = [...visibleUserIds, ...team.memberIds];
      }
    });
  }

  // Deduplicate user IDs
  visibleUserIds = [...new Set(visibleUserIds.map(id => id?.toString()))];

  return { ownerId: { $in: visibleUserIds } };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/crm/leads
router.get('/', async (req, res) => {
  try {
    const { status, source, teamId } = req.query;
    const ownerFilter = await buildOwnerFilter(req.user, teamId);
    const query = { ...ownerFilter };
    if (status) query.status = status;
    if (source) query.source = source;

    const leads = await Lead.find(query)
      .populate('ownerId', 'username first_name last_name')
      .sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('ownerId', 'username first_name last_name');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/leads
router.post('/', async (req, res) => {
  try {
    // Auto-set owner from session user if not provided
    const userId = req.user?._id || req.user?.id || req.headers['user-id'];
    const leadData = {
      ...req.body,
      ownerId: req.body.ownerId || userId
    };
    const newLead = new Lead(leadData);
    await newLead.save();
    res.status(201).json(newLead);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedLead) return res.status(404).json({ message: 'Lead not found' });
    res.json(updatedLead);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/crm/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/leads/:id/assign — reassign to another team member
router.patch('/:id/assign', async (req, res) => {
  try {
    const { ownerId } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { ownerId },
      { new: true }
    ).populate('ownerId', 'username first_name last_name');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/crm/leads/:id/convert
// Converts a lead into Account + Contact + Opportunity
router.post('/:id/convert', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.status === 'converted') {
      return res.status(400).json({ success: false, message: 'Lead already converted' });
    }

    // 1. Create Account
    const account = new Account({
      name: lead.company,
      ownerId: lead.ownerId
    });
    await account.save();

    // 2. Create Contact
    const contact = new Contact({
      accountId: account._id,
      ownerId: lead.ownerId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      isPrimary: true,
      convertedFromLead: lead._id
    });
    await contact.save();

    // 3. Create Opportunity
    const opportunity = new Opportunity({
      accountId: account._id,
      primaryContactId: contact._id,
      name: `${lead.company} - Deal`,
      stage: 'lead',
      services: lead.interestedServices || [],
      ownerId: lead.ownerId,
      convertedFromLead: lead._id,
      probability: 10,
      stageHistory: [{ stage: 'lead', enteredAt: new Date() }]
    });
    await opportunity.save();

    // 4. Mark lead as converted
    lead.status = 'converted';
    lead.convertedAt = new Date();
    lead.convertedTo = {
      accountId: account._id,
      contactId: contact._id,
      opportunityId: opportunity._id
    };
    await lead.save();

    return res.status(201).json({
      success: true,
      message: 'Lead converted successfully',
      data: { lead, account, contact, opportunity }
    });
  } catch (error) {
    console.error('Lead conversion error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to convert lead',
      code: 'CONVERSION_FAILED'
    });
  }
});

export default router;

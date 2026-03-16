import express from 'express';
import Lead from '../../model/crm/Lead.mjs';
import Account from '../../model/crm/Account.mjs';
import Contact from '../../model/crm/Contact.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';
import { requireTenant } from './middleware/tenant.mjs';

const router = express.Router();

// Apply multi-tenancy requirement to all lead routes
router.use(requireTenant);

// GET /api/crm/leads
router.get('/', async (req, res) => {
  try {
    const { status, source, ownerId } = req.query;
    const query = { tenantId: req.tenantId };
    if (status) query.status = status;
    if (source) query.source = source;
    if (ownerId) query.ownerId = ownerId;

    const leads = await Lead.find(query)
      .populate('ownerId', 'username email')
      .sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('ownerId', 'username email');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/leads
router.post('/', async (req, res) => {
  try {
    const newLead = new Lead({ ...req.body, tenantId: req.tenantId });
    await newLead.save();
    res.status(201).json(newLead);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedLead = await Lead.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
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
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/crm/leads/:id/assign
router.patch('/:id/assign', async (req, res) => {
  try {
    const { ownerId } = req.body;
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { ownerId },
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/crm/leads/:id/convert
router.post('/:id/convert', async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (lead.status === 'converted') return res.status(400).json({ message: 'Lead already converted' });

    // 1. Create Account
    const account = new Account({
      tenantId: req.tenantId,
      name: lead.company,
      ownerId: lead.ownerId
    });
    await account.save();

    // 2. Create Contact
    const contact = new Contact({
      tenantId: req.tenantId,
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
      tenantId: req.tenantId,
      accountId: account._id,
      primaryContactId: contact._id,
      name: `${lead.company} - Deal`,
      stage: 'opportunity',
      services: lead.interestedServices,
      ownerId: lead.ownerId,
      convertedFromLead: lead._id
    });
    await opportunity.save();

    // 4. Update Lead Status
    lead.status = 'converted';
    lead.convertedAt = new Date();
    lead.convertedTo = {
      accountId: account._id,
      contactId: contact._id,
      opportunityId: opportunity._id
    };
    await lead.save();

    res.json({ success: true, account, contact, opportunity, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

import express from 'express';
import mongoose from 'mongoose';
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
async function buildOwnerFilter(user, requestedTeamId = null, req = null) {
  if (req?.query?.all === 'true' || req?.query?.forSelect === 'true') {
    return {};
  }

  const role = user?.crmRole || user?.role || req?.headers?.['user-role'];
  const userRole = user?.role || req?.headers?.['user-role'];
  const userId = user?._id || user?.id || user?.userId || req?.headers?.['user-id'];

  const isHOD = userRole === 'HOD' || userRole === 'Head_of_Department' || (typeof userRole === 'string' && (userRole.toLowerCase() === 'hod' || userRole.toLowerCase() === 'head_of_department'));
  const isCrmAdmin = role === 'Admin' || (typeof role === 'string' && role.toLowerCase() === 'admin');
  const isSystemAdmin = userRole === 'Admin' || (typeof userRole === 'string' && userRole.toLowerCase() === 'admin');
  const isAdmin = (isCrmAdmin || isSystemAdmin) && !isHOD;

  if (!userId) return {};

  const objectIdUserId = new mongoose.Types.ObjectId(userId.toString());

  if (requestedTeamId && requestedTeamId !== 'all' && mongoose.Types.ObjectId.isValid(requestedTeamId)) {
    const team = await SalesTeam.findById(requestedTeamId).lean();
    if (team) {
      const isManager = team.managerId?.toString() === userId?.toString();
      const isMember = team.memberIds?.some(m => m?.toString() === userId?.toString());
      if (isAdmin || isManager || isMember) {
        const objectIdMemberIds = (team.memberIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
        if (team.managerId) {
          objectIdMemberIds.push(new mongoose.Types.ObjectId(team.managerId.toString()));
        }
        const orConditions = [
          { ownerId: { $in: objectIdMemberIds } },
          { createdBy: { $in: objectIdMemberIds } }
        ];
        return { $or: orConditions };
      }
    }
  }

  if (isAdmin) return {};

  const myTeams = await SalesTeam.find({
    $or: [
      { managerId: userId },
      { memberIds: userId }
    ]
  }).lean();

  const myTeamIds = myTeams.map(t => t._id);
  let visibleUserIds = [objectIdUserId];

  if (myTeams && myTeams.length > 0) {
    myTeams.forEach(team => {
      const isManager = team.managerId?.toString() === userId?.toString();
      if (isManager) {
        if (team.memberIds) {
          team.memberIds.forEach(m => visibleUserIds.push(new mongoose.Types.ObjectId(m.toString())));
        }
        if (team.managerId) {
          visibleUserIds.push(new mongoose.Types.ObjectId(team.managerId.toString()));
        }
      }
    });
  }

  const uniqueUserIds = [...new Map(visibleUserIds.map(id => [id.toString(), id])).values()];

  const orConditions = [
    { ownerId: { $in: uniqueUserIds } },
    { createdBy: { $in: uniqueUserIds } },
    { hasPlannedVisit: true },
    { status: 'sales_visit' },
    { 'plannedVisits.0': { $exists: true } }
  ];

  if (myTeamIds.length > 0) {
    orConditions.push({ referredFromTeamId: { $in: myTeamIds } });
    orConditions.push({ referredToTeamId: { $in: myTeamIds } });
  }

  return { $or: orConditions };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/crm/leads
router.get('/', async (req, res) => {
  try {
    const { status, source, referralSourceName, teamId, startDate, endDate, period, service, businessVertical, searchQuery } = req.query;
    const ownerFilter = await buildOwnerFilter(req.user, teamId, req);
    const query = { ...ownerFilter };
    
    if (searchQuery) {
      const searchOr = [
        { company: { $regex: searchQuery, $options: 'i' } },
        { firstName: { $regex: searchQuery, $options: 'i' } },
        { lastName: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { phone: { $regex: searchQuery, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    if (businessVertical && businessVertical !== 'all') {
      query.businessVertical = businessVertical;
    }
    if (status) query.status = status;
    if (source) query.source = source;
    if (service) query.interestedServices = service;
    if (referralSourceName) {
      query.referralSourceName = { $regex: referralSourceName, $options: 'i' };
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(`${startDate}T00:00:00.000Z`),
        $lte: new Date(`${endDate}T23:59:59.999Z`)
      };
    } else if (period) {
      query.period = period;
    } else {
      query.period = new Date().toISOString().substring(0, 7);
    }

    const userId = req.user?._id || req.headers['user-id'];
    console.log(`[CRM GET Leads] User: ${userId}, period: ${query.period}, teamId: ${teamId}, all: ${req.query.all}`);

    const leads = await Lead.find(query)
      .populate('ownerId', 'username first_name last_name')
      .populate('referredFromTeamId', 'nameCode teamName')
      .populate('referredToTeamId', 'nameCode teamName')
      .populate('referredByUserId', 'username first_name last_name')
      .sort({ createdAt: -1 });
      
    console.log(`[CRM GET Leads] Returning ${leads.length} leads to user ${userId}`);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('ownerId', 'username first_name last_name')
      .populate('referredFromTeamId', 'nameCode teamName')
      .populate('referredToTeamId', 'nameCode teamName')
      .populate('referredByUserId', 'username first_name last_name');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/leads/:id/refer - Transfer/Refer lead to internal team
router.put('/:id/refer', async (req, res) => {
  try {
    const { targetTeamId, fromTeamId } = req.body;
    const userId = req.user?._id || req.headers['user-id'];
    
    if (!targetTeamId) {
      return res.status(400).json({ success: false, message: 'Target team ID is required' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    lead.referredToTeamId = targetTeamId;
    if (fromTeamId) lead.referredFromTeamId = fromTeamId;
    if (userId) lead.referredByUserId = userId;
    lead.isReferral = true;
    lead.lastActivityAt = new Date();

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate('ownerId', 'username first_name last_name')
      .populate('referredFromTeamId', 'nameCode teamName')
      .populate('referredToTeamId', 'nameCode teamName')
      .populate('referredByUserId', 'username first_name last_name');

    res.json({ success: true, message: 'Lead referred successfully to target team', lead: updatedLead });
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
      ownerId: lead.ownerId,
      businessVertical: lead.businessVertical
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
      convertedFromLead: lead._id,
      businessVertical: lead.businessVertical
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
      createdBy: req.user?._id,
      convertedFromLead: lead._id,
      probability: 10,
      stageHistory: [{ stage: 'lead', enteredAt: new Date() }],
      source: lead.source,
      crateSize: lead.crateSize,
      shipper: lead.shipper,
      stuffing: lead.stuffing,
      shippingLine: lead.shippingLine,
      shipmentType: lead.shipmentType,
      pol: lead.pol,
      pod: lead.pod,
      containerType: lead.containerType,
      containerWeight: lead.containerWeight,
      containerVolume: lead.containerVolume,
      paymentTerm: lead.paymentTerm,
      detentionFreeDays: lead.detentionFreeDays,
      transitTime: lead.transitTime,
      currentFreightIndications: lead.currentFreightIndications,
      referralSourceName: lead.referralSourceName,
      monthlyVolume: lead.monthlyVolume,
      monthlyRevenue: lead.monthlyRevenue,
      businessVertical: lead.businessVertical
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

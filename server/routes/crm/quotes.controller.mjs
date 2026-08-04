import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import Quote from '../../model/crm/Quote.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';

// Ownership filter — team owner sees all member quotes, others see own team / business vertical
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
          { createdById: { $in: objectIdMemberIds } },
          { ownerId: { $in: objectIdMemberIds } }
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

  let visibleUserIds = [objectIdUserId];

  if (myTeams && myTeams.length > 0) {
    myTeams.forEach(team => {
      if (team.memberIds) {
        team.memberIds.forEach(m => visibleUserIds.push(new mongoose.Types.ObjectId(m.toString())));
      }
      if (team.managerId) {
        visibleUserIds.push(new mongoose.Types.ObjectId(team.managerId.toString()));
      }
    });
  }

  const uniqueUserIds = [...new Map(visibleUserIds.map(id => [id.toString(), id])).values()];

  const orConditions = [
    { createdById: { $in: uniqueUserIds } },
    { ownerId: { $in: uniqueUserIds } }
  ];

  return { $or: orConditions };
}

// Initialize AWS SES client (same pattern as profileCompletion.mjs)
const sesClient = new SESClient({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

const transporter = nodemailer.createTransport({
  SES: { ses: sesClient, aws: { SendRawEmailCommand } },
});

const router = express.Router();

// Helper: Generate quote number
const generateQuoteNumber = async () => {
  const count = await Quote.countDocuments({});
  return `QT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// Helper: Build professional HTML email template
const buildQuoteEmailHTML = (quote, customBody) => {
  // Build line items rows
  const lineItemsHtml = (quote.lineItems || []).map((item, idx) => `
    <tr style="border-bottom: 1px solid #edf2f7;">
      <td style="padding: 12px 16px; font-size: 13px; color: #4a5568;">${idx + 1}</td>
      <td style="padding: 12px 16px;">
        <div style="font-size: 13px; font-weight: 600; color: #2d3748;">${item.productName || '—'}</div>
        ${item.description ? `<div style="font-size: 11px; color: #a0aec0; margin-top: 2px;">${item.description}</div>` : ''}
      </td>
      <td style="padding: 12px 16px; text-align: center; font-size: 13px; color: #4a5568;">${item.hsnSac || '392310'}</td>
      <td style="padding: 12px 16px; text-align: center; font-size: 13px; color: #4a5568;">${item.quantity}</td>
      <td style="padding: 12px 16px; text-align: right; font-size: 13px; color: #4a5568;">₹${Number(item.unitPrice).toLocaleString('en-IN')}</td>
      <td style="padding: 12px 16px; text-align: center; font-size: 13px; color: #4a5568;">${item.discount ? `${item.discount}%` : '—'}</td>
      <td style="padding: 12px 16px; text-align: center; font-size: 13px; color: #4a5568;">${item.tax ? `${item.tax}%` : '—'}</td>
      <td style="padding: 12px 16px; text-align: right; font-size: 13px; font-weight: 700; color: #2d3748;">₹${Math.round(item.lineTotal).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const contactName = quote.contactId
    ? `${quote.contactId.firstName || ''} ${quote.contactId.lastName || ''}`.trim()
    : '';
  const accountName = quote.accountId?.name || '';
  const validUntil = quote.terms?.validUntil ? new Date(quote.terms.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const quoteDate = new Date(quote.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; padding: 32px 0;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #4338ca 0%, #3b82f6 50%, #0ea5e9 100%); padding: 32px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">PARAMOUNT PROPACK</div>
                  <div style="font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.75); letter-spacing: 2px; text-transform: uppercase; margin-top: 4px;">PRIVATE LIMITED</div>
                </td>
                <td align="right">
                  <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 16px; display: inline-block;">
                    <div style="font-size: 10px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px;">Quotation</div>
                    <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 2px;">${quote.quoteNumber}</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Quote Info Bar -->
        <tr>
          <td style="padding: 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 1px solid #edf2f7;">
              <tr>
                <td style="padding: 20px 0;" width="33%">
                  <div style="font-size: 10px; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Date</div>
                  <div style="font-size: 13px; color: #2d3748; font-weight: 600; margin-top: 4px;">${quoteDate}</div>
                </td>
                <td style="padding: 20px 0;" width="34%" align="center">
                  <div style="font-size: 10px; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Valid Until</div>
                  <div style="font-size: 13px; color: #2d3748; font-weight: 600; margin-top: 4px;">${validUntil}</div>
                </td>
                <td style="padding: 20px 0;" width="33%" align="right">
                  <div style="font-size: 10px; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Version</div>
                  <div style="font-size: 13px; color: #2d3748; font-weight: 600; margin-top: 4px;">v${quote.version || 1}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Customer Info -->
        <tr>
          <td style="padding: 24px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" valign="top">
                  <div style="font-size: 10px; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Prepared For</div>
                  <div style="font-size: 15px; color: #1a202c; font-weight: 700; margin-top: 6px;">${accountName || 'Customer'}</div>
                  ${contactName ? `<div style="font-size: 12px; color: #718096; margin-top: 2px;">Attn: ${contactName}</div>` : ''}
                  ${quote.billToAddress ? `<div style="font-size: 12px; color: #a0aec0; margin-top: 6px; line-height: 1.5;">${quote.billToAddress.replace(/\n/g, '<br/>')}</div>` : ''}
                </td>
                <td width="50%" valign="top" align="right">
                  <div style="font-size: 10px; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">From</div>
                  <div style="font-size: 13px; color: #2d3748; font-weight: 600; margin-top: 6px;">Paramount Propack Pvt Ltd</div>
                  <div style="font-size: 12px; color: #a0aec0; margin-top: 4px; line-height: 1.5;">A-306, Wall Street 2, Opp. Orient Club,<br/>Ellis Bridge, Ahmedabad 380006<br/>GSTIN: 24AAHCP4599D1Z8</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Custom Message -->
        <tr>
          <td style="padding: 0 40px 24px 40px;">
            <div style="background-color: #f7fafc; border-radius: 10px; padding: 20px 24px; border-left: 4px solid #4338ca;">
              <div style="font-size: 14px; color: #4a5568; line-height: 1.7; white-space: pre-wrap;">${customBody}</div>
            </div>
          </td>
        </tr>

        <!-- Line Items Table -->
        <tr>
          <td style="padding: 0 40px 8px 40px;">
            <div style="font-size: 12px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Items & Pricing</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #edf2f7; border-radius: 10px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f7fafc;">
                  <th style="padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px;">#</th>
                  <th style="padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                  <th style="padding: 10px 16px; text-align: center; font-size: 10px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px;">HSN</th>
                  <th style="padding: 10px 16px; text-align: center; font-size: 10px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                  <th style="padding: 10px 16px; text-align: right; font-size: 10px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px;">Rate</th>
                  <th style="padding: 10px 16px; text-align: center; font-size: 10px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px;">Disc</th>
                  <th style="padding: 10px 16px; text-align: center; font-size: 10px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px;">Tax</th>
                  <th style="padding: 10px 16px; text-align: right; font-size: 10px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td style="padding: 16px 40px 24px 40px;">
            <table role="presentation" width="280" cellpadding="0" cellspacing="0" align="right">
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #718096;">Subtotal</td>
                <td style="padding: 6px 0; font-size: 13px; color: #2d3748; text-align: right;">₹${Math.round(quote.subtotal).toLocaleString('en-IN')}</td>
              </tr>
              ${quote.totalDiscount > 0 ? `
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #e53e3e;">Discount</td>
                <td style="padding: 6px 0; font-size: 13px; color: #e53e3e; text-align: right;">- ₹${Math.round(quote.totalDiscount).toLocaleString('en-IN')}</td>
              </tr>` : ''}
              ${quote.totalTax > 0 ? `
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #3182ce;">Tax (GST)</td>
                <td style="padding: 6px 0; font-size: 13px; color: #3182ce; text-align: right;">+ ₹${Math.round(quote.totalTax).toLocaleString('en-IN')}</td>
              </tr>` : ''}
              <tr>
                <td colspan="2" style="padding: 0;"><div style="border-top: 2px solid #edf2f7; margin: 8px 0;"></div></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 16px; font-weight: 800; color: #1a202c;">Grand Total</td>
                <td style="padding: 6px 0; font-size: 16px; font-weight: 800; color: #1a202c; text-align: right;">₹${Math.round(quote.total).toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Terms -->
        <tr>
          <td style="padding: 0 40px 32px 40px;">
            <div style="background-color: #f7fafc; border-radius: 10px; padding: 16px 20px;">
              <div style="font-size: 11px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Terms & Conditions</div>
              <div style="font-size: 12px; color: #718096; line-height: 1.6;">
                • Payment: ${quote.terms?.paymentTerms || '100% Advance'}<br/>
                • Freight charges will be extra<br/>
                • Delivery within 10–12 working days<br/>
                • Prices quoted in INR
              </div>
            </div>
          </td>
        </tr>

        <!-- PDF Attachment Notice -->
        <tr>
          <td style="padding: 0 40px 24px 40px;">
            <div style="background: linear-gradient(135deg, #ebf8ff 0%, #e9d5ff 100%); border-radius: 10px; padding: 16px 20px; text-align: center;">
              <div style="font-size: 13px; color: #553c9a; font-weight: 600;">📎 Detailed PDF estimate is attached to this email</div>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #1a202c; padding: 24px 40px; border-radius: 0 0 16px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size: 13px; font-weight: 600; color: #ffffff;">Paramount Propack Pvt Ltd</div>
                  <div style="font-size: 11px; color: #a0aec0; margin-top: 4px;">A-306, Wall Street 2, Ellis Bridge, Ahmedabad 380006</div>
                </td>
                <td align="right">
                  <div style="font-size: 11px; color: #a0aec0;">Phone: 9924304363 / 9924330777</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// CREATE quote
router.post('/', async (req, res) => {
  try {
    const { opportunityId, accountId, contactId, title, description, lineItems = [], terms, placeOfSupply, billToAddress, shipToAddress } = req.body;

    if (!accountId || !title) {
      return res.status(400).json({ message: 'Account and title are required' });
    }

    // Sanitize optional ObjectIds to avoid BSONTypeError for empty strings
    const cleanOpportunityId = opportunityId && opportunityId.trim() ? opportunityId : undefined;
    const cleanContactId = contactId && contactId.trim() ? contactId : undefined;
    const creatorId = req.user?._id || req.user?.id || req.headers['user-id'];

    if (!creatorId) {
      return res.status(401).json({ message: 'User context is missing. Authentication required.' });
    }

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    lineItems.forEach(item => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = lineSubtotal * (item.discount / 100);
      const itemTax = (lineSubtotal - itemDiscount) * (item.tax / 100);

      item.lineTotal = lineSubtotal - itemDiscount + itemTax;
      subtotal += lineSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    });

    const total = subtotal - totalDiscount + totalTax;

    const quoteNumber = await generateQuoteNumber();

    // Fetch creator primary team vertical
    const creatorTeam = await SalesTeam.findOne({
      $or: [{ managerId: creatorId }, { memberIds: creatorId }]
    }).lean();
    const defaultVertical = creatorTeam?.businessVertical || 'Paramount';
    const finalVertical = req.body.businessVertical || defaultVertical;

    const newQuote = new Quote({
      quoteNumber,
      opportunityId: cleanOpportunityId,
      accountId,
      contactId: cleanContactId,
      title,
      description,
      lineItems,
      subtotal,
      totalDiscount,
      totalTax,
      total,
      terms,
      placeOfSupply,
      billToAddress,
      shipToAddress,
      createdById: creatorId,
      businessVertical: finalVertical
    });

    await newQuote.save();
    await newQuote.populate('createdById accountId contactId');

    res.status(201).json(newQuote);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET all quotes
router.get('/', async (req, res) => {
  try {
    const { status, accountId, opportunityId, teamId, page = 1, limit = 20 } = req.query;
    const ownerFilter = await buildOwnerFilter(req.user, teamId, req);

    let query = { ...ownerFilter };

    if (status) query.status = status;
    if (accountId) query.accountId = accountId;
    if (opportunityId) query.opportunityId = opportunityId;

    const quotes = await Quote.find(query)
      .populate('accountId', 'name')
      .populate('contactId', 'firstName lastName email')
      .populate('createdById', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Quote.countDocuments(query);

    res.json({
      quotes,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single quote
router.get('/:id', async (req, res) => {
  try {
    const ownerFilter = await buildOwnerFilter(req.user, null, req);
    const query = { _id: req.params.id, ...ownerFilter };

    const quote = await Quote.findOne(query)
      .populate('accountId')
      .populate('contactId')
      .populate('createdById')
      .populate('opportunityId');

    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    res.json(quote);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE quote
router.put('/:id', async (req, res) => {
  try {
    const ownerFilter = await buildOwnerFilter(req.user, null, req);
    const quote = await Quote.findOne({ _id: req.params.id, ...ownerFilter });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const { lineItems, terms, createNewVersion } = req.body;

    // Handle Version Control Archive
    if (createNewVersion) {
      quote.previousVersions.push({
        version: quote.version || 1,
        total: quote.total,
        createdAt: quote.updatedAt || quote.createdAt || new Date()
      });
      quote.version = (quote.version || 1) + 1;
    }

    // Recalculate totals if items changed
    if (lineItems) {
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      lineItems.forEach(item => {
        const lineSubtotal = item.quantity * item.unitPrice;
        const itemDiscount = lineSubtotal * (item.discount / 100);
        const itemTax = (lineSubtotal - itemDiscount) * (item.tax / 100);

        item.lineTotal = lineSubtotal - itemDiscount + itemTax;
        subtotal += lineSubtotal;
        totalDiscount += itemDiscount;
        totalTax += itemTax;
      });

      quote.lineItems = lineItems;
      quote.subtotal = subtotal;
      quote.totalDiscount = totalDiscount;
      quote.totalTax = totalTax;
      quote.total = subtotal - totalDiscount + totalTax;
    }

    if (terms) quote.terms = terms;
    if (req.body.title) quote.title = req.body.title;
    if (req.body.description) quote.description = req.body.description;
    if (req.body.status) quote.status = req.body.status;
    if (req.body.accountId) quote.accountId = req.body.accountId;
    if (req.body.opportunityId !== undefined) {
      quote.opportunityId = req.body.opportunityId && req.body.opportunityId.trim() ? req.body.opportunityId : undefined;
    }
    if (req.body.contactId !== undefined) {
      quote.contactId = req.body.contactId && req.body.contactId.trim() ? req.body.contactId : undefined;
    }
    if (req.body.placeOfSupply !== undefined) quote.placeOfSupply = req.body.placeOfSupply;
    if (req.body.billToAddress !== undefined) quote.billToAddress = req.body.billToAddress;
    if (req.body.shipToAddress !== undefined) quote.shipToAddress = req.body.shipToAddress;

    await quote.save();

    res.json(quote);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete quote
router.delete('/:id', async (req, res) => {
  try {
    const ownerFilter = await buildOwnerFilter(req.user, null, req);
    const deleted = await Quote.findOneAndDelete({ _id: req.params.id, ...ownerFilter });
    if (!deleted) return res.status(404).json({ message: 'Quote not found' });
    res.json({ success: true, message: 'Quote deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update quote status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    const update = { status: status };
    if (status === 'rejected' && rejectionReason) {
      update['tracking.rejectedAt'] = new Date();
      update['tracking.rejectedReason'] = rejectionReason;
    }

    const quote = await Quote.findOneAndUpdate(
      { _id: req.params.id },
      update,
      { new: true }
    );

    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    res.json(quote);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Send quote — sends email via SES with PDF attachment + updates status + audit log
router.post('/:id/send', async (req, res) => {
  try {
    const { recipientEmail, subject, body, mailClient, pdfBase64 } = req.body;
    const senderId = req.user?._id || req.user?.id || req.headers['user-id'];
    const senderUsername = req.user?.username || req.headers['username'] || '';

    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }

    const quote = await Quote.findOne({ _id: req.params.id })
      .populate('accountId')
      .populate('contactId')
      .populate('createdById');
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    let deliveryStatus = 'drafted';
    let emailError = null;

    // If mailClient is 'ses', send email server-side via AWS SES
    if (mailClient === 'ses') {
      try {
        const htmlBody = buildQuoteEmailHTML(quote, body || `Dear Customer,\n\nPlease find attached our pricing proposal for "${quote.title}" (Ref: ${quote.quoteNumber}).`);

        const mailOptions = {
          from: 'connect@surajgroupofcompanies.com',
          to: recipientEmail,
          subject: subject || `Quotation ${quote.quoteNumber}: ${quote.title}`,
          html: htmlBody,
        };

        // Attach PDF if provided from client
        if (pdfBase64) {
          // Strip data URI prefix if present (e.g. "data:application/pdf;base64,...")
          const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
          mailOptions.attachments = [{
            filename: `Quotation_${quote.quoteNumber}.pdf`,
            content: Buffer.from(base64Data, 'base64'),
            contentType: 'application/pdf',
          }];
        }

        await transporter.sendMail(mailOptions);
        deliveryStatus = 'sent';
      } catch (sesErr) {
        console.error('SES email delivery failed:', sesErr.message);
        emailError = sesErr.message;
        deliveryStatus = 'failed';
      }
    }
    // For gmail/outlook/default — email is opened client-side, status = drafted

    // Update quote status and tracking
    quote.status = 'sent';
    quote.tracking.sentAt = new Date();
    quote.tracking.sentBy = senderId;

    // Push email activity to audit log
    quote.emailHistory.push({
      sentAt: new Date(),
      sentBy: senderId,
      sentByUsername: senderUsername,
      recipientEmail,
      subject: subject || `Quotation ${quote.quoteNumber}`,
      mailClient: mailClient || 'default',
      deliveryStatus,
    });

    await quote.save();

    // Return populated quote for frontend refresh
    const populated = await Quote.findOne({ _id: quote._id })
      .populate('accountId')
      .populate('contactId')
      .populate('createdById');

    if (emailError) {
      return res.json({
        success: true,
        emailDelivered: false,
        message: `Quote marked as sent, but email delivery failed: ${emailError}`,
        quote: populated
      });
    }

    res.json({
      success: true,
      emailDelivered: mailClient === 'ses',
      message: mailClient === 'ses'
        ? `Quote ${quote.quoteNumber} emailed to ${recipientEmail} with PDF attached`
        : `Quote ${quote.quoteNumber} marked as sent to ${recipientEmail}`,
      quote: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track quote views
router.post('/:id/view', async (req, res) => {
  try {
    const quote = await Quote.findOne({ _id: req.params.id });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    quote.tracking.viewedCount = (quote.tracking.viewedCount || 0) + 1;
    quote.tracking.lastViewedAt = new Date();

    // Set to viewed status if not already
    if (quote.status === 'sent') quote.status = 'viewed';

    await quote.save();
    res.json(quote);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Convert quote to opportunity (if not already linked)
router.post('/:id/convert-to-opportunity', async (req, res) => {
  try {
    const quote = await Quote.findOne({ _id: req.params.id });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    if (quote.opportunityId) {
      return res.json({ message: 'Quote already linked to opportunity', opportunityId: quote.opportunityId });
    }

    const currentUserId = req.user?._id || req.user?.id || req.headers['user-id'];

    // Create opportunity from quote
    const newOpportunity = new Opportunity({
      name: quote.title,
      accountId: quote.accountId,
      value: quote.total,
      stage: 'opportunity',
      ownerId: currentUserId,
      createdBy: currentUserId,
      linkedQuoteId: quote._id
    });

    await newOpportunity.save();

    quote.opportunityId = newOpportunity._id;
    quote.status = 'converted';
    await quote.save();

    res.json({ success: true, opportunity: newOpportunity, quote });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

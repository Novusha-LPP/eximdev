import express from 'express';
import Quote from '../../model/crm/Quote.mjs';
import Opportunity from '../../model/crm/Opportunity.mjs';
import Account from '../../model/crm/Account.mjs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper: Generate quote number
const generateQuoteNumber = async () => {
  const count = await Quote.countDocuments({});
  return `QT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// CREATE quote
router.post('/', async (req, res) => {
  try {
    const { opportunityId, accountId, contactId, title, description, lineItems = [], terms } = req.body;

    if (!accountId || !title) {
      return res.status(400).json({ message: 'Account and title are required' });
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

    const newQuote = new Quote({
      quoteNumber,
      opportunityId,
      accountId,
      contactId,
      title,
      description,
      lineItems,
      subtotal,
      totalDiscount,
      totalTax,
      total,
      terms,
      createdById: req.userId
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
    const { status, accountId, opportunityId, page = 1, limit = 20 } = req.query;
    let query = {};

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
    const quote = await Quote.findOne({ _id: req.params.id })
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
    const quote = await Quote.findOne({ _id: req.params.id });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    const { lineItems, terms } = req.body;

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

    const updated = req.body.status ? { ...quote.toObject(), status: req.body.status } : quote;
    await quote.save();

    res.json(quote);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete quote
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Quote.findOneAndDelete({ _id: req.params.id });
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

// Send quote
router.post('/:id/send', async (req, res) => {
  try {
    const { recipientEmail } = req.body;

    const quote = await Quote.findOneAndUpdate(
      { _id: req.params.id },
      {
        status: 'sent',
        'tracking.sentAt': new Date(),
        'tracking.sentBy': req.userId
      },
      { new: true }
    );

    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    // TODO: Send email with quote PDF
    // For now, just return success
    res.json({
      success: true,
      message: `Quote ${quote.quoteNumber} sent to ${recipientEmail}`,
      quote
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

    // Create opportunity from quote
    const newOpportunity = new Opportunity({
      name: quote.title,
      accountId: quote.accountId,
      value: quote.total,
      stage: 'opportunity',
      ownerId: req.userId,
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

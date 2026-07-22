import express from 'express';
import mongoose from 'mongoose';
import PricingRequest from '../../model/crm/PricingRequest.mjs';

const router = express.Router();

// GET /api/crm/pricing-requests/assignees
router.get('/assignees', async (req, res) => {
  try {
    const User = mongoose.model('User');
    const users = await User.find({ isActive: true }, 'username first_name last_name role crmRole email')
      .sort({ username: 1 })
      .lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/pricing-requests
router.get('/', async (req, res) => {
  try {
    const role = req.user?.crmRole || req.user?.role || req.headers['user-role'];
    const userId = req.user?._id || req.user?.id || req.headers['user-id'];

    let isAccountsUser = false;
    if (userId) {
      const User = mongoose.model('User');
      const fullUser = await User.findById(userId).lean();
      isAccountsUser = fullUser?.modules?.includes('Accounts') || false;
    }

    const query = {};
    if (role !== 'Admin' && !isAccountsUser && userId) {
      query.$or = [
        { requestedBy: userId },
        { assignedTo: userId }
      ];
    }

    const requests = await PricingRequest.find(query)
      .populate('requestedBy', 'username first_name last_name email')
      .populate('assignedTo', 'username first_name last_name email')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/pricing-requests/related/:model/:id
router.get('/related/:model/:id', async (req, res) => {
  try {
    const { model, id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const requests = await PricingRequest.find({
      'relatedTo.model': model,
      'relatedTo.id': id
    })
      .populate('requestedBy', 'username first_name last_name email')
      .populate('assignedTo', 'username first_name last_name email')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/crm/pricing-requests/:id
router.get('/:id', async (req, res) => {
  try {
    const request = await PricingRequest.findById(req.params.id)
      .populate('requestedBy', 'username first_name last_name email')
      .populate('assignedTo', 'username first_name last_name email');

    if (!request) return res.status(404).json({ success: false, message: 'Pricing Request not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/pricing-requests
router.post('/', async (req, res) => {
  try {
    const { assignedTo, relatedTo, subject, description, targetPrice, crateSize, qty, additionalRequirement } = req.body;
    const requestedBy = req.user?._id || req.headers['user-id'];
    const requesterName = req.user?.username || req.headers['username'] || 'Salesperson';

    if (!assignedTo || !relatedTo || !relatedTo.model || !relatedTo.id || !subject) {
      return res.status(400).json({ success: false, message: 'Missing required fields (assignedTo, relatedTo, subject)' });
    }

    const pricingRequest = new PricingRequest({
      requestedBy,
      assignedTo,
      relatedTo,
      subject,
      description,
      targetPrice,
      crateSize,
      qty: qty ? Number(qty) : undefined,
      additionalRequirement,
      status: 'pending',
      history: [{
        action: `Pricing request created by ${requesterName}`,
        userId: requestedBy,
        userName: requesterName
      }]
    });

    await pricingRequest.save();

    // Trigger notification for assignee
    try {
      const CRMNotification = mongoose.model('CRMNotification');
      const notif = new CRMNotification({
        userId: assignedTo,
        title: 'New Pricing Request Assigned',
        message: `You have been assigned a pricing request "${subject}" by ${requesterName}.`,
        relatedId: pricingRequest._id,
        relatedModel: 'PricingRequest'
      });
      await notif.save();
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr.message);
    }

    res.status(201).json(pricingRequest);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/pricing-requests/:id
router.put('/:id', async (req, res) => {
  try {
    const { assignedTo, subject, description, targetPrice, approvedPrice, status } = req.body;
    const modifierId = req.user?._id || req.headers['user-id'];
    const modifierName = req.user?.username || req.headers['username'] || 'User';

    const pricingRequest = await PricingRequest.findById(req.params.id);
    if (!pricingRequest) return res.status(404).json({ success: false, message: 'Pricing request not found' });

    const statusChanged = status && status !== pricingRequest.status;

    // Apply updates
    if (assignedTo) pricingRequest.assignedTo = assignedTo;
    if (subject) pricingRequest.subject = subject;
    if (description) pricingRequest.description = description;
    if (targetPrice !== undefined) pricingRequest.targetPrice = targetPrice;
    if (approvedPrice !== undefined) pricingRequest.approvedPrice = approvedPrice;
    if (status) pricingRequest.status = status;

    if (statusChanged) {
      pricingRequest.history.push({
        action: `Status updated to "${status.replace('_', ' ')}" by ${modifierName}`,
        userId: modifierId,
        userName: modifierName
      });
    } else {
      pricingRequest.history.push({
        action: `Pricing request details updated by ${modifierName}`,
        userId: modifierId,
        userName: modifierName
      });
    }

    await pricingRequest.save();

    // Trigger notification to the requester on status change
    if (statusChanged) {
      try {
        const CRMNotification = mongoose.model('CRMNotification');
        const notif = new CRMNotification({
          userId: pricingRequest.requestedBy,
          title: 'Pricing Request Updated',
          message: `Your pricing request "${pricingRequest.subject}" status is now "${status.replace('_', ' ')}" (updated by ${modifierName}).`,
          relatedId: pricingRequest._id,
          relatedModel: 'PricingRequest'
        });
        await notif.save();
      } catch (notifErr) {
        console.error('Failed to create status change notification:', notifErr.message);
      }
    }

    res.json(pricingRequest);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/crm/pricing-requests/:id/remarks
router.post('/:id/remarks', async (req, res) => {
  try {
    const { text } = req.body;
    const authorId = req.user?._id || req.headers['user-id'];
    const authorName = req.user?.username || req.headers['username'] || 'User';

    if (!text) return res.status(400).json({ success: false, message: 'Remark text is required' });

    const pricingRequest = await PricingRequest.findById(req.params.id);
    if (!pricingRequest) return res.status(404).json({ success: false, message: 'Pricing request not found' });

    pricingRequest.remarks.push({
      text,
      userId: authorId,
      userName: authorName
    });

    pricingRequest.history.push({
      action: `Remark added by ${authorName}`,
      userId: authorId,
      userName: authorName
    });

    await pricingRequest.save();

    // Notify the other party
    const targetUserId = authorId.toString() === pricingRequest.requestedBy.toString()
      ? pricingRequest.assignedTo
      : pricingRequest.requestedBy;

    try {
      const CRMNotification = mongoose.model('CRMNotification');
      const notif = new CRMNotification({
        userId: targetUserId,
        title: 'New Remark on Pricing Request',
        message: `${authorName} commented: "${text.substring(0, 40)}..."`,
        relatedId: pricingRequest._id,
        relatedModel: 'PricingRequest'
      });
      await notif.save();
    } catch (notifErr) {
      console.error('Failed to create remark notification:', notifErr.message);
    }

    res.status(201).json(pricingRequest);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/crm/pricing-requests/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await PricingRequest.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Pricing request not found' });
    res.json({ success: true, message: 'Pricing request deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

import express from 'express';
import CustomerKycModel from '../../model/CustomerKyc/customerKycModel.mjs';

const router = express.Router();

// GET /prospects  — all pending/revision records
router.get('/prospects', async (req, res) => {
  try {
    const { filter } = req.query; // 'Pending' | 'Sent for revision' | undefined = all

    const query = {
      draft: 'false',
      approval: { $in: ['Pending', 'Sent for revision'] }
    };

    if (filter && ['Pending', 'Sent for revision'].includes(filter)) {
      query.approval = filter;
    }

    const data = await CustomerKycModel.find(query)
      .select('_id name_of_individual iec_no category status approval remarks approved_by createdAt updatedAt')
      .sort({ updatedAt: -1 });

    // Attach daysPending
    const now = Date.now();
    const enriched = data.map(doc => {
      const obj = doc.toObject({ virtuals: true });
      obj.daysPending = Math.floor((now - new Date(doc.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      return obj;
    });

    res.json(enriched);
  } catch (err) {
    console.error('CRM prospects GET error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /prospects/:id  — full record
router.get('/prospects/:id', async (req, res) => {
  try {
    const record = await CustomerKycModel.findOne({
      _id: req.params.id,
      draft: 'false',
      approval: { $in: ['Pending', 'Sent for revision'] }
    });
    if (!record) return res.status(404).json({ message: 'Prospect not found.' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /prospects/:id  — update prospect data (addresses, contacts, docs, etc.)
router.put('/prospects/:id', async (req, res) => {
  try {
    const record = await CustomerKycModel.findOne({ _id: req.params.id, draft: 'false' });
    if (!record) return res.status(404).json({ message: 'Record not found.' });

    // Prevent touching workflow fields directly
    const blockedFields = ['draft', 'approval', 'approved_by', '_id', '__v'];
    const updates = { ...req.body };
    blockedFields.forEach(f => delete updates[f]);

    // If "Same as Permanent Address" flag is set, auto-copy permanent → principle
    if (updates.sameAsPermanentAddress === true) {
      const src = record; // use saved values (or incoming if also in payload)
      const pa = (field) => updates[`permanent_address_${field}`] ?? src[`permanent_address_${field}`];
      updates.principle_business_address_line_1   = pa('line_1');
      updates.principle_business_address_line_2   = pa('line_2');
      updates.principle_business_address_city     = pa('city');
      updates.principle_business_address_state    = pa('state');
      updates.principle_business_address_pin_code = pa('pin_code');
      updates.principle_business_telephone        = (updates.permanent_address_telephone ?? src.permanent_address_telephone);
      updates.principle_address_email             = (updates.permanent_address_email ?? src.permanent_address_email);
    }

    Object.assign(record, updates);
    await record.save();

    res.json({ message: 'Prospect updated successfully.', data: record });
  } catch (err) {
    console.error('CRM prospects PUT error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /prospects/:id/submit  — submit for manager approval (Phase 2 gate)
router.post('/prospects/:id/submit', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });

    // ── Phase 2 completion gates ──────────────────────────────────────────
    const hasPermAddress =
      record.permanent_address_line_1 && record.permanent_address_city &&
      record.permanent_address_state  && record.permanent_address_pin_code;

    const hasPrinAddress =
      record.principle_business_address_line_1 && record.principle_business_address_city &&
      record.principle_business_address_state  && record.principle_business_address_pin_code;

    if (!hasPermAddress && !hasPrinAddress) {
      return res.status(400).json({ message: 'Please complete at least one address (Permanent or Principal Business).' });
    }
    if (!record.contacts || record.contacts.length < 1) {
      return res.status(400).json({ message: 'At least one contact person is required.' });
    }
    if (!record.pan_no || !record.pan_copy || record.pan_copy.length === 0) {
      return res.status(400).json({ message: 'PAN number and PAN copy document are required.' });
    }
    if (!record.iec_copy || record.iec_copy.length === 0) {
      return res.status(400).json({ message: 'IEC copy document is required.' });
    }

    record.approval = 'Pending';
    record.draft = 'false';
    await record.save();

    res.json({ message: 'Submitted for approval successfully.', data: record });
  } catch (err) {
    console.error('CRM prospects submit error:', err);
    res.status(500).json({ message: err.message });
  }
});



// POST /prospects/:id/approve  — approve prospect (Admin)
router.post('/prospects/:id/approve', async (req, res) => {
  try {
    const { approved_by } = req.body;
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });

    record.approval = 'Approved';
    record.approved_by = approved_by || req.headers['username'] || 'Admin';
    record.remarks = '';
    await record.save();

    res.json({ message: 'Prospect approved successfully.', data: record });
  } catch (err) {
    console.error('CRM prospects approve error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /prospects/:id/revision  — send for revision
router.post('/prospects/:id/revision', async (req, res) => {
  try {
    const { remarks } = req.body;
    if (!remarks) return res.status(400).json({ message: 'Remarks are required for revision.' });

    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });

    record.approval = 'Sent for revision';
    record.remarks = remarks;
    await record.save();

    res.json({ message: 'Sent for revision.', data: record });
  } catch (err) {
    console.error('CRM prospects revision error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /prospects/:id/escalate  — escalate to HOD
router.post('/prospects/:id/escalate', async (req, res) => {
  try {
    const { remarks } = req.body;

    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });

    record.approval = 'Pending';
    record.remarks = remarks ? `[Escalated to HOD] ${remarks}` : '[Escalated to HOD]';
    await record.save();

    res.json({ message: 'Escalated to HOD for approval.', data: record });
  } catch (err) {
    console.error('CRM prospects escalate error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /prospects/:id/hod-approve  — HOD Final Approval
router.post('/prospects/:id/hod-approve', async (req, res) => {
  try {
    const { approved_by } = req.body;
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });

    record.approval = 'Approved by HOD';
    record.approved_by = approved_by || req.headers['username'] || 'HOD';
    record.remarks = record.remarks ? record.remarks + ' | Approved by HOD' : 'Approved by HOD';
    await record.save();

    res.json({ message: 'Approved by HOD.', data: record });
  } catch (err) {
    console.error('CRM prospects HOD approve error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

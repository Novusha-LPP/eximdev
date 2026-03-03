import express from 'express';
import CustomerKycModel from '../../model/CustomerKyc/customerKycModel.mjs';

const router = express.Router();

// POST /customers/:id/open-points — add an activity entry
router.post('/customers/:id/open-points', async (req, res) => {
  try {
    const { comment_text, next_action_date, created_by } = req.body;
    if (!comment_text || comment_text.trim().length < 5)
      return res.status(400).json({ message: 'Comment must be at least 5 characters.' });

    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Customer not found.' });

    if (!record.open_points) record.open_points = [];
    const point = {
      comment_text: comment_text.trim(),
      created_by: created_by || 'System',
      created_at: new Date(),
      next_action_date: next_action_date || null,
      is_resolved: false,
      resolved_at: null,
    };
    record.open_points.push(point);
    record.last_open_point_date = new Date();
    record.markModified('open_points');
    await record.save();

    res.json({ message: 'Activity logged.', data: record.open_points });
  } catch (err) {
    console.error('CRM open-point POST error:', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /customers/:id/open-points/:pointIndex/resolve — mark resolved
router.patch('/customers/:id/open-points/:pointIndex/resolve', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Customer not found.' });

    const idx = parseInt(req.params.pointIndex, 10);
    if (!record.open_points || !record.open_points[idx])
      return res.status(404).json({ message: 'Open point not found.' });

    record.open_points[idx].is_resolved  = true;
    record.open_points[idx].resolved_at  = new Date();
    record.open_points[idx].resolved_by  = req.body.resolved_by || 'System';
    record.markModified('open_points');
    await record.save();

    res.json({ message: 'Marked as resolved.', data: record.open_points });
  } catch (err) {
    console.error('CRM open-point PATCH error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /customers/:id/open-points
router.get('/customers/:id/open-points', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id).select('open_points last_open_point_date');
    if (!record) return res.status(404).json({ message: 'Customer not found.' });

    const now = Date.now();
    const daysSinceLast = record.last_open_point_date
      ? Math.floor((now - new Date(record.last_open_point_date).getTime()) / 86400000)
      : null;

    res.json({
      open_points: record.open_points || [],
      last_open_point_date: record.last_open_point_date,
      days_since_last: daysSinceLast,
      is_stagnant: daysSinceLast !== null && daysSinceLast > 15,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/customers', async (req, res) => {
  try {
    const { search, category, dateFrom, dateTo } = req.query;

    const query = {
      draft: 'false',
      approval: { $in: ['Approved', 'Approved by HOD'] }
    };

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Date range filter (on approval / updatedAt)
    if (dateFrom || dateTo) {
      query.updatedAt = {};
      if (dateFrom) query.updatedAt.$gte = new Date(dateFrom);
      if (dateTo) query.updatedAt.$lte = new Date(dateTo);
    }

    let data = await CustomerKycModel.find(query)
      .select(
        '_id name_of_individual iec_no pan_no category status approval approved_by outstanding_limit credit_period createdAt updatedAt'
      )
      .sort({ updatedAt: -1 });

    // Text search (IEC, company name, PAN)
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      data = data.filter(d =>
        (d.name_of_individual && d.name_of_individual.toLowerCase().includes(term)) ||
        (d.iec_no && d.iec_no.toLowerCase().includes(term)) ||
        (d.pan_no && d.pan_no.toLowerCase().includes(term))
      );
    }

    res.json(data);
  } catch (err) {
    console.error('CRM customers GET error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /customers/:id  — full document
router.get('/customers/:id', async (req, res) => {
  try {
    const record = await CustomerKycModel.findOne({
      _id: req.params.id,
      draft: 'false',
      approval: { $in: ['Approved', 'Approved by HOD'] }
    });
    if (!record) return res.status(404).json({ message: 'Customer not found.' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /customers/:id  — update customer data
router.put('/customers/:id', async (req, res) => {
  try {
    const record = await CustomerKycModel.findOne({
      _id: req.params.id,
      draft: 'false',
      approval: { $in: ['Approved', 'Approved by HOD'] }
    });
    if (!record) return res.status(404).json({ message: 'Customer not found.' });

    const blockedFields = ['draft', 'approval', 'approved_by', '_id', '__v'];
    const updates = { ...req.body };
    blockedFields.forEach(f => delete updates[f]);

    Object.assign(record, updates);
    await record.save();

    res.json({ message: 'Customer record updated.', data: record });
  } catch (err) {
    console.error('CRM customers PUT error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /customers/:id/submit-final — Phase 3 final approval gate
router.post('/customers/:id/submit-final', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Customer not found.' });

    // Gate: at least 1 bank
    if (!record.banks || record.banks.length < 1) {
      return res.status(400).json({ message: 'At least one bank account is required.' });
    }
    // Gate: factory verification photos
    if (!record.factory_name_board_img || record.factory_name_board_img.length < 1) {
      return res.status(400).json({ message: 'Factory name board photo is required.' });
    }
    if (!record.factory_selfie_img || record.factory_selfie_img.length < 1) {
      return res.status(400).json({ message: 'Factory selfie photo is required.' });
    }

    // Gate: at least 2 category-specific docs
    const categoryDocFields = {
      'Individual/ Proprietary Firm': ['individual_passport_img','individual_voter_card_img','individual_driving_license_img','individual_bank_statement_img','individual_ration_card_img','individual_aadhar_card'],
      'Partnership Firm': ['partnership_registration_certificate_img','partnership_deed_img','partnership_power_of_attorney_img','partnership_valid_document','partnership_aadhar_card_front_photo','partnership_aadhar_card_back_photo','partnership_telephone_bill'],
      'Company': ['company_certificate_of_incorporation_img','company_memorandum_of_association_img','company_articles_of_association_img','company_power_of_attorney_img','company_telephone_bill_img','company_pan_allotment_letter_img'],
      'Trust Foundations': ['trust_certificate_of_registration_img','trust_power_of_attorney_img','trust_officially_valid_document_img','trust_resolution_of_managing_body_img','trust_telephone_bill_img'],
    };
    const fields = categoryDocFields[record.category] || [];
    const uploadedDocs = fields.filter(f => record[f] && record[f].length > 0).length;
    if (uploadedDocs < 2) {
      return res.status(400).json({ message: `Upload at least 2 ${record.category} documents (currently ${uploadedDocs}).` });
    }

    res.json({ message: 'Phase 3 validation passed. Record is complete.', data: { _id: record._id, approval: record.approval } });
  } catch (err) {
    console.error('CRM customers submit-final error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /customers/:id/add-factory — append factory address
router.post('/customers/:id/add-factory', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Customer not found.' });
    if (!record.factory_addresses) record.factory_addresses = [];
    record.factory_addresses.push(req.body);
    await record.save();
    res.json({ message: 'Factory address added.', data: record.factory_addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /customers/:id/factory/:factoryIndex — update factory address
router.put('/customers/:id/factory/:factoryIndex', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Customer not found.' });
    const idx = parseInt(req.params.factoryIndex, 10);
    if (!record.factory_addresses || !record.factory_addresses[idx])
      return res.status(404).json({ message: 'Factory address not found.' });
    Object.assign(record.factory_addresses[idx], req.body);
    record.markModified('factory_addresses');
    await record.save();
    res.json({ message: 'Factory updated.', data: record.factory_addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /customers/:id/factory/:factoryIndex
router.delete('/customers/:id/factory/:factoryIndex', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Customer not found.' });
    const idx = parseInt(req.params.factoryIndex, 10);
    record.factory_addresses.splice(idx, 1);
    record.markModified('factory_addresses');
    await record.save();
    res.json({ message: 'Factory removed.', data: record.factory_addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /customers/:id/add-branch — append branch
router.post('/customers/:id/add-branch', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Customer not found.' });
    if (!record.branches) record.branches = [];
    record.branches.push(req.body);
    await record.save();
    res.json({ message: 'Branch added.', data: record.branches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /customers/:id/add-bank — append bank account
router.post('/customers/:id/add-bank', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Customer not found.' });
    if (!record.banks) record.banks = [];
    record.banks.push(req.body);
    await record.save();
    res.json({ message: 'Bank added.', data: record.banks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;


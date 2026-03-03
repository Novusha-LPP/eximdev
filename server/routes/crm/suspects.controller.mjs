import express from 'express';
import CustomerKycModel from '../../model/CustomerKyc/customerKycModel.mjs';

const router = express.Router();

// GET /suspects/check-iec/:iec  — real-time IEC availability check
router.get('/suspects/check-iec/:iec', async (req, res) => {
  try {
    const iec = req.params.iec.toUpperCase().trim();
    if (!iec || iec.length !== 10 || !/^[A-Z0-9]{10}$/.test(iec)) {
      return res.json({ success: true, available: false, message: 'Invalid IEC format' });
    }
    const existing = await CustomerKycModel.findOne({ iec_no: iec }).select('_id name_of_individual approval');
    return res.json({
      success: true,
      available: !existing,
      message: existing ? 'IEC number already exists' : 'IEC number is available',
      existingRecord: existing ? { id: existing._id, name: existing.name_of_individual, approval: existing.approval } : null
    });
  } catch (err) {
    console.error('IEC check error:', err);
    res.status(500).json({ success: false, message: 'Error checking IEC availability' });
  }
});

// GET /suspects  — all draft records
router.get('/suspects', async (req, res) => {
  try {
    const data = await CustomerKycModel.find({ draft: 'true' })
      .select('_id name_of_individual iec_no category status createdAt updatedAt')
      .sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    console.error('CRM suspects GET error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /suspects  — create draft (Phase 1, 4 fields only)
router.post('/suspects', async (req, res) => {
  try {
    const { name_of_individual, iec_no, category, status } = req.body;

    if (!name_of_individual || !iec_no || !category || !status) {
      return res.status(400).json({ message: 'name_of_individual, iec_no, category, and status are required.' });
    }

    // Check IEC uniqueness
    const existing = await CustomerKycModel.findOne({ iec_no: iec_no.toUpperCase() });
    if (existing) {
      return res.status(409).json({ message: 'A record with this IEC number already exists.' });
    }

    const record = new CustomerKycModel({
      name_of_individual,
      iec_no: iec_no.toUpperCase(),
      category,
      status,
      draft: 'true',
      approval: 'Pending'
    });

    await record.save();
    res.status(201).json({ message: 'Suspect created successfully.', data: record });
  } catch (err) {
    console.error('CRM suspects POST error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A record with this IEC number already exists.' });
    }
    res.status(500).json({ message: err.message });
  }
});

// PUT /suspects/:id  — update draft
router.put('/suspects/:id', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    if (record.draft !== 'true') {
      return res.status(400).json({ message: 'Only draft records can be edited here.' });
    }

    const allowedFields = ['name_of_individual', 'iec_no', 'category', 'status'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) record[field] = req.body[field];
    });

    if (req.body.iec_no) record.iec_no = req.body.iec_no.toUpperCase();

    await record.save();
    res.json({ message: 'Draft updated successfully.', data: record });
  } catch (err) {
    console.error('CRM suspects PUT error:', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /suspects/:id  — delete draft only
router.delete('/suspects/:id', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    if (record.draft !== 'true') {
      return res.status(400).json({ message: 'Only draft records can be deleted.' });
    }

    await CustomerKycModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Draft deleted successfully.' });
  } catch (err) {
    console.error('CRM suspects DELETE error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /suspects/:id/submit  — move to prospects (draft=false, approval=Pending)
router.post('/suspects/:id/submit', async (req, res) => {
  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    if (record.draft !== 'true') {
      return res.status(400).json({ message: 'Record is already submitted.' });
    }

    record.draft = 'false';
    record.approval = 'Pending';
    await record.save();

    res.json({ message: 'Submitted for approval successfully.', data: record });
  } catch (err) {
    console.error('CRM suspects submit error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

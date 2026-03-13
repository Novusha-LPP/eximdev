import express from 'express';
import JobModel from '../../model/jobModel.mjs';
import ChargeHeadModel from '../../model/ChargeHead.mjs';

const router = express.Router();

// --- CHARGE HEADS API ---

router.get('/charge-heads', async (req, res) => {
  try {
    const { search } = req.query;
    let query = { isActive: true };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    const heads = await ChargeHeadModel.find(query).sort({ isSystem: -1, name: 1 });
    res.json({ success: true, data: heads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/charge-heads', async (req, res) => {
  try {
    const { name, category } = req.body;
    
    // Check dupe (case insensitive)
    const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Charge head already exists" });
    }

    const newHead = new ChargeHeadModel({ name, category, isSystem: false });
    await newHead.save();
    res.json({ success: true, data: newHead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Seed API (optional helper to initialize system charges)
router.post('/charge-heads/seed', async (req, res) => {
  try {
    const defaultCharges = [
      { name: 'EDI CHARGES', category: 'Service Charge', isSystem: true },
      { name: 'ODEX INDIA SOLUTIONS PVT LTD', category: 'Reimbursement', isSystem: true },
      { name: 'HASTI PETRO CHEMICALS & SHIPPING LTD - IMPORT', category: 'Freight', isSystem: true },
      { name: 'CONTAINER CORPN OF INDIA LTD.', category: 'Freight', isSystem: true },
      { name: 'SR CONTAINER CARRIERS', category: 'Transport', isSystem: true },
      { name: 'BOND PAPER EXP.', category: 'Document', isSystem: true },
      { name: 'THAR LOGISTICS', category: 'Transport', isSystem: true },
      { name: 'CUSTOMS DUTY', category: 'Customs', isSystem: true },
      { name: 'LABOUR & MISC CHARGES', category: 'Miscellaneous', isSystem: true },
      { name: 'OTHER DOCUMENT', category: 'Document', isSystem: true },
    ];

    let addedCount = 0;
    for (const charge of defaultCharges) {
      const existing = await ChargeHeadModel.findOne({ name: charge.name });
      if (!existing) {
        await ChargeHeadModel.create(charge);
        addedCount++;
      }
    }
    
    res.json({ success: true, message: `Seeded ${addedCount} new system charges.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// --- CHARGES API (Embedded in JobModel) ---

router.get('/charges', async (req, res) => {
  try {
    const { parentId, parentModule } = req.query;
    if (!parentId || parentModule !== 'Job') {
      return res.status(400).json({ success: false, message: 'Valid Job parentId required' });
    }
    const job = await JobModel.findById(parentId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    
    res.json({ success: true, data: job.charges || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/charges', async (req, res) => {
  try {
    const { parentId, parentModule } = req.body;
    if (!parentId || parentModule !== 'Job') return res.status(400).json({ success: false, message: 'Valid Job parentId required' });
    
    const job = await JobModel.findById(parentId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    job.charges.push(req.body);
    await job.save();
    
    const newCharge = job.charges[job.charges.length - 1];
    res.json({ success: true, data: newCharge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add multiple charges at once
router.post('/charges/bulk', async (req, res) => {
  try {
    const { charges } = req.body;
    if (!Array.isArray(charges) || charges.length === 0) {
      return res.status(400).json({ success: false, message: "Expected 'charges' array." });
    }
    
    const parentId = charges[0].parentId;
    const job = await JobModel.findById(parentId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    charges.forEach(chargeData => job.charges.push(chargeData));
    await job.save();
    
    const savedCharges = job.charges.slice(-charges.length);
    res.json({ success: true, data: savedCharges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/charges/:id', async (req, res) => {
  try {
    const job = await JobModel.findOne({ 'charges._id': req.params.id });
    if (!job) return res.status(404).json({ success: false, message: 'Charge not found' });
    
    const charge = job.charges.id(req.params.id);
    
    // Assign fields
    if (req.body.revenue) {
        charge.revenue = { ...(charge.revenue ? charge.revenue.toObject() : {}), ...req.body.revenue };
    }
    if (req.body.cost) {
        charge.cost = { ...(charge.cost ? charge.cost.toObject() : {}), ...req.body.cost };
    }
    
    // Other top level fields
    const excludedFields = ['revenue', 'cost', '_id', 'createdAt', 'updatedAt', 'parentId', 'parentModule'];
    for (const key of Object.keys(req.body)) {
        if (!excludedFields.includes(key)) {
            charge[key] = req.body[key];
        }
    }

    await job.save();
    res.json({ success: true, data: charge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/charges/:id', async (req, res) => {
  try {
    const job = await JobModel.findOne({ 'charges._id': req.params.id });
    if (!job) return res.status(404).json({ success: false, message: 'Charge not found' });
    
    job.charges.pull(req.params.id);
    await job.save();
    
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
     res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

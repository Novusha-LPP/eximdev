import express from 'express';
import JobModel from '../../model/jobModel.mjs';
import ChargeHeadModel from '../../model/ChargeHead.mjs';
import verifyToken from '../../middleware/authMiddleware.mjs';

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
    const { name, category, sacHsn } = req.body;
    
    // Check dupe (case insensitive)
    const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Charge head already exists" });
    }

    const newHead = new ChargeHeadModel({ name, category, sacHsn, isSystem: false });
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

router.put('/charge-heads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, sacHsn, isActive } = req.body;
    
    // Optional: check dupe name if name is provided
    if (name) {
      const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Charge head with this name already exists" });
      }
    }

    const updated = await ChargeHeadModel.findByIdAndUpdate(
      id,
      { $set: { name, category, sacHsn, isActive } },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Charge head not found' });
    }
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/charge-heads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ChargeHeadModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Charge head not found' });
    }
    res.json({ success: true, message: 'Charge head deleted' });
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

router.put('/charges/:id', verifyToken, async (req, res) => {
  try {
    const job = await JobModel.findOne({ 'charges._id': req.params.id });
    if (!job) return res.status(404).json({ success: false, message: 'Charge not found' });
    
    const charge = job.charges.id(req.params.id);

    const role = (req.user.role || "").toLowerCase();
    const isAuthorized = role === 'admin' || role === 'head_of_department' || role === 'hod';

    // If locked and not authorized, we only allow updates to NON-COST fields
    const isLocked = (charge.payment_request_no || charge.purchase_book_no) && !isAuthorized;
    
    // Assign fields
    if (req.body.revenue) {
        charge.revenue = { ...(charge.revenue ? charge.revenue.toObject() : {}), ...req.body.revenue };
    }
    
    if (req.body.cost) {
        if (isLocked) {
            // Allow updating attachments even if locked
            if (req.body.cost.url) {
                const currentCost = charge.cost ? charge.cost.toObject() : {};
                charge.cost = { ...currentCost, url: req.body.cost.url };
            }
        } else {
            charge.cost = { ...(charge.cost ? charge.cost.toObject() : {}), ...req.body.cost };
        }
    }
    
    // Other top level fields
    const excludedFields = ['revenue', 'cost', '_id', 'createdAt', 'updatedAt', 'parentId', 'parentModule', 'payment_request_no', 'purchase_book_no'];
    for (const key of Object.keys(req.body)) {
      if (!excludedFields.includes(key)) {
        if (isLocked && (key === 'payment_request_no' || key === 'purchase_book_no' || key === 'payment_request_status' || key === 'purchase_book_status')) {
            // Skip
        } else {
            charge[key] = req.body[key];
        }
      }
    }
    await job.save();
    res.json({ success: true, data: charge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/charges/:id', verifyToken, async (req, res) => {
  try {
    const job = await JobModel.findOne({ 'charges._id': req.params.id });
    if (!job) return res.status(404).json({ success: false, message: 'Charge not found' });
    
    const charge = job.charges.id(req.params.id);

    // Check if locked
    const isLocked = charge.payment_request_no || charge.purchase_book_no;
    const isAuthorized = req.user.role === 'Admin' || req.user.role === 'Head_of_Department';

    if (isLocked && !isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'This charge is locked because a Payment Request or Purchase Book number has been generated. Only Admins or HODs can delete it.' 
      });
    }

    job.charges.pull(req.params.id);
    await job.save();
    
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
     res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

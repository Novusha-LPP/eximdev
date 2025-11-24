// routes/master.js
import express from "express";
import MasterType from "../../model/accounts/MasterType.js";
import AccountEntry from "../../model/accounts/AccountEntry.js";

const router = express.Router();

// ==================== MASTER TYPES ROUTES ====================

// Get all master types
router.get('/master-types', async (req, res) => {
  try {
    const masterTypes = await MasterType.find({ isActive: true }).sort({ name: 1 });
    res.json(masterTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new master type
router.post('/master-types', async (req, res) => {
  try {
    const { name, icon } = req.body;
    
    const existingMasterType = await MasterType.findOne({ name, isActive: true });
    if (existingMasterType) {
      return res.status(400).json({ message: 'Master type already exists' });
    }

    const masterType = new MasterType({
      name,
      icon: icon || 'Business',
      fields: [], // No custom fields
      isActive: true
    });
    
    const newMasterType = await masterType.save();
    res.status(201).json(newMasterType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update master type
router.put('/master-types/:id', async (req, res) => {
  try {
    const { name, icon } = req.body;
    const masterType = await MasterType.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        icon,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json(masterType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete master type (soft delete)
router.delete('/master-types/:id', async (req, res) => {
  try {
    // Check if any entries use this master type
    const entries = await AccountEntry.find({ masterTypeId: req.params.id });
    if (entries.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete master type with existing entries' 
      });
    }

    const masterType = await MasterType.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json({ message: 'Master type deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== MASTER ENTRIES ROUTES ====================

// Create new entry
router.post('/masters', async (req, res) => {
  try {
    const { masterType, defaultFields } = req.body;
    
    let masterTypeDoc = await MasterType.findOne({ name: masterType, isActive: true });
    if (!masterTypeDoc) {
      return res.status(404).json({ message: 'Master type not found' });
    }

    const accountEntry = new AccountEntry({
      masterTypeId: masterTypeDoc._id,
      masterTypeName: masterType,
      defaultFields: {
        ...defaultFields,
        isPaid: false,
        paymentStatus: 'unpaid',
        paymentDate: null
      }
    });

    const newEntry = await accountEntry.save();
    await newEntry.populate('masterTypeId');
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all entries
router.get('/masters', async (req, res) => {
  try {
    const entries = await AccountEntry.find()
      .populate('masterTypeId')
      .sort({ 'defaultFields.dueDate': -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get entries by master type
router.get('/masters/type/:masterType', async (req, res) => {
  try {
    const entries = await AccountEntry.find({ 
      masterTypeName: req.params.masterType 
    }).populate('masterTypeId').sort({ 'defaultFields.dueDate': -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single entry
router.get('/masters/:id', async (req, res) => {
  try {
    const entry = await AccountEntry.findById(req.params.id).populate('masterTypeId');
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update entry
router.put('/masters/:id', async (req, res) => {
  try {
    const { defaultFields } = req.body;
    const entry = await AccountEntry.findByIdAndUpdate(
      req.params.id,
      {
        defaultFields,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('masterTypeId');
    
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete entry
router.delete('/masters/:id', async (req, res) => {
  try {
    const entry = await AccountEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark payment as done
router.post('/masters/:id/mark-paid', async (req, res) => {
  try {
    const entry = await AccountEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    
    if (entry.defaultFields.isPaid) {
      return res.status(400).json({ message: 'Payment already recorded' });
    }

    // Update current entry
    entry.defaultFields.isPaid = true;
    entry.defaultFields.paymentStatus = 'paid';
    entry.defaultFields.paymentDate = new Date();
    await entry.save();

    // Generate next month's entry
    const nextDueDate = new Date(entry.defaultFields.dueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    const nextEntry = new AccountEntry({
      masterTypeId: entry.masterTypeId,
      masterTypeName: entry.masterTypeName,
      defaultFields: {
        companyName: entry.defaultFields.companyName,
        address: entry.defaultFields.address,
        phoneNumber: entry.defaultFields.phoneNumber,
        email: entry.defaultFields.email,
        gstNumber: entry.defaultFields.gstNumber,
        dueDate: nextDueDate,
        amount: entry.defaultFields.amount,
        description: entry.defaultFields.description,
        documents: entry.defaultFields.documents,
        isPaid: false,
        paymentStatus: 'unpaid',
        paymentDate: null
      }
    });

    const newEntry = await nextEntry.save();
    await entry.populate('masterTypeId');
    await newEntry.populate('masterTypeId');

    res.json({ 
      updated: entry, 
      nextMonth: newEntry,
      message: 'Payment marked and next month entry created'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;

// routes/master.js
import express from "express";
import MasterType from "../../model/accounts/MasterType.js";
import AccountEntry from "../../model/accounts/AccountEntry.js";

const router = express.Router();

// MASTER TYPES ROUTES
// Get all master types (for dropdown selection)
router.get('/master-types', async (req, res) => {
  try {
    const masterTypes = await MasterType.find({ isActive: true }).sort({ name: 1 });
    res.json(masterTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific master type
router.get('/master-types/:id', async (req, res) => {
  try {
    const masterType = await MasterType.findById(req.params.id);
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json(masterType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new master type (structure/template)
router.post('/master-types', async (req, res) => {
  try {
    const { name, fields } = req.body;
    
    // Check if master type already exists
    const existingMasterType = await MasterType.findOne({ name, isActive: true });
    if (existingMasterType) {
      return res.status(400).json({ message: 'Master type already exists' });
    }

    const masterType = new MasterType({
      name,
      fields: fields || [],
      isActive: true
    });
    
    const newMasterType = await masterType.save();
    res.status(201).json(newMasterType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a master type structure
router.put('/master-types/:id', async (req, res) => {
  try {
    const { name, fields } = req.body;
    const masterType = await MasterType.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        fields,
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

// Delete a master type (soft delete)
router.delete('/master-types/:id', async (req, res) => {
  try {
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

// MASTER DATA ENTRIES ROUTES
// Create a new master entry (actual data)
router.post('/masters', async (req, res) => {
  try {
    const { masterType, defaultFields, customFields } = req.body;
    
    // Find or create master type if it doesn't exist
    let masterTypeDoc = await MasterType.findOne({ name: masterType, isActive: true });
    if (!masterTypeDoc) {
      // Create new master type with custom fields structure
      masterTypeDoc = new MasterType({
        name: masterType,
        fields: customFields.map(cf => ({
          name: cf.name,
          type: cf.type,
          required: cf.required || false
        })),
        isActive: true
      });
      await masterTypeDoc.save();
    }

    // Create the actual master entry
    const accountEntry = new AccountEntry({
      masterTypeId: masterTypeDoc._id,
      masterTypeName: masterType,
      defaultFields: {
        companyName: defaultFields.companyName,
        address: defaultFields.address,
        billingDate: defaultFields.billingDate,
        dueDate: defaultFields.dueDate,
        reminder: defaultFields.reminder
      },
      customFields: customFields.map(cf => ({
        name: cf.name,
        value: cf.value,
        type: cf.type,
        required: cf.required || false
      }))
    });

    const newEntry = await accountEntry.save();
    await newEntry.populate('masterTypeId');
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all master entries
router.get('/masters', async (req, res) => {
  try {
    const entries = await AccountEntry.find().populate('masterTypeId').sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get master entries by master type
router.get('/masters/type/:masterType', async (req, res) => {
  try {
    const masterType = req.params.masterType;
    const entries = await AccountEntry.find({ 
      masterTypeName: masterType 
    }).populate('masterTypeId').sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific master entry
router.get('/masters/:id', async (req, res) => {
  try {
    const entry = await AccountEntry.findById(req.params.id).populate('masterTypeId');
    if (!entry) return res.status(404).json({ message: 'Master entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a master entry
router.put('/masters/:id', async (req, res) => {
  try {
    const { defaultFields, customFields } = req.body;
    const entry = await AccountEntry.findByIdAndUpdate(
      req.params.id,
      {
        defaultFields,
        customFields,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('masterTypeId');
    
    if (!entry) return res.status(404).json({ message: 'Master entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a master entry
router.delete('/masters/:id', async (req, res) => {
  try {
    const entry = await AccountEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Master entry not found' });
    res.json({ message: 'Master entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADDITIONAL UTILITY ROUTES
// Get master type structure by name (for form building)
router.get('/master-types/by-name/:name', async (req, res) => {
  try {
    const masterType = await MasterType.findOne({ 
      name: req.params.name, 
      isActive: true 
    });
    if (!masterType) return res.status(404).json({ message: 'Master type not found' });
    res.json(masterType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search masters by company name
router.get('/masters/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const entries = await AccountEntry.find({
      'defaultFields.companyName': { $regex: query, $options: 'i' }
    }).populate('masterTypeId').sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

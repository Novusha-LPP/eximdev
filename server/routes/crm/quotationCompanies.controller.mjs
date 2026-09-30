import express from 'express';
import QuotationCompany from '../../model/crm/QuotationCompany.mjs';

const router = express.Router();

// GET all quotation companies
router.get('/', async (req, res) => {
  try {
    const companies = await QuotationCompany.find().sort({ isDefault: -1, createdAt: -1 }).lean();
    return res.json(companies);
  } catch (err) {
    console.error('Error fetching quotation companies:', err);
    return res.status(500).json({ message: 'Failed to fetch quotation companies', error: err.message });
  }
});

// GET single company by ID
router.get('/:id', async (req, res) => {
  try {
    const company = await QuotationCompany.findById(req.params.id).lean();
    if (!company) {
      return res.status(404).json({ message: 'Quotation company not found' });
    }
    return res.json(company);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch company', error: err.message });
  }
});

// CREATE company profile
router.post('/', async (req, res) => {
  try {
    const { name, tagline, logoUrl, address, gstin, pan, cin, email, phone, website, bankDetails, authorizedSignatory, isDefault } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    // If setting as default, unset previous defaults
    if (isDefault) {
      await QuotationCompany.updateMany({}, { isDefault: false });
    }

    const userId = req.user?._id || req.user?.id || req.headers['user-id'];

    const newCompany = new QuotationCompany({
      name,
      tagline: tagline || '',
      logoUrl: logoUrl || '',
      address: address || {},
      gstin: gstin || '',
      pan: pan || '',
      cin: cin || '',
      email: email || '',
      phone: phone || '',
      website: website || '',
      bankDetails: bankDetails || {},
      authorizedSignatory: authorizedSignatory || {},
      isDefault: isDefault || false,
      createdById: userId || undefined
    });

    await newCompany.save();

    // If first company created, make it default automatically
    const count = await QuotationCompany.countDocuments();
    if (count === 1) {
      newCompany.isDefault = true;
      await newCompany.save();
    }

    return res.status(201).json(newCompany);
  } catch (err) {
    console.error('Error creating quotation company:', err);
    return res.status(500).json({ message: 'Failed to create quotation company', error: err.message });
  }
});

// UPDATE company profile
router.put('/:id', async (req, res) => {
  try {
    const { name, tagline, logoUrl, address, gstin, pan, cin, email, phone, website, bankDetails, authorizedSignatory, isDefault } = req.body;

    if (isDefault) {
      await QuotationCompany.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    const updated = await QuotationCompany.findByIdAndUpdate(
      req.params.id,
      {
        name,
        tagline,
        logoUrl,
        address,
        gstin,
        pan,
        cin,
        email,
        phone,
        website,
        bankDetails,
        authorizedSignatory,
        isDefault
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Quotation company not found' });
    }

    return res.json(updated);
  } catch (err) {
    console.error('Error updating quotation company:', err);
    return res.status(500).json({ message: 'Failed to update quotation company', error: err.message });
  }
});

// DELETE company profile
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await QuotationCompany.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Quotation company not found' });
    }
    return res.json({ message: 'Quotation company deleted successfully', _id: req.params.id });
  } catch (err) {
    console.error('Error deleting quotation company:', err);
    return res.status(500).json({ message: 'Failed to delete quotation company', error: err.message });
  }
});

export default router;

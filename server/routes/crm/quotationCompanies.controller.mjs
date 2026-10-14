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

// ──────────────────────────────────────────────
// Validation Helpers (Phone, Pincode, PAN, GSTIN, Email, Website, IFSC)
// ──────────────────────────────────────────────
export const isValidPhone = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  const str = val.trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  // Normalized 10-digit check (strip leading +91, 91, or 0 if 11-12 digits)
  const normalized = digits.replace(/^91(?=\d{10})|^0(?=\d{10})/, '');
  if (normalized.length === 10 && /^[6-9]\d{9}$/.test(normalized)) return true;
  // Landline with STD code (10-11 digits starting with 0)
  if (digits.length >= 10 && digits.length <= 11 && digits.startsWith('0')) return true;
  // Standard general phone pattern: +? digits, spaces, hyphens, parens
  return /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/.test(str);
};

export const isValidPincode = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  return /^[1-9][0-9]{5}$/.test(val.trim());
};

export const isValidPAN = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val.trim().toUpperCase());
};

export const isValidGSTIN = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val.trim().toUpperCase());
};

export const isValidEmail = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
};

export const isValidWebsite = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  return /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{2,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/i.test(val.trim());
};

export const isValidIFSC = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val.trim().toUpperCase());
};

export const validateCompanyEntity = (data) => {
  const errors = {};

  // 1. Company Name (Required)
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) {
    errors.name = 'Company Name is required';
  }

  // 2. Phone
  if (data.phone !== undefined && data.phone !== null) {
    const rawPhone = String(data.phone).trim();
    if (rawPhone && !isValidPhone(rawPhone)) {
      errors.phone = 'Invalid phone number. Must be a valid 10-digit mobile or standard landline number (e.g. +91 9924304363, 079-26561234)';
    }
  }

  // 3. Pincode
  const rawPincode = data.address?.pincode !== undefined && data.address?.pincode !== null ? String(data.address.pincode).trim() : '';
  if (rawPincode && !isValidPincode(rawPincode)) {
    errors.pincode = 'Invalid pincode. Must be exactly 6 numeric digits and cannot start with 0 (e.g. 380006)';
  }

  // 4. PAN
  let panClean = '';
  if (data.pan !== undefined && data.pan !== null) {
    panClean = String(data.pan).trim().toUpperCase();
    if (panClean && !isValidPAN(panClean)) {
      errors.pan = 'Invalid PAN format. Must be 10 characters: 5 letters, 4 digits, 1 letter (e.g. AAHCP4599D)';
    }
  }

  // 5. GSTIN
  let gstinClean = '';
  if (data.gstin !== undefined && data.gstin !== null) {
    gstinClean = String(data.gstin).trim().toUpperCase();
    if (gstinClean) {
      if (!isValidGSTIN(gstinClean)) {
        errors.gstin = 'Invalid GSTIN format. Must be 15 characters (e.g. 24AAHCP4599D1Z8)';
      } else if (panClean && isValidPAN(panClean)) {
        const panInGst = gstinClean.substring(2, 12);
        if (panInGst !== panClean) {
          errors.gstin = `GSTIN PAN segment (${panInGst}) does not match entered PAN (${panClean})`;
        }
      }
    }
  }

  // 6. Email
  if (data.email !== undefined && data.email !== null) {
    const rawEmail = String(data.email).trim().toLowerCase();
    if (rawEmail && !isValidEmail(rawEmail)) {
      errors.email = 'Invalid email address format (e.g. sales@company.com)';
    }
  }

  // 7. Website
  if (data.website !== undefined && data.website !== null) {
    const rawWebsite = String(data.website).trim();
    if (rawWebsite && !isValidWebsite(rawWebsite)) {
      errors.website = 'Invalid website URL format (e.g. www.company.com or https://company.com)';
    }
  }

  // 8. IFSC
  const rawIfsc = data.bankDetails?.ifscCode !== undefined && data.bankDetails?.ifscCode !== null ? String(data.bankDetails.ifscCode).trim().toUpperCase() : '';
  if (rawIfsc && !isValidIFSC(rawIfsc)) {
    errors.ifsc = "Invalid IFSC Code. Must be 11 characters: 4 letters, 5th character '0', and 6 alphanumeric characters (e.g. HDFC0001234)";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// CREATE company profile
router.post('/', async (req, res) => {
  try {
    const validation = validateCompanyEntity(req.body);
    if (!validation.isValid) {
      const firstErrorMessage = Object.values(validation.errors)[0];
      return res.status(400).json({ 
        message: firstErrorMessage || 'Validation failed for company profile', 
        errors: validation.errors 
      });
    }

    const { name, tagline, logoUrl, address, gstin, pan, cin, email, phone, website, bankDetails, authorizedSignatory, isDefault } = req.body;

    // If setting as default, unset previous defaults
    if (isDefault) {
      await QuotationCompany.updateMany({}, { isDefault: false });
    }

    const userId = req.user?._id || req.user?.id || req.headers['user-id'];

    const newCompany = new QuotationCompany({
      name: name.trim(),
      tagline: (tagline || '').trim(),
      logoUrl: logoUrl || '',
      address: {
        street: (address?.street || '').trim(),
        city: (address?.city || '').trim(),
        state: (address?.state || '').trim(),
        pincode: (address?.pincode || '').trim(),
        country: (address?.country || 'India').trim()
      },
      gstin: (gstin || '').trim().toUpperCase(),
      pan: (pan || '').trim().toUpperCase(),
      cin: (cin || '').trim().toUpperCase(),
      email: (email || '').trim().toLowerCase(),
      phone: (phone || '').trim(),
      website: (website || '').trim(),
      bankDetails: {
        bankName: (bankDetails?.bankName || '').trim(),
        accountName: (bankDetails?.accountName || '').trim(),
        accountNumber: (bankDetails?.accountNumber || '').trim(),
        ifscCode: (bankDetails?.ifscCode || '').trim().toUpperCase(),
        swiftCode: (bankDetails?.swiftCode || '').trim().toUpperCase(),
        branch: (bankDetails?.branch || '').trim()
      },
      authorizedSignatory: {
        name: (authorizedSignatory?.name || '').trim(),
        designation: (authorizedSignatory?.designation || '').trim(),
        signatureUrl: authorizedSignatory?.signatureUrl || ''
      },
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
    const validation = validateCompanyEntity(req.body);
    if (!validation.isValid) {
      const firstErrorMessage = Object.values(validation.errors)[0];
      return res.status(400).json({ 
        message: firstErrorMessage || 'Validation failed for company profile', 
        errors: validation.errors 
      });
    }

    const { name, tagline, logoUrl, address, gstin, pan, cin, email, phone, website, bankDetails, authorizedSignatory, isDefault } = req.body;

    if (isDefault) {
      await QuotationCompany.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    const updated = await QuotationCompany.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        tagline: (tagline || '').trim(),
        logoUrl: logoUrl || '',
        address: {
          street: (address?.street || '').trim(),
          city: (address?.city || '').trim(),
          state: (address?.state || '').trim(),
          pincode: (address?.pincode || '').trim(),
          country: (address?.country || 'India').trim()
        },
        gstin: (gstin || '').trim().toUpperCase(),
        pan: (pan || '').trim().toUpperCase(),
        cin: (cin || '').trim().toUpperCase(),
        email: (email || '').trim().toLowerCase(),
        phone: (phone || '').trim(),
        website: (website || '').trim(),
        bankDetails: {
          bankName: (bankDetails?.bankName || '').trim(),
          accountName: (bankDetails?.accountName || '').trim(),
          accountNumber: (bankDetails?.accountNumber || '').trim(),
          ifscCode: (bankDetails?.ifscCode || '').trim().toUpperCase(),
          swiftCode: (bankDetails?.swiftCode || '').trim().toUpperCase(),
          branch: (bankDetails?.branch || '').trim()
        },
        authorizedSignatory: {
          name: (authorizedSignatory?.name || '').trim(),
          designation: (authorizedSignatory?.designation || '').trim(),
          signatureUrl: authorizedSignatory?.signatureUrl || ''
        },
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

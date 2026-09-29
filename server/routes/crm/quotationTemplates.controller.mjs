import express from 'express';
import QuotationTemplate from '../../model/crm/QuotationTemplate.mjs';
import QuotationCompany from '../../model/crm/QuotationCompany.mjs';

const router = express.Router();

// GET all quotation templates (with populated companyId)
router.get('/', async (req, res) => {
  try {
    const templates = await QuotationTemplate.find()
      .populate('companyId')
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
    return res.json(templates);
  } catch (err) {
    console.error('Error fetching quotation templates:', err);
    return res.status(500).json({ message: 'Failed to fetch quotation templates', error: err.message });
  }
});

// GET single template
router.get('/:id', async (req, res) => {
  try {
    const template = await QuotationTemplate.findById(req.params.id)
      .populate('companyId')
      .lean();
    if (!template) {
      return res.status(404).json({ message: 'Quotation template not found' });
    }
    return res.json(template);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch template', error: err.message });
  }
});

// CREATE quotation template
router.post('/', async (req, res) => {
  try {
    const { templateName, companyId, description, category, templateStyle, customColumns = [], defaultLineItems = [], isDefault } = req.body;

    if (!templateName || !templateName.trim()) {
      return res.status(400).json({ message: 'Template name is required' });
    }
    if (!companyId) {
      return res.status(400).json({ message: 'Company selection is required for a quotation template' });
    }

    // Verify company exists
    const companyExists = await QuotationCompany.findById(companyId);
    if (!companyExists) {
      return res.status(400).json({ message: 'Selected company does not exist' });
    }

    if (isDefault) {
      await QuotationTemplate.updateMany({}, { isDefault: false });
    }

    const userId = req.user?._id || req.user?.id || req.headers['user-id'];
    const styleData = templateStyle || {};

    const newTemplate = new QuotationTemplate({
      templateName,
      companyId,
      description: description || '',
      category: category || 'general',
      templateStyle: styleData,
      customColumns: customColumns || [],
      defaultLineItems: defaultLineItems || [],
      isDefault: isDefault || false,
      createdById: userId || undefined
    });

    await newTemplate.save();
    const populated = await QuotationTemplate.findById(newTemplate._id).populate('companyId');

    return res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating quotation template:', err);
    return res.status(500).json({ message: 'Failed to create quotation template', error: err.message });
  }
});

// UPDATE quotation template
router.put('/:id', async (req, res) => {
  try {
    const { templateName, companyId, description, category, templateStyle, customColumns, defaultLineItems, isDefault } = req.body;

    if (isDefault) {
      await QuotationTemplate.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    const styleData = templateStyle;

    const updated = await QuotationTemplate.findByIdAndUpdate(
      req.params.id,
      {
        templateName,
        companyId,
        description,
        category,
        ...(styleData ? { templateStyle: styleData } : {}),
        customColumns,
        defaultLineItems,
        isDefault
      },
      { new: true, runValidators: true }
    ).populate('companyId');

    if (!updated) {
      return res.status(404).json({ message: 'Quotation template not found' });
    }

    return res.json(updated);
  } catch (err) {
    console.error('Error updating quotation template:', err);
    return res.status(500).json({ message: 'Failed to update quotation template', error: err.message });
  }
});

// DELETE quotation template
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await QuotationTemplate.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Quotation template not found' });
    }
    return res.json({ message: 'Quotation template deleted successfully', _id: req.params.id });
  } catch (err) {
    console.error('Error deleting quotation template:', err);
    return res.status(500).json({ message: 'Failed to delete quotation template', error: err.message });
  }
});

export default router;

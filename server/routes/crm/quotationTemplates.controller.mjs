import express from 'express';
import QuotationTemplate from '../../model/crm/QuotationTemplate.mjs';
import QuotationCompany from '../../model/crm/QuotationCompany.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';

const router = express.Router();

// GET all quotation templates (filtered by user's team for non-admins)
router.get('/', async (req, res) => {
  try {
    const role = req.user?.crmRole || req.user?.role || req.headers['user-role'];
    const userRole = req.user?.role || req.headers['user-role'];
    const userId = req.user?._id || req.user?.id || req.headers['user-id'];

    const isHOD = userRole === 'HOD' || userRole === 'Head_of_Department' || (typeof userRole === 'string' && (userRole.toLowerCase() === 'hod' || userRole.toLowerCase() === 'head_of_department'));
    const isCrmAdmin = role === 'Admin' || (typeof role === 'string' && role.toLowerCase() === 'admin');
    const isSystemAdmin = userRole === 'Admin' || (typeof userRole === 'string' && userRole.toLowerCase() === 'admin');
    const isAdmin = (isCrmAdmin || isSystemAdmin) && !isHOD;

    let filter = {};

    if (req.query.teamId && req.query.teamId !== 'all') {
      filter.teamId = req.query.teamId;
    } else if (!isAdmin && userId) {
      // Find all teams where user is manager or member
      const myTeams = await SalesTeam.find({
        $or: [
          { managerId: userId },
          { memberIds: userId }
        ]
      }).select('_id').lean();
      const myTeamIds = myTeams.map(t => t._id);

      // Only allow templates for the user's teams, or global templates (no team assigned), or created by self
      filter = {
        $or: [
          { teamId: { $in: myTeamIds } },
          { teamId: null },
          { teamId: { $exists: false } },
          { createdById: userId }
        ]
      };
    }

    const templates = await QuotationTemplate.find(filter)
      .populate('companyId')
      .populate('teamId', 'name businessVertical')
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
      .populate('teamId', 'name businessVertical')
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
    const {
      templateName,
      companyId,
      teamId,
      teamName,
      description,
      category,
      templateStyle,
      customColumns = [],
      defaultLineItems = [],
      isDefault
    } = req.body;

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

    let resolvedTeamName = teamName || '';
    if (teamId && !resolvedTeamName) {
      const teamDoc = await SalesTeam.findById(teamId).lean();
      if (teamDoc) resolvedTeamName = teamDoc.name;
    }

    const userId = req.user?._id || req.user?.id || req.headers['user-id'];
    const styleData = templateStyle || {};

    const newTemplate = new QuotationTemplate({
      templateName,
      companyId,
      teamId: teamId || null,
      teamName: resolvedTeamName,
      description: description || '',
      category: category || 'general',
      templateStyle: styleData,
      customColumns: customColumns || [],
      defaultLineItems: defaultLineItems || [],
      isDefault: isDefault || false,
      createdById: userId || undefined
    });

    await newTemplate.save();
    const populated = await QuotationTemplate.findById(newTemplate._id)
      .populate('companyId')
      .populate('teamId', 'name businessVertical');

    return res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating quotation template:', err);
    return res.status(500).json({ message: 'Failed to create quotation template', error: err.message });
  }
});

// UPDATE quotation template
router.put('/:id', async (req, res) => {
  try {
    const {
      templateName,
      companyId,
      teamId,
      teamName,
      description,
      category,
      templateStyle,
      customColumns,
      defaultLineItems,
      isDefault
    } = req.body;

    if (isDefault) {
      await QuotationTemplate.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    }

    let resolvedTeamName = teamName;
    if (teamId && !resolvedTeamName) {
      const teamDoc = await SalesTeam.findById(teamId).lean();
      if (teamDoc) resolvedTeamName = teamDoc.name;
    } else if (!teamId) {
      resolvedTeamName = '';
    }

    const styleData = templateStyle;

    const updateFields = {
      templateName,
      companyId,
      description,
      category,
      ...(styleData ? { templateStyle: styleData } : {}),
      customColumns,
      defaultLineItems,
      isDefault
    };

    if (teamId !== undefined) {
      updateFields.teamId = teamId || null;
      updateFields.teamName = resolvedTeamName;
    }

    const updated = await QuotationTemplate.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    )
      .populate('companyId')
      .populate('teamId', 'name businessVertical');

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

import CustomerKycModel from '../../../model/CustomerKyc/customerKycModel.mjs';

const STAGE_ORDER = {
  'suspect': 1,
  'prospect': 2,
  'qualified_lead': 3,
  'opportunity': 4,
  'customer': 5
};

/**
 * Guards against invalid stage hopping.
 * Ensures linear progression (or valid backward movement if allowed).
 */
export const transitionGuard = async (req, res, next) => {
  const { stage } = req.body;
  if (!stage) return next(); // Not a stage transition request

  const targetLevel = STAGE_ORDER[stage];
  if (!targetLevel) return next();

  if (!req.params.id) {
    // If creating new, must be suspect
    if (stage !== 'suspect') {
       return res.status(400).json({ message: 'New records must start as suspects.' });
    }
    return next();
  }

  try {
    const record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });

    const currentLevel = STAGE_ORDER[record.crm_stage] || 1;

    // Rule: Cannot skip stages forward
    if (targetLevel > currentLevel + 1) {
      return res.status(400).json({ 
        message: `Cannot skip stages. Target stage: ${stage}, Current stage: ${record.crm_stage}` 
      });
    }

    // Rule: Cannot go from customer back to anything
    if (currentLevel === 5 && targetLevel < 5) {
      return res.status(400).json({ message: 'Customers cannot be demoted to an earlier stage.' });
    }

    // Pass the current record on req to save DB hits later
    req.currentKycRecord = record;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

import CustomerKycModel from '../../../model/CustomerKyc/customerKycModel.mjs';

/**
 * Validates whether the incoming request contains the required fields
 * to transition to a specific CRM stage.
 */
export const validateStageTransition = async (req, res, next) => {
  const { stage } = req.body;
  
  if (!stage) {
    return res.status(400).json({ message: 'Target stage is required.' });
  }

  const validStages = ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'];
  if (!validStages.includes(stage.toLowerCase())) {
    return res.status(400).json({ message: 'Invalid target stage.' });
  }

  // Find record if ID is provided (some routes might create directly, e.g., suspect)
  let record = null;
  if (req.params.id) {
    record = await CustomerKycModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found.' });
  }

  // Validation logic based on the TARGET stage
  switch (stage) {
    case 'suspect':
      // minimal requirements usually enforced by schema creation
      break;

    case 'prospect':
      // Basic info required
      if (record) {
        if (!record.name_of_individual || !record.iec_no) {
          return res.status(400).json({ message: 'Name and IEC number are required to become a prospect.' });
        }
      } else {
        if (!req.body.name_of_individual || !req.body.iec_no) {
          return res.status(400).json({ message: 'Name and IEC number are required to become a prospect.' });
        }
      }
      break;

    case 'qualified_lead':
      // Requires basic address or contact
      if (record) {
        const hasContact = record.contacts && record.contacts.length > 0;
        if (!hasContact && (!req.body.contacts || req.body.contacts.length === 0)) {
           return res.status(400).json({ message: 'At least one contact person is required for a qualified lead.' });
        }
      }
      break;

    case 'opportunity':
      // Requires forecasting data
      const estRev = req.body.estimated_revenue !== undefined ? req.body.estimated_revenue : record?.estimated_revenue;
      const svcInt = req.body.service_interest !== undefined ? req.body.service_interest : record?.service_interest;
      const expClose = req.body.expected_closure_date !== undefined ? req.body.expected_closure_date : record?.expected_closure_date;
      
      if (!estRev || !svcInt || svcInt.length === 0 || !expClose) {
        return res.status(400).json({ message: 'Opportunity requires estimated revenue, service interest, and expected closure date.' });
      }
      break;

    case 'customer':
      // Requires Opportunity win AND KYC Approval
      if (record && record.approval !== 'Approved' && record.approval !== 'Approved by HOD') {
        return res.status(400).json({ message: 'Customer conversion requires prior KYC Approval.' });
      }
      break;
  }

  next();
};

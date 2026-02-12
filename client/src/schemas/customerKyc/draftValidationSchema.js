import * as Yup from 'yup';

// Draft validation schema - only essential fields for saving drafts
export const draftValidationSchema = Yup.object({
  // Only require IEC number for draft identification
  iec_no: Yup.string()
    .matches(/^[A-Z0-9]{10}$/, 'IEC number must be 10 characters')
    .required('IEC number is required to save draft'),
    
  // Optional: Require at least a name for better UX
  name_of_individual: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required to save draft'),
});

// Helper function to check if form has minimum data for draft
export const hasMinimumDraftData = (values) => {
  return values.iec_no && values.iec_no.trim() !== '' && 
         values.name_of_individual && values.name_of_individual.trim() !== '';
};

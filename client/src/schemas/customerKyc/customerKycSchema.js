import * as Yup from 'yup';

export const validationSchema = Yup.object({
  category: Yup.string().required('Category is required'),
  name_of_individual: Yup.string().required('Name is required'),
  status: Yup.string().required('Status is required'),
  
  // Permanent Address
  permanent_address_line_1: Yup.string().required('Permanent address line 1 is required'),
  permanent_address_city: Yup.string().required('City is required'),
  permanent_address_state: Yup.string().required('State is required'),
  permanent_address_pin_code: Yup.string()
    .matches(/^\d{6}$/, 'PIN code must be 6 digits')
    .required('PIN code is required'),
  permanent_address_telephone: Yup.string()
    .matches(/^\d{10}$/, 'Mobile number must be 10 digits')
    .required('Mobile number is required'),
  permanent_address_email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),

  // Principal Business Address
  principle_business_address_line_1: Yup.string().required('Principal business address line 1 is required'),
  principle_business_address_city: Yup.string().required('City is required'),
  principle_business_address_state: Yup.string().required('State is required'),
  principle_business_address_pin_code: Yup.string()
    .matches(/^\d{6}$/, 'PIN code must be 6 digits')
    .required('PIN code is required'),
  principle_business_telephone: Yup.string()
    .matches(/^\d{10}$/, 'Mobile number must be 10 digits')
    .required('Mobile number is required'),
  principle_address_email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),

  // IEC Information
  iec_no: Yup.string()
    .matches(/^[A-Z0-9]{10}$/, 'IEC number must be 10 characters')
    .required('IEC number is required'),

  // PAN Information
  pan_no: Yup.string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
    .required('PAN number is required'),

  // Factory Addresses
  factory_addresses: Yup.array().of(
    Yup.object({
      factory_address_line_1: Yup.string().required('Factory address line 1 is required'),
      factory_address_city: Yup.string().required('City is required'),
      factory_address_state: Yup.string().required('State is required'),
      factory_address_pin_code: Yup.string()
        .matches(/^\d{6}$/, 'PIN code must be 6 digits')
        .required('PIN code is required'),
      gst: Yup.string()
        .matches(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, 'Invalid GST format')
        .required('GST number is required'),
    })
  ),

  // Banking Information
  banks: Yup.array().of(
    Yup.object({
      bankers_name: Yup.string().required('Banker name is required'),
      branch_address: Yup.string().required('Branch address is required'),
      account_no: Yup.string()
        .matches(/^\d+$/, 'Account number must contain only digits')
        .required('Account number is required'),
      ifsc: Yup.string()
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format')
        .required('IFSC code is required'),
      adCode: Yup.string()
        .length(7, 'AD Code must be exactly 7 characters')
        .required('AD Code is required'),
    })
  ).min(1, 'At least one bank is required'),
});

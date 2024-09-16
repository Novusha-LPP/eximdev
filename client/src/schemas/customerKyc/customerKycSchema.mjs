import * as Yup from "yup";

export const validationSchema = Yup.object().shape({
  category: Yup.string().required("Category is required"),
  name_of_individual: Yup.string().required("Name of individual is required"),
  status: Yup.string().required("Status is required"),

  // Permanent address
  permanent_address_line_1: Yup.string().required(
    "Permanent address line 1 is required"
  ),
  permanent_address_line_2: Yup.string().required(
    "Permanent address line 2 is required"
  ),
  permanent_address_city: Yup.string().required(
    "Permanent address city is required"
  ),
  permanent_address_state: Yup.string().required(
    "Permanent address state is required"
  ),
  permanent_address_pin_code: Yup.string()
    .required("Permanent address pin code is required")
    .matches(/^[0-9]{6}$/, "Pin code must be exactly 6 digits"),
  permanent_address_telephone: Yup.string()
    .required("Permanent address telephone is required")
    .matches(/^[0-9]{10}$/, "Telephone must be exactly 10 digits"),
  permanent_address_email: Yup.string()
    .email("Invalid email")
    .required("Permanent address email is required"),

  // Principal business addresses
  principle_business_address_line_1: Yup.string().required(
    "Principal business address line 1 is required"
  ),
  principle_business_address_line_2: Yup.string().required(
    "Principal business address line 2 is required"
  ),
  principle_business_address_city: Yup.string().required(
    "Principal business address city is required"
  ),
  principle_business_address_state: Yup.string().required(
    "Principal business address state is required"
  ),
  principle_business_address_pin_code: Yup.string()
    .required("Principal business address pin code is required")
    .matches(/^[0-9]{6}$/, "Pin code must be exactly 6 digits"),
  principle_address_email: Yup.string()
    .email("Invalid email")
    .required("Principal address email is required"),
  principle_business_telephone: Yup.string()
    .required("Principal business telephone is required")
    .matches(/^[0-9]{10}$/, "Telephone must be exactly 10 digits"),
  authorised_signatories: Yup.string().required(
    "Authorised signatories is required"
  ),
  authorisation_letter: Yup.string().required(
    "Authorisation letter is required"
  ),
  iec_no: Yup.string()
    .required("IEC No is required")
    .length(10, "IEC No must be exactly 10 characters")
    .matches(
      /^[a-zA-Z0-9]*$/,
      "IEC No must contain only alphanumeric characters"
    ),
  iec_copy: Yup.string().required("IEC Copy is required"),
  pan_no: Yup.string()
    .required("PAN No is required")
    .length(10, "PAN No must be exactly 10 characters")
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN No"),
  pan_copy: Yup.string().required("PAN Copy is required"),
  other_documents: Yup.array().of(Yup.string()),
  banks: Yup.array().of(
    Yup.object().shape({
      bankers_name: Yup.string().required("Banker's Name is required"),
      branch_address: Yup.string().required("Branch Address is required"),
      account_no: Yup.string().required("Account No is required"),
      ifsc: Yup.string()
        .required("IFSC Code is required")
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code"),
      ad_code: Yup.string().required("AD Code is required"),
      ad_code_file: Yup.string().required("AD Code File is required"),
    })
  ),
});

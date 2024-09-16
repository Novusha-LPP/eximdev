import * as yup from "yup";

export const validationSchema = yup.object({
  tyre_no: yup.string("Enter tyre no").required("Tyre no is required"),
  bill_no: yup.string("Enter bill no").required("Bill no is required"),
  bill_date: yup.string("Enter bill date").required("Bill date is required"),
  vendor_name: yup
    .string("Enter vendor name")
    .required("Vendor name is required"),
  tyre_model: yup.string("Enter tyre model").required("Tyre model is required"),
  tyre_brand: yup.string("Enter tyre brand").required("Tyre brand is required"),
  tyre_type: yup.string("Enter tyre type").required("Tyre type is required"),
  tyre_size: yup.string("Enter tyre size").required("Tyre size is required"),
  ply_rating: yup.string("Enter ply rating").required("Ply rating is required"),
  warranty_date: yup
    .string("Enter warranty date")
    .required("Warranty date is required"),
});

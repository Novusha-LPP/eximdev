import * as yup from "yup";

export const validationSchema = yup.object({
  vendor_name: yup
    .string("Enter vendor name")
    .required("Vendor name is required"),
  vendor_address: yup
    .string("Enter vendor address")
    .required("Vendor address is required"),
  vendor_phone: yup
    .string("Enter vendor phone")
    .required("Vendor phone is required"),
});

import * as yup from "yup";

const mobileRegex = /^[6789]\d{9}$/;

export const validationSchema = yup.object({
  driver_name: yup
    .string("Enter driver name")
    .required("Driver name is required"),
  driver_phone: yup
    .string("Enter driver phone")
    .matches(mobileRegex, "Enter a valid mobile number")
    .required("Driver phone is required"),
  driver_license: yup
    .string("Enter license no")
    .required("License no is required"),
  license_validity: yup
    .string("Enter license validity")
    .required("License validity is required"),
  driver_address: yup
    .string("Enter driver address")
    .required("Driver address is required"),
  joining_date: yup
    .string("Enter joining date")
    .required("Joining date is required"),
  blood_group: yup
    .string("Enter blood group")
    .required("Blood group is required"),
});

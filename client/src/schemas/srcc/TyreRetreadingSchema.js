import * as yup from "yup";

export const validationSchema = yup.object({
  tyre_no: yup.string("Enter tyre no").required("Tyre no is required"),
  truck_no: yup.string("Enter truck no").required("Truck no is required"),
  vendor: yup.string("Enter vendor name").required("Vendor name is required"),
  retreading_date: yup
    .string("Enter retreading date")
    .required("Retreading date is required"),
  tread_pattern: yup
    .string("Enter tread pattern")
    .required("Tread pattern is required"),
  amount: yup.string("Enter amount").required("Amount is required"),
  retreading_date_odometer: yup
    .string("Enter retreading date odometer")
    .required("Retreading date odometer is required"),
});

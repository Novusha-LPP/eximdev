import * as yup from "yup";

export const validationSchema = yup.object({
  tyre_no: yup.string("Enter tyre no").required("Tyre no is required"),
  truck_no: yup.string("Enter truck no").required("Truck no is required"),
  bill_no: yup.string("Enter bill no").required("Bill no is required"),
  bill_date: yup.string("Enter bill date").required("Bill date is required"),
  repair_type: yup
    .string("Enter repair type")
    .required("Repair type is required"),
  vendor: yup.string("Enter vendor name").required("Vendor name is required"),
  amount: yup.string("Enter amount").required("Amount is required"),
  repair_date_odometer: yup
    .string("Enter repair date odometer")
    .required("Repair date odometer is required"),
});

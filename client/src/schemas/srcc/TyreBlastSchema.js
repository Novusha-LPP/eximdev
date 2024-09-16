import * as yup from "yup";

export const validationSchema = yup.object({
  tyre_no: yup.string("Enter tyre no").required("Tyre no is required"),
  blast_truck_no: yup
    .string("Enter truck no")
    .matches(/^[a-zA-Z]{2}\d{2}[a-zA-Z]{2}\d{4}$/, "Invalid truck number")
    .required("Truck no is required"),
  blast_date: yup.string("Enter blast date").required("Blast date is required"),
  blast_driver: yup
    .string("Enter blast driver")
    .required("Blast driver is required"),
  blast_odometer: yup
    .string("Enter blast odometer")
    .required("Blast odometer is required"),
  blast_remarks: yup
    .string("Enter blast remarks")
    .required("Blast remarks is required"),
});

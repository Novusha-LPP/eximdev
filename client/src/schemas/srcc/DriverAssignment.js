import * as yup from "yup";

export const validationSchema = yup.object({
  truck_no: yup.string("Enter truck no").required("Truck no is required"),
  driver_name: yup
    .string("Enter driver name")
    .required("Driver name is required"),
  assign_date: yup
    .string("Enter assign date")
    .required("Assign date is required"),
  assign_date_odometer: yup
    .string("Enter assign date odometer")
    .required("Assign date odometer is required"),
});

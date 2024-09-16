import * as yup from "yup";

export const validationSchema = yup.object({
  tyre_no: yup.string("Enter tyre no").required("Tyre no is required"),
  truck_no: yup
    .string("Enter truck no")
    .matches(/^[a-zA-Z]{2}\d{2}[a-zA-Z]{2}\d{4}$/, "Invalid truck number")
    .required("Truck no is required"),
  fitting_date: yup
    .string("Enter fitting date")
    .required("Fitting date is required"),
  fitting_date_odometer: yup
    .string("Enter fitting date odometer")
    .required("Fitting date odometer is required"),
  truck_type: yup.string("Enter truck type").required("Truck type is required"),
  location: yup.string("Enter location").required("Location is required"),
});

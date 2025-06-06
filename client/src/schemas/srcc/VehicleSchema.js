import * as yup from "yup";

export const validationSchema = yup.object({
  truck_no: yup
    .string("Enter truck number")
    .matches(/^[a-zA-Z]{2}\d{2}[a-zA-Z]{1,2}\d{4}$/, "Invalid truck number")
    .required("Truck number is required"),
  type_of_vehicle: yup
    .string("Enter type of vehicle")
    .required("Type of vehicle is required"),
  max_tyres: yup
    .string("Enter maximum tyres")
    .required("Maximum tyres is required"),
  units: yup.string("Enter units").required("Units is required"),
});

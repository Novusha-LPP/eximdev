import * as yup from "yup";

export const validationSchema = yup.object({
  type_of_vehicle: yup
    .string("Enter type of vehicle")
    .required("Type of vehicle is required"),
});

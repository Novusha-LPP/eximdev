import * as yup from "yup";

export const validationSchema = yup.object({
  repair_type: yup
    .string("Enter repair type")
    .required("Repair type is required"),
});

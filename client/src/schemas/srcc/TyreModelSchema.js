import * as yup from "yup";

export const validationSchema = yup.object({
  tyre_brand: yup
    .string("Select tyre brand")
    .required("Tyre brand is required"),
  tyre_model: yup.string("Enter tyre model").required("Tyre model is required"),
  description: yup
    .string("Enter description")
    .required("Description is required"),
});

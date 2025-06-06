import * as yup from "yup";

export const validationSchema = yup.object({
  tyre_brand: yup.string("Enter tyre brand").required("Tyre brand is required"),
  description: yup
    .string("Enter description")
    .required("Description is required"),
});

import * as yup from "yup";

export const validationSchema = yup.object({
  container_type: yup
    .string("Enter container type")
    .required("Container type is required"),
});

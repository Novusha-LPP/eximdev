import * as yup from "yup";

export const validationSchema = yup.object({
  tyre_type: yup.string("Enter tyre type").required("Tyre type is required"),
});

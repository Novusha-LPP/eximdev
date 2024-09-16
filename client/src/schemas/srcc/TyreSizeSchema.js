import * as yup from "yup";

export const validationSchema = yup.object({
  tyre_size: yup.string("Enter tyre size").required("Tyre size is required"),
});

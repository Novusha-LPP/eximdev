import * as Yup from "yup";

export const validationSchema = Yup.object({
  location: Yup.string().required("This field is required"),
  district: Yup.string().required("This field is required"),
  area: Yup.string().required("This field is required"),
});

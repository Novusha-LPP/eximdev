import * as Yup from "yup";

export const validationSchema = Yup.object({
  weight: Yup.string().required("This field is required"),
  docket_no: Yup.string().required("This field is required"),
  courier_details: Yup.string().required("This field is required"),
});

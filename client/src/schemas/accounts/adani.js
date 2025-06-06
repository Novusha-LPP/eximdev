import * as Yup from "yup";

export const validationSchema = Yup.object({
  comapny_name: Yup.string().required("This field is required"),
  address: Yup.string().required("This field is required"),
  service_no: Yup.string().required("This field is required"),
  billing_date: Yup.string().required("This field is required"),
  due_date: Yup.string().required("This field is required"),
  remarks: Yup.string().required("This field is required"),
});

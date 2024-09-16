import * as Yup from "yup";

export const validationSchema = Yup.object({
  comapny_name: Yup.string().required("Required"),
  address: Yup.string().required("Required"),
  service_no: Yup.string().required("Required"),
  billing_date: Yup.date().required("Required"),
  due_date: Yup.date().required("Required"),
  remarks: Yup.string().required("Required"),
});

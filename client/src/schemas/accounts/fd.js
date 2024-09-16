import * as Yup from "yup";

export const validationSchema = Yup.object({
  comapny_name: Yup.string().required("Required"),
  start_date: Yup.date().required("Required"),
  end_date: Yup.date().required("Required"),
  period: Yup.string().required("Required"),
  roi: Yup.string().required("Required"),
  remarks: Yup.string().required("Required"),
});

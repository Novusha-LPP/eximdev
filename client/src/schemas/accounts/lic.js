import * as Yup from "yup";

export const validationSchema = Yup.object({
  policy_name: Yup.string().required("Required"),
  policy_no: Yup.string().required("Required"),
  insured_person_name: Yup.string().required("Required"),
  start_date: Yup.date().required("Required"),
  end_date: Yup.date().required("Required"),
  insured_amount: Yup.string().required("Required"),
  premium_amount: Yup.string().required("Required"),
  premium_term: Yup.string().required("Required"),
  remarks: Yup.string().required("Required"),
});

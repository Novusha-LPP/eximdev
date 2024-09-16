import * as Yup from "yup";

export const validationSchema = Yup.object({
  bill_given_date: Yup.string().required("This field is required"),
  party: Yup.string().required("This field is required"),
  division: Yup.string().required("This field is required"),
  party_email: Yup.string().required("This field is required"),
  description: Yup.string().required("This field is required"),
  kind_attention: Yup.string().required("This field is required"),
});

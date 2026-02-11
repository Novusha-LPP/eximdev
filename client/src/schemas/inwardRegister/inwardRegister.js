import * as Yup from "yup";

export const validationSchema = Yup.object({
  time: Yup.string().required("This field is required"),
  date: Yup.string().required("This field is required"),
  from: Yup.string().required("This field is required"),
  type: Yup.string().required("This field is required"),
  details_of_document: Yup.string().required("This field is required"),
  contact_person_name: Yup.string().required("This field is required"),
});

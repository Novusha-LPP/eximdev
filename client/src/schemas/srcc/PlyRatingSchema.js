import * as yup from "yup";

export const validationSchema = yup.object({
  ply_rating: yup.string("Enter ply rating").required("Ply rating is required"),
});

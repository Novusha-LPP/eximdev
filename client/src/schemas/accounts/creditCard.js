import * as Yup from "yup";

export const validationSchema = Yup.object({
  comapny_name: Yup.string().required("Comapny name is required"),
  address: Yup.string().required("Address is required"),
  cc_no: Yup.string().required("CC no is required"),
  billing_date: Yup.string().required("Billing date is required"),
  due_date: Yup.string().required("Due date is required"),
  remarks: Yup.string().required("Remarks is required"),
});

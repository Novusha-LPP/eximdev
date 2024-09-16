import * as Yup from "yup";

export const validationSchema = Yup.object({
  address: Yup.string().required("Required"),
  tenant_name: Yup.string().required("Required"),
  property_in_name_of: Yup.string().required("Required"),
  start_date: Yup.date().required("Required"),
  end_date: Yup.date().required("Required"),
  rent_amount: Yup.string().required("Required"),
  increase_percentage: Yup.string().required("Required"),
  remarks: Yup.string().required("Required"),
});

import * as Yup from "yup";

export const validationSchema = Yup.object({
  service_name: Yup.string().required("Service name is required"),
  address: Yup.string().required("Address is required"),
  service_provider: Yup.string().required("Service provider is required"),
  start_date: Yup.string().required("Start date is required"),
  end_date: Yup.string().required("End date is required"),
  remarks: Yup.string().required("Remarks is required"),
});

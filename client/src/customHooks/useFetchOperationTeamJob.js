import { useEffect, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useFormik } from "formik";
import { TabContext } from "../components/import-operations/ImportOperations";

function useFetchOperationTeamJob(params) {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentTab } = useContext(TabContext);
  // This might be the job you're editing...
  // Fetch data
  useEffect(() => {
    async function getJobDetails() {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-job/${params.year}/${params.job_no}`
        );
        setData(response.data);
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }

    getJobDetails();
  }, [params.job_no, params.year]);

  // Formik setup
  const formik = useFormik({
    initialValues: {
      container_nos: [],
      examination_date: "",
      container_images: "",
      weighment_slip_images: [],
      pcv_date: "",
      concor_gate_pass_date: "",
      concor_gate_pass_validate_up_to: "",
      completed_operation_date: "",
      out_of_charge: "",
      custodian_gate_pass: [],
      concor_invoice_and_receipt_copy: [],
    },

    onSubmit: async (values) => {
      try {
        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-operations-job/${params.year}/${params.job_no}`,
          values
        );
        navigate("/import-operations", {
          state: {
            tabIndex: location.state?.tab_number ?? 2,
            selectedJobId: params.job_no,
            searchQuery: location.state?.searchQuery,
            page: location.state?.page,
          },
        });
        setCurrentTab(1);
      } catch (error) {
        console.error("Error updating job:", error);
      }
    },
  });

  // Update formik initial values when data is fetched from the database
  useEffect(() => {
    if (data) {
      const container_nos = data.container_nos?.map((container) => ({
        container_number: container.container_number || "",
        arrival_date: container.arrival_date || "",
        detention_from: container.detention_from || "",
        size: container.size || "",
        net_weight: container.net_weight || "",
        container_gross_weight: container.container_gross_weight || "",
        pre_weighment: container.pre_weighment || "",
        post_weighment: container.post_weighment || "",
        physical_weight: container.physical_weight || "",
        tare_weight: container.tare_weight || "",
        actual_weight: container.actual_weight || "",
        weight_shortage: container.weight_shortage || "",
        weighment_slip_images: container.weighment_slip_images || [],
        container_pre_damage_images:
          container.container_pre_damage_images || [],
        container_images: container.container_images || [],
        loose_material: container.loose_material || [],
        examination_videos: container.examination_videos || [],
      }));

      formik.setValues({
        container_nos,
        examination_date: data.examination_date || "",
        pcv_date: data.pcv_date || "",
        concor_gate_pass_date: data.concor_gate_pass_date || "",
        concor_gate_pass_validate_up_to:
          data.concor_gate_pass_validate_up_to || "",
        completed_operation_date: data.completed_operation_date || "",
        out_of_charge: data.out_of_charge || "",
        custodian_gate_pass: data.custodian_gate_pass || [],
        concor_invoice_and_receipt_copy:
          data.concor_invoice_and_receipt_copy || [],
      });
    }
  }, [data]); // When data changes, formik values are updated

  return { data, formik };
}

export default useFetchOperationTeamJob;

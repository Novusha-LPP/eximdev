import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useFormik } from "formik";

function useFetchOperationTeamJob(params) {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  // Fetch data
  useEffect(() => {
    async function getJobDetails() {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${params.year}/${params.job_no}`
      );
      setData(response.data);
    }

    getJobDetails();
  }, [params.importer, params.job_no, params.year]);

  // Formik
  const formik = useFormik({
    initialValues: {
      container_nos: [],
      examination_date: "",
      container_images: "",
      weighment_slip_images: "",
      pcv_date: "",
      out_of_charge: "",
      custodian_gate_pass: [],
    },

    onSubmit: async (values) => {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-operations-job/${params.year}/${params.job_no}`,
        {
          container_nos: values.container_nos,
          examination_date: values.examination_date,
          pcv_date: values.pcv_date,
          out_of_charge: values.out_of_charge,
          custodian_gate_pass: values.custodian_gate_pass,
        }
      );

      navigate(`/import-operations`);
    },
  });

  // Update formik intial values when data is fetched from db
  useEffect(() => {
    if (data) {
      const container_nos = data.container_nos?.map((container) => ({
        container_number: container.container_number,
        net_weight:
          container.net_weight === undefined ? "" : container.net_weight,
        pre_weighment:
          container.pre_weighment === undefined ? "" : container.pre_weighment,
        post_weighment:
          container.post_weighment === undefined
            ? ""
            : container.post_weighment,
        physical_weight:
          container.physical_weight === undefined
            ? ""
            : container.physical_weight,
        tare_weight:
          container.tare_weight === undefined ? "" : container.tare_weight,
        actual_weight:
          container.actual_weight === undefined ? "" : container.actual_weight,
        weight_shortage:
          container.weight_shortage === undefined
            ? ""
            : container.weight_shortage,
        weighment_slip_images:
          container.weighment_slip_images === undefined
            ? []
            : container.weighment_slip_images,
        container_pre_damage_images:
          container.container_pre_damage_images === undefined
            ? []
            : container.container_pre_damage_images,
        container_images:
          container.container_images === undefined
            ? []
            : container.container_images,
        loose_material:
          container.loose_material === undefined
            ? []
            : container.loose_material,
        examination_videos:
          container.examination_videos === undefined
            ? []
            : container.examination_videos,
      }));

      formik.setValues({
        ...{ container_nos },
        examination_date:
          data.examination_date === undefined ? "" : data.examination_date,
        pcv_date: data.pcv_date === undefined ? "" : data.pcv_date,
        out_of_charge:
          data.out_of_charge === undefined ? "" : data.out_of_charge,
        custodian_gate_pass: data === undefined ? [] : data.custodian_gate_pass,
      });
    }
    // eslint-disable-next-line
  }, [data]);

  return { data, formik };
}

export default useFetchOperationTeamJob;

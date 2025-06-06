import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../schemas/accounts/amc";

const AMC = () => {
  const date = new Date();
  const convertedDate = date
    .toLocaleDateString()
    .split("/")
    .reverse()
    .join("-");

  const formik = useFormik({
    initialValues: {
      service_name: "",
      address: "",
      service_provider: "",
      start_date: convertedDate,
      end_date: convertedDate,
      remarks: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-amc`,
        values
      );
      resetForm();
      alert(res.data.message);
    },
  });

  return (
    <div className="form-container">
      <form onSubmit={formik.handleSubmit} className="register-form">
        <h3>AMC</h3>
        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="service_name"
          name="service_name"
          label="Service Name"
          value={formik.values.service_name}
          onChange={formik.handleChange}
          error={
            formik.touched.service_name && Boolean(formik.errors.service_name)
          }
          helperText={formik.touched.service_name && formik.errors.service_name}
        />

        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="address"
          name="address"
          label="Address"
          value={formik.values.address}
          onChange={formik.handleChange}
          error={formik.touched.address && Boolean(formik.errors.address)}
          helperText={formik.touched.address && formik.errors.address}
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="service_provider"
          name="service_provider"
          label="Service Provider"
          value={formik.values.service_provider}
          onChange={formik.handleChange}
          error={
            formik.touched.service_provider &&
            Boolean(formik.errors.service_provider)
          }
          helperText={
            formik.touched.service_provider && formik.errors.service_provider
          }
        />

        <TextField
          size="small"
          type="date"
          margin="dense"
          variant="outlined"
          fullWidth
          id="start_date"
          name="start_date"
          label="Start Date"
          value={formik.values.start_date}
          onChange={formik.handleChange}
          error={formik.touched.start_date && Boolean(formik.errors.start_date)}
          helperText={formik.touched.start_date && formik.errors.start_date}
        />

        <TextField
          size="small"
          type="date"
          margin="dense"
          variant="outlined"
          fullWidth
          id="end_date"
          name="end_date"
          label="End Date"
          value={formik.values.end_date}
          onChange={formik.handleChange}
          error={formik.touched.end_date && Boolean(formik.errors.end_date)}
          helperText={formik.touched.end_date && formik.errors.end_date}
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="remarks"
          name="remarks"
          label="Remarks"
          value={formik.values.remarks}
          onChange={formik.handleChange}
          error={formik.touched.remarks && Boolean(formik.errors.remarks)}
          helperText={formik.touched.remarks && formik.errors.remarks}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default AMC;

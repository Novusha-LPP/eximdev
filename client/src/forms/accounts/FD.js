import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../schemas/accounts/fd";

const FD = () => {
  const date = new Date();
  const convertedDate = date
    .toLocaleDateString()
    .split("/")
    .reverse()
    .join("-");

  const formik = useFormik({
    initialValues: {
      comapny_name: "",
      start_date: convertedDate,
      end_date: convertedDate,
      period: "",
      roi: "",
      remarks: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-fd`,
        values
      );
      resetForm();
      alert(res.data.message);
    },
  });

  return (
    <div className="form-container">
      <form onSubmit={formik.handleSubmit} className="register-form">
        <h3>FD/ Investment</h3>
        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="comapny_name"
          name="comapny_name"
          label="Comapny Name"
          value={formik.values.comapny_name}
          onChange={formik.handleChange}
          error={
            formik.touched.comapny_name && Boolean(formik.errors.comapny_name)
          }
          helperText={formik.touched.comapny_name && formik.errors.comapny_name}
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
          margin="dense"
          variant="outlined"
          fullWidth
          id="period"
          name="period"
          label="Period"
          value={formik.values.period}
          onChange={formik.handleChange}
          error={formik.touched.period && Boolean(formik.errors.period)}
          helperText={formik.touched.period && formik.errors.period}
        />

        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="roi"
          name="roi"
          label="Rate of Interest"
          value={formik.values.roi}
          onChange={formik.handleChange}
          error={formik.touched.roi && Boolean(formik.errors.roi)}
          helperText={formik.touched.roi && formik.errors.roi}
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

export default FD;

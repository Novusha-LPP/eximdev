import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/ContainerTypeSchema";

const PlyRatings = () => {
  const formik = useFormik({
    initialValues: {
      container_type: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-container-type`,
        values
      );
      resetForm();
      alert(res.data.message);
    },
  });

  return (
    <div className="form-container">
      <form onSubmit={formik.handleSubmit} className="register-form">
        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="container_type"
          name="container_type"
          label="Container Type"
          value={formik.values.container_type}
          onChange={formik.handleChange}
          error={
            formik.touched.container_type &&
            Boolean(formik.errors.container_type)
          }
          helperText={
            formik.touched.container_type && formik.errors.container_type
          }
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default PlyRatings;

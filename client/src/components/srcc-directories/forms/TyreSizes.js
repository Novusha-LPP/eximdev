import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/TyreSizeSchema";

const TyreSizes = () => {
  const formik = useFormik({
    initialValues: {
      tyre_size: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-tyre-size`,
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
          id="tyre_size"
          name="tyre_size"
          label="Tyre Size"
          value={formik.values.tyre_size}
          onChange={formik.handleChange}
          error={formik.touched.tyre_size && Boolean(formik.errors.tyre_size)}
          helperText={formik.touched.tyre_size && formik.errors.tyre_size}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default TyreSizes;

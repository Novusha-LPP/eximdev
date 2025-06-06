import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/TyreBrandSchema";

const TyreBrands = () => {
  const formik = useFormik({
    initialValues: {
      tyre_brand: "",
      description: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-tyre-brand`,
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
          id="tyre_brand"
          name="tyre_brand"
          label="Tyre Brand"
          value={formik.values.tyre_brand}
          onChange={formik.handleChange}
          error={formik.touched.tyre_brand && Boolean(formik.errors.tyre_brand)}
          helperText={formik.touched.tyre_brand && formik.errors.tyre_brand}
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="description"
          name="description"
          label="Description"
          value={formik.values.description}
          onChange={formik.handleChange}
          error={
            formik.touched.description && Boolean(formik.errors.description)
          }
          helperText={formik.touched.description && formik.errors.description}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default TyreBrands;

import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/TyreTypesSchema";

const TyreTypes = () => {
  const formik = useFormik({
    initialValues: {
      tyre_type: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-tyre-type`,
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
          id="tyre_type"
          name="tyre_type"
          label="Tyre Type"
          value={formik.values.tyre_type}
          onChange={formik.handleChange}
          error={formik.touched.tyre_type && Boolean(formik.errors.tyre_type)}
          helperText={formik.touched.tyre_type && formik.errors.tyre_type}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default TyreTypes;

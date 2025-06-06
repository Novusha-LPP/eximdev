import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/RepairTypeSchema";

const RepairTypes = () => {
  const formik = useFormik({
    initialValues: {
      repair_type: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-repair-type`,
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
          id="repair_type"
          name="repair_type"
          label="Repair Type"
          value={formik.values.repair_type}
          onChange={formik.handleChange}
          error={
            formik.touched.repair_type && Boolean(formik.errors.repair_type)
          }
          helperText={formik.touched.repair_type && formik.errors.repair_type}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default RepairTypes;

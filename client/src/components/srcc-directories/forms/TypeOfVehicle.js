import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/TypeOfVehicleSchema";

const TypeOfVehicle = () => {
  const formik = useFormik({
    initialValues: {
      type_of_vehicle: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-type-of-vehicle`,
        values
      );
      console.log(res.data);
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
          id="type_of_vehicle"
          name="type_of_vehicle"
          label="Type of Vehicle"
          value={formik.values.type_of_vehicle}
          onChange={formik.handleChange}
          error={
            formik.touched.type_of_vehicle &&
            Boolean(formik.errors.type_of_vehicle)
          }
          helperText={
            formik.touched.type_of_vehicle && formik.errors.type_of_vehicle
          }
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default TypeOfVehicle;

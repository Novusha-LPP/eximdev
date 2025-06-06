import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/LocationSchema";

const LocationMaster = () => {
  const formik = useFormik({
    initialValues: {
      location: "",
      district: "",
      area: "",
      pincode: "",
    },

    validationSchema: validationSchema,

    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-location`,
        values
      );
      console.log(res.data);
      alert(res.data.message);
      resetForm();
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
          id="location"
          name="location"
          label="Location"
          value={formik.values.location}
          onChange={formik.handleChange}
          error={formik.touched.location && Boolean(formik.errors.location)}
          helperText={formik.touched.location && formik.errors.location}
        />
        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="district"
          name="district"
          label="District"
          value={formik.values.district}
          onChange={formik.handleChange}
          error={formik.touched.district && Boolean(formik.errors.district)}
          helperText={formik.touched.district && formik.errors.district}
        />
        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="area"
          name="area"
          label="Area"
          value={formik.values.area}
          onChange={formik.handleChange}
          error={formik.touched.area && Boolean(formik.errors.area)}
          helperText={formik.touched.area && formik.errors.area}
        />
        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="pincode"
          name="pincode"
          label="Pin code"
          value={formik.values.pincode}
          onChange={formik.handleChange}
          error={formik.touched.pincode && Boolean(formik.errors.pincode)}
          helperText={formik.touched.pincode && formik.errors.pincode}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default LocationMaster;

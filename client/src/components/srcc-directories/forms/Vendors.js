import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/VendorSchema";

const Vendors = () => {
  const formik = useFormik({
    initialValues: {
      vendor_name: "",
      vendor_address: "",
      vendor_phone: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-vendor`,
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
          id="vendor_name"
          name="vendor_name"
          label="Vendor Name"
          value={formik.values.vendor_name}
          onChange={formik.handleChange}
          error={
            formik.touched.vendor_name && Boolean(formik.errors.vendor_name)
          }
          helperText={formik.touched.vendor_name && formik.errors.vendor_name}
        />

        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="vendor_address"
          name="vendor_address"
          label="Vendor Address"
          value={formik.values.vendor_address}
          onChange={formik.handleChange}
          error={
            formik.touched.vendor_address &&
            Boolean(formik.errors.vendor_address)
          }
          helperText={
            formik.touched.vendor_address && formik.errors.vendor_address
          }
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="vendor_phone"
          name="vendor_phone"
          label="Vendor Phone"
          value={formik.values.vendor_phone}
          onChange={formik.handleChange}
          error={
            formik.touched.vendor_phone && Boolean(formik.errors.vendor_phone)
          }
          helperText={formik.touched.vendor_phone && formik.errors.vendor_phone}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default Vendors;

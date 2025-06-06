import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../schemas/accounts/rent";

const Rent = () => {
  const date = new Date();
  const convertedDate = date
    .toLocaleDateString()
    .split("/")
    .reverse()
    .join("-");

  const formik = useFormik({
    initialValues: {
      address: "",
      tenant_name: "",
      property_in_name_of: "",
      start_date: convertedDate,
      end_date: convertedDate,
      rent_amount: "",
      increase_percentage: "",
      remarks: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-rent`,
        values
      );
      resetForm();
      alert(res.data.message);
    },
  });

  return (
    <div className="form-container">
      <form onSubmit={formik.handleSubmit} className="register-form">
        <h3>Rent</h3>
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
          margin="dense"
          variant="outlined"
          fullWidth
          id="tenant_name"
          name="tenant_name"
          label="Tenant Address"
          value={formik.values.tenant_name}
          onChange={formik.handleChange}
          error={
            formik.touched.tenant_name && Boolean(formik.errors.tenant_name)
          }
          helperText={formik.touched.tenant_name && formik.errors.tenant_name}
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="property_in_name_of"
          name="property_in_name_of"
          label="Property In Name Of"
          value={formik.values.property_in_name_of}
          onChange={formik.handleChange}
          error={
            formik.touched.property_in_name_of &&
            Boolean(formik.errors.property_in_name_of)
          }
          helperText={
            formik.touched.property_in_name_of &&
            formik.errors.property_in_name_of
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
          id="rent_amount"
          name="rent_amount"
          label="Rent Amount"
          value={formik.values.rent_amount}
          onChange={formik.handleChange}
          error={
            formik.touched.rent_amount && Boolean(formik.errors.rent_amount)
          }
          helperText={formik.touched.rent_amount && formik.errors.rent_amount}
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="increase_percentage"
          name="increase_percentage"
          label="Percentage Increase"
          value={formik.values.increase_percentage}
          onChange={formik.handleChange}
          error={
            formik.touched.increase_percentage &&
            Boolean(formik.errors.increase_percentage)
          }
          helperText={
            formik.touched.increase_percentage &&
            formik.errors.increase_percentage
          }
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

export default Rent;

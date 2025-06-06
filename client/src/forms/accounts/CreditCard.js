import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../schemas/accounts/creditCard";

const CreditCard = () => {
  const date = new Date();
  const convertedDate = date
    .toLocaleDateString()
    .split("/")
    .reverse()
    .join("-");

  const formik = useFormik({
    initialValues: {
      comapny_name: "",
      address: "",
      cc_no: "",
      billing_date: convertedDate,
      due_date: convertedDate,
      remarks: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-cc`,
        values
      );
      resetForm();
      alert(res.data.message);
    },
  });

  return (
    <div className="form-container">
      <form onSubmit={formik.handleSubmit} className="register-form">
        <h3>Credit Card</h3>
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
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="cc_no"
          name="cc_no"
          label="Credit Card No"
          value={formik.values.cc_no}
          onChange={formik.handleChange}
          error={formik.touched.cc_no && Boolean(formik.errors.cc_no)}
          helperText={formik.touched.cc_no && formik.errors.cc_no}
        />

        <TextField
          size="small"
          type="date"
          margin="dense"
          variant="outlined"
          fullWidth
          id="billing_date"
          name="billing_date"
          label="Billing Date"
          value={formik.values.billing_date}
          onChange={formik.handleChange}
          error={
            formik.touched.billing_date && Boolean(formik.errors.billing_date)
          }
          helperText={formik.touched.billing_date && formik.errors.billing_date}
        />

        <TextField
          size="small"
          type="date"
          margin="dense"
          variant="outlined"
          fullWidth
          id="due_date"
          name="due_date"
          label="Due Date"
          value={formik.values.due_date}
          onChange={formik.handleChange}
          error={formik.touched.due_date && Boolean(formik.errors.due_date)}
          helperText={formik.touched.due_date && formik.errors.due_date}
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

export default CreditCard;

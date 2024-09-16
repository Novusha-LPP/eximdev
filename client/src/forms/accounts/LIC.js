import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../schemas/accounts/lic";

const LIC = () => {
  const date = new Date();
  const convertedDate = date
    .toLocaleDateString()
    .split("/")
    .reverse()
    .join("-");

  const formik = useFormik({
    initialValues: {
      policy_name: "",
      policy_no: "",
      insured_person_name: "",
      start_date: convertedDate,
      end_date: convertedDate,
      insured_amount: "",
      premium_amount: "",
      premium_term: "",
      remarks: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-lic`,
        values
      );
      resetForm();
      alert(res.data.message);
    },
  });

  return (
    <div className="form-container">
      <form onSubmit={formik.handleSubmit} className="register-form">
        <h3>LIC</h3>
        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="policy_name"
          name="policy_name"
          label="Policy Name"
          value={formik.values.policy_name}
          onChange={formik.handleChange}
          error={
            formik.touched.policy_name && Boolean(formik.errors.policy_name)
          }
          helperText={formik.touched.policy_name && formik.errors.policy_name}
        />

        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="policy_no"
          name="policy_no"
          label="Policy Name"
          value={formik.values.policy_no}
          onChange={formik.handleChange}
          error={formik.touched.policy_no && Boolean(formik.errors.policy_no)}
          helperText={formik.touched.policy_no && formik.errors.policy_no}
        />

        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="insured_person_name"
          name="insured_person_name"
          label="Insured Person Name"
          value={formik.values.insured_person_name}
          onChange={formik.handleChange}
          error={
            formik.touched.insured_person_name &&
            Boolean(formik.errors.insured_person_name)
          }
          helperText={
            formik.touched.insured_person_name &&
            formik.errors.insured_person_name
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
          id="insured_amount"
          name="insured_amount"
          label="Insured Amount"
          value={formik.values.insured_amount}
          onChange={formik.handleChange}
          error={
            formik.touched.insured_amount &&
            Boolean(formik.errors.insured_amount)
          }
          helperText={
            formik.touched.insured_amount && formik.errors.insured_amount
          }
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="premium_amount"
          name="premium_amount"
          label="Premium Amount"
          value={formik.values.premium_amount}
          onChange={formik.handleChange}
          error={
            formik.touched.premium_amount &&
            Boolean(formik.errors.premium_amount)
          }
          helperText={
            formik.touched.premium_amount && formik.errors.premium_amount
          }
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="premium_term"
          name="premium_term"
          label="Premium Term"
          value={formik.values.premium_term}
          onChange={formik.handleChange}
          error={
            formik.touched.premium_term && Boolean(formik.errors.premium_term)
          }
          helperText={formik.touched.premium_term && formik.errors.premium_term}
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

export default LIC;

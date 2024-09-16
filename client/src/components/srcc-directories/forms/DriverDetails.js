import React, { useState } from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/DriverDetailsSchema";
import { handleFileUpload } from "../../../utils/awsFileUpload";
import { handleSingleFileUpload } from "../../../utils/awsSingleFileUpload";
import Snackbar from "@mui/material/Snackbar";

const DriverDetails = () => {
  const [fileSnackbar, setFileSnackbar] = useState(false);

  const formik = useFormik({
    initialValues: {
      driver_name: "",
      driver_phone: "",
      driver_license: "",
      license_validity: "",
      driver_address: "",
      joining_date: "",
      blood_group: "",
      driver_photo: "",
      license_photo: [],
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-driver-details`,
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
          id="driver_name"
          name="driver_name"
          label="Driver Name"
          value={formik.values.driver_name}
          onChange={formik.handleChange}
          error={
            formik.touched.driver_name && Boolean(formik.errors.driver_name)
          }
          helperText={formik.touched.driver_name && formik.errors.driver_name}
        />

        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="driver_phone"
          name="driver_phone"
          label="Driver Phone"
          value={formik.values.driver_phone}
          onChange={formik.handleChange}
          error={
            formik.touched.driver_phone && Boolean(formik.errors.driver_phone)
          }
          helperText={formik.touched.driver_phone && formik.errors.driver_phone}
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="driver_license"
          name="driver_license"
          label="License Number"
          value={formik.values.driver_license}
          onChange={formik.handleChange}
          error={
            formik.touched.driver_license &&
            Boolean(formik.errors.driver_license)
          }
          helperText={
            formik.touched.driver_license && formik.errors.driver_license
          }
        />

        <TextField
          size="small"
          type="date"
          margin="dense"
          variant="outlined"
          fullWidth
          id="license_validity"
          name="license_validity"
          label="License Validity"
          value={formik.values.license_validity}
          onChange={formik.handleChange}
          error={
            formik.touched.license_validity &&
            Boolean(formik.errors.license_validity)
          }
          helperText={
            formik.touched.license_validity && formik.errors.license_validity
          }
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="driver_address"
          name="driver_address"
          label="Driver Address"
          value={formik.values.driver_address}
          onChange={formik.handleChange}
          error={
            formik.touched.driver_address &&
            Boolean(formik.errors.driver_address)
          }
          helperText={
            formik.touched.driver_address && formik.errors.driver_address
          }
        />

        <TextField
          size="small"
          type="date"
          margin="dense"
          variant="outlined"
          fullWidth
          id="joining_date"
          name="joining_date"
          label="Joining Date"
          value={formik.values.joining_date}
          onChange={formik.handleChange}
          error={
            formik.touched.joining_date && Boolean(formik.errors.joining_date)
          }
          helperText={formik.touched.joining_date && formik.errors.joining_date}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="blood_group"
          name="blood_group"
          label="Blood Group"
          value={formik.values.blood_group}
          onChange={formik.handleChange}
          error={
            formik.touched.blood_group && Boolean(formik.errors.blood_group)
          }
          helperText={formik.touched.blood_group && formik.errors.blood_group}
        />

        <br />
        <br />

        <label htmlFor="driver_photo">Upload Driver Photo&nbsp;</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            handleSingleFileUpload(
              e,
              "driver_photo",
              "driver_photo",
              formik,
              setFileSnackbar
            )
          }
        />
        <br />
        <br />
        <label htmlFor="license_photo">Upload License Photo&nbsp;</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            handleFileUpload(
              e,
              "license_photo",
              "license_photo",
              formik,
              setFileSnackbar
            )
          }
        />
        <br />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>

      <Snackbar
        open={fileSnackbar}
        message="File uploaded successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </div>
  );
};

export default DriverDetails;

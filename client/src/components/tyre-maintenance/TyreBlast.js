import React, { useEffect, useState } from "react";
import { TextField } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import Autocomplete from "@mui/material/Autocomplete";
import { handleFileUpload } from "../../utils/awsFileUpload";
import Snackbar from "@mui/material/Snackbar";
import { validationSchema } from "../../schemas/srcc/TyreBlastSchema";
import useTyreNumber from "../../customHooks/useTyreNumber";
import useTruckNumber from "../../customHooks/useTruckNumber";

function TyreBlast() {
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const { tyreNo, setTyreNo } = useTyreNumber();
  const { truckNo, setTruckNo } = useTruckNumber();

  useEffect(() => {
    async function getTyreNumber() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-tyre-nos`
      );
      setTyreNo(res.data);
    }

    async function getTruckNumber() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-vehicles`
      );
      setTruckNo(res.data.map((item) => item.truck_no));
    }

    getTyreNumber();
    getTruckNumber();
    // eslint-disable-next-line
  }, []);

  const formik = useFormik({
    initialValues: {
      tyre_no: "",
      blast_truck_no: "",
      blast_date: "",
      blast_driver: "",
      blast_odometer: "",
      blast_remarks: "",
      blast_images: [],
    },

    validationSchema,

    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-tyre-blast`,
        values
      );
      resetForm();
      alert(res.data.message);
    },
  });

  const handleTyreNoChange = (event, value) => {
    formik.setFieldValue("tyre_no", value);
  };

  const handleTruckNoChange = (event, value) => {
    formik.setFieldValue("blast_truck_no", value);
  };

  return (
    <div>
      <div className="form">
        {tyreNo.length !== 0 && truckNo.length !== 0 && (
          <form onSubmit={formik.handleSubmit}>
            <Autocomplete
              disablePortal
              options={Array.isArray(tyreNo) ? tyreNo : []}
              getOptionLabel={(option) => option}
              width="100%"
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Select tyre number"
                  error={
                    formik.touched.tyre_no && Boolean(formik.errors.tyre_no)
                  }
                  helperText={formik.touched.tyre_no && formik.errors.tyre_no}
                />
              )}
              id="tyre_no"
              name="tyre_no"
              onChange={handleTyreNoChange}
              value={formik.values.tyre_no}
              style={{ marginBottom: "15px" }}
            />

            <Autocomplete
              disablePortal
              options={Array.isArray(truckNo) ? truckNo : []}
              getOptionLabel={(option) => option}
              width="100%"
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Select truck number"
                  error={
                    formik.touched.blast_truck_no &&
                    Boolean(formik.errors.blast_truck_no)
                  }
                  helperText={
                    formik.touched.blast_truck_no &&
                    formik.errors.blast_truck_no
                  }
                />
              )}
              id="truck_no"
              name="truck_no"
              onChange={handleTruckNoChange}
              value={formik.values.truck_no}
              style={{ marginBottom: "15px" }}
            />

            <TextField
              type="date"
              size="small"
              margin="dense"
              variant="outlined"
              fullWidth
              id="blast_date"
              name="blast_date"
              value={formik.values.blast_date}
              onChange={formik.handleChange}
              error={
                formik.touched.blast_date && Boolean(formik.errors.blast_date)
              }
              helperText={formik.touched.blast_date && formik.errors.blast_date}
              className="login-input"
            />

            <TextField
              type="text"
              size="small"
              margin="dense"
              variant="outlined"
              fullWidth
              id="blast_driver"
              name="blast_driver"
              label="Driver"
              value={formik.values.blast_driver}
              onChange={formik.handleChange}
              error={
                formik.touched.blast_driver &&
                Boolean(formik.errors.blast_driver)
              }
              helperText={
                formik.touched.blast_driver && formik.errors.blast_driver
              }
              className="login-input"
            />

            <TextField
              type="text"
              size="small"
              margin="dense"
              variant="outlined"
              fullWidth
              id="blast_odometer"
              name="blast_odometer"
              label="Odometer"
              value={formik.values.blast_odometer}
              onChange={formik.handleChange}
              error={
                formik.touched.blast_odometer &&
                Boolean(formik.errors.blast_odometer)
              }
              helperText={
                formik.touched.blast_odometer && formik.errors.blast_odometer
              }
              className="login-input"
            />

            <TextField
              type="text"
              size="small"
              margin="dense"
              variant="outlined"
              fullWidth
              id="blast_remarks"
              name="blast_remarks"
              label="Remarks"
              value={formik.values.blast_remarks}
              onChange={formik.handleChange}
              error={
                formik.touched.blast_remarks &&
                Boolean(formik.errors.blast_remarks)
              }
              helperText={
                formik.touched.blast_remarks && formik.errors.blast_remarks
              }
              className="login-input"
            />
            <br />
            <br />
            <label htmlFor="tyreBlast" className="uploadBtn-secondary">
              Upload tyre blast images:&nbsp;
            </label>
            <input
              type="file"
              multiple
              id="tyreBlast"
              onChange={(e) =>
                handleFileUpload(
                  e,
                  "blast_images",
                  "blast_images",
                  formik,
                  setFileSnackbar
                )
              }
            />
            <br />
            {formik.values.blast_images.map((image, index) => {
              console.log(image);
              return (
                <div key={index}>
                  <a href={image}>{image}</a>
                  <br />
                </div>
              );
            })}

            <br />

            <button className="btn" type="submit">
              Submit
            </button>
          </form>
        )}
      </div>

      <Snackbar
        open={fileSnackbar}
        message="File uploaded successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </div>
  );
}

export default TyreBlast;

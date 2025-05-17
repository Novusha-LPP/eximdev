import React, { useEffect, useState } from "react";
import { TextField } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { validationSchema } from "../../schemas/srcc/TyreRetreadingSchema";
import Autocomplete from "@mui/material/Autocomplete";
import { handleSingleFileUpload } from "../../utils/awsSingleFileUpload";
import Snackbar from "@mui/material/Snackbar";
import useTyreNumber from "../../customHooks/useTyreNumber";
import useTruckNumber from "../../customHooks/useTruckNumber";

function TyreRetreading() {
  const { tyreNo, setTyreNo } = useTyreNumber();
  const { truckNo, setTruckNo } = useTruckNumber();
  const [vendors, setVendors] = useState([]);
  const [fileSnackbar, setFileSnackbar] = useState(false);

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

    async function getVendors() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-vendors`
      );
      const data = res.data.map((item) => item.vendor_name);
      setVendors(data);
    }

    getTyreNumber();
    getTruckNumber();
    getVendors();
    // eslint-disable-next-line
  }, []);

  const formik = useFormik({
    initialValues: {
      tyre_no: "",
      truck_no: "",
      vendor: "",
      retreading_date: "",
      tread_pattern: "",
      retreading_date_odometer: "",
      amount: "",
      tyre_retreading_invoice_images: "",
    },

    validationSchema: validationSchema,

    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-tyre-retreading`,
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
    formik.setFieldValue("truck_no", value);
  };

  const handleVendorChange = (event, value) => {
    formik.setFieldValue("vendor", value);
  };

  return (
    <div>
      <div className="form">
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
                error={formik.touched.tyre_no && Boolean(formik.errors.tyre_no)}
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
                  formik.touched.truck_no && Boolean(formik.errors.truck_no)
                }
                helperText={formik.touched.truck_no && formik.errors.truck_no}
              />
            )}
            id="truck_no"
            name="truck_no"
            onChange={handleTruckNoChange}
            value={formik.values.truck_no}
            style={{ marginBottom: "15px" }}
          />

          <Autocomplete
            disablePortal
            options={Array.isArray(vendors) ? vendors : []}
            getOptionLabel={(option) => option}
            width="100%"
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Select vendor"
                error={formik.touched.vendor && Boolean(formik.errors.vendor)}
                helperText={formik.touched.vendor && formik.errors.vendor}
              />
            )}
            id="vendor"
            name="vendor"
            onChange={handleVendorChange}
            value={formik.values.vendor}
            style={{ marginBottom: "15px" }}
          />

          <TextField
            margin="dense"
            size="small"
            variant="outlined"
            fullWidth
            id="retreading_date"
            name="retreading_date"
            type="date"
            label="Retreading date"
            value={formik.values.retreading_date}
            onChange={formik.handleChange}
            error={
              formik.touched.retreading_date &&
              Boolean(formik.errors.retreading_date)
            }
            helperText={
              formik.touched.retreading_date && formik.errors.retreading_date
            }
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            margin="dense"
            size="small"
            variant="outlined"
            fullWidth
            id="tread_pattern"
            name="tread_pattern"
            label="Tread pattern"
            value={formik.values.tread_pattern}
            onChange={formik.handleChange}
            error={
              formik.touched.tread_pattern &&
              Boolean(formik.errors.tread_pattern)
            }
            helperText={
              formik.touched.tread_pattern && formik.errors.tread_pattern
            }
          />

          <TextField
            margin="dense"
            size="small"
            variant="outlined"
            fullWidth
            id="amount"
            name="amount"
            label="Amount"
            value={formik.values.amount}
            onChange={formik.handleChange}
            error={formik.touched.amount && Boolean(formik.errors.amount)}
            helperText={formik.touched.amount && formik.errors.amount}
          />

          <TextField
            margin="dense"
            size="small"
            variant="outlined"
            fullWidth
            id="retreading_date_odometer"
            name="retreading_date_odometer"
            label="Retreading date odometer"
            value={formik.values.retreading_date_odometer}
            onChange={formik.handleChange}
            error={
              formik.touched.retreading_date_odometer &&
              Boolean(formik.errors.retreading_date_odometer)
            }
            helperText={
              formik.touched.retreading_date_odometer &&
              formik.errors.retreading_date_odometer
            }
          />
          <br />
          <br />
          <label htmlFor="tyreBlast" className="uploadBtn-secondary">
            Upload invoice images:&nbsp;
          </label>
          <input
            type="file"
            multiple
            id="tyreBlast"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "tyre_retreading_invoice_images",
                "tyre_retreading_invoice_images",
                formik,
                setFileSnackbar
              )
            }
          />

          <br />

          <button className="btn" type="submit">
            Submit
          </button>
        </form>
      </div>

      <Snackbar
        open={fileSnackbar}
        message="File uploaded successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </div>
  );
}

export default TyreRetreading;

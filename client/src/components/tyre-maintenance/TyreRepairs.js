import React, { useEffect, useState } from "react";
import { TextField } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { validationSchema } from "../../schemas/srcc/TyreRepairSchema";
import Autocomplete from "@mui/material/Autocomplete";
import { handleSingleFileUpload } from "../../utils/awsSingleFileUpload";
import Snackbar from "@mui/material/Snackbar";
import useTyreNumber from "../../customHooks/useTyreNumber";
import useTruckNumber from "../../customHooks/useTruckNumber";

function TyreRepairs() {
  const { tyreNo, setTyreNo } = useTyreNumber();
  const { truckNo, setTruckNo } = useTruckNumber();
  const [vendors, setVendors] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
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

    async function getRepairTypes() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-repair-types`
      );
      const data = res.data.map((item) => item.repair_type);
      setRepairTypes(data);
    }

    getTyreNumber();
    getTruckNumber();
    getVendors();
    getRepairTypes();
    // eslint-disable-next-line
  }, []);

  const formik = useFormik({
    initialValues: {
      tyre_no: "",
      truck_no: "",
      vendor: "",
      bill_no: "",
      bill_date: "",
      amount: "",
      repair_type: "",
      repair_date_odometer: "",
      tyre_repair_invoice_images: "",
    },

    validationSchema: validationSchema,

    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-tyre-repairs`,
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

  const handleRepairTypeChange = (event, value) => {
    formik.setFieldValue("repair_type", value);
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
            getOptionLabel={(option) => (option ? option : "")}
            width="100%"
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Select truck number"
                error={formik.touched.user && Boolean(formik.errors.user)}
                helperText={formik.touched.user && formik.errors.user}
              />
            )}
            id="truck_no"
            name="truck_no"
            onChange={(event, value) =>
              handleTruckNoChange(event, value, formik)
            }
            value={formik.values.truck_no}
            style={{ marginBottom: "15px" }}
          />

          <Autocomplete
            disablePortal
            options={Array.isArray(repairTypes) ? repairTypes : []}
            getOptionLabel={(option) => option}
            width="100%"
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Select repair type"
                error={
                  formik.touched.repair_type &&
                  Boolean(formik.errors.repair_type)
                }
                helperText={
                  formik.touched.repair_type && formik.errors.repair_type
                }
              />
            )}
            id="repair_type"
            name="repair_type"
            onChange={handleRepairTypeChange}
            value={formik.values.repair_type}
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
            type="text"
            label="Bill No"
            id="bill_no"
            name="bill_no"
            value={formik.values.bill_no}
            onChange={formik.handleChange}
            error={formik.touched.bill_no && Boolean(formik.errors.bill_no)}
            helperText={formik.touched.bill_no && formik.errors.bill_no}
          />
          <TextField
            margin="dense"
            size="small"
            variant="outlined"
            fullWidth
            id="bill_date"
            name="bill_date"
            type="date"
            label="Repair Date"
            value={formik.values.bill_date}
            onChange={formik.handleChange}
            error={formik.touched.bill_date && Boolean(formik.errors.bill_date)}
            helperText={formik.touched.bill_date && formik.errors.bill_date}
            InputLabelProps={{ shrink: true }}
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
            id="repair_date_odometer"
            name="repair_date_odometer"
            label="Repair date odometer"
            value={formik.values.repair_date_odometer}
            onChange={formik.handleChange}
            error={
              formik.touched.repair_date_odometer &&
              Boolean(formik.errors.repair_date_odometer)
            }
            helperText={
              formik.touched.repair_date_odometer &&
              formik.errors.repair_date_odometer
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
                "tyre_repair_invoice_images",
                "tyre_repair_invoice_images",
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

export default TyreRepairs;

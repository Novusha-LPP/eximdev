import React, { useEffect, useState } from "react";
import { TextField } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import TyreLocation from "./TyreLocation";
import { validationSchema } from "../../schemas/srcc/TyreFittingSchema";
import Autocomplete from "@mui/material/Autocomplete";
import MenuItem from "@mui/material/MenuItem";
import useTyreNumber from "../../customHooks/useTyreNumber";
import useTruckNumber from "../../customHooks/useTruckNumber";

function TyreFitting() {
  const [typeOfVehicle, setTypeOfVehicle] = useState([]);
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

    async function getTypeOfVehicle() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-type-of-vehicles`
      );
      setTypeOfVehicle(res.data);
    }

    getTyreNumber();
    getTruckNumber();
    getTypeOfVehicle();
    // eslint-disable-next-line
  }, []);

  const formik = useFormik({
    initialValues: {
      tyre_no: "",
      truck_no: "",
      truck_type: "5 Wheel",
      fitting_date: "",
      fitting_date_odometer: "",
      location: "",
    },

    validationSchema: validationSchema,

    onSubmit: async (values, { resetForm }) => {
      async function tyreFitting() {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/add-tyre-fitting`,
          values
        );
        alert(res.data.message);
      }

      async function truckTyres() {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/add-vehicle-tyres`,
          values
        );
        console.log(res.data);
      }

      tyreFitting();
      truckTyres();
      resetForm();
    },
  });

  const handleLocation = (location) => {
    formik.setFieldValue("location", location);
  };

  const handleTyreNoChange = (event, value) => {
    formik.setFieldValue("tyre_no", value);
  };

  const handleTruckNoChange = (event, value) => {
    formik.setFieldValue("truck_no", value);
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
                error={formik.touched.user && Boolean(formik.errors.user)}
                helperText={formik.touched.user && formik.errors.user}
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

          <TextField
            fullWidth
            size="small"
            select
            margin="normal"
            variant="outlined"
            id="truck_type"
            name="truck_type"
            label="Truck type"
            value={formik.values.truck_type}
            onChange={formik.handleChange}
          >
            {typeOfVehicle.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            margin="dense"
            size="small"
            variant="outlined"
            fullWidth
            type="date"
            id="fitting_date"
            name="fitting_date"
            label="Fitting Date"
            value={formik.values.fitting_date}
            onChange={formik.handleChange}
            error={
              formik.touched.fitting_date && Boolean(formik.errors.fitting_date)
            }
            helperText={
              formik.touched.fitting_date && formik.errors.fitting_date
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            margin="dense"
            size="small"
            variant="outlined"
            fullWidth
            id="fitting_date_odometer"
            name="fitting_date_odometer"
            label="Fitting date odometer"
            value={formik.values.fitting_date_odometer}
            onChange={formik.handleChange}
            error={
              formik.touched.fitting_date_odometer &&
              Boolean(formik.errors.fitting_date_odometer)
            }
            helperText={
              formik.touched.fitting_date_odometer &&
              formik.errors.fitting_date_odometer
            }
          />
          <TextField
            margin="dense"
            size="small"
            variant="outlined"
            fullWidth
            id="location"
            name="location"
            label="Location"
            value={formik.values.location}
            onChange={formik.handleChange}
            error={formik.touched.location && Boolean(formik.errors.location)}
            helperText={formik.touched.location && formik.errors.location}
            disabled={true}
          />

          <br />
          <br />
          <p>
            <strong>Click on a tyre below to enter tyre location</strong>
          </p>

          <TyreLocation handleLocation={handleLocation} formik={formik} />

          <button className="btn" type="submit">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default TyreFitting;

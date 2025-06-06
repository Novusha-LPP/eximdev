import React, { useEffect, useState } from "react";
import { TextField } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { validationSchema } from "../../schemas/srcc/DriverAssignment";
import Autocomplete from "@mui/material/Autocomplete";
import useTruckNumber from "../../customHooks/useTruckNumber";

function DriverAssignment() {
  const { truckNo, setTruckNo } = useTruckNumber();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);

  useEffect(() => {
    async function getTruckNumber() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-vehicles`
      );
      setTruckNo(res.data.map((item) => item.truck_no));
    }

    async function getDrivers() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-drivers`
      );
      setDrivers(res.data);
    }

    getTruckNumber();
    getDrivers();
    // eslint-disable-next-line
  }, []);

  const formik = useFormik({
    initialValues: {
      truck_no: "",
      driver_name: "",
      assign_date: "",
      assign_date_odometer: "",
      driver_license: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      if (selectedDriver) {
        values.driver_license = selectedDriver.driver_license; // Set driver_license in the form data.

        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/driver-assignment`,
          values
        );
        resetForm();
        alert(res.data.message);
      }
    },
  });

  const handleDriverChange = (event, value) => {
    const selectedDriver = drivers.find(
      (driver) => driver.driver_name === value
    );
    setSelectedDriver(selectedDriver); // Store the selected driver object.
    formik.setFieldValue("driver_name", value);
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
            options={drivers.map((driver) => driver.driver_name)}
            width="100%"
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Select driver"
                error={
                  formik.touched.driver_name &&
                  Boolean(formik.errors.driver_name)
                }
                helperText={
                  formik.touched.driver_name && formik.errors.driver_name
                }
              />
            )}
            id="driver_name"
            name="driver_name"
            onChange={handleDriverChange}
            value={formik.values.driver_name}
            style={{ marginBottom: "15px" }}
          />

          <TextField
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            type="date"
            id="assign_date"
            name="assign_date"
            label="Assign date"
            value={formik.values.assign_date}
            onChange={formik.handleChange}
            error={
              formik.touched.assign_date && Boolean(formik.errors.assign_date)
            }
            helperText={formik.touched.assign_date && formik.errors.assign_date}
            className="login-input"
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="assign_date_odometer"
            name="assign_date_odometer"
            label="Assign date odometer"
            value={formik.values.assign_date_odometer}
            onChange={formik.handleChange}
            error={
              formik.touched.assign_date_odometer &&
              Boolean(formik.errors.assign_date_odometer)
            }
            helperText={
              formik.touched.assign_date_odometer &&
              formik.errors.assign_date_odometer
            }
            className="login-input"
          />

          <button className="btn" type="submit">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default DriverAssignment;

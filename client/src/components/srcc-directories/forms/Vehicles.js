import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/VehicleSchema";
import { MenuItem } from "@mui/material";

const Vehicles = () => {
  const [truckTypes, setTruckTypes] = useState([]);
  const maxTyres = ["5 Wheel", "10 Wheel", "12 Wheel", "14 Wheel", "18 Wheel"];

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-type-of-vehicles`
      );
      setTruckTypes(res.data);
    }

    getData();
  }, []);

  const formik = useFormik({
    initialValues: {
      truck_no: "",
      type_of_vehicle: "",
      max_tyres: "",
      units: "",
    },

    validationSchema: validationSchema,

    onSubmit: async (values, { resetForm }) => {
      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/add-vehicle`,
          values
        );
        // Reset the form
        resetForm();
        // Show success alert
        alert(res.data.message);
      } catch (error) {
        if (error.response && error.response.status === 400) {
          // Show alert for existing vehicle
          alert(error.response.data.message);
        } else {
          // Handle other errors
          alert("An error occurred while adding the vehicle.");
        }
      }
    },
  });

  const handleTruckNoChange = (event) => {
    const newValue = event.target.value.toUpperCase(); // Convert to uppercase
    formik.handleChange(event); // Handle Formik's onChange event
    formik.setFieldValue("truck_no", newValue); // Update the formik field value
  };

  return (
    <div className="form-container">
      <form onSubmit={formik.handleSubmit} className="register-form">
        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="truck_no"
          name="truck_no"
          label="Truck Number"
          value={formik.values.truck_no}
          onChange={handleTruckNoChange}
          error={formik.touched.truck_no && Boolean(formik.errors.truck_no)}
          helperText={formik.touched.truck_no && formik.errors.truck_no}
          inputProps={{ maxLength: 10 }}
        />

        <TextField
          size="small"
          select
          margin="dense"
          variant="outlined"
          fullWidth
          id="type_of_vehicle"
          name="type_of_vehicle"
          label="Type of Vehicle"
          value={formik.values.type_of_vehicle}
          onChange={formik.handleChange}
          error={
            formik.touched.type_of_vehicle &&
            Boolean(formik.errors.type_of_vehicle)
          }
          helperText={
            formik.touched.type_of_vehicle && formik.errors.type_of_vehicle
          }
        >
          {truckTypes.map((type, id) => (
            <MenuItem key={id} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          select
          margin="dense"
          variant="outlined"
          fullWidth
          id="max_tyres"
          name="max_tyres"
          label="Maximum Tyres"
          value={formik.values.max_tyres}
          onChange={formik.handleChange}
          error={formik.touched.max_tyres && Boolean(formik.errors.max_tyres)}
          helperText={formik.touched.max_tyres && formik.errors.max_tyres}
        >
          {maxTyres.map((type, id) => (
            <MenuItem key={id} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          type="text"
          margin="dense"
          variant="outlined"
          fullWidth
          id="units"
          name="units"
          label="Units"
          value={formik.values.units}
          onChange={formik.handleChange}
          error={formik.touched.units && Boolean(formik.errors.units)}
          helperText={formik.touched.units && formik.errors.units}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default Vehicles;

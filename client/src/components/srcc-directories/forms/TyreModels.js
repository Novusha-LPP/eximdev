import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/TyreModelSchema";

const TyreModels = () => {
  const [tyreBrands, setTyreBrands] = useState([]);

  useEffect(() => {
    async function getTyreBrand() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-tyre-brand`
      );
      setTyreBrands(res.data);
    }
    getTyreBrand();
  }, []);

  const formik = useFormik({
    initialValues: {
      tyre_brand: "",
      tyre_model: "",
      description: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-tyre-model`,
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
          select
          margin="dense"
          variant="outlined"
          fullWidth
          id="tyre_brand"
          name="tyre_brand"
          label="Tyre Brand"
          value={formik.values.tyre_brand}
          onChange={formik.handleChange}
          error={formik.touched.tyre_brand && Boolean(formik.errors.tyre_brand)}
          helperText={formik.touched.tyre_brand && formik.errors.tyre_brand}
          className="login-input"
        >
          {tyreBrands.map((option) => (
            <MenuItem key={option._id} value={option.tyre_brand}>
              {option.tyre_brand}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="tyre_model"
          name="tyre_model"
          label="Tyre Model"
          value={formik.values.tyre_model}
          onChange={formik.handleChange}
          error={formik.touched.tyre_model && Boolean(formik.errors.tyre_model)}
          helperText={formik.touched.tyre_model && formik.errors.tyre_model}
        />

        <TextField
          type="text"
          size="small"
          margin="dense"
          variant="outlined"
          fullWidth
          id="description"
          name="description"
          label="Description"
          value={formik.values.description}
          onChange={formik.handleChange}
          error={
            formik.touched.description && Boolean(formik.errors.description)
          }
          helperText={formik.touched.description && formik.errors.description}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default TyreModels;

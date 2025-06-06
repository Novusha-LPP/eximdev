import React from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import { validationSchema } from "../../../schemas/srcc/PlyRatingSchema";

const PlyRatings = () => {
  const formik = useFormik({
    initialValues: {
      ply_rating: "",
    },

    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-ply-rating`,
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
          id="ply_rating"
          name="ply_rating"
          label="Ply Rating"
          value={formik.values.ply_rating}
          onChange={formik.handleChange}
          error={formik.touched.ply_rating && Boolean(formik.errors.ply_rating)}
          helperText={formik.touched.ply_rating && formik.errors.ply_rating}
        />

        <button type="submit" className="btn" aria-labelledby="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default PlyRatings;

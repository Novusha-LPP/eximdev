import React, { useEffect, useState } from "react";
import { MenuItem, TextField } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { handleSingleFileUpload } from "../../utils/awsSingleFileUpload";
import Snackbar from "@mui/material/Snackbar";
import { validationSchema } from "../../schemas/srcc/NewTyreSchema";

function NewTyre() {
  const [vendors, setVendors] = useState([]);
  const [tyreModels, setTyreModels] = useState([]);
  const [tyreBrands, setTyreBrands] = useState([]);
  const [tyreTypes, setTyreTypes] = useState([]);
  const [tyreSizes, setTyreSizes] = useState([]);
  const [plyRatings, setPlyRatings] = useState([]);
  const [fileSnackbar, setFileSnackbar] = useState(false);

  useEffect(() => {
    async function getVendor() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-vendors`
      );
      setVendors(res.data);
    }

    getVendor();

    async function getTyreModel() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-tyre-models`
      );
      setTyreModels(res.data);
    }

    getTyreModel();

    async function getTyreBrand() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-tyre-brands`
      );
      setTyreBrands(res.data);
    }

    getTyreBrand();

    async function getTyreType() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-tyre-types`
      );
      setTyreTypes(res.data);
    }

    getTyreType();

    async function getTyreSize() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-tyre-sizes`
      );
      setTyreSizes(res.data);
    }

    getTyreSize();

    async function getPlyRating() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-ply-ratings`
      );
      setPlyRatings(res.data);
    }

    getPlyRating();
  }, []);

  const formik = useFormik({
    initialValues: {
      tyre_no: "",
      bill_no: "",
      bill_date: "",
      vendor_name: "",
      tyre_model: "",
      tyre_brand: "",
      tyre_type: "",
      tyre_size: "",
      ply_rating: "",
      warranty_date: "",
      tyre_invoice_image: "",
    },

    validationSchema: validationSchema,

    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-new-tyre`,
        values
      );
      alert(res.data.message);

      // Reset the form after successful submission
      resetForm();
    },
  });

  return (
    <div>
      <div className="form">
        <form onSubmit={formik.handleSubmit}>
          <TextField
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="tyre_no"
            name="tyre_no"
            label="Tyre Number"
            value={formik.values.tyre_no}
            onChange={formik.handleChange}
            error={formik.touched.tyre_no && Boolean(formik.errors.tyre_no)}
            helperText={formik.touched.tyre_no && formik.errors.tyre_no}
            className="login-input"
          />
          <TextField
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="bill_no"
            name="bill_no"
            label="Bill Number"
            value={formik.values.bill_no}
            onChange={formik.handleChange}
            error={formik.touched.bill_no && Boolean(formik.errors.bill_no)}
            helperText={formik.touched.bill_no && formik.errors.bill_no}
            className="login-input"
          />
          <TextField
            type="date"
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="bill_date"
            name="bill_date"
            label="Bill date"
            value={formik.values.bill_date}
            onChange={formik.handleChange}
            error={formik.touched.bill_date && Boolean(formik.errors.bill_date)}
            helperText={formik.touched.bill_date && formik.errors.bill_date}
            className="login-input"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="vendor_name"
            name="vendor_name"
            label="Vendor Name"
            value={formik.values.vendor_name}
            onChange={formik.handleChange}
            error={
              formik.touched.vendor_name && Boolean(formik.errors.vendor_name)
            }
            helperText={formik.touched.vendor_name && formik.errors.vendor_name}
            className="login-input"
          >
            {vendors.map((option) => (
              <MenuItem key={option._id} value={option.vendor_name}>
                {option.vendor_name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="tyre_brand"
            name="tyre_brand"
            label="Tyre Brands"
            value={formik.values.tyre_brand}
            onChange={(event) => {
              formik.handleChange(event);
              const selectedBrand = event.target.value;
              const brandModels = tyreModels.find(
                (model) => model.tyre_brand === selectedBrand
              );
              if (brandModels) {
                formik.setFieldValue("tyre_model", brandModels.tyre_model);
              }
            }}
            error={
              formik.touched.tyre_brand && Boolean(formik.errors.tyre_brand)
            }
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
            select
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="tyre_model"
            name="tyre_model"
            label="Tyre Models"
            value={formik.values.tyre_model}
            onChange={formik.handleChange}
            error={
              formik.touched.tyre_model && Boolean(formik.errors.tyre_model)
            }
            helperText={formik.touched.tyre_model && formik.errors.tyre_model}
            className="login-input"
          >
            {tyreModels
              .filter(
                (option) => option.tyre_brand === formik.values.tyre_brand
              )
              .map((option) => (
                <MenuItem key={option._id} value={option.tyre_model}>
                  {option.tyre_model}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="tyre_type"
            name="tyre_type"
            label="Tyre Type"
            value={formik.values.tyre_type}
            onChange={formik.handleChange}
            error={formik.touched.tyre_type && Boolean(formik.errors.tyre_type)}
            helperText={formik.touched.tyre_type && formik.errors.tyre_type}
            className="login-input"
          >
            {tyreTypes.map((option) => (
              <MenuItem key={option._id} value={option.tyre_type}>
                {option.tyre_type}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="tyre_size"
            name="tyre_size"
            label="Tyre Size"
            value={formik.values.tyre_size}
            onChange={formik.handleChange}
            error={formik.touched.tyre_size && Boolean(formik.errors.tyre_size)}
            helperText={formik.touched.tyre_size && formik.errors.tyre_size}
            className="login-input"
          >
            {tyreSizes.map((option) => (
              <MenuItem key={option._id} value={option.tyre_size}>
                {option.tyre_size}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="ply_rating"
            name="ply_rating"
            label="Ply Rating"
            value={formik.values.ply_rating}
            onChange={formik.handleChange}
            error={
              formik.touched.ply_rating && Boolean(formik.errors.ply_rating)
            }
            helperText={formik.touched.ply_rating && formik.errors.ply_rating}
            className="login-input"
          >
            {plyRatings.map((option) => (
              <MenuItem key={option._id} value={option.ply_rating}>
                {option.ply_rating}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            margin="dense"
            variant="outlined"
            fullWidth
            id="warranty_date"
            name="warranty_date"
            label="Warranty upto"
            value={formik.values.warranty_date}
            onChange={formik.handleChange}
            error={
              formik.touched.warranty_date &&
              Boolean(formik.errors.warranty_date)
            }
            helperText={
              formik.touched.warranty_date && formik.errors.warranty_date
            }
            className="login-input"
            InputLabelProps={{ shrink: true }}
          />
          <br />
          <label htmlFor="tyreBlast" className="uploadBtn-secondary">
            Upload invoice image
          </label>
          <input
            type="file"
            multiple
            id="tyreBlast"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "tyre_invoice_image",
                "tyre_invoice_image",
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

export default NewTyre;

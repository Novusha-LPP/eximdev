import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { handleSingleFileUpload } from "../../utils/awsSingleFileUpload";
import Snackbar from "@mui/material/Snackbar";
import { validationSchema } from "../../schemas/outwardRegister/completeOutwardRegister";

function OutwardRegisterDetails() {
  const [courierAgency, setCourierAgency] = useState("Courier Agency");
  const { _id } = useParams();
  const [data, setData] = useState();
  const [fileSnackbar, setFileSnackbar] = useState(false);

  const formik = useFormik({
    initialValues: {
      weight: "",
      docket_no: "",
      outward_consignment_photo: "",
      courier_details: "Shree Anjani",
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/update-outward-register/${_id}`,
        values
      );
      alert(res.data.message);
      resetForm();
    },
  });

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-outward-register-details/${_id}`
      );

      setData(res.data);
    }

    getData();
  }, [_id]);

  return (
    <form onSubmit={formik.handleSubmit} className="feedback-form">
      <h3>Outward Register Details</h3>
      <br />
      {data && (
        <>
          <p>
            <strong>Courier Given Date:&nbsp;</strong>
            {data.bill_given_date}
          </p>

          <p>
            <strong>Party:&nbsp;</strong>
            {data.party}
          </p>

          <p>
            <strong>Division:&nbsp;</strong>
            {data.division}
          </p>

          <p>
            <strong>Email of Party:&nbsp;</strong>
            {data.party_email}
          </p>
        </>
      )}

      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="weight"
        name="weight"
        label="Weight"
        value={formik.values.weight}
        onChange={formik.handleChange}
        error={formik.touched.weight && Boolean(formik.errors.weight)}
        helperText={formik.touched.weight && formik.errors.weight}
        className="login-input"
      />

      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="docket_no"
        name="docket_no"
        label="Docket No"
        value={formik.values.docket_no}
        onChange={formik.handleChange}
        error={formik.touched.docket_no && Boolean(formik.errors.docket_no)}
        helperText={formik.touched.docket_no && formik.errors.docket_no}
        className="login-input"
      />

      <FormControl>
        <RadioGroup
          aria-labelledby="demo-radio-buttons-group-label"
          defaultValue="Courier Agency"
          name="radio-buttons-group"
          onChange={(e) => setCourierAgency(e.target.value)}
        >
          <FormControlLabel
            value="Courier Agency"
            control={<Radio />}
            label="Courier Agency"
          />
          <FormControlLabel
            value="Courier By Hand"
            control={<Radio />}
            label="Courier By Hand"
          />
        </RadioGroup>
      </FormControl>

      {courierAgency === "Courier Agency" ? (
        <TextField
          select
          size="small"
          margin="dense"
          variant="filled"
          fullWidth
          id="courier_details"
          name="courier_details"
          label="Courier Agency Name"
          value={formik.values.courier_details}
          onChange={formik.handleChange}
          error={
            formik.touched.courier_details &&
            Boolean(formik.errors.courier_details)
          }
          helperText={
            formik.touched.courier_details && formik.errors.courier_details
          }
          className="login-input"
        >
          <MenuItem value="Shree Anjani">Shree Anjani</MenuItem>
          <MenuItem value="Shree Maruti">Shree Maruti</MenuItem>
        </TextField>
      ) : (
        <TextField
          size="small"
          margin="dense"
          variant="filled"
          fullWidth
          id="courier_details"
          name="courier_details"
          label="Name"
          value={formik.values.courier_details}
          onChange={formik.handleChange}
          error={
            formik.touched.courier_details &&
            Boolean(formik.errors.courier_details)
          }
          helperText={
            formik.touched.courier_details && formik.errors.courier_details
          }
          className="login-input"
        />
      )}

      <br />
      <br />
      <label htmlFor="inward_consignment_photo">
        Upload Outward Consignment Photo&nbsp;
      </label>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) =>
          handleSingleFileUpload(
            e,
            "outward_consignment_photo",
            "outward_register",
            formik,
            setFileSnackbar
          )
        }
      />

      <br />
      <br />

      <button
        type="submit"
        className="btn"
        aria-label="submit-btn"
        style={{ marginBottom: "20px" }}
      >
        Submit
      </button>

      <Snackbar
        open={fileSnackbar}
        message="File uploaded successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </form>
  );
}

export default React.memo(OutwardRegisterDetails);

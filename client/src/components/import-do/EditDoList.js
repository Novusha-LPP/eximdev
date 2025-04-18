import React, { useContext } from "react";
import { Checkbox, FormControlLabel } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { handleFileUpload } from "../../utils/awsFileUpload";
import Snackbar from "@mui/material/Snackbar";
import { TextField } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { TabContext } from "./ImportDO";

function EditDoList() {
  const { _id } = useParams();
  const [fileSnackbar, setFileSnackbar] = React.useState(false);
  const [jobDetails, setJobDetails] = React.useState({
    job_no: "",
    importer: "",
    awb_bl_no: "",
  });
  const kycDocsRef = React.useRef();
  const location = useLocation();
  const { setCurrentTab } = useContext(TabContext);
  // This might be the job you're editing...
  const { selectedJobId } = location.state || {};

  React.useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-kyc-and-bond-status/${_id}`
        );
        const {
          shipping_line_kyc_completed,
          shipping_line_bond_completed,
          shipping_line_invoice_received,
          job_no,
          importer,
          awb_bl_no,
        } = res.data;

        // Set formik values based on the API response
        formik.setValues({
          ...formik.values,
          shipping_line_kyc_completed: shipping_line_kyc_completed === "Yes",
          shipping_line_bond_completed: shipping_line_bond_completed === "Yes",
          shipping_line_invoice_received:
            shipping_line_invoice_received === "Yes",
        });

        // Set job details for display
        setJobDetails({ job_no, importer, awb_bl_no });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    getData();
    // eslint-disable-next-line
  }, [_id]);

  const formik = useFormik({
    initialValues: {
      shipping_line_bond_completed: false,
      shipping_line_kyc_completed: false,
      shipping_line_invoice_received: false,
      kyc_documents: [],
      kyc_valid_upto: "",
      shipping_line_bond_valid_upto: "",
      shipping_line_bond_docs: [],
      shipping_line_insurance: [],
    },

    onSubmit: async (values, { resetForm }) => {
      const data = {
        ...values,
        _id,
        shipping_line_bond_completed: values.shipping_line_bond_completed
          ? "Yes"
          : "No",
        shipping_line_kyc_completed: values.shipping_line_kyc_completed
          ? "Yes"
          : "No",
        shipping_line_invoice_received: values.shipping_line_invoice_received
          ? "Yes"
          : "No",
      };

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/update-do-list`,
        data
      );
      alert(res.data.message);
      resetForm();
    },
  });

  // const currentState = window.history.state || {};
  //       const scrollPosition = currentState.scrollPosition || 0;

  //       navigate("/import-do", {
  //         state: {
  //           tabIndex: 2, // BillingSheet tab index
  //           scrollPosition, // Preserve scroll position
  //           selectedJobId,
  //         },
  //       });

  //       setCurrentTab(2); // Update the active tab in context

  return (
    <div>
      <h3>
        <abbr title="Job Number" style={{ textDecoration: "none" }}>
          {jobDetails.job_no}
        </abbr>{" "}
        |
        <abbr title="Airway Bill/BL Number" style={{ textDecoration: "none" }}>
          {jobDetails.awb_bl_no}
        </abbr>{" "}
        |
        <abbr title="Importer" style={{ textDecoration: "none" }}>
          {jobDetails.importer}
        </abbr>
      </h3>

      <form onSubmit={formik.handleSubmit}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.shipping_line_bond_completed}
              onChange={formik.handleChange}
              name="shipping_line_bond_completed"
              color="primary"
            />
          }
          label="Shipping line bond completed"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.shipping_line_kyc_completed}
              onChange={formik.handleChange}
              name="shipping_line_kyc_completed"
              color="primary"
            />
          }
          label="Shipping line KYC completed"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.shipping_line_invoice_received}
              onChange={formik.handleChange}
              name="shipping_line_invoice_received"
              color="primary"
            />
          }
          label="Shipping line invoice received"
        />

        <Row>
          <Col>
            <TextField
              fullWidth
              size="small"
              margin="normal"
              variant="outlined"
              type="date"
              id="kyc_valid_upto"
              name="kyc_valid_upto"
              label="KYC valid upto"
              value={formik.values.kyc_valid_upto}
              onChange={formik.handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Col>
          <Col>
            <TextField
              fullWidth
              size="small"
              margin="normal"
              variant="outlined"
              type="date"
              id="shipping_line_bond_valid_upto"
              name="shipping_line_bond_valid_upto"
              label="Shipping line bond valid upto"
              value={formik.values.shipping_line_bond_valid_upto}
              onChange={formik.handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Col>
        </Row>

        <Row>
          <Col>
            <label htmlFor="kyc_documents" className="btn">
              Upload KYC Documents
            </label>
            <input
              type="file"
              multiple
              name="kyc_documents"
              id="kyc_documents"
              onChange={(e) =>
                handleFileUpload(
                  e,
                  "kyc_documents",
                  "kyc_documents",
                  formik,
                  setFileSnackbar
                )
              }
              ref={kycDocsRef}
              className="input-hidden"
            />
            <br />
            {formik.values.kyc_documents?.map((file, index) => {
              return (
                <div key={index}>
                  <br />
                  <a href={file}>View</a>
                </div>
              );
            })}
          </Col>
          <Col>
            <label htmlFor="shipping_line_bond_docs" className="btn">
              Upload Shipping Line Bond Documents
            </label>
            <input
              type="file"
              multiple
              name="shipping_line_bond_docs"
              id="shipping_line_bond_docs"
              onChange={(e) =>
                handleFileUpload(
                  e,
                  "shipping_line_bond_docs",
                  "shipping_line_bond_docs",
                  formik,
                  setFileSnackbar
                )
              }
              ref={kycDocsRef}
              className="input-hidden"
            />
            <br />
            {formik.values.shipping_line_bond_docs?.map((file, index) => {
              return (
                <div key={index}>
                  <br />
                  <a href={file}>View</a>
                </div>
              );
            })}
          </Col>
          <Col>
            <label htmlFor="shipping_line_insurance" className="btn">
              Upload Shipping Line Insurance
            </label>
            <input
              type="file"
              multiple
              name="shipping_line_insurance"
              id="shipping_line_insurance"
              onChange={(e) =>
                handleFileUpload(
                  e,
                  "shipping_line_insurance",
                  "shipping_line_insurance",
                  formik,
                  setFileSnackbar
                )
              }
              ref={kycDocsRef}
              className="input-hidden"
            />
            <br />
            {formik.values.shipping_line_insurance?.map((file, index) => {
              return (
                <div key={index}>
                  <br />
                  <a href={file}>View</a>
                </div>
              );
            })}
          </Col>
        </Row>
        <br />
        <button type="submit" className="btn">
          Submit
        </button>
      </form>

      <Snackbar
        open={fileSnackbar}
        message={"File uploaded successfully!"}
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </div>
  );
}

export default React.memo(EditDoList);

import React, { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import axios from "axios";
// import { handleFileUpload } from "../../utils/awsFileUpload";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import { useParams } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import DeleteIcon from "@mui/icons-material/Delete";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
// import { Checkbox, FormControlLabel, TextField } from "@mui/material";
import {
  Checkbox,
  FormControlLabel,
  TextField,
  Button,
  Box,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  DialogContentText,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Row, Col } from "react-bootstrap";

function EditDoPlanning() {
  const [data, setData] = React.useState();
  const [loading, setLoading] = React.useState(true); // Loading state
  const [kycData, setKycData] = React.useState("");
  const [fileSnackbar, setFileSnackbar] = React.useState(false);
  const { _id } = useParams();
  //
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [currentField, setCurrentField] = useState(null);
  const [openImageDeleteModal, setOpenImageDeleteModal] = useState(false);
  const container_number_ref = useRef([]);
  const navigate = useNavigate();
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  };
  // Fetch data on component mount
  React.useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-job-by-id/${_id}`
        );
        console.log("API Response:", res.data); // Debugging log

        // Ensure correct access to the job object
        const jobData = res.data.job;
        // Update data and set appropriate flags for boolean values
        setData({
          ...jobData,
          shipping_line_invoice: jobData.shipping_line_invoice === "Yes",
          payment_made: jobData.payment_made === "Yes",
          do_processed: jobData.do_processed === "Yes",
          other_invoices: jobData.other_invoices === "Yes",
          security_deposit: jobData.security_deposit === "Yes",
        });

        setLoading(false); // Data loaded
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false); // Stop loading even if error occurs
      }
    }

    getData();
  }, [_id]);

  const formik = useFormik({
    initialValues: {
      security_deposit: false,
      security_amount: "",
      utr: [],
      other_invoices: false,
      payment_made: false,
      do_processed: false,
      do_documents: [],
      do_validity: "",
      do_copies: [],
      shipping_line_invoice: false,
      shipping_line_invoice_date: "",
      shipping_line_invoice_imgs: [],
      do_queries: [{ query: "", reply: "" }],
      do_completed: false,
      do_Revalidation_Completed: false,
    },

    onSubmit: async (values, { resetForm }) => {
      // Initialize navigate

      // Convert booleans back to "Yes" or "No"
      const data = {
        ...values,
        _id,
        do_Revalidation_Completed: values.do_Revalidation_Completed,
        shipping_line_invoice: values.shipping_line_invoice ? "Yes" : "No",
        payment_made: values.payment_made ? "Yes" : "No",
        do_processed: values.do_processed ? "Yes" : "No",
        do_completed: values.do_completed ? "Yes" : "No",
        other_invoices: values.other_invoices ? "Yes" : "No",
        security_deposit: values.security_deposit ? "Yes" : "No",
      };

      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/update-do-planning`,
          data
        );
        resetForm(); // Reset the form
        navigate("/import-do"); // Redirect to /import-do
      } catch (error) {
        console.error("Error submitting form:", error);
      }
    },
  });

  React.useEffect(() => {
    if (data) {
      const updatedData = {
        ...data,
        shipping_line_invoice:
          data.shipping_line_invoice === "Yes" ||
          data.shipping_line_invoice === true,
        shipping_line_invoice_date: formatDate(data.shipping_line_invoice_date),
        payment_made: data.payment_made === "Yes" || data.payment_made === true, // Handle similar cases for payment_made
        do_processed: data.do_processed === "Yes" || data.do_processed === true, // Handle similar cases for do_processed
        other_invoices:
          data.other_invoices === "Yes" || data.other_invoices === true, // Handle similar cases for other_invoices
        security_deposit:
          data.security_deposit === "Yes" || data.security_deposit === true, // Handle similar cases for security_deposit
        do_completed: data.do_completed === "Yes" || data.do_completed === true, // Handle similar cases for do_completed
        do_Revalidation_Completed: data.do_Revalidation_Completed,
        do_queries: data.do_queries || [{ query: "", reply: "" }],
      };

      formik.setValues(updatedData);
      console.log(
        "Update d shipping_line_invoice_date:",
        updatedData.shipping_line_invoice_date
      ); // Check if value is set
      async function getKycDocs() {
        const importer = data.importer;
        const shipping_line_airline = data.shipping_line_airline;
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/get-kyc-documents`,
          { importer, shipping_line_airline }
        );
        setKycData(res.data);
      }

      getKycDocs();
    }
  }, [data]);

  //

  //
  const handleAddField = () => {
    formik.setValues({
      ...formik.values,
      do_queries: [
        ...formik.values.do_queries,
        {
          query: "",
          reply: "",
        },
      ],
    });
  };

  // const containers = data.container_nos || [];
  // Render container details only if data is available
  const renderContainerDetails = () => {
    if (!data || !data.container_nos || data.container_nos.length === 0) {
      return <p>No containers available.</p>;
    }

    return data.container_nos.map((container, index) => (
      <div key={index} style={{ padding: "30px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h6 style={{ marginBottom: 0 }}>
            <strong>
              {index + 1}. Container Number:&nbsp;
              <span ref={(el) => (container_number_ref.current[index] = el)}>
                {container.container_number || "N/A"} | "{container.size}"
              </span>
            </strong>
          </h6>
        </div>

        {/* Render DO Revalidation Details */}
        {container.do_revalidation?.map((item, id) => (
          <Row key={id}>
            <Col xs={12} lg={4}>
              <div className="job-detail-input-container">
                <strong>DO Revalidation Upto:&nbsp;</strong>
                {item.do_revalidation_upto || ""}
              </div>
            </Col>
            <Col xs={12} lg={4}>
              <div className="job-detail-input-container">
                <strong>Remarks:&nbsp;</strong>
                {item.remarks || ""}
              </div>
            </Col>
            <Col xs={12} lg={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      formik.values.container_nos?.[index]?.do_revalidation?.[
                        id
                      ]?.do_Revalidation_Completed || false
                    }
                    onChange={(e) =>
                      formik.setFieldValue(
                        `container_nos[${index}].do_revalidation[${id}].do_Revalidation_Completed`,
                        e.target.checked
                      )
                    }
                    name={`container_nos[${index}].do_revalidation[${id}].do_Revalidation_Completed`}
                    color="primary"
                  />
                }
                label="DO Revalidation Completed"
              />
            </Col>
          </Row>
        ))}
      </div>
    ));
  };

  if (loading) return <p>Loading...</p>; // Show loading state

  if (!data) return <p>Failed to load job details.</p>; // Handle missing data
  console.log("shipping_line_invoice:", formik.values.shipping_line_invoice);

  return (
    <>
      <div style={{ margin: "20px 0" }}>
        {data && (
          <div>
            <div className="job-details-container">
              <Row>
                <h4>
                  Job Number:&nbsp;{data.job_no}&nbsp;|&nbsp;
                  {data && `Custom House: ${data.custom_house}`}
                </h4>
              </Row>

              <Row className="job-detail-row">
                <Col xs={12} lg={5}>
                  <strong>Importer:&nbsp;</strong>
                  <span className="non-editable-text">{data.importer}</span>
                </Col>
              </Row>
            </div>
            <form onSubmit={formik.handleSubmit}>
              <div className="job-details-container">
                <strong>KYC Documents:&nbsp;</strong>
                <br />
                {kycData.kyc_documents && (
                  <ImagePreview
                    images={kycData.kyc_documents} // Pass the array of KYC document URLs
                    readOnly // Makes it view-only
                  />
                )}

                <strong>KYC Valid Upto:&nbsp;</strong>
                {kycData.kyc_valid_upto}
                <br />
                <strong>BL Status:&nbsp;</strong>
                {data.obl_telex_bl || "N/A"}
                <br />
              </div>

              <div className="job-details-container">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.shipping_line_invoice}
                      onChange={(e) =>
                        formik.setFieldValue(
                          "shipping_line_invoice",
                          e.target.checked
                        )
                      }
                      name="shipping_line_invoice"
                      color="primary"
                    />
                  }
                  label="Shipping line invoice"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.payment_made}
                      onChange={(e) =>
                        formik.setFieldValue("payment_made", e.target.checked)
                      }
                      name="payment_made"
                      color="primary"
                    />
                  }
                  label="Payment Made"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.do_processed}
                      onChange={(e) =>
                        formik.setFieldValue("do_processed", e.target.checked)
                      }
                      name="do_processed"
                      color="primary"
                    />
                  }
                  label="DO processed"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.other_invoices}
                      onChange={(e) =>
                        formik.setFieldValue("other_invoices", e.target.checked)
                      }
                      name="other_invoices"
                      color="primary"
                    />
                  }
                  label="Other invoices"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.security_deposit}
                      onChange={(e) =>
                        formik.setFieldValue(
                          "security_deposit",
                          e.target.checked
                        )
                      }
                      name="security_deposit"
                      color="primary"
                    />
                  }
                  label="Security Deposit"
                />
                <TextField
                  date
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  type="date"
                  id="shipping_line_invoice_date"
                  name="shipping_line_invoice_date"
                  label="Shipping line invoice date"
                  value={formik.values.shipping_line_invoice_date}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
                <Row>
                  <Col>
                    <FileUpload
                      label="Upload Shipping Line Invoices"
                      bucketPath="shipping_line_invoice_imgs"
                      onFilesUploaded={(newFiles) => {
                        const existingFiles =
                          formik.values.shipping_line_invoice_imgs || [];
                        const updatedFiles = [...existingFiles, ...newFiles];
                        formik.setFieldValue(
                          "shipping_line_invoice_imgs",
                          updatedFiles
                        );
                      }}
                      multiple={true}
                    />

                    <ImagePreview
                      images={formik.values.shipping_line_invoice_imgs || []}
                      onDeleteImage={(index) => {
                        const updatedFiles = [
                          ...formik.values.shipping_line_invoice_imgs,
                        ];
                        updatedFiles.splice(index, 1);
                        formik.setFieldValue(
                          "shipping_line_invoice_imgs",
                          updatedFiles
                        );
                      }}
                    />
                  </Col>

                  <Col>
                    <FileUpload
                      label="DO Documents"
                      bucketPath="do_documents"
                      onFilesUploaded={(newFiles) => {
                        const existingFiles = formik.values.do_documents || [];
                        const updatedFiles = [...existingFiles, ...newFiles];
                        formik.setFieldValue("do_documents", updatedFiles);
                      }}
                      multiple={true}
                    />

                    <ImagePreview
                      images={formik.values.do_documents || []}
                      onDeleteImage={(index) => {
                        const updatedFiles = [...formik.values.do_documents];
                        updatedFiles.splice(index, 1);
                        formik.setFieldValue("do_documents", updatedFiles);
                      }}
                    />
                  </Col>

                  <Col></Col>
                </Row>
                <br />
                {formik.values.security_deposit === "Yes" && (
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="security_amount"
                    name="security_amount"
                    label="Security amount"
                    value={formik.values.security_amount}
                    onChange={formik.handleChange}
                  />
                )}
                <strong>UTR:&nbsp;</strong>
                {formik.values.utr?.map((file, index) => {
                  return (
                    <div key={index}>
                      <a href={file}>{file}</a>
                      <br />
                    </div>
                  );
                })}
                <br />
                <br />
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id="do_validity"
                  name="do_validity"
                  label="DO Validity"
                  value={formik.values.do_validity}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
                <Col>
                  <FileUpload
                    label="Upload DO Copies"
                    bucketPath="do_copies"
                    onFilesUploaded={(newFiles) => {
                      const existingFiles = formik.values.do_copies || [];
                      const updatedFiles = [...existingFiles, ...newFiles];
                      formik.setFieldValue("do_copies", updatedFiles);
                    }}
                    multiple={true}
                  />

                  <ImagePreview
                    images={formik.values.do_copies || []}
                    onDeleteImage={(index) => {
                      const updatedFiles = [...formik.values.do_copies];
                      updatedFiles.splice(index, 1);
                      formik.setFieldValue("do_copies", updatedFiles);
                    }}
                  />
                </Col>
              </div>

              <div className="job-details-container">
                <h5>DO Queries</h5>
                {formik.values.do_queries.map((item, id) => {
                  return (
                    <div key={id}>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        id={`do_queries[${id}].query`}
                        name={`do_queries[${id}].query`}
                        label="Query"
                        value={item.query}
                        onChange={formik.handleChange}
                      />
                      {item.reply}
                    </div>
                  );
                })}
                <br />
                <button type="button" className="btn" onClick={handleAddField}>
                  Add Query
                </button>
                <br />
                <br />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.do_completed}
                      onChange={(e) =>
                        formik.setFieldValue("do_completed", e.target.checked)
                      }
                      name="do_completed"
                      color="primary"
                    />
                  }
                  label="DO Completed"
                />
              </div>

              <br />
              <div className="job-details-container">
                <JobDetailsRowHeading heading="Container Details" />

                {renderContainerDetails()}
              </div>
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
        )}
      </div>
    </>
  );
}

export default React.memo(EditDoPlanning);

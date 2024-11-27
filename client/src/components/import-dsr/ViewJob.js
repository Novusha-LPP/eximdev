import React, { useState, useRef, useContext, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { IconButton, TextField, Autocomplete } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import "../../styles/job-details.scss";
import useFetchJobDetails from "../../customHooks/useFetchJobDetails";
import Checkbox from "@mui/material/Checkbox";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Snackbar from "@mui/material/Snackbar";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import AWS from "aws-sdk";
import { handleFileUpload } from "../../utils/awsFileUpload";
import { handleCopyContainerNumber } from "../../utils/handleCopyContainerNumber";
import JobDetailsStaticData from "./JobDetailsStaticData";
import JobDetailsRowHeading from "./JobDetailsRowHeading";
import FormGroup from "@mui/material/FormGroup";
import { TabValueContext } from "../../contexts/TabValueContext";
import { handleNetWeightChange } from "../../utils/handleNetWeightChange";
import { UserContext } from "../../contexts/UserContext";
import DeleteIcon from "@mui/icons-material/Delete";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import FileUpload from "../../components/gallery/FileUpload.js";

function JobDetails() {
  const params = useParams();
  const { user } = useContext(UserContext);
  const { setTabValue } = React.useContext(TabValueContext);
  const options = Array.from({ length: 25 }, (_, index) => index);
  const [checked, setChecked] = useState(false);
  const [selectedRegNo, setSelectedRegNo] = useState();
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const bl_no_ref = useRef();
  const checklistRef = useRef();
  const processedBeAttachmentRef = useRef();
  const oocCopyRef = useRef();
  const gatePassCopyRef = useRef();
  const weighmentSlipRef = useRef();
  const container_number_ref = useRef([]);

  // delete modal
  const [openDialog, setOpenDialog] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const {
    data,
    detentionFrom,
    formik,
    cthDocuments,
    setCthDocuments,
    handleFileChange,
    selectedDocuments,
    setSelectedDocuments,
    handleDocumentChange,
    handleAddDocument,
    handleRemoveDocument,
    newDocumentName,
    setNewDocumentName,
    setNewDocumentCode,
    newDocumentCode,

    filterDocuments,
  } = useFetchJobDetails(
    params,
    checked,
    setSelectedRegNo,
    setTabValue,
    setFileSnackbar
  );

  // Helper function to update the `detailed_status` based on form values
  const updateDetailedStatus = () => {
    const {
      vessel_berthing: eta,
      gateway_igm_date: gatewayIGMDate,
      discharge_date: dischargeDate,
      out_of_charge: outOfChargeDate,
      delivery_date: deliveryDate,
      pcv_date: pcvDate,
      container_nos,
    } = formik.values;

    const billOfEntryNo = formik.values.be_no || data?.be_no;
    const anyContainerArrivalDate = container_nos?.some(
      (container) => container.arrival_date
    );

    if (
      billOfEntryNo &&
      anyContainerArrivalDate &&
      outOfChargeDate &&
      deliveryDate
    ) {
      formik.setFieldValue("detailed_status", "Billing Pending");
    } else if (billOfEntryNo && anyContainerArrivalDate && outOfChargeDate) {
      formik.setFieldValue("detailed_status", "Custom Clearance Completed");
    } else if (billOfEntryNo && anyContainerArrivalDate && pcvDate) {
      formik.setFieldValue("detailed_status", "PCV Done, Duty Payment Pending");
    } else if (billOfEntryNo && anyContainerArrivalDate) {
      formik.setFieldValue("detailed_status", "BE Noted, Clearance Pending");
    } else if (billOfEntryNo) {
      formik.setFieldValue("detailed_status", "BE Noted, Arrival Pending");
    } else if (dischargeDate) {
      formik.setFieldValue("detailed_status", "Discharged");
    } else if (gatewayIGMDate) {
      formik.setFieldValue("detailed_status", "Gateway IGM Filed");
    } else if (eta === "" || eta === "Invalid Date") {
      formik.setFieldValue("detailed_status", "ETA Date Pending");
    } else if (eta) {
      console.log(eta);
      formik.setFieldValue("detailed_status", "Estimated Time of Arrival");
    } else {
      console.log("No conditions met");
    }
  };

  // // Trigger the `updateDetailedStatus` function when form values change
  useEffect(() => {
    updateDetailedStatus();
  }, [
    formik.values.vessel_berthing,
    formik.values.gateway_igm_date,
    formik.values.discharge_date,
    formik.values.arrival_date, // Ensure this is included
    formik.values.out_of_charge,
    formik.values.pcv_date,
    formik.values.completed_operation_date,
    formik.values.be_no,
    formik.values.delivery_date,
    formik.values.container_nos, // Include container_nos to track the changes in arrival_date for containers
  ]);

  const handleRadioChange = (event) => {
    const selectedValue = event.target.value;

    if (selectedValue === "clear") {
      setSelectedRegNo("");
      formik.setFieldValue("sims_reg_no", "");
      formik.setFieldValue("pims_reg_no", "");
      formik.setFieldValue("nfmims_reg_no", "");
      formik.setFieldValue("sims_date", "");
      formik.setFieldValue("pims_date", "");
      formik.setFieldValue("nfmims_date", "");
    } else {
      setSelectedRegNo(selectedValue);
      formik.setFieldValue("sims_reg_no", "");
      formik.setFieldValue("pims_reg_no", "");
      formik.setFieldValue("nfmims_reg_no", "");
      formik.setFieldValue("sims_date", "");
      formik.setFieldValue("pims_date", "");
      formik.setFieldValue("nfmims_date", "");
    }
  };

  const handleBlStatusChange = (event) => {
    const selectedValue = event.target.value;

    if (selectedValue === "clear") {
      formik.setFieldValue("obl_telex_bl", "");
    } else {
      formik.setFieldValue("obl_telex_bl", selectedValue);
    }
  };

  const handleWeighmentSlip = async (e, container_number, fileType) => {
    if (e.target.files.length === 0) {
      alert("No file selected");
      return;
    }

    try {
      const s3 = new AWS.S3({
        accessKeyId: process.env.REACT_APP_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
        region: "ap-south-1",
      });

      const updatedWeighmentSlips = await Promise.all(
        formik.values.container_nos?.map(async (container) => {
          if (container.container_number === container_number) {
            const fileUrls = [];

            for (let i = 0; i < e.target.files.length; i++) {
              const file = e.target.files[i];
              const params = {
                Bucket: "alvision-exim-images",
                Key: `${fileType}/${container_number}/${file.name}`,
                Body: file,
              };

              // Upload the file to S3 and wait for the promise to resolve
              const data = await s3.upload(params).promise();

              // Store the S3 URL in the fileUrls array
              fileUrls.push({ url: data.Location, container_number });
            }

            // Update the container with the new images, replacing the old ones
            return {
              ...container,
              [fileType]: fileUrls,
            };
          }

          return container;
        })
      );

      // Update the formik values with the updated container images
      formik.setValues((values) => ({
        ...values,
        container_nos: updatedWeighmentSlips,
      }));

      setFileSnackbar(true);

      setTimeout(() => {
        setFileSnackbar(false);
      }, 3000);
    } catch (err) {
      console.error("Error uploading files:", err);
    }
  };

  const handleTransporterChange = (e, index) => {
    if (e.target.checked === true) {
      formik.setFieldValue(`container_nos[${index}].transporter`, "SRCC");
    } else {
      formik.setFieldValue(`container_nos[${index}].transporter`, "");
    }
  };

  const handleAddContainer = () => {
    formik.setFieldValue("container_nos", [
      ...formik.values.container_nos,
      {
        container_number: "",
        size: "",
        arrival_date: "",
        do_validity_upto_container_level: "",
        do_revalidation_date: "",
        do_revalidation: [],
        physical_weight: "",
        tare_weight: "",
        actual_weight: "",
        net_weight: "",
        weight_shortage: "",
        transporter: "",
      },
    ]);
  };
  const handleDeleteContainer = () => {
    if (deleteConfirmText === "Delete") {
      formik.setFieldValue(
        "container_nos",
        formik.values.container_nos.filter((_, i) => i !== containerToDelete)
      );
      setOpenDialog(false);
      setDeleteConfirmText("");
    } else {
      alert("Please type 'Delete' to confirm.");
    }
  };
  const handleDeleteRevalidation = (containerIndex, revalidationIndex) => {
    formik.setFieldValue(
      `container_nos[${containerIndex}].do_revalidation`,
      formik.values.container_nos[containerIndex].do_revalidation.filter(
        (_, index) => index !== revalidationIndex
      )
    );
  };

  const handleDateChange = (newDate) => {
    const updatedContainers = formik.values.container_nos.map((container) => ({
      ...container,
      required_do_validity_upto: newDate,
    }));

    formik.setFieldValue("container_nos", updatedContainers);
  };

  return (
    <>
      {data !== null && (
        <form onSubmit={formik.handleSubmit}>
          <JobDetailsStaticData
            data={data}
            params={params}
            bl_no_ref={bl_no_ref}
            setSnackbar={setSnackbar}
            container_nos={formik.values.container_nos}
            // Passing be_no from formik
          />

          <div className="job-details-container">
            <JobDetailsRowHeading heading="Documents" />
            <br />
            <Row style={{ marginBottom: "20px" }}>
              <Col xs={12} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id="cth_no"
                  name="cth_no"
                  label="CTH No."
                  value={formik.values.cth_no}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Col>
            </Row>

            {/* CTH Documents Section */}
            <Row>
              {cthDocuments?.map((doc, index) => (
                <Col
                  xs={12}
                  lg={4}
                  key={`cth-${index}`}
                  style={{ marginBottom: "20px" }}
                >
                  <FileUpload
                    label={`${doc.document_name} (${doc.document_code})`}
                    bucketPath={`cth-documents/${doc.document_name}`}
                    onFilesUploaded={(urls) => {
                      const updatedDocuments = [...cthDocuments];
                      if (!Array.isArray(updatedDocuments[index].url)) {
                        updatedDocuments[index].url = []; // Ensure `url` is an array
                      }
                      updatedDocuments[index].url = [
                        ...updatedDocuments[index].url,
                        ...urls,
                      ]; // Append new URLs
                      setCthDocuments(updatedDocuments);
                    }}
                    multiple={true} // Allow multiple uploads
                  />
                  <ImagePreview
                    images={doc.url || []} // Pass all uploaded URLs
                    onDeleteImage={(deleteIndex) => {
                      const updatedDocuments = [...cthDocuments];
                      updatedDocuments[index].url = updatedDocuments[
                        index
                      ].url.filter((_, i) => i !== deleteIndex); // Remove the specific URL
                      setCthDocuments(updatedDocuments);
                    }}
                    readOnly={false}
                  />
                </Col>
              ))}
            </Row>

            {/* Add Document Section */}
            <Row style={{ marginTop: "20px", marginBottom: "20px" }}>
              <Col xs={12} lg={4}>
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  label="New Document Name"
                  value={newDocumentName}
                  onChange={(e) => setNewDocumentName(e.target.value)} // Update state for document name
                />
              </Col>
              <Col xs={12} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  label="New Document Code"
                  value={newDocumentCode}
                  onChange={(e) => setNewDocumentCode(e.target.value)} // Update state for document code
                />
              </Col>
              <Col
                xs={12}
                lg={4}
                style={{ display: "flex", alignItems: "center" }}
              >
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: "8px", height: "fit-content" }}
                  onClick={() => {
                    if (newDocumentName.trim() && newDocumentCode.trim()) {
                      setCthDocuments([
                        ...cthDocuments,
                        {
                          document_name: newDocumentName,
                          document_code: newDocumentCode, // Use provided document code
                          url: [], // Initialize with an empty URL array
                        },
                      ]);
                      setNewDocumentName(""); // Clear name input after adding
                      setNewDocumentCode(""); // Clear code input after adding
                    }
                  }}
                >
                  Add Document
                </button>
              </Col>
            </Row>
          </div>
          <div className="job-details-container">
            <JobDetailsRowHeading heading="All Documents" />
            <br />
            <Col xs={6}>
              <FileUpload
                label="All Documents"
                bucketPath="all_documents"
                onFilesUploaded={(newFiles) => {
                  const existingFiles = formik.values.all_documents || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  formik.setFieldValue("all_documents", updatedFiles);
                }}
                multiple={true}
              />
              <ImagePreview
                images={formik.values.all_documents || []}
                onDeleteImage={(index) => {
                  const updatedFiles = [...formik.values.all_documents];
                  updatedFiles.splice(index, 1);
                  formik.setFieldValue("all_documents", updatedFiles);
                }}
              />
            </Col>
          </div>

          <div className="job-details-container">
            <JobDetailsRowHeading heading="Completion Status" />

            <Row>
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>
                    Documentation Status:{" "}
                    {formik.values.documentation_completed_date_time ? (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.documentation_completed_date_time
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    ) : (
                      <span style={{ marginLeft: "10px" }}>Pending</span>
                    )}
                  </strong>
                </div>
              </Col>

              {user?.role === "Admin" && (
                <Col xs={12} md={3}>
                  <TextField
                    type="datetime-local"
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="documentation_completed_date_time"
                    name="documentation_completed_date_time"
                    label="Set Date (Admin Only)"
                    value={
                      formik.values.documentation_completed_date_time || ""
                    }
                    onChange={(e) =>
                      formik.setFieldValue(
                        "documentation_completed_date_time",
                        e.target.value
                      )
                    } // Update formik value
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Col>
              )}
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>
                    E-Sanchit Status:{" "}
                    {/* {formik.values.documentation_completed_date_time && (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.documentation_completed_date_time
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    )} */}
                  </strong>
                </div>
              </Col>

              {/* {user?.role === "Admin" && (
                <Col xs={12} md={3}>
                  <TextField
                    type="datetime-local"
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="documentation_completed_date_time"
                    name="documentation_completed_date_time"
                    label="Set Date (Admin Only)"
                    value={
                      formik.values.documentation_completed_date_time || ""
                    }
                    onChange={(e) =>
                      formik.setFieldValue(
                        "documentation_completed_date_time",
                        e.target.value
                      )
                    } // Update formik value
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Col>
              )} */}
            </Row>
            <Row>
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>
                    Submission Status:{" "}
                    {/* {formik.values.documentation_completed_date_time && (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.documentation_completed_date_time
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    )} */}
                  </strong>
                </div>
              </Col>

              {/* {user?.role === "Admin" && (
                <Col xs={12} md={3}>
                  <TextField
                    type="datetime-local"
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="documentation_completed_date_time"
                    name="documentation_completed_date_time"
                    label="Set Date (Admin Only)"
                    value={
                      formik.values.documentation_completed_date_time || ""
                    }
                    onChange={(e) =>
                      formik.setFieldValue(
                        "documentation_completed_date_time",
                        e.target.value
                      )
                    } // Update formik value
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Col>
              )} */}
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>
                    Documentation Status:{" "}
                    {formik.values.bill_document_sent_to_accounts ? (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.bill_document_sent_to_accounts
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    ) : (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        Pending
                      </span>
                    )}
                  </strong>
                </div>
              </Col>

              {user?.role === "Admin" && (
                <Col xs={12} md={3}>
                  <TextField
                    type="datetime-local"
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="bill_document_sent_to_accounts"
                    name="bill_document_sent_to_accounts"
                    label="Set Date (Admin Only)"
                    value={formik.values.bill_document_sent_to_accounts || ""}
                    onChange={(e) =>
                      formik.setFieldValue(
                        "bill_document_sent_to_accounts",
                        e.target.value
                      )
                    } // Update formik value
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Col>
              )}
            </Row>

            <JobDetailsRowHeading heading="Queries" />
            <br />
            {formik.values.do_queries.length > 0 &&
              formik.values.do_queries.map((item, id) => (
                <Row key={id}>
                  {id === 0 && <h5>DO Queries</h5>}

                  <Col xs={6}>{item.query}</Col>
                  <Col xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id={`do_queries[${id}].reply`}
                      name={`do_queries[${id}].reply`}
                      label="Reply"
                      value={item.reply}
                      onChange={formik.handleChange}
                    />
                  </Col>
                </Row>
              ))}
            {formik.values.documentationQueries.length > 0 &&
              formik.values.documentationQueries.map((item, id) => (
                <Row key={id}>
                  <br />
                  {id === 0 && <h5>Documentation Queries</h5>}
                  <Col>{item.query}</Col>
                  <Col>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id={`documentationQueries[${id}].reply`}
                      name={`documentationQueries[${id}].reply`}
                      label="Reply"
                      value={item.reply}
                      onChange={formik.handleChange}
                    />
                  </Col>
                </Row>
              ))}
            {formik.values.eSachitQueries.length > 0 &&
              formik.values.eSachitQueries.map((item, id) => (
                <Row key={id}>
                  <br />
                  {id === 0 && <h5>E-Sanchit Queries</h5>}
                  <Col>{item.query}</Col>
                  <Col>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id={`eSachitQueries[${id}].reply`}
                      name={`eSachitQueries[${id}].reply`}
                      label="Reply"
                      value={item.reply}
                      onChange={formik.handleChange}
                    />
                  </Col>
                </Row>
              ))}
            {formik.values.submissionQueries.length > 0 &&
              formik.values.submissionQueries.map((item, id) => (
                <Row key={id}>
                  <br />
                  {id === 0 && <h5>Submission Queries</h5>}
                  <Col>{item.query}</Col>
                  <Col>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id={`submissionQueries[${id}].reply`}
                      name={`submissionQueries[${id}].reply`}
                      label="Reply"
                      value={item.reply}
                      onChange={formik.handleChange}
                    />
                  </Col>
                </Row>
              ))}
          </div>

          {/*************************** Row 8 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Description and Checklist" />
            <Row className="job-detail-row">
              <div className="job-detail-input-container">
                <strong>Description:&nbsp;</strong>
                <TextField
                  size="small"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  id="description"
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                />
              </div>
              <div>
                <FileUpload
                  label="Upload Checklist"
                  bucketPath="checklist"
                  onFilesUploaded={(newFiles) => {
                    const existingFiles = formik.values.checklist || [];
                    const updatedFiles = [...existingFiles, ...newFiles];
                    formik.setFieldValue("checklist", updatedFiles);
                  }}
                  multiple={true}
                />

                <ImagePreview
                  images={formik.values.checklist || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...formik.values.checklist];
                    updatedFiles.splice(index, 1);
                    formik.setFieldValue("checklist", updatedFiles);
                  }}
                />
              </div>
            </Row>
          </div>
          {/*************************** Row 9 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Status" />
            <Row>
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>Status:&nbsp;</strong>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="status"
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                  </TextField>
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Detailed Status:&nbsp;</strong>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="detailed_status"
                    name="detailed_status"
                    value={formik.values.detailed_status}
                    onChange={formik.handleChange}
                  >
                    <MenuItem value="ETA Date Pending">
                      ETA Date Pending
                    </MenuItem>
                    <MenuItem value="Estimated Time of Arrival">
                      Estimated Time of Arrival
                    </MenuItem>
                    <MenuItem value="Gateway IGM Filed">
                      Gateway IGM Filed
                    </MenuItem>
                    <MenuItem value="Discharged">Discharged</MenuItem>
                    <MenuItem value="BE Noted, Arrival Pending">
                      BE Noted, Arrival Pending
                    </MenuItem>
                    <MenuItem value="BE Noted, Clearance Pending">
                      BE Noted, Clearance Pending
                    </MenuItem>
                    <MenuItem value="PCV Done, Duty Payment Pending">
                      PCV Done, Duty Payment Pending
                    </MenuItem>
                    <MenuItem value="Custom Clearance Completed">
                      Cus.Clearance Completed, delivery pending
                    </MenuItem>

                    <MenuItem value="Billing Pending">Billing Pending</MenuItem>
                  </TextField>
                </div>
              </Col>
              <Col xs={12} lg={5}>
                <FormControl>
                  <RadioGroup
                    row
                    aria-labelledby="demo-radio-buttons-group-label"
                    name="radio-buttons-group"
                    value={formik.values.obl_telex_bl}
                    onChange={handleBlStatusChange}
                    style={{ justifyContent: "center", alignItems: "center", display: "flex" }}
                  >
                    <FormControlLabel
                      value="OBL"
                      control={
                        <Radio checked={formik.values.obl_telex_bl === "OBL"} />
                      }
                      label="OBL"
                    />
                    <FormControlLabel
                      value="Telex"
                      control={
                        <Radio
                          checked={formik.values.obl_telex_bl === "Telex"}
                        />
                      }
                      label="Telex"
                    />
                    <FormControlLabel
                      value="Surrender BL"
                      control={
                        <Radio
                          checked={
                            formik.values.obl_telex_bl === "Surrender BL"
                          }
                        />
                      }
                      label="Surrender BL"
                    />
                    <FormControlLabel
                      value="clear"
                      control={<Radio />}
                      label="Clear"
                    />
                  </RadioGroup>
                </FormControl>
              </Col>
            </Row>
            <Row>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>
                    {formik.values.obl_telex_bl === "OBL"
                      ? "Original Document Received Date:"
                      : "Document Received Date:"}
                  </strong>
                  &nbsp;
                  {formik.values.document_received_date}
                </div>
              </Col>

              {user.role === "Admin" && (
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>
                      {formik.values.obl_telex_bl === "OBL"
                        ? "Original Document Received Date:"
                        : "Document Received Date:"}
                    </strong>
                    &nbsp;
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="date"
                      id="document_received_date"
                      name="document_received_date"
                      value={formik.values.document_received_date}
                      onChange={formik.handleChange}
                    />
                  </div>
                </Col>
              )}
            </Row>
            <Row>
              <Col xs={12} lg={6}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>DO Planning & Type:&nbsp;</strong>
                  <RadioGroup
                    row
                    aria-label="do-planning-type"
                    name="type_of_Do"
                    value={formik.values.type_of_Do}
                    onChange={(e) => {
                      const selectedValue = e.target.value;

                      if (selectedValue === "Clear") {
                        // Reset values when "Clear" is selected
                        formik.setFieldValue("type_of_Do", "");
                        formik.setFieldValue("do_planning_date", "");
                      } else {
                        // Set the selected type and current date-time
                        const currentDateTime = new Date().toISOString();
                        formik.setFieldValue("type_of_Do", selectedValue);
                        formik.setFieldValue(
                          "do_planning_date",
                          currentDateTime
                        );
                      }
                    }}
                    style={{ marginLeft: "10px" }}
                  >
                    <FormControlLabel
                      value="ICD"
                      control={
                        <Radio
                          style={{
                            color:
                              formik.values.type_of_Do === "ICD"
                                ? "green"
                                : "inherit",
                          }}
                        />
                      }
                      label="ICD"
                    />
                    <FormControlLabel
                      value="Factory"
                      control={
                        <Radio
                          style={{
                            color:
                              formik.values.type_of_Do === "Factory"
                                ? "green"
                                : "inherit",
                          }}
                        />
                      }
                      label="Factory"
                    />
                    <FormControlLabel
                      value="Clear"
                      control={
                        <Radio
                          style={{
                            color:
                              formik.values.type_of_Do === "Clear"
                                ? "red"
                                : "inherit",
                          }}
                        />
                      }
                      label="Clear"
                    />
                  </RadioGroup>

                  {/* Show the current date and time */}
                  {formik.values.do_planning_date &&
                    new Date(formik.values.do_planning_date).toLocaleString(
                      "en-US",
                      {
                        timeZone: "Asia/Kolkata",
                        hour12: true,
                      }
                    )}
                </div>
              </Col>

              {user.role === "Admin" && (
                <Col xs={12} lg={6}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>DO Planning Date:&nbsp;</strong>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="datetime-local"
                      id="do_planning_date"
                      name="do_planning_date"
                      value={
                        formik.values.do_planning_date
                          ? new Date(formik.values.do_planning_date)
                              .toISOString()
                              .slice(0, 16) // Format for datetime-local input
                          : ""
                      }
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue) {
                          formik.setFieldValue(
                            "do_planning_date",
                            new Date(newValue).toISOString()
                          );
                        } else {
                          formik.setFieldValue("do_planning_date", "");
                        }
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </div>
                </Col>
              )}
            </Row>
            <Row>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong style={{ width: "50%" }}>DO Validity:&nbsp;</strong>
                  {formik.values.do_revalidation ? (
                    formik.values.do_validity_upto_job_level
                  ) : (
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="date"
                      id="do_validity_upto_job_level"
                      name="do_validity_upto_job_level"
                      value={formik.values.do_validity_upto_job_level}
                      onChange={formik.handleChange}
                    />
                  )}
                </div>
              </Col>
              <Col xs={12} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <Col xs={12} lg={12}>
                    <div className="job-detail-input-container">
                      <strong>Required DO Validity Upto:&nbsp;</strong>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        type="date"
                        id={`required_do_validity_upto_0`}
                        name={`container_nos[0].required_do_validity_upto`}
                        value={
                          formik.values.container_nos[0]
                            ?.required_do_validity_upto || ""
                        }
                        onChange={(e) => handleDateChange(e.target.value)}
                      />
                    </div>
                  </Col>
                </div>
              </Col>
            </Row>
            <Row>
              <Col xs={12} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>DO Revalidation:&nbsp;</strong>
                  <Checkbox
                    value={formik.values.do_revalidation}
                    checked={formik.values.do_revalidation}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      if (isChecked) {
                        // Set current date-time when checked
                        const currentDateTime = new Date().toISOString();
                        formik.setFieldValue("do_revalidation", true);
                        formik.setFieldValue(
                          "do_revalidation_date",
                          currentDateTime
                        );
                      } else {
                        // Clear values when unchecked
                        formik.setFieldValue("do_revalidation", false);
                        formik.setFieldValue("do_revalidation_date", "");
                      }
                    }}
                  />
                  {formik.values.do_revalidation_date &&
                    new Date(formik.values.do_revalidation_date).toLocaleString(
                      "en-US",
                      {
                        timeZone: "Asia/Kolkata",
                        hour12: true,
                      }
                    )}
                </div>
              </Col>

              {user.role === "Admin" && (
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>DO Revalidation Date:&nbsp;</strong>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="datetime-local"
                      id="do_revalidation_date"
                      name="do_revalidation_date"
                      value={
                        formik.values.do_revalidation_date
                          ? new Date(formik.values.do_revalidation_date)
                              .toISOString()
                              .slice(0, 16) // Format for datetime-local input
                          : ""
                      }
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue) {
                          formik.setFieldValue("do_revalidation", true);
                          formik.setFieldValue(
                            "do_revalidation_date",
                            new Date(newValue).toISOString()
                          );
                        } else {
                          formik.setFieldValue("do_revalidation", false);
                          formik.setFieldValue("do_revalidation_date", "");
                        }
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </div>
                </Col>
              )}
            </Row>
            <Row>
              <Col xs={12} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Examination Planning:&nbsp;</strong>
                  <Checkbox
                    value={formik.values.examinationPlanning}
                    checked={formik.values.examinationPlanning}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      if (isChecked) {
                        // Set current date-time when checked
                        const currentDateTime = new Date().toISOString();
                        formik.setFieldValue("examinationPlanning", true);
                        formik.setFieldValue(
                          "examination_planning_date",
                          currentDateTime
                        );
                      } else {
                        // Clear values when unchecked
                        formik.setFieldValue("examinationPlanning", false);
                        formik.setFieldValue("examination_planning_date", "");
                      }
                    }}
                  />
                  {formik.values.examination_planning_date &&
                    new Date(
                      formik.values.examination_planning_date
                    ).toLocaleString("en-US", {
                      timeZone: "Asia/Kolkata",
                      hour12: true,
                    })}
                </div>
              </Col>
              {user.role === "Admin" && (
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>Examination Planning Date:&nbsp;</strong>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="datetime-local"
                      id="examination_planning_date"
                      name="examination_planning_date"
                      value={
                        formik.values.examination_planning_date
                          ? new Date(formik.values.examination_planning_date)
                              .toISOString()
                              .slice(0, 16) // Format for datetime-local input
                          : ""
                      }
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue) {
                          formik.setFieldValue("examinationPlanning", true);
                          formik.setFieldValue(
                            "examination_planning_date",
                            new Date(newValue).toISOString()
                          );
                        } else {
                          formik.setFieldValue("examinationPlanning", false);
                          formik.setFieldValue("examination_planning_date", "");
                        }
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </div>
                </Col>
              )}
            </Row>
            
          </div>
          {/*************************** Row 10 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="SIMS/PIMS/NFMIMS" />
            <br />
            <Row>
              <Col sx={12} lg={2}>
                <strong>SIMS Reg No and Date</strong>
              </Col>
              <Col>
                <TextField
                  id="outlined-start-adornment"
                  size="small"
                  fullWidth
                  // sx={{ m: 1 }}
                  name="sims_reg_no"
                  value={formik.values.sims_reg_no}
                  onChange={formik.handleChange}
                />
              </Col>
              <Col>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  sx={{ margin: 0 }}
                  variant="outlined"
                  id="sims_date"
                  name="sims_date"
                  value={formik.values.sims_date}
                  onChange={formik.handleChange}
                />
              </Col>
            </Row>
            <br />
            <Row>
              <Col sx={12} lg={2}>
                <strong>PIMS Reg No and Date</strong>
              </Col>
              <Col>
                <TextField
                  id="outlined-start-adornment"
                  size="small"
                  fullWidth
                  name="pims_reg_no"
                  value={formik.values.pims_reg_no}
                  onChange={formik.handleChange}
                />
              </Col>
              <Col>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  variant="outlined"
                  id="pims_date"
                  name="pims_date"
                  sx={{ margin: 0 }}
                  value={formik.values.pims_date}
                  onChange={formik.handleChange}
                />
              </Col>
            </Row>
            <br />
            <Row>
              <Col sx={12} lg={2}>
                <strong>NFMIMS Reg No and Date</strong>
              </Col>
              <Col>
                <TextField
                  id="outlined-start-adornment"
                  size="small"
                  fullWidth
                  name="nfmims_reg_no"
                  value={formik.values.nfmims_reg_no}
                  onChange={formik.handleChange}
                />
              </Col>
              <Col>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  variant="outlined"
                  id="nfmims_date"
                  name="nfmims_date"
                  sx={{ margin: 0 }}
                  value={formik.values.nfmims_date}
                  onChange={formik.handleChange}
                />
              </Col>
            </Row>
          </div>
          {/*************************** Row 11 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Dates" />
            <Row>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>ETA:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="vessel_berthing"
                    name="vessel_berthing"
                    value={formik.values.vessel_berthing}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Gateway IGM Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="gateway_igm_date"
                    name="gateway_igm_date"
                    value={formik.values.gateway_igm_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Discharge Date/ IGM Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="discharge_date"
                    name="discharge_date"
                    value={formik.values.discharge_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
            </Row>
            {/*************************** Row 12 ****************************/}
            <Row>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Assessment Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="assessment_date"
                    name="assessment_date"
                    value={formik.values.assessment_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <strong>Examination Date:&nbsp;</strong>
                  {data.examination_date ? data.examination_date : ""}
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <strong>PCV Date:&nbsp;</strong>
                  {data.pcv_date ? data.pcv_date : ""}
                </div>
              </Col>
            </Row>

            {/*************************** Row 13 ****************************/}
            <Row>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Duty Paid Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="duty_paid_date"
                    name="duty_paid_date"
                    value={formik.values.duty_paid_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>DO Validity:&nbsp;</strong>
                  {formik.values.do_validity}
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Out of Charge Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="out_of_charge"
                    name="out_of_charge"
                    value={formik.values.out_of_charge}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
            </Row>

            <Row className="my-3">
              <Col xs={12} lg={4} className="mb-3">
                <div className="job-detail-input-container">
                  <strong>Delivery Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    margin="normal"
                    variant="outlined"
                    id="delivery_date"
                    name="delivery_date"
                    value={formik.values.delivery_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>

              <Col xs={12} lg={4} className="mb-3">
                <div className="job-detail-input-container">
                  <Checkbox
                    checked={formik.values.checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setChecked(true);
                        formik.setFieldValue("checked", true);
                      } else {
                        setChecked(false);
                        formik.setFieldValue("checked", false);
                      }
                    }}
                  />
                  {!formik.values.checked && (
                    <strong>All containers arrived at same date</strong>
                  )}
                  {formik.values.checked && (
                    <>
                      <strong>Arrival Date:&nbsp;</strong>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        type="date"
                        id="arrival_date"
                        name="arrival_date"
                        value={formik.values.arrival_date}
                        onChange={formik.handleChange}
                      />
                    </>
                  )}
                </div>
              </Col>

              <Col xs={12} lg={4} className="mb-3">
                <div
                  className="job-detail-input-container"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <strong>Completed Operation Date:&nbsp;</strong>
                  {data.completed_operation_date
                    ? data.completed_operation_date
                    : ""}
                </div>
              </Col>
            </Row>

            <br />
            <Row>
              <Col xs={6}>
                <div className="mb-3">
                  <strong>DO Copies:&nbsp;</strong>
                  <ImagePreview
                    images={formik.values.do_copies || []} // Corrected optional chaining syntax
                    readOnly
                  />
                </div>
              </Col>
              <Col xs={6}>
                <FileUpload
                  label="Upload Processed BE Attachment"
                  bucketPath="processed_be_attachment"
                  onFilesUploaded={(newFiles) => {
                    const existingFiles =
                      formik.values.processed_be_attachment || [];
                    const updatedFiles = [...existingFiles, ...newFiles];
                    formik.setFieldValue(
                      "processed_be_attachment",
                      updatedFiles
                    );
                  }}
                  multiple={true}
                />
                <ImagePreview
                  images={formik.values.processed_be_attachment || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [
                      ...formik.values.processed_be_attachment,
                    ];
                    updatedFiles.splice(index, 1);
                    formik.setFieldValue(
                      "processed_be_attachment",
                      updatedFiles
                    );
                  }}
                />
              </Col>
            </Row>

            <Row>
              <Col xs={6}>
                <FileUpload
                  label="Upload OOC Copy"
                  bucketPath="ooc_copies"
                  onFilesUploaded={(newFiles) => {
                    const existingFiles = formik.values.ooc_copies || [];
                    const updatedFiles = [...existingFiles, ...newFiles];
                    formik.setFieldValue("ooc_copies", updatedFiles);
                  }}
                  multiple={true}
                />
                <ImagePreview
                  images={formik.values.ooc_copies || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...formik.values.ooc_copies];
                    updatedFiles.splice(index, 1);
                    formik.setFieldValue("ooc_copies", updatedFiles);
                  }}
                />
              </Col>

              <Col xs={6}>
                <FileUpload
                  label="Upload e-Gate Pass Copy"
                  bucketPath="gate_pass_copies"
                  onFilesUploaded={(newFiles) => {
                    const existingFiles = formik.values.gate_pass_copies || [];
                    const updatedFiles = [...existingFiles, ...newFiles];
                    formik.setFieldValue("gate_pass_copies", updatedFiles);
                  }}
                  multiple={true}
                />
                <ImagePreview
                  images={formik.values.gate_pass_copies || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...formik.values.gate_pass_copies];
                    updatedFiles.splice(index, 1);
                    formik.setFieldValue("gate_pass_copies", updatedFiles);
                  }}
                />
              </Col>
            </Row>
          </div>

          {/*************************** Row 14 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Remarks" />
            <Row>
              <Col>
                <div className="job-detail-input-container">
                  <strong>Remarks:&nbsp;</strong>
                  <TextField
                    multiline
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="remarks"
                    name="remarks"
                    value={formik.values.remarks}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
            </Row>
          </div>

          <div className="job-details-container">
            <JobDetailsRowHeading heading="Container Details" />
            {/* {formik.values.status !== "" && 
              formik.values.container_nos?.map((container, index) => {
                return ( */}
            {(formik.values.status !== "" &&
            formik.values.container_nos?.length > 0
              ? formik.values.container_nos
              : [
                  {
                    container_number: "",
                    size: "",
                    arrival_date: "",
                    do_revalidation: [],
                  },
                ]
            )?.map((container, index) => {
              return (
                <div key={index}>
                  <div
                    style={{
                      padding: "30px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <h6 style={{ marginBottom: 0 }}>
                        <strong>
                          {index + 1}. Container Number:&nbsp;
                          <span ref={container_number_ref[index]}>
                            <TextField
                              size="small"
                              value={container.container_number}
                              key={index}
                              variant="outlined"
                              id={`container_number_${index}`}
                              name={`container_nos[${index}].container_number`}
                              onChange={formik.handleChange}
                            />
                          </span>
                          <IconButton
                            onClick={() =>
                              handleCopyContainerNumber(
                                container.container_number,
                                setSnackbar
                              )
                            }
                            aria-label="copy-btn"
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </strong>
                      </h6>

                      <strong style={{ marginLeft: "20px" }}>
                        Size:&nbsp;
                      </strong>
                      <TextField
                        select
                        size="small"
                        margin="normal"
                        variant="outlined"
                        id={`size_${index}`}
                        name={`container_nos[${index}].size`}
                        value={container.size}
                        onChange={formik.handleChange}
                      >
                        <MenuItem value="20">20</MenuItem>
                        <MenuItem value="40">40</MenuItem>
                      </TextField>
                    </div>
                    <br />
                    <Row>
                      {!checked && (
                        <Col xs={12} lg={3}>
                          <div className="job-detail-input-container">
                            <strong>Arrival Date:&nbsp;</strong>
                            <TextField
                              fullWidth
                              key={index}
                              size="small"
                              margin="normal"
                              variant="outlined"
                              type="date"
                              id={`arrival_date_${index}`}
                              name={`container_nos[${index}].arrival_date`}
                              value={container.arrival_date}
                              onChange={formik.handleChange}
                            />
                          </div>
                        </Col>
                      )}
                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>Free Time:&nbsp;</strong>
                          <TextField
                            fullWidth
                            select
                            size="small"
                            margin="normal"
                            variant="outlined"
                            id="free_time"
                            name="free_time"
                            value={formik.values.free_time}
                            onChange={formik.handleChange}
                            disabled={user.role !== "Admin"} // Disable if the user is not Admin
                          >
                            {options?.map((option, id) => (
                              <MenuItem key={id} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                        </div>
                      </Col>

                      <Col xs={12} lg={3} className="flex-div">
                        <strong>Detention From:&nbsp;</strong>
                        {detentionFrom[index]}
                      </Col>

                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>DO Validity :&nbsp;</strong>
                          <TextField
                            fullWidth
                            key={index}
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="date"
                            id={`do_validity_upto_container_level_${index}`}
                            name={`container_nos[${index}].do_validity_upto_container_level`}
                            value={container.do_validity_upto_container_level}
                            onChange={formik.handleChange}
                          />
                        </div>
                      </Col>
                      {/* <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>Required DO Validity Upto:&nbsp;</strong>
                          <TextField
                            fullWidth
                            key={index}
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="date"
                            id={`required_do_validity_upto_${index}`}
                            name={`container_nos[${index}].required_do_validity_upto`}
                            value={container.required_do_validity_upto}
                            onChange={formik.handleChange}
                          />
                        </div>
                      </Col> */}
                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>Required DO Validity Upto:&nbsp;</strong>
                          <TextField
                            fullWidth
                            key={index}
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="date"
                            id={`required_do_validity_upto_${index}`}
                            name={`container_nos[${index}].required_do_validity_upto`}
                            value={container.required_do_validity_upto}
                            onChange={(e) => handleDateChange(e.target.value)}
                          />
                        </div>
                      </Col>
                    </Row>

                    {container.do_revalidation?.map((item, id) => {
                      return (
                        <Row key={id}>
                          <Col xs={12} lg={3}>
                            <div className="job-detail-input-container">
                              <strong>DO Revalidation Upto:&nbsp;</strong>
                              <TextField
                                fullWidth
                                size="small"
                                margin="normal"
                                variant="outlined"
                                type="date"
                                id={`do_revalidation_date_${index}_${id}`}
                                name={`container_nos[${index}].do_revalidation[${id}].do_revalidation_upto`}
                                value={item.do_revalidation_upto}
                                onChange={formik.handleChange}
                              />
                            </div>
                          </Col>
                          <Col xs={10} lg={8}>
                            <div className="job-detail-input-container">
                              <strong>Remarks:&nbsp;</strong>
                              <TextField
                                fullWidth
                                size="small"
                                margin="normal"
                                variant="outlined"
                                id={`remarks_${index}_${id}`}
                                name={`container_nos[${index}].do_revalidation[${id}].remarks`}
                                value={item.remarks}
                                onChange={formik.handleChange}
                              />
                            </div>
                          </Col>
                          <Col
                            xs={2}
                            lg={1}
                            className="d-flex align-items-center"
                          >
                            <IconButton
                              aria-label="delete-revalidation"
                              onClick={() =>
                                handleDeleteRevalidation(index, id)
                              }
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Col>
                        </Row>
                      );
                    })}

                    {/* Add DO Revalidation Button */}
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        const newRevalidation = {
                          do_revalidation_upto: "",
                          remarks: "",
                        };
                        formik.setFieldValue(
                          `container_nos[${index}].do_revalidation`,
                          [...container.do_revalidation, newRevalidation]
                        );
                      }}
                    >
                      Add DO Revalidation
                    </button>

                    <Row className="job-detail-row">
                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>Physical Weight:&nbsp;</strong>
                          {container.physical_weight}
                        </div>
                      </Col>
                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>Tare Weight:&nbsp;</strong>
                          {container.tare_weight}
                        </div>
                      </Col>
                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>Actual Weight:&nbsp;</strong>
                          {container.actual_weight}
                        </div>
                      </Col>
                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>Weight as per Document:&nbsp;</strong>
                          <TextField
                            fullWidth
                            key={index}
                            size="small"
                            margin="normal"
                            variant="outlined"
                            id={`net_weight_${index}`}
                            name={`container_nos[${index}].net_weight`}
                            value={container.net_weight}
                            onChange={(e) =>
                              handleNetWeightChange(e, index, formik)
                            }
                          />
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col xs={12} lg={3}>
                        <div
                          className="job-detail-input-container"
                          style={{
                            backgroundColor:
                              container.weight_shortage < 0
                                ? "red"
                                : "transparent",
                            padding: "5px",
                            borderRadius: "4px",
                            color:
                              container.weight_shortage < 0
                                ? "white"
                                : "inherit",
                          }}
                        >
                          <strong>Weight Excess/Shortage:&nbsp;</strong>
                          {container.weight_shortage}
                        </div>
                      </Col>

                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <FormGroup>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={container.transporter === "SRCC"}
                                  disabled={!formik.values.out_of_charge}
                                />
                              }
                              label="Transporter: SRCC"
                              onChange={(e) =>
                                handleTransporterChange(e, index)
                              }
                            />
                          </FormGroup>
                        </div>
                      </Col>
                      <Col>
                        {container.transporter !== "SRCC" && (
                          <div className="job-detail-input-container">
                            <strong>Transporter:&nbsp;</strong>
                            <TextField
                              fullWidth
                              key={index}
                              size="small"
                              margin="normal"
                              variant="outlined"
                              id={`transporter_${index}`}
                              name={`container_nos[${index}].transporter`}
                              value={container.transporter}
                              onChange={formik.handleChange}
                            />
                          </div>
                        )}
                      </Col>
                    </Row>

                    <Row>
                      <Col>
                        <br />
                        <label
                          htmlFor={`weighmentSlip${index}`}
                          className="btn"
                        >
                          Upload Weighment Slip
                        </label>
                        <input
                          type="file"
                          multiple
                          id={`weighmentSlip${index}`}
                          onChange={(e) => {
                            handleWeighmentSlip(
                              e,
                              container.container_number,
                              "weighment_slip_images"
                            );
                          }}
                          className="input-hidden"
                          ref={weighmentSlipRef}
                        />
                        <br />
                        <br />
                        {container.weighment_slip_images?.map((image, id) => {
                          // eslint-disable-next-line
                          return <a href={image.url} key={id} />;
                        })}
                      </Col>
                    </Row>

                    <Row>
                      <Col xs={12} md={6}>
                        {/* Weighment Slip Images */}

                        <div className="mb-3">
                          <strong>Weighment Slip Images:&nbsp;</strong>
                          <ImagePreview
                            images={container?.weighment_slip_images || []}
                            readOnly
                          />
                        </div>

                        {/* Container Pre-Damage Images */}
                        <div className="mb-3">
                          <strong>Container Pre-Damage Images:&nbsp;</strong>
                          <ImagePreview
                            images={
                              container?.container_pre_damage_images || []
                            }
                            readOnly
                          />
                        </div>
                      </Col>

                      <Col xs={12} md={6}>
                        {/* Container Images */}
                        <div className="mb-3">
                          <strong>Container Images:&nbsp;</strong>
                          <ImagePreview
                            images={container?.container_images || []}
                            readOnly
                          />
                        </div>
                        {/* Loose Material Images */}
                        <div className="mb-3">
                          <strong>Loose Material Images:&nbsp;</strong>
                          <ImagePreview
                            images={container?.loose_material || []}
                            readOnly
                          />
                        </div>

                        {/* Examination Videos */}
                      </Col>
                      <Col xs={12} md={6}>
                        <div className="mb-3">
                          <strong>Examination Videos:&nbsp;</strong>
                          <ImagePreview
                            images={container?.examination_videos || []}
                            readOnly
                          />
                        </div>
                      </Col>
                    </Row>
                  </div>

                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <button
                      className="btn"
                      type="button"
                      onClick={handleAddContainer}
                    >
                      Add Container
                    </button>
                    <button
                      className="btn-danger"
                      type="button"
                      onClick={() => {
                        setOpenDialog(true);
                        setContainerToDelete(index);
                      }}
                    >
                      Delete Container
                    </button>
                  </div>
                  <hr />
                </div>
              );
            })}
          </div>
          <Row>
            <Col>
              <button
                className="btn"
                type="submit"
                style={{ float: "right", margin: "10px" }}
                aria-label="submit-btn"
              >
                Submit
              </button>
            </Col>
          </Row>
        </form>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar || fileSnackbar}
        message={
          snackbar ? "Copied to clipboard" : "File uploaded successfully!"
        }
        sx={{ left: "auto !important", right: "24px !important" }}
      />
      {/* Confirm Deletion */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please type <strong>Delete</strong> in the box below to confirm you
            want to delete this container.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="delete-confirm"
            label="Type 'Delete' to confirm"
            fullWidth
            variant="outlined"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteContainer} color="error">
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default React.memo(JobDetails);

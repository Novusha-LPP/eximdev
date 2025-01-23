import React, { useState, useRef, useContext, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { useParams } from "react-router-dom";
import {
  IconButton,
  TextField,
  Autocomplete,
  InputLabel,
  Select,
  Typography,
} from "@mui/material";
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
import {
  handleNetWeightChange,
  handleGrossWeightChange,
} from "../../utils/handleNetWeightChange";
import { UserContext } from "../../contexts/UserContext";
import DeleteIcon from "@mui/icons-material/Delete";
import Switch from "@mui/material/Switch";
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
import ConfirmDialog from "../../components/gallery/ConfirmDialog.js";
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
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [currentDocument, setCurrentDocument] = useState(null);
  const [actionType, setActionType] = useState(""); // "edit" or "delete"

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});

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
    canEditOrDelete,
    cth_Dropdown,
    filterDocuments,
    selectedDocument,
    setSelectedDocument,
    clearanceOptionsMapping,
    jobDetails,
    setJobDetails,
    type_of_b_e,
    setTypeOfBE,
    clearanceValue,
    setClearanceValue,
    scheme,
    setScheme,
    exBondValue,
    setExBondValue,
    be_no,
    setBeNo,
    be_date,
    setBeDate,
    ooc_copies,
    setOocCopies,
    beTypeOptions,
    filteredClearanceOptions,
    canChangeClearance,
    resetOtherDetails,
    schemeOptions,
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
      // Clear the values when "clear" is selected
      formik.setFieldValue("obl_telex_bl", "");
      formik.setFieldValue("document_received_date", "");
    } else {
      // Set the selected value for the radio button
      formik.setFieldValue("obl_telex_bl", selectedValue);

      // Set the current date and time for "document_received_date"
      const currentDateTime = new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16); // Format to "yyyy-MM-ddTHH:mm"

      formik.setFieldValue("document_received_date", currentDateTime);
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
        container_gross_weight: "",
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

  // const handleOpenDialog = (doc, action) => {
  //   setCurrentDocument(doc);
  //   setActionType(action);
  //   setDialogOpen(true);
  // };

  // const handleCloseDialog = () => {
  //   setDialogOpen(false);
  //   setCurrentDocument(null);
  //   setActionType("");
  // };

  // const handleConfirmDialog = () => {
  //   if (actionType === "delete") {
  //     setCthDocuments((prevDocs) =>
  //       prevDocs.filter((doc) => doc !== currentDocument)
  //     );
  //   } else if (actionType === "edit") {
  //     const newName = prompt(
  //       "Enter new document name:",
  //       currentDocument.document_name
  //     );
  //     const newCode = prompt(
  //       "Enter new document code:",
  //       currentDocument.document_code
  //     );

  //     if (newName && newCode) {
  //       setCthDocuments((prevDocs) =>
  //         prevDocs.map((doc) =>
  //           doc === currentDocument
  //             ? { ...doc, document_name: newName, document_code: newCode }
  //             : doc
  //         )
  //       );
  //     }
  //   }
  //   handleCloseDialog();
  // };

  const handleOpenDialog = (doc, isEdit = false) => {
    setCurrentDocument(doc);
    setIsEditMode(isEdit);

    if (isEdit) {
      setEditValues({ ...doc });
    }
    setDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentDocument(null);
    setIsEditMode(false);
    setEditValues({});
  };

  // Confirm action (delete or edit)
  const handleConfirmDialog = () => {
    if (isEditMode) {
      // Save edited document
      setCthDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc === currentDocument ? { ...doc, ...editValues } : doc
        )
      );
    } else {
      // Delete document
      setCthDocuments((prevDocs) =>
        prevDocs.filter((doc) => doc !== currentDocument)
      );
    }

    handleCloseDialog();
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
            {/* <JobDetailsRowHeading heading="Documents" /> */}
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
              {/* Bill of Entry No. Section */}
              {/* {user.role === "Admin" ? (
                <> */}
              <Col xs={12} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id="be_no"
                  name="be_no"
                  value={formik.values.be_no}
                  onChange={formik.handleChange}
                  label="Bill of Entry Number"
                  InputLabelProps={{ shrink: true }}
                />
              </Col>
              <Col xs={12} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  type="date"
                  id="be_date"
                  name="be_date"
                  value={formik.values.be_date}
                  onChange={formik.handleChange}
                  label="Bill of Entry Date"
                  InputLabelProps={{ shrink: true }}
                />
              </Col>
              <Col xs={12} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="do_revalidation_date"
                    name="do_revalidation_date"
                    label="FTA Benefit:"
                    value={
                      formik.values.fta_Benefit_date_time
                        ? formik.values.fta_Benefit_date_time
                        : ""
                    }
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue) {
                        formik.setFieldValue("fta_Benefit_date_time", newValue);
                      } else {
                        formik.setFieldValue("fta_Benefit_date_time", "");
                      }
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </div>
              </Col>
              {/* <Col xs={12} lg={2}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id="type_of_b_e"
                  name="type_of_b_e"
                  label="Select BE Type"
                  value={formik.values.type_of_b_e}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="Home">Home</MenuItem>
                  <MenuItem value="In-Bond">In-Bond</MenuItem>
                  <MenuItem value="Ex-Bond">Ex-Bond</MenuItem>
                </TextField>
              </Col> */}

              {/* Column for selecting Clearance Value */}
              {/* <Col xs={12} lg={2}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id="clearanceValue"
                  name="clearanceValue"
                  label="Clearance Value"
                  value={formik.values.clearanceValue}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                >
                  {clearanceOptionsMapping[formik.values.type_of_b_e] &&
                    clearanceOptionsMapping[formik.values.type_of_b_e].map(
                      (option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      )
                    )}
                </TextField>
              </Col> */}

              {/* </>
              ) : null} */}
            </Row>
            <Row>
              <Col xs={12} lg={3}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  variant="outlined"
                  id="free_time"
                  name="free_time"
                  label="Free Time"
                  value={formik.values.free_time}
                  onChange={formik.handleChange}
                  style={{ marginTop: "10px" }}
                  // disabled={user.role !== "Admin"} // Disable if the user is not Admin
                >
                  {options?.map((option, id) => (
                    <MenuItem key={id} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Col>
              <Col
                xs={12}
                lg={3}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Typography variant="body1" sx={{ mr: 1 }}>
                  Frist check
                </Typography>
                <Switch
                  checked={Boolean(formik.values.fristCheck)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Calculate current date-time adjusted for timezone and slice to 'YYYY-MM-DDTHH:mm'
                      const currentDateTime = new Date(
                        Date.now() - new Date().getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .slice(0, 16);
                      formik.setFieldValue("fristCheck", currentDateTime);
                    } else {
                      formik.setFieldValue("fristCheck", "");
                    }
                  }}
                  name="fristCheck"
                  color="primary"
                />
                {formik.values.fristCheck && (
                  <>
                    <Typography variant="body1" sx={{ color: "green", ml: 1 }}>
                      Active
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ ml: 1, fontWeight: "bold" }}
                    >
                      {new Date(formik.values.fristCheck).toLocaleString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "Asia/Kolkata",
                        }
                      )}
                    </Typography>
                  </>
                )}
              </Col>
              <Col
                xs={12}
                lg={3}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Typography variant="body1" sx={{ ml: 2, mr: 1 }}>
                  Priority Job:
                </Typography>
                <RadioGroup
                  row
                  name="priorityJob"
                  value={formik.values.priorityJob}
                  onChange={formik.handleChange}
                  sx={{ alignItems: "center" }}
                >
                  <FormControlLabel
                    value="normal"
                    control={<Radio size="small" />}
                    label="Normal"
                    sx={{
                      color: "green",
                      "& .MuiSvgIcon-root": { color: "green" },
                    }}
                  />
                  <FormControlLabel
                    value="priority"
                    control={<Radio size="small" />}
                    label="Priority"
                    sx={{
                      color: "orange",
                      "& .MuiSvgIcon-root": { color: "orange" },
                    }}
                  />
                  <FormControlLabel
                    value="high"
                    control={<Radio size="small" />}
                    label="High Priority"
                    sx={{
                      color: "red",
                      "& .MuiSvgIcon-root": { color: "red" },
                    }}
                  />
                </RadioGroup>
              </Col>
              <Col
                xs={12}
                lg={3}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Typography variant="body1" sx={{ ml: 2, mr: 1 }}>
                  Payment Method:
                </Typography>
                <RadioGroup
                  row
                  name="payment_method"
                  value={formik.values.payment_method}
                  onChange={formik.handleChange}
                  sx={{ alignItems: "center" }}
                >
                  <FormControlLabel
                    value="Transaction"
                    control={<Radio size="small" />}
                    label="Transaction"
                    // sx={{
                    //   color: "green",
                    //   "& .MuiSvgIcon-root": { color: "green" },
                    // }}
                  />
                  <FormControlLabel
                    value="Deferred"
                    control={<Radio size="small" />}
                    label="Deferred"
                    // sx={{
                    //   color: "orange",
                    //   "& .MuiSvgIcon-root": { color: "orange" },
                    // }}
                  />
                </RadioGroup>
              </Col>

              <Col xs={12} lg={3}>
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id="gross_weight"
                  name="gross_weight"
                  label="Gross Weight"
                  value={formik.values.gross_weight}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Col>
            </Row>
            <Row style={{ marginTop: "10px" }}>
              {/* BE Type Selection */}
              <Col xs={12} lg={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="BE Type:"
                  name="type_of_b_e"
                  value={formik.values.type_of_b_e}
                  onChange={formik.handleChange}
                  style={{ marginBottom: "16px" }}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    Select BE Type
                  </MenuItem>
                  {beTypeOptions.map((option, index) => (
                    <MenuItem key={index} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Col>

              {/* Clearance Under Selection */}
              <Col xs={12} lg={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="Clearance Under:"
                  name="clearanceValue"
                  value={formik.values.clearanceValue}
                  onChange={(e) => {
                    if (canChangeClearance()) {
                      formik.setFieldValue("clearanceValue", e.target.value);
                    } else {
                      alert(
                        "Please clear Ex-Bond details before changing Clearance Under."
                      );
                    }
                  }}
                  style={{ marginBottom: "16px" }}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    Select Clearance Type
                  </MenuItem>
                  {filteredClearanceOptions.map((option, index) => (
                    <MenuItem key={index} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Col>

              {/* Scheme Selection */}
              <Col xs={12} lg={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  variant="outlined"
                  label="Scheme:"
                  name="scheme"
                  value={formik.values.scheme}
                  onChange={formik.handleChange}
                  style={{ marginBottom: "16px" }}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    Select Scheme
                  </MenuItem>
                  {schemeOptions.map((schemeOption, index) => (
                    <MenuItem key={index} value={schemeOption}>
                      {schemeOption}
                    </MenuItem>
                  ))}
                </TextField>
              </Col>

              {/* Ex-Bond Details (shown only if Clearance Under is "Ex-Bond") */}
              <Col xs={12} lg={3}>
                {formik.values.clearanceValue === "Ex-Bond" && (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    variant="outlined"
                    label="In-Bond:"
                    name="exBondValue"
                    value={formik.values.exBondValue}
                    onChange={formik.handleChange}
                    style={{ marginBottom: "16px" }}
                    displayEmpty
                  >
                    <MenuItem value="" disabled>
                      Select In-Bond Type
                    </MenuItem>
                    {/* Static "Other" option */}
                    <MenuItem value="other">Other</MenuItem>
                    {/* Dynamic Job Details from API */}
                    {jobDetails.map((job) => (
                      <MenuItem key={job.job_no} value={job.job_no}>
                        {`${job.job_no} - ${job.importer}`}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Col>

              {/* Additional BE Details if the "other" option is selected */}
              {formik.values.exBondValue === "other" && (
                <>
                  <Col xs={12} lg={3}>
                    <TextField
                      fullWidth
                      size="small"
                      variant="outlined"
                      label="InBond BE Number"
                      name="in_bond_be_no"
                      value={formik.values.in_bond_be_no}
                      onChange={formik.handleChange}
                    />
                  </Col>

                  <Col xs={12} lg={3}>
                    <TextField
                      fullWidth
                      size="small"
                      variant="outlined"
                      label="InBond BE Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      name="in_bond_be_date"
                      value={formik.values.in_bond_be_date}
                      onChange={formik.handleChange}
                    />
                  </Col>

                  <Row>
                    <Col xs={12} lg={3}>
                      <FileUpload
                        label="Upload InBond BE Copy"
                        bucketPath="ex_be_copy_documents"
                        onFilesUploaded={(newFiles) =>
                          formik.setFieldValue("in_bond_ooc_copies", [
                            ...formik.values.in_bond_ooc_copies,
                            ...newFiles,
                          ])
                        }
                        multiple
                      />
                      <ImagePreview
                        images={formik.values.in_bond_ooc_copies || []}
                        onDeleteImage={(index) => {
                          const updatedFiles = [
                            ...formik.values.in_bond_ooc_copies,
                          ];
                          updatedFiles.splice(index, 1);
                          formik.setFieldValue(
                            "in_bond_ooc_copies",
                            updatedFiles
                          );
                        }}
                      />
                    </Col>
                    <Col xs={12} lg={3}>
                      {formik.values.clearanceValue === "Ex-Bond" && (
                        <Row style={{ marginTop: "10px" }}>
                          <Col xs={12}>
                            <Button
                              variant="contained"
                              color="secondary"
                              onClick={resetOtherDetails}
                            >
                              Reset Ex-Bond Details
                            </Button>
                          </Col>
                        </Row>
                      )}
                    </Col>
                  </Row>
                </>
              )}
            </Row>
          </div>

          <div className="job-details-container">
            <JobDetailsRowHeading heading="Documents" />
            <br />

            {/* CTH Documents Section */}

            <Row>
              {cthDocuments?.map((doc, index) => (
                <Col
                  xs={12}
                  lg={4}
                  key={`cth-${index}`}
                  style={{ marginBottom: "20px", position: "relative" }}
                >
                  <FileUpload
                    label={`${doc.document_name} (${doc.document_code})`}
                    bucketPath={`cth-documents/${doc.document_name}`}
                    onFilesUploaded={(urls) => {
                      const updatedDocuments = [...cthDocuments];
                      updatedDocuments[index].url = [
                        ...(updatedDocuments[index].url || []),
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
                  {/* Small icons for Edit and Delete */}
                  <div
                    style={{ position: "absolute", top: "10px", right: "10px" }}
                  >
                    <span
                      style={{
                        cursor: "pointer",
                        marginRight: "10px",
                        color: "#007bff",
                      }}
                      onClick={() => handleOpenDialog(doc, true)}
                    >
                      <i className="fas fa-edit" title="Edit"></i>
                    </span>
                    <span
                      style={{ cursor: "pointer", color: "#dc3545" }}
                      onClick={() => handleOpenDialog(doc, false)}
                    >
                      <i className="fas fa-trash-alt" title="Delete"></i>
                    </span>
                  </div>
                </Col>
              ))}
            </Row>
            {/*  */}

            {/* Add Document Section */}
            <Row style={{ marginTop: "20px", marginBottom: "20px" }}>
              <Col xs={12} lg={3}>
                <FormControl
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                >
                  <InputLabel>Select Document</InputLabel>
                  <Select
                    value={selectedDocument}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      if (selectedValue === "other") {
                        setNewDocumentName("");
                        setNewDocumentCode("");
                      }
                      setSelectedDocument(selectedValue);
                    }}
                    label="Select Document"
                  >
                    {cth_Dropdown.map((doc) => (
                      <MenuItem
                        key={doc.document_code}
                        value={doc.document_code}
                      >
                        {doc.document_name}
                      </MenuItem>
                    ))}
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Col>

              {selectedDocument === "other" && (
                <>
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
                </>
              )}

              <Col
                xs={12}
                lg={2}
                style={{ display: "flex", alignItems: "center" }}
              >
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: "8px", height: "fit-content" }}
                  onClick={() => {
                    if (
                      selectedDocument !== "other" &&
                      selectedDocument &&
                      cth_Dropdown.some(
                        (doc) => doc.document_code === selectedDocument
                      )
                    ) {
                      const selectedDoc = cth_Dropdown.find(
                        (doc) => doc.document_code === selectedDocument
                      );
                      setCthDocuments([
                        ...cthDocuments,
                        {
                          document_name: selectedDoc.document_name,
                          document_code: selectedDoc.document_code,
                          url: [],
                          document_check_date: "",
                        },
                      ]);
                    } else if (
                      selectedDocument === "other" &&
                      newDocumentName.trim() &&
                      newDocumentCode.trim()
                    ) {
                      setCthDocuments([
                        ...cthDocuments,
                        {
                          document_name: newDocumentName,
                          document_code: newDocumentCode,
                          url: [],
                          document_check_date: "",
                        },
                      ]);
                      setNewDocumentName("");
                      setNewDocumentCode("");
                    }
                    setSelectedDocument(""); // Reset dropdown
                  }}
                >
                  Add Document
                </button>
              </Col>
            </Row>

            {/*  */}
            {/*  */}
          </div>
          {/* test232423242 */}
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
                    Documentation Completed:{" "}
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
                    E-Sanchit Completed:{" "}
                    {formik.values.esanchit_completed_date_time ? (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.esanchit_completed_date_time
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
                    id="esanchit_completed_date_time"
                    name="esanchit_completed_date_time"
                    label="Set Date (Admin Only)"
                    value={formik.values.esanchit_completed_date_time || ""}
                    onChange={(e) =>
                      formik.setFieldValue(
                        "esanchit_completed_date_time",
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
            <Row>
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>
                    Submission Completed:{" "}
                    {formik.values.submission_completed_date_time ? (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.submission_completed_date_time
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
                    id="submission_completed_date_time"
                    name="submission_completed_date_time"
                    label="Set Date (Admin Only)"
                    value={formik.values.submission_completed_date_time || ""}
                    onChange={(e) =>
                      formik.setFieldValue(
                        "submission_completed_date_time",
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
                    Do Completed:{" "}
                    {formik.values.do_completed ? (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(formik.values.do_completed).toLocaleString(
                          "en-US",
                          {
                            timeZone: "Asia/Kolkata",
                            hour12: true,
                          }
                        )}
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
                    id="do_completed"
                    name="do_completed"
                    label="Set Date (Admin Only)"
                    value={formik.values.do_completed || ""}
                    onChange={(e) =>
                      formik.setFieldValue("do_completed", e.target.value)
                    } // Update formik value
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Col>
              )}
            </Row>
            <Row>
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>
                    DO Billing Completed:{" "}
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
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>
                    Operation Completed:{" "}
                    {formik.values.completed_operation_date ? (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.completed_operation_date
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
                    id="completed_operation_date"
                    name="completed_operation_date"
                    label="Set Date (Admin Only)"
                    value={formik.values.completed_operation_date || ""}
                    onChange={(e) =>
                      formik.setFieldValue(
                        "completed_operation_date",
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
              <Col xs={12} lg={4}>
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
              </Col>
              <Col xs={12} lg={4}>
                <FileUpload
                  label="Job Sticker Upload"
                  bucketPath="job-sticker"
                  onFilesUploaded={(newFiles) => {
                    const existingFiles =
                      formik.values.job_sticker_upload || [];
                    const updatedFiles = [...existingFiles, ...newFiles];
                    formik.setFieldValue("job_sticker_upload", updatedFiles);
                  }}
                  multiple={true}
                />

                <ImagePreview
                  images={formik.values.job_sticker_upload || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...formik.values.job_sticker_upload];
                    updatedFiles.splice(index, 1);
                    formik.setFieldValue("job_sticker_upload", updatedFiles);
                  }}
                />
              </Col>
            </Row>
          </div>
          {/*************************** Row 9 ****************************/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Status" />
            <Row>
              <Col xs={12} lg={4}>
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
            </Row>

            <Row>
              <Col xs={12} lg={4}>
                <FormControl>
                  <RadioGroup
                    row
                    aria-labelledby="demo-radio-buttons-group-label"
                    name="radio-buttons-group"
                    value={formik.values.obl_telex_bl}
                    onChange={handleBlStatusChange}
                    style={{ marginTop: "10px" }}
                  >
                    <FormControlLabel
                      value="OBL"
                      control={
                        <Radio checked={formik.values.obl_telex_bl === "OBL"} />
                      }
                      label="Original Documents"
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
                  {formik.values.document_received_date && (
                    <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                      {new Date(
                        formik.values.document_received_date
                      ).toLocaleString("en-US", {
                        timeZone: "Asia/Kolkata",
                        hour12: true,
                      })}
                    </span>
                  )}
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
                      type="datetime-local"
                      id="document_received_date"
                      name="document_received_date"
                      value={
                        formik.values.document_received_date
                          ? formik.values.document_received_date
                          : ""
                      }
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue) {
                          formik.setFieldValue(
                            "document_received_date",
                            newValue
                          );
                        } else {
                          formik.setFieldValue("document_received_date", "");
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
              {/* Checkbox for DO Planning */}
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>DO Planning:&nbsp;</strong>
                  <Checkbox
                    value={formik.values.doPlanning}
                    checked={formik.values.doPlanning}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      if (isChecked) {
                        // Set current date-time when checked
                        const currentDateTime = new Date(
                          Date.now() - new Date().getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16); // Format to "yyyy-MM-ddTHH:mm"
                        formik.setFieldValue("doPlanning", true);
                        formik.setFieldValue(
                          "do_planning_date",
                          currentDateTime
                        );
                      } else {
                        // Clear values when unchecked
                        formik.setFieldValue("doPlanning", false);
                        formik.setFieldValue("do_planning_date", "");
                      }
                    }}
                  />
                  {formik.values.do_planning_date && (
                    <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                      {new Date(formik.values.do_planning_date).toLocaleString(
                        "en-US",
                        {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        }
                      )}
                    </span>
                  )}
                </div>
              </Col>

              {/* Radio Button for DO Planning Type */}
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>DO Planning Type:&nbsp;</strong>
                  <RadioGroup
                    row
                    aria-label="do-planning-type"
                    name="type_of_Do"
                    value={formik.values.type_of_Do}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      if (selectedValue === "Clear") {
                        // Retain the current date but reset only the type
                        formik.setFieldValue("type_of_Do", "");
                      } else {
                        // Set the selected type without changing the date
                        formik.setFieldValue("type_of_Do", selectedValue);
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
                </div>
              </Col>

              {/* Admin TextField for DO Planning Date */}
              {user.role === "Admin" && (
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>DO Planning Date (Admin Only):&nbsp;</strong>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="datetime-local"
                      id="do_planning_date"
                      name="do_planning_date"
                      value={formik.values.do_planning_date || ""}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue) {
                          formik.setFieldValue("do_planning_date", newValue);
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
              <Col xs={12} lg={4}>
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
              <Col xs={12} lg={4}>
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
                        // Set current date-time adjusted to local timezone
                        const currentDateTime = new Date(
                          Date.now() - new Date().getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16);
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
                  {formik.values.do_revalidation_date && (
                    <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                      {new Date(
                        formik.values.do_revalidation_date
                      ).toLocaleString("en-US", {
                        timeZone: "Asia/Kolkata",
                        hour12: true,
                      })}
                    </span>
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
                          ? formik.values.do_revalidation_date
                          : ""
                      }
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue) {
                          formik.setFieldValue("do_revalidation", true);
                          formik.setFieldValue(
                            "do_revalidation_date",
                            newValue
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
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Rail out Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="rail_out_date"
                    name="rail_out_date"
                    value={
                      formik.values.rail_out_date
                        ? formik.values.rail_out_date
                        : ""
                    }
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue) {
                        // formik.setFieldValue("examinationPlanning", true);
                        formik.setFieldValue("rail_out_date", newValue);
                      } else {
                        // formik.setFieldValue("examinationPlanning", false);
                        formik.setFieldValue("rail_out_date", "");
                      }
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
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
                        // Set current date-time when checked, adjusted to local timezone
                        const currentDateTime = new Date(
                          Date.now() - new Date().getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16);
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
                  {formik.values.examination_planning_date && (
                    <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                      {new Date(
                        formik.values.examination_planning_date
                      ).toLocaleString("en-US", {
                        timeZone: "Asia/Kolkata",
                        hour12: true,
                      })}
                    </span>
                  )}
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
                          ? formik.values.examination_planning_date
                          : ""
                      }
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue) {
                          formik.setFieldValue("examinationPlanning", true);
                          formik.setFieldValue(
                            "examination_planning_date",
                            newValue
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
                <div className="job-detail-input-container">
                  <strong>PCV Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="pcv_date"
                    name="pcv_date"
                    value={formik.values.pcv_date}
                    onChange={formik.handleChange}
                  />
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
                      <Col xs={12} lg={1}>
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
                      <Col xs={12} lg={2} className="flex-div">
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
                      <Col xs={12} lg={2}>
                        <div className="job-detail-input-container">
                          <strong>Physical Weight:&nbsp;</strong>
                          {container.physical_weight}
                        </div>
                      </Col>
                      <Col xs={12} lg={2}>
                        <div className="job-detail-input-container">
                          <strong>Tare Weight:&nbsp;</strong>
                          {container.tare_weight}
                        </div>
                      </Col>
                      <Col xs={12} lg={2}>
                        <div className="job-detail-input-container">
                          <strong>Actual Weight:&nbsp;</strong>
                          {container.actual_weight}
                        </div>
                      </Col>
                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>Gross Weight as per Document:&nbsp;</strong>
                          <TextField
                            fullWidth
                            key={index}
                            size="small"
                            margin="normal"
                            variant="outlined"
                            id={`container_gross_weight_${index}`}
                            name={`container_nos[${index}].container_gross_weight`}
                            value={container.container_gross_weight}
                            onChange={(e) =>
                              handleGrossWeightChange(e, index, formik)
                            }
                          />
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
                            onChange={formik.handleChange}
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
                className="btn sticky-btn"
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
      <ConfirmDialog
        open={dialogOpen}
        handleClose={handleCloseDialog}
        handleConfirm={handleConfirmDialog}
        message={
          isEditMode
            ? undefined // No message for edit
            : `Are you sure you want to delete the document "${currentDocument?.document_name}"?`
        }
        isEdit={isEditMode}
        editValues={editValues}
        onEditChange={setEditValues}
      />
    </>
  );
}

export default React.memo(JobDetails);

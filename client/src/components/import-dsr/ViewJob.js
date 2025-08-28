import React, { useState, useRef, useContext, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
// import { uploadFileToS3 } from "../../utils/awsFileUpload";
import JobStickerPDF from "./JobStickerPDF";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { format } from "date-fns";
import {
  IconButton,
  TextField,
  Tooltip,
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
import FormLabel from "@mui/material/FormLabel";
import AWS from "aws-sdk";
import { handleCopyContainerNumber } from "../../utils/handleCopyContainerNumber";
import JobDetailsStaticData from "./JobDetailsStaticData";
import JobDetailsRowHeading from "./JobDetailsRowHeading";
import FormGroup from "@mui/material/FormGroup";
import { TabValueContext } from "../../contexts/TabValueContext";
import { handleGrossWeightChange } from "../../utils/handleNetWeightChange";
import { UserContext } from "../../contexts/UserContext";
import DeleteIcon from "@mui/icons-material/Delete";
import Switch from "@mui/material/Switch";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import AddIcon from "@mui/icons-material/Add";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box,
} from "@mui/material";
import FileUpload from "../../components/gallery/FileUpload.js";
import ConfirmDialog from "../../components/gallery/ConfirmDialog.js";
import { TabContext } from "../documentation/DocumentationTab.js";
import DeliveryChallanPdf from "./DeliveryChallanPDF.js";
import IgstModal from "../gallery/IgstModal.js";
import IgstCalculationPDF from "./IgstCalculationPDF.js";
import { preventFormSubmitOnEnter } from "../../utils/preventFormSubmitOnEnter.js";
import QueriesComponent from "../../utils/QueriesComponent.js";

function JobDetails() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [documentToDelete, setDocumentToDelete] = useState(null);

  const { currentTab } = useContext(TabContext); // Access context
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { setTabValue } = React.useContext(TabValueContext);
  const { setSearchQuery, setSelectedImporter } = useSearchQuery();

  const [storedSearchParams, setStoredSearchParams] = useState(null);
  useEffect(() => {
    if (
      location.state &&
      (location.state.fromJobList || location.state.currentTab !== undefined)
    ) {
      const {
        searchQuery,
        detailedStatus,
        selectedICD,
        selectedImporter,
        currentTab,
      } = location.state;

      setStoredSearchParams({
        searchQuery: searchQuery || "",
        detailedStatus: detailedStatus || "",
        selectedICD: selectedICD || "",
        selectedImporter: selectedImporter || "",
        currentTab,
      });
    }
  }, [location.state]);

  // const handleBackClick = () => {
  //   navigate('/import-dsr', {
  //     state: {
  //       fromJobDetails: true,
  //       ...(storedSearchParams && {
  //         searchQuery: storedSearchParams.searchQuery,
  //         detailedStatus: storedSearchParams.detailedStatus,
  //         selectedICD: storedSearchParams.selectedICD,
  //         selectedImporter: storedSearchParams.selectedImporter
  //       })
  //     }
  //   });
  // };
  React.useEffect(() => {
    // Clear search state when this tab becomes active, unless coming from job details
    if (
      currentTab === 1 &&
      !(location.state && location.state.fromJobDetails)
    ) {
      setSearchQuery("");
      setSelectedImporter("");
    }
  }, [currentTab, setSearchQuery, setSelectedImporter, location.state]);

  React.useEffect(() => {
    // Clear search state when this tab becomes active, unless coming from job details
    if (
      currentTab === 1 &&
      !(location.state && location.state.fromJobDetails)
    ) {
      setSearchQuery("");
      setSelectedImporter("");
    }
  }, [currentTab, setSearchQuery, setSelectedImporter, location.state]);
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 0; // Use the actual current tab
    navigate("/import-dsr", {
      state: {
        fromJobDetails: true,
        tabIndex: tabIndex,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          detailedStatus: storedSearchParams.detailedStatus,
          selectedICD: storedSearchParams.selectedICD,
          selectedImporter: storedSearchParams.selectedImporter,
        }),
      },
    });
  };

  // Import Terms handlers
  const handleImportTermsChange = (event) => {
    const value = event.target.value;
    setImportTerms(value);
    // Update formik
    formik.setFieldValue("import_terms", value);
  };

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: "", // "delete" or "resolve"
    queryKey: "",
    queryIndex: null,
  });

  const options = Array.from({ length: 25 }, (_, index) => index);
  const [checked, setChecked] = useState(false);
  const [selectedRegNo, setSelectedRegNo] = useState();
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const bl_no_ref = useRef();
  // const checklistRef = useRef();
  // const processedBeAttachmentRef = useRef();
  // const oocCopyRef = useRef();
  // const gatePassCopyRef = useRef();
  const weighmentSlipRef = useRef();
  const container_number_ref = useRef([]);
  const pdfRef = useRef(null);
  // delete modal
  const [openDialog, setOpenDialog] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [dutyModalOpen, setDutyModalOpen] = useState(false);

  // Import Terms state
  const [importTerms, setImportTerms] = useState("CIF");

  const {
    data,
    detentionFrom,
    formik,
    cthDocuments,
    setCthDocuments,
    // handleFileChange,
    // selectedDocuments,
    // setSelectedDocuments,
    // handleDocumentChange,
    // handleAddDocument,
    // handleRemoveDocument,
    newDocumentName,
    setNewDocumentName,
    setNewDocumentCode,
    newDocumentCode,
    // canEditOrDelete,
    cth_Dropdown,
    // filterDocuments,
    selectedDocument,
    setSelectedDocument,
    // clearanceOptionsMapping,
    jobDetails,
    // setJobDetails,
    // type_of_b_e,
    // setTypeOfBE,
    // clearanceValue,
    // setClearanceValue,
    // scheme,
    // setScheme,
    // exBondValue,
    // setExBondValue,
    // be_no,
    // setBeNo,
    // be_date,
    // setBeDate,
    // ooc_copies,
    // setOocCopies,
    beTypeOptions,
    filteredClearanceOptions,
    canChangeClearance,
    resetOtherDetails,
    // Charges related
    DsrCharges,
    setDsrCharges,
    selectedChargesDocuments,
    setSelectedChargesDocuments,
    selectedChargesDocument,
    setSelectedChargesDocument,
    newChargesDocumentName,
    setNewChargesDocumentName,
    setData,
    // schemeOptions,
  } = useFetchJobDetails(
    params,
    checked,
    setSelectedRegNo,
    setTabValue,
    setFileSnackbar,
    storedSearchParams
  );
  const formatDateTime = (date) => {
    return date ? new Date(date).toISOString().slice(0, 16) : "";
  };
  const [isSubmissionDate, setIsSubmissiondate] = useState(false);
  // Utility function to calculate number of days between two dates
  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // useEffect to watch for changes in submission_completed_date_time

  useEffect(() => {
    const submissionDateTime = formik.values.submission_completed_date_time;

    // Check if the value is not empty, undefined, or null
    if (submissionDateTime && submissionDateTime.trim() !== "") {
      setIsSubmissiondate(true);
    } else {
      setIsSubmissiondate(false);
    }
  }, [formik.values.submission_completed_date_time]);

  // Sync import_terms from formik to local state when component loads
  useEffect(() => {
    if (
      formik.values.import_terms &&
      formik.values.import_terms !== importTerms
    ) {
      setImportTerms(formik.values.import_terms);
    }
  }, [formik.values.import_terms]);

  const [emptyContainerOffLoadDate, setEmptyContainerOffLoadDate] =
    useState(false);
  const [deleveryDate, setDeliveryDate] = useState(false);
  // Helper function to update the `detailed_status` based on form values
  const updateDetailedStatus = () => {
    const {
      vessel_berthing: eta,
      gateway_igm_date: gatewayIGMDate,
      discharge_date: dischargeDate,
      out_of_charge: outOfChargeDate,
      pcv_date: pcvDate,
      container_nos,
      type_of_b_e,
      consignment_type,
    } = formik.values;

    const billOfEntryNo = formik.values.be_no || data?.be_no;
    const anyContainerArrivalDate = container_nos?.some(
      (container) => container.arrival_date
    );
    const containerRailOutDate =
      container_nos?.length > 0 &&
      container_nos.every((container) => container.container_rail_out_date);

    const emptyContainerOffLoadDate =
      container_nos?.length > 0 &&
      container_nos.every((container) => container.emptyContainerOffLoadDate);

    const deliveryDate =
      container_nos?.length > 0 &&
      container_nos.every((container) => container.delivery_date);

    // Check if type_of_b_e or consignment_type is "Ex-Bond" or "LCL"
    const isExBondOrLCL =
      type_of_b_e === "Ex-Bond" || consignment_type === "LCL";
    if (
      billOfEntryNo &&
      anyContainerArrivalDate &&
      outOfChargeDate &&
      (isExBondOrLCL ? deliveryDate : emptyContainerOffLoadDate)
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
    } else if (!billOfEntryNo && anyContainerArrivalDate) {
      formik.setFieldValue("detailed_status", "Arrived, BE Note Pending");
    } else if (containerRailOutDate) {
      formik.setFieldValue("detailed_status", "Rail Out");
    } else if (dischargeDate) {
      formik.setFieldValue("detailed_status", "Discharged");
    } else if (gatewayIGMDate) {
      formik.setFieldValue("detailed_status", "Gateway IGM Filed");
    } else if (eta === "" || eta === "Invalid Date") {
      formik.setFieldValue("detailed_status", "ETA Date Pending");
    } else if (eta) {
      formik.setFieldValue("detailed_status", "Estimated Time of Arrival");
    } else {
    }
  };

  function toISTLocalInput(date) {
    if (!date) return "";
    const d = new Date(date);
    // Convert to IST by adding 5.5 hours (19800 seconds)
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset() + 330);
    return d.toISOString().slice(0, 16);
  }
  // // Trigger the `updateDetailedStatus` function when form values change
  useEffect(() => {
    updateDetailedStatus();
  }, [
    formik.values.vessel_berthing,
    formik.values.gateway_igm_date,
    formik.values.discharge_date,
    // formik.values.rail_out_date,
    formik.values.arrival_date, // Ensure this is included
    formik.values.container_rail_out_date,
    formik.values.out_of_charge,
    formik.values.pcv_date,
    formik.values.completed_operation_date,
    formik.values.be_no,
    formik.values.emptyContainerOffLoadDate,
    formik.values.delivery_date,
    formik.values.container_nos, // Include container_nos to track the changes in arrival_date for containers
  ]);

  // const handleRadioChange = (event) => {
  //   const selectedValue = event.target.value;

  //   if (selectedValue === "clear") {
  //     setSelectedRegNo("");
  //     formik.setFieldValue("sims_reg_no", "");
  //     formik.setFieldValue("pims_reg_no", "");
  //     formik.setFieldValue("nfmims_reg_no", "");
  //     formik.setFieldValue("sims_date", "");
  //     formik.setFieldValue("pims_date", "");
  //     formik.setFieldValue("nfmims_date", "");
  //   } else {
  //     setSelectedRegNo(selectedValue);
  //     formik.setFieldValue("sims_reg_no", "");
  //     formik.setFieldValue("pims_reg_no", "");
  //     formik.setFieldValue("nfmims_reg_no", "");
  //     formik.setFieldValue("sims_date", "");
  //     formik.setFieldValue("pims_date", "");
  //     formik.setFieldValue("nfmims_date", "");
  //   }
  // };

  // ...existing code...

  // Helper to get the correct date for "Delivery Completed"
  const getDeliveryCompletedDate = () => {
    const containers = formik.values.container_nos || [];
    if (!containers.length) return null;

    // LCL: use delivery_date, else use emptyContainerOffLoadDate
    const isLCL = formik.values.consignment_type === "LCL";
    const key = isLCL ? "delivery_date" : "emptyContainerOffLoadDate";

    // Check if all containers have the required date
    const allHaveDate = containers.every((c) => c[key]);
    if (!allHaveDate) return null;

    // Get the last container's date
    const lastDate = containers[containers.length - 1][key];
    return lastDate || null;
  };

  const deliveryCompletedDate = getDeliveryCompletedDate();

  // ...existing code...
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

  const formatDateForInput = (date) => {
    if (!date) return "";
    if (date.length === 10) return `${date}T00:00`; // If only date, add default time
    return date.replace(" ", "T"); // Convert space to "T" if needed
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
                Bucket: process.env.REACT_APP_S3_BUCKET,
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
    } catch (err) {}
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
        delivery_date: "",
        emptyContainerOffLoadDate: "",
        container_rail_out_date: "",
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
  const handleGenerate = () => {
    pdfRef.current?.generatePdf();
  };

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
  }; // Duty Modal Handlers
  const handleOpenDutyModal = async () => {
    setDutyModalOpen(true);
  };

  const handleCloseDutyModal = () => {
    setDutyModalOpen(false);
  };

  const handleQueriesChange = (updatedQueries) => {
    setData((prev) => ({
      ...prev,
      dsr_queries: updatedQueries,
    }));
  };

  const handleResolveQuery = (resolvedQuery, index) => {
    // Custom logic when a query is resolved
    console.log("Query resolved:", resolvedQuery);
    // You can add API calls, notifications, etc.
  };
  const handleDutySubmit = async (updateData) => {
    try {
      // Update formik values with IGST values from the modal
      Object.keys(updateData).forEach((key) => {
        formik.setFieldValue(key, updateData[key]);
      });

      // Submit the form using existing formik submit
      await formik.submitForm();
      setDutyModalOpen(false);
    } catch (error) {
      console.error("Error submitting duty data:", error);
    }
  }; // Check if duty_paid_date should be disabled
  const isDutyPaidDateDisabled =
    !formik.values.assessment_date || !formik.values.igst_ammount;
  function subtractOneDay(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`; // Fixed template literal syntax
  }

  const ExBondflag = formik.values.type_of_b_e === "Ex-Bond";
  const LCLFlag = formik.values.consignment_type === "LCL";

  return (
    <>
      {data !== null && (
        <form onSubmit={formik.handleSubmit}>
          <Box sx={{ position: "fixed", top: 80, left: 80, zIndex: 999 }}>
            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackClick}
              sx={{
                // fontWeight: 'bold',
                backgroundColor: "black",
                color: "white",
                "&:hover": {
                  backgroundColor: "#333",
                },
              }}
            >
              Back to Job List
            </Button>
          </Box>

          {/* Importer info start*/}
          <div style={{ marginTop: "70px" }}>
            <JobDetailsStaticData
              data={data}
              params={params}
              bl_no_ref={bl_no_ref}
              setSnackbar={setSnackbar}
              container_nos={formik.values.container_nos}
              // Passing be_no from formik
            />
          </div>
          {/* Importer info End*/}

          <div>
            <QueriesComponent
              queries={data.dsr_queries}
              currentModule="Import DSR"
              onQueriesChange={handleQueriesChange}
              title="DSR Queries"
              showResolveButton={true}
              readOnlyReply={false}
              onResolveQuery={handleResolveQuery}
              userName={user?.username}
            />
          </div>

          {/* completion status start*/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Completion Status" />

            <Row style={{ marginTop: "10px" }}>
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
            <Row style={{ marginTop: "10px" }}>
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
                    value={
                      formik.values.do_completed
                        ? new Date(formik.values.do_completed)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
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
            <Row style={{ marginTop: "10px" }}>
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>
                    Operation Completed Date:{" "}
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
              <Col xs={12} lg={3}>
                <div className="job-detail-input-container">
                  <strong>
                    Delivery Completed :{" "}
                    {deliveryCompletedDate ? (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(deliveryCompletedDate).toLocaleString(
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
                    id="bill_document_sent_to_accounts"
                    name="bill_document_sent_to_accounts"
                    label="Set Date (Admin Only)"
                    value={
                      deliveryCompletedDate
                        ? formatDateForInput(deliveryCompletedDate)
                        : ""
                    }
                    onChange={(e) =>
                      formik.setFieldValue(
                        "bill_document_sent_to_accounts",
                        e.target.value
                      )
                    }
                    disabled={!deliveryCompletedDate}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Col>
              )}
            </Row>
            <Row style={{ marginTop: "20px" }}>
              {/* Bill Document Sent */}
              <Col xs={14} lg={3}>
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                  <div className="flex items-center">
                    <strong>Bill document sent to account team:&nbsp;</strong>
                    <span className="text-gray-900">
                      {data.bill_document_sent_to_accounts
                        ? new Date(
                            data.bill_document_sent_to_accounts
                          ).toLocaleString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              </Col>
              {/* Bill Agency No */}
              <Col xs={14} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Bill Agency:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={(formik.values.bill_no?.split(",")[0] || "").trim()}
                    onChange={(e) => {
                      const currentBillNo = formik.values.bill_no || "";
                      const billParts = currentBillNo.split(",");
                      const newBillNo = `${e.target.value.trim()},${(
                        billParts[1] || ""
                      ).trim()}`;
                      formik.setFieldValue("bill_no", newBillNo);
                    }}
                    disabled={user?.role !== "Admin" || isSubmissionDate}
                    style={{ marginTop: "10px" }}
                  />
                </div>
              </Col>

              {/* Bill Reimbursement No */}
              <Col xs={14} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Bill Reimbursement:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={(formik.values.bill_no?.split(",")[1] || "").trim()}
                    onChange={(e) => {
                      const currentBillNo = formik.values.bill_no || "";
                      const billParts = currentBillNo.split(",");
                      const newBillNo = `${(
                        billParts[0] || ""
                      ).trim()},${e.target.value.trim()}`;
                      formik.setFieldValue("bill_no", newBillNo);
                    }}
                    disabled={user?.role !== "Admin" || isSubmissionDate}
                    style={{ marginTop: "10px" }}
                  />
                </div>
              </Col>

              {/* Bill Date (First Only) */}
              <Col xs={12} lg={3}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Bill Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    type="datetime-local"
                    value={(() => {
                      const firstDateStr = (formik.values.bill_date || "")
                        .split(",")[0]
                        ?.trim();
                      if (firstDateStr) {
                        const date = new Date(firstDateStr);
                        if (!isNaN(date.getTime())) {
                          return date.toISOString().slice(0, 16);
                        }
                      }
                      return "";
                    })()}
                    onChange={(e) => {
                      const currentBillDate = formik.values.bill_date || "";
                      const dateParts = currentBillDate.split(",");
                      const newBillDate = `${e.target.value},${(
                        dateParts[1] || ""
                      ).trim()}`;
                      formik.setFieldValue("bill_date", newBillDate);
                    }}
                    disabled={user?.role !== "Admin" || isSubmissionDate}
                    style={{ marginTop: "10px" }}
                  />
                </div>
              </Col>
            </Row>
            <Row style={{ marginTop: "10px" }}>
              <Col xs={12} lg={2}>
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
                    value={formik.values.status || ""}
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
                    value={formik.values.detailed_status || ""}
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
                    <MenuItem value="Rail Out">Rail Out</MenuItem>
                    <MenuItem value="BE Noted, Arrival Pending">
                      BE Noted, Arrival Pending
                    </MenuItem>
                    <MenuItem value="Arrived, BE Note Pending">
                      Arrived, BE Note Pending
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
                    <MenuItem value="Status Completed">
                      Status Completed
                    </MenuItem>
                  </TextField>
                </div>
              </Col>
            </Row>
          </div>
          {/* completion status end  */}
          {/* Tracking status start*/}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Tracking Status" />

            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  {/* Seller Name Field */}
                  <strong>BL No:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    id="awb_bl_no"
                    name="awb_bl_no"
                    // disabled={isSubmissionDate}
                    value={formik.values.awb_bl_no || ""}
                    onChange={formik.handleChange}
                    style={{ marginTop: "10px" }}
                    placeholder="Enter BL No"
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>BL Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="awb_bl_date"
                    name="awb_bl_date"
                    value={
                      formik.values.awb_bl_date
                        ? formik.values.awb_bl_date.length === 10
                          ? `${formik.values.awb_bl_date}T00:00`
                          : formik.values.awb_bl_date
                        : ""
                    }
                    // disabled={ExBondflag || isSubmissionDate}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
            </Row>

            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  {/* Seller Name Field */}
                  <strong>HAWBL No:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    id="hawb_hbl_no"
                    name="hawb_hbl_no"
                    // disabled={isSubmissionDate}
                    value={formik.values.hawb_hbl_no || ""}
                    onChange={formik.handleChange}
                    style={{ marginTop: "10px" }}
                    placeholder="Enter HAWBL No"
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>HAWBL Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="hawb_hbl_date"
                    name="hawb_hbl_date"
                    value={
                      formik.values.hawb_hbl_date
                        ? formik.values.hawb_hbl_date.length === 10
                          ? `${formik.values.hawb_hbl_date}T00:00`
                          : formik.values.hawb_hbl_date
                        : ""
                    }
                    // disabled={ExBondflag || isSubmissionDate}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>
            </Row>
            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>ETA Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="vessel_berthing"
                    name="vessel_berthing"
                    value={
                      formik.values.vessel_berthing
                        ? formik.values.vessel_berthing.length === 10
                          ? `${formik.values.vessel_berthing}T00:00`
                          : formik.values.vessel_berthing
                        : ""
                    }
                    disabled={ExBondflag || isSubmissionDate}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>

              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  {/* Seller Name Field */}
                  <strong>G-IGM No:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    id="gatweay_igm"
                    name="gateway_igm"
                    disabled={isSubmissionDate}
                    value={formik.values.gateway_igm || ""}
                    onChange={formik.handleChange}
                    style={{ marginTop: "10px" }}
                    placeholder="Enter IGM No"
                  />
                </div>
              </Col>

              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>G-IGM Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="gateway_igm_date"
                    name="gateway_igm_date"
                    disabled={isSubmissionDate}
                    value={
                      formik.values.gateway_igm_date
                        ? formik.values.gateway_igm_date.length === 10
                          ? `${formik.values.gateway_igm_date}T00:00`
                          : formik.values.gateway_igm_date
                        : ""
                    }
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>

              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  {/* Seller Name Field */}
                  <strong>IGM No:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    id="igm_no"
                    name="igm_no"
                    value={formik.values.igm_no || ""}
                    disabled={isSubmissionDate}
                    onChange={formik.handleChange}
                    style={{ marginTop: "10px" }}
                    placeholder="Enter IGM No"
                  />
                </div>
              </Col>

              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>IGM Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="igm_date"
                    name="igm_date"
                    value={
                      formik.values.igm_date
                        ? formik.values.igm_date.length === 10
                          ? `${formik.values.igm_date}T00:00`
                          : formik.values.igm_date
                        : ""
                    }
                    disabled={ExBondflag || isSubmissionDate}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>

              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Discharge/ L-IGM Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="discharge_date"
                    name="discharge_date"
                    disabled={
                      !formik.values.vessel_berthing ||
                      ExBondflag ||
                      isSubmissionDate
                    }
                    value={
                      formik.values.discharge_date
                        ? formik.values.discharge_date.length === 10
                          ? `${formik.values.discharge_date}T00:00`
                          : formik.values.discharge_date
                        : ""
                    }
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>

              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  {/* Seller Name Field */}
                  <strong>Line No:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    id="line_no"
                    name="line_no"
                    disabled={isSubmissionDate}
                    value={formik.values.line_no || ""}
                    onChange={formik.handleChange}
                    style={{ marginTop: "10px" }}
                    placeholder="Enter Line No"
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  {/* Seller Name Field */}
                  <strong>No Of packages:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    id="no_of_pkgs"
                    name="no_of_pkgs"
                    disabled={isSubmissionDate}
                    value={formik.values.no_of_pkgs || ""}
                    onChange={formik.handleChange}
                    style={{ marginTop: "10px" }}
                    placeholder="Enter No Of packages"
                  />
                </div>
              </Col>
            </Row>
            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  {/* HSS Field */}
                  <strong>HSS:&nbsp;</strong>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    variant="outlined"
                    id="hss"
                    name="hss"
                    disabled={isSubmissionDate}
                    value={formik.values.hss || "No"}
                    onChange={formik.handleChange}
                    style={{ marginTop: "10px" }}
                  >
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </TextField>
                </div>
              </Col>

              {formik.values.hss && formik.values.hss == "Yes" && (
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    {/* Seller Name Field */}
                    <strong>Seller Name:&nbsp;</strong>
                    <TextField
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="saller_name"
                      name="saller_name"
                      disabled={isSubmissionDate}
                      value={formik.values.saller_name || ""}
                      onChange={formik.handleChange}
                      style={{ marginTop: "10px" }}
                      placeholder="Enter Seller Name"
                    />
                  </div>
                </Col>
              )}

{ formik.values.consignment_type  !== "LCL"&&
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Free time:&nbsp;</strong>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    variant="outlined"
                    id="free_time"
                    name="free_time"
                    value={formik.values.free_time || ""}
                    disabled={isSubmissionDate}
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
                </div>
              </Col>
}

              <Row style={{ marginTop: "20px" }}>
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    {/* Seller Name Field */}
                    <strong>AD Code:&nbsp;</strong>
                    <TextField
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="adCode"
                      name="adCode"
                      disabled={isSubmissionDate}
                      value={formik.values.adCode || ""}
                      onChange={formik.handleChange}
                      style={{ marginTop: "10px" }}
                      placeholder="Enter AD Code"
                    />
                  </div>
                </Col>

                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    {/* Seller Name Field */}
                    <strong>Bank Name:&nbsp;</strong>
                    <TextField
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="bank_name"
                      name="bank_name"
                      disabled={isSubmissionDate}
                      value={formik.values.bank_name || ""}
                      onChange={formik.handleChange}
                      style={{ marginTop: "10px" }}
                      placeholder="Enter Bank Name"
                    />
                  </div>
                </Col>
              </Row>

              {/* Import Terms Section */}
              <Row style={{ marginTop: "20px" }}>
                <Col xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <FormLabel
                      component="legend"
                      sx={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#34495e",
                        mb: 2,
                        display: "block",
                      }}
                    >
                      Terms of Invoice
                    </FormLabel>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 4,
                        flexWrap: "wrap",
                        "@media (max-width: 768px)": {
                          flexDirection: "column",
                          gap: 2,
                        },
                      }}
                    >
                      {/* Radio Group Section */}
                      <Box sx={{ minWidth: 200 }}>
                        <FormControl component="fieldset">
                          <RadioGroup
                            aria-label="import-terms"
                            name="import_terms"
                            value={formik.values.import_terms || importTerms}
                            onChange={handleImportTermsChange}
                            sx={{ gap: 0.5 }}
                          >
                            <FormControlLabel
                              value="CIF"
                              control={<Radio size="small" />}
                              label={
                                <Typography sx={{ fontSize: "14px" }}>
                                  CIF
                                </Typography>
                              }
                            />
                            <FormControlLabel
                              value="FOB"
                              control={<Radio size="small" />}
                              label={
                                <Typography sx={{ fontSize: "14px" }}>
                                  FOB
                                </Typography>
                              }
                            />
                            <FormControlLabel
                              value="CF"
                              control={<Radio size="small" />}
                              label={
                                <Typography sx={{ fontSize: "14px" }}>
                                  C&F
                                </Typography>
                              }
                            />
                            <FormControlLabel
                              value="CI"
                              control={<Radio size="small" />}
                              label={
                                <Typography sx={{ fontSize: "14px" }}>
                                  C&I
                                </Typography>
                              }
                            />
                          </RadioGroup>
                        </FormControl>
                      </Box>

                      {/* Conditional Fields Section */}
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 300,
                          padding: 2,
                          backgroundColor: "#f8f9fa",
                          borderRadius: 2,
                          border: "1px solid #e9ecef",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <TextField
                            label={`${
                              formik.values.import_terms || importTerms
                            } Value (₹)`}
                            type="number"
                            name="cifValue"
                            value={formik.values.cifValue || ""}
                            onChange={formik.handleChange}
                            size="small"
                            variant="outlined"
                            sx={{
                              maxWidth: 250,
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: "white",
                              },
                            }}
                          />

                          {((formik.values.import_terms || importTerms) ===
                            "FOB" ||
                            (formik.values.import_terms || importTerms) ===
                              "CI") && (
                            <TextField
                              label="Freight (₹)"
                              type="number"
                              name="freight"
                              value={formik.values.freight || ""}
                              onChange={formik.handleChange}
                              size="small"
                              variant="outlined"
                              sx={{
                                maxWidth: 250,
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: "white",
                                },
                              }}
                            />
                          )}

                          {((formik.values.import_terms || importTerms) ===
                            "FOB" ||
                            (formik.values.import_terms || importTerms) ===
                              "CF") && (
                            <TextField
                              label="Insurance (₹)"
                              type="number"
                              name="insurance"
                              value={formik.values.insurance || ""}
                              onChange={formik.handleChange}
                              size="small"
                              variant="outlined"
                              sx={{
                                maxWidth: 250,
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: "white",
                                },
                              }}
                            />
                          )}

                          {/* Helper text based on selected import terms */}
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#6c757d",
                              fontStyle: "italic",
                              mt: 1,
                            }}
                          >
                            {(formik.values.import_terms || importTerms) ===
                              "CIF" && "Cost, Insurance & Freight included"}
                            {(formik.values.import_terms || importTerms) ===
                              "FOB" &&
                              "Free on Board - Add freight & insurance"}
                            {(formik.values.import_terms || importTerms) ===
                              "CF" && "Cost & Freight - Add insurance"}
                            {(formik.values.import_terms || importTerms) ===
                              "CI" && "Cost & Insurance - Add freight"}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Col>
              </Row>
            </Row>
            <Row style={{ marginTop: "20px" }}>
              <Col
                xs={12}
                lg={4}
                style={{ display: "flex", alignItems: "center" }}
              >
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Priority :&nbsp;</strong>

                  <RadioGroup
                    row
                    name="priorityJob"
                    value={formik.values.priorityJob || ""}
                    onChange={formik.handleChange}
                    sx={{ alignItems: "center" }}
                    disabled={isSubmissionDate}
                  >
                    <FormControlLabel
                      value="normal"
                      control={
                        <Radio size="small" disabled={isSubmissionDate} />
                      }
                      label="Normal"
                      disabled={isSubmissionDate}
                      sx={{
                        color: "green",
                        "& .MuiSvgIcon-root": { color: "green" },
                      }}
                    />
                    <FormControlLabel
                      value="Priority"
                      control={
                        <Radio size="small" disabled={isSubmissionDate} />
                      }
                      label="Priority"
                      disabled={isSubmissionDate}
                      sx={{
                        color: "orange",
                        "& .MuiSvgIcon-root": { color: "orange" },
                      }}
                    />
                    <FormControlLabel
                      value="High Priority"
                      control={
                        <Radio size="small" disabled={isSubmissionDate} />
                      }
                      label="High Priority"
                      disabled={isSubmissionDate}
                      sx={{
                        color: "red",
                        "& .MuiSvgIcon-root": { color: "red" },
                      }}
                    />
                  </RadioGroup>
                </div>
              </Col>
              <Col
                xs={12}
                lg={4}
                style={{ display: "flex", alignItems: "center" }}
              >
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Payment Method:&nbsp;</strong>

                  <RadioGroup
                    row
                    name="payment_method"
                    value={formik.values.payment_method || ""}
                    onChange={formik.handleChange}
                    sx={{ alignItems: "center" }}
                    disabled={isSubmissionDate}
                  >
                    <FormControlLabel
                      value="Transaction"
                      control={
                        <Radio size="small" disabled={isSubmissionDate} />
                      }
                      label="Transaction"
                      disabled={isSubmissionDate}
                      // sx={{
                      //   color: "green",
                      //   "& .MuiSvgIcon-root": { color: "green" },
                      // }}
                    />
                    <FormControlLabel
                      value="Deferred"
                      control={
                        <Radio size="small" disabled={isSubmissionDate} />
                      }
                      label="Deferred"
                      disabled={isSubmissionDate}
                      // sx={{
                      //   color: "orange",
                      //   "& .MuiSvgIcon-root": { color: "orange" },
                      // }}
                    />
                  </RadioGroup>
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>FTA Benefit: &nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="do_revalidation_date"
                    name="do_revalidation_date"
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
                    disabled={isSubmissionDate}
                  />
                </div>
              </Col>
            </Row>
            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Description:&nbsp;</strong>
                  <TextField
                    size="small"
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    id="description"
                    name="description"
                    value={formik.values.description || ""}
                    onChange={formik.handleChange}
                    disabled={isSubmissionDate}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>CTH No.: &nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="cth_no"
                    name="cth_no"
                    value={formik.values.cth_no || ""}
                    onChange={formik.handleChange}
                    // InputLabelProps={{ shrink: true }}
                    disabled={isSubmissionDate}
                  />
                </div>
              </Col>
              {/* BE Type Selection */}
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>BOE Type:&nbsp;</strong>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    variant="outlined"
                    margin="normal"
                    name="type_of_b_e"
                    value={formik.values.type_of_b_e || ""}
                    onChange={formik.handleChange}
                    displayempty="true"
                    disabled={isSubmissionDate}
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
                </div>
              </Col>
            </Row>
            {/* Clearance under start */}
            <Row style={{ marginTop: "20px" }}>
              {/* Clearance Under Selection */}
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Clearance Under:&nbsp;</strong>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    variant="outlined"
                    name="clearanceValue"
                    value={formik.values.clearanceValue || ""}
                    onChange={(e) => {
                      if (canChangeClearance()) {
                        formik.setFieldValue("clearanceValue", e.target.value);
                      } else {
                        alert(
                          "Please clear Ex-Bond details before changing Clearance Under."
                        );
                      }
                    }}
                  >
                    <MenuItem value="" disabled>
                      Select Clearance Type
                    </MenuItem>
                    {filteredClearanceOptions.map((option, index) => (
                      <MenuItem key={index} value={option.value || ""}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </div>
              </Col>
              {/* Ex-Bond Details (shown only if Clearance Under is "Ex-Bond") */}
              <Col xs={12} lg={4}>
                {ExBondflag && (
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>In Bond:&nbsp;</strong>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      variant="outlined"
                      name="exBondValue"
                      value={formik.values.exBondValue || ""}
                      onChange={formik.handleChange}
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
                  </div>
                )}
              </Col>

              {/* Additional BE Details if the "other" option is selected */}
              {formik.values.exBondValue === "other" && (
                <>
                  <Col xs={12} lg={4} style={{ marginTop: "20px" }}>
                    <div
                      className="job-detail-input-container"
                      style={{ justifyContent: "flex-start" }}
                    >
                      <strong>InBond BE Number:&nbsp;</strong>
                      <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        name="in_bond_be_no"
                        value={formik.values.in_bond_be_no || ""}
                        onChange={formik.handleChange}
                      />
                    </div>
                  </Col>

                  <Col xs={12} lg={4} style={{ marginTop: "20px" }}>
                    <div
                      className="job-detail-input-container"
                      style={{ justifyContent: "flex-start" }}
                    >
                      <strong>InBond BE Date:&nbsp;</strong>
                      <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        label="InBond BE Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        name="in_bond_be_date"
                        value={formik.values.in_bond_be_date || ""}
                        onChange={formik.handleChange}
                      />
                    </div>
                  </Col>

                  <Col xs={12} lg={4} style={{ marginTop: "20px" }}>
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
                </>
              )}
              {formik.values.exBondValue !== "other" &&
                formik.values.exBondValue !== "" &&
                (() => {
                  // Find the matching job based on job_no
                  const matchedJob = jobDetails.find(
                    (job) => job.job_no === formik.values.exBondValue
                  );

                  return matchedJob ? (
                    <>
                      <Col xs={12} lg={4} style={{ marginTop: "20px" }}>
                        <strong>BE No:</strong>&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                        {matchedJob.be_no || "N/A"}
                      </Col>
                      <Col xs={12} lg={4} style={{ marginTop: "20px" }}>
                        <strong>BE Date:</strong> &nbsp;&nbsp;&nbsp;&nbsp;{" "}
                        {matchedJob.be_date || "N/A"}
                      </Col>
                      <Col xs={12} lg={4} style={{ marginTop: "20px" }}>
                        <strong>OOC copy:</strong>
                        <ImagePreview
                          images={matchedJob.ooc_copies || []} // Corrected optional chaining syntax
                          readOnly
                        />
                      </Col>
                    </>
                  ) : (
                    <Col xs={12} style={{ marginTop: "20px" }}>
                      No matching job found.
                    </Col>
                  );
                })()}

              <Col xs={12} lg={4} style={{ marginTop: "30px" }}>
                {ExBondflag && (
                  <Row>
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
            {/* Clearance under end */}
            {/* total weight start */}
            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Gross Weight (KGS):&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="gross_weight"
                    name="gross_weight"
                    value={formik.values.gross_weight || ""}
                    onChange={formik.handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Net Weight (KGS):&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="job_net_weight"
                    name="job_net_weight"
                    value={formik.values.job_net_weight || ""}
                    onChange={formik.handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </Col>
            </Row>
            {/* total weight end */}

            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>BOE NO:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="be_no"
                    name="be_no"
                    value={formik.values.be_no || ""}
                    onChange={formik.handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>BOE Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="date"
                    id="be_date"
                    name="be_date"
                    value={formik.values.be_date || ""}
                    onChange={formik.handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </Col>

              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Assessment Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="assessment_date"
                    name="assessment_date"
                    value={formik.values.assessment_date}
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>

              <Col
                xs={12}
                lg={4}
                style={{ display: "flex", alignItems: "center" }}
              >
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>BOE Filing:&nbsp;</strong>

                  <RadioGroup
                    row
                    name="be_filing_type"
                    value={formik.values.be_filing_type || ""}
                    onChange={formik.handleChange}
                    sx={{ alignItems: "center" }}
                    disabled={isSubmissionDate}
                  >
                    <FormControlLabel
                      value="Discharge"
                      control={<Radio size="small" />}
                      label="Discharge"
                      // disabled={
                      //   isSubmissionDate ||
                      //   !formik.values.discharge_date ||
                      //   !formik.values.gateway_igm_date ||
                      //   !formik.values.esanchit_completed_date_time ||
                      //   !formik.values.documentation_completed_date_time
                      // }
                    />
                    <FormControlLabel
                      value="Railout"
                      control={<Radio size="small" />}
                      label="Railout"
                    />
                    <FormControlLabel
                      value="Advanced"
                      control={<Radio size="small" />}
                      label="Advanced"
                      disabled={isSubmissionDate}
                    />
                    <FormControlLabel
                      value="Prior"
                      control={<Radio size="small" />}
                      label="Prior"
                      disabled={isSubmissionDate}
                    />
                  </RadioGroup>
                </div>
              </Col>
            </Row>
            <Row style={{ marginTop: "20px" }}>
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
                />{" "}
                <ImagePreview
                  images={formik.values.checklist || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...formik.values.checklist];
                    updatedFiles.splice(index, 1);
                    formik.setFieldValue("checklist", updatedFiles);
                  }}
                  onImageClick={() => {
                    formik.setFieldValue("is_checklist_clicked", true);
                  }}
                />
              </Col>
              {/* <Col xs={12} lg={4}>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <Button
                    variant="primary"
                    onClick={handleGenerate}
                    style={{
                      padding: "10px 20px",
                      fontSize: "16px",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    Generate Job Sticker
                  </Button>
                </div>
              </Col> */}
              <JobStickerPDF
                ref={pdfRef}
                jobData={{
                  job_no: formik.values.job_no,
                  year: formik.values.year,
                  importer: formik.values.importer,
                  be_no: formik.values.be_no,
                  be_date: formik.values.be_date,
                  invoice_number: formik.values.invoice_number,
                  invoice_date: formik.values.invoice_date,
                  loading_port: formik.values.loading_port,
                  no_of_pkgs: formik.values.no_of_pkgs,
                  description: formik.values.description,
                  gross_weight: formik.values.gross_weight,
                  job_net_weight: formik.values.job_net_weight,
                  gateway_igm: formik.values.gateway_igm,
                  gateway_igm_date: formik.values.gateway_igm_date,
                  igm_no: formik.values.igm_no,
                  igm_date: formik.values.igm_date,
                  awb_bl_no: formik.values.awb_bl_no,
                  awb_bl_date: formik.values.awb_bl_date,
                  shipping_line_airline: formik.values.shipping_line_airline,
                  custom_house: formik.values.custom_house,
                  container_nos: formik.values.container_nos,
                }}
                data={data}
              />
              <Col xs={12} lg={4}>
                {/* Only show FileUpload if there's NO PDF in the array */}

                <div
                  style={{
                    display: "flex", // puts items in a row
                    alignItems: "center", // vertically center items
                    gap: "10px", // space between items
                    marginBottom: "10px", // optional spacing below
                  }}
                >
                  <Button
                    variant="primary"
                    onClick={handleGenerate}
                    style={{
                      padding: "10px 20px",
                      fontSize: "16px",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    Generate Job Sticker
                  </Button>

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
                </div>

                <ImagePreview
                  images={formik.values.job_sticker_upload || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...formik.values.job_sticker_upload];
                    updatedFiles.splice(index, 1);
                    formik.setFieldValue("job_sticker_upload", updatedFiles);
                  }}
                />
              </Col>
              <Col xs={12} lg={4}>
                <FileUpload
                  label="Upload Processed BE Copy"
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
              </Col>{" "}
              <Row style={{ marginTop: "10px" }}>
                <Col xs={12} lg={4}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>Checklist Approved:&nbsp;</strong>{" "}
                    <Checkbox
                      checked={formik.values.is_checklist_aprroved}
                      disabled={!formik.values.is_checklist_clicked}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (isChecked) {
                          // Set current date-time adjusted to local timezone
                          const currentDateTime = new Date(
                            Date.now() - new Date().getTimezoneOffset() * 60000
                          )
                            .toISOString()
                            .slice(0, 16);
                          formik.setFieldValue("is_checklist_aprroved", true);
                          formik.setFieldValue(
                            "is_checklist_aprroved_date",
                            currentDateTime
                          );
                        } else {
                          // Clear values when unchecked
                          formik.setFieldValue("is_checklist_aprroved", false);
                          formik.setFieldValue(
                            "is_checklist_aprroved_date",
                            ""
                          );
                        }
                      }}
                    />
                    {!formik.values.is_checklist_clicked && (
                      <span
                        style={{
                          marginLeft: "10px",
                          fontSize: "12px",
                          color: "#666",
                          fontStyle: "italic",
                        }}
                      >
                        (Click on a checklist file first to enable)
                      </span>
                    )}
                    {formik.values.is_checklist_aprroved_date && (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.is_checklist_aprroved_date
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                </Col>{" "}
              </Row>
            </Row>
            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>Examination Planning Date:&nbsp;</strong>
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
              <Col
                xs={12}
                lg={4}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Typography variant="body1" sx={{ mr: 1 }}>
                  First Check
                </Typography>
                <Switch
                  checked={Boolean(formik.values.firstCheck)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Calculate current date-time adjusted for timezone and slice to 'YYYY-MM-DDTHH:mm'
                      const currentDateTime = new Date(
                        Date.now() - new Date().getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .slice(0, 16);
                      formik.setFieldValue("firstCheck", currentDateTime);
                    } else {
                      formik.setFieldValue("firstCheck", "");
                    }
                  }}
                  name="firstCheck"
                  color="primary"
                  disabled={Boolean(formik.values.out_of_charge?.trim())} // Disable if OOC date is not empty
                />
                {formik.values.firstCheck && (
                  <>
                    <Typography variant="body1" sx={{ color: "green", ml: 1 }}>
                      YES &nbsp;
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ ml: 1, fontWeight: "bold" }}
                    >
                      {new Date(formik.values.firstCheck).toLocaleString(
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
            </Row>
            <Row style={{ marginTop: "20px" }}>
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
                    type="datetime-local"
                    id="pcv_date"
                    name="pcv_date"
                    value={
                      formik.values.pcv_date
                        ? formik.values.pcv_date.length === 10
                          ? `${formik.values.pcv_date}T00:00`
                          : formik.values.pcv_date
                        : ""
                    }
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>{" "}
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Duty Paid Date:&nbsp;</strong>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      type="datetime-local"
                      id="duty_paid_date"
                      name="duty_paid_date"
                      value={formik.values.duty_paid_date}
                      onChange={formik.handleChange}
                      disabled={isDutyPaidDateDisabled}
                      sx={{ flex: 1 }}
                    />
                    <IconButton
                      onClick={handleOpenDutyModal}
                      size="small"
                      sx={{ mt: 1 }}
                      title="Add Duty Details"
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                  {isDutyPaidDateDisabled && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ mt: 1, display: "block" }}
                    >
                      Please add Assessment Date and IGST Amount details first
                    </Typography>
                  )}{" "}
                </div>
              </Col>
            </Row>
            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div className="job-detail-input-container">
                  <strong>Out of Charge Date:&nbsp;</strong>
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="out_of_charge"
                    name="out_of_charge"
                    value={
                      formik.values.out_of_charge
                        ? formik.values.out_of_charge.length === 10
                          ? `${formik.values.out_of_charge}T00:00`
                          : formik.values.out_of_charge
                        : ""
                    }
                    onChange={formik.handleChange}
                  />
                </div>
              </Col>

              <Col xs={4}>
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
              <Col xs={12} lg={4}>
                <FileUpload
                  label="Upload Customs Gate Pass Copy"
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
            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>
                    {formik.values.is_obl_recieved
                      ? "OBL Recived By DO Team "
                      : ""}
                  </strong>
                </div>
              </Col>
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
                      value="Waybill"
                      control={
                        <Radio
                          checked={formik.values.obl_telex_bl === "Waybill"}
                        />
                      }
                      label="Waybill"
                    />
                    <FormControlLabel
                      value="clear"
                      control={<Radio />}
                      label="Clear"
                    />
                  </RadioGroup>
                </FormControl>
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
            <Row style={{ marginTop: "20px" }}>
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

            <Row style={{ marginTop: "20px" }}>
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
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>DO Revalidation:&nbsp;</strong>
                  <Checkbox
                    value={formik.values.do_revalidatioFn}
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
                <Col xs={12} lg={4} style={{ marginTop: "20px" }}>
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
            <Row style={{ marginTop: "20px" }}>
              <Col xs={12} lg={4}>
                <div
                  className="job-detail-input-container"
                  style={{ justifyContent: "flex-start" }}
                >
                  <strong>DO Received Date:</strong>
                  &nbsp;
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    type="datetime-local"
                    id="do_completed"
                    name="do_completed"
                    value={formatDateTime(
                      formik.values.do_completed
                        ? formik.values.do_completed
                        : ""
                    )}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue) {
                        formik.setFieldValue("do_completed", newValue);
                      } else {
                        formik.setFieldValue("do_completed", "");
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
                  <strong>DO Valid Up to:</strong> &nbsp;&nbsp;
                  {formik.values.do_validity_upto_job_level}
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div className="mb-3">
                  <strong>DO Copies:&nbsp;</strong>
                  <ImagePreview
                    images={formik.values.do_copies || []} // Corrected optional chaining syntax
                    readOnly
                  />
                </div>
              </Col>
            </Row>
            <Row style={{ marginTop: "20px" }}>
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
          {/* Tracking status end*/}

{/* document section */}
<div className="job-details-container">
  <JobDetailsRowHeading heading="Documents" />
  <br />

  {/* CTH Documents Section */}
  <Row>
    {cthDocuments?.map((doc, index) => (
      <Col
        xs={12}
        md={6}
        lg={4}
        key={`cth-${index}`}
        style={{ marginBottom: "30px", position: "relative" }}
      >
        <div className="document-card" style={{ 
          border: "1px solid #e0e0e0", 
          borderRadius: "8px", 
          padding: "15px",
          backgroundColor: "#fafafa"
        }}>
          {/* Document Header with Title and Actions */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "15px",
            borderBottom: "1px solid #e0e0e0",
            paddingBottom: "10px"
          }}>
            <h6 style={{ 
              margin: 0, 
              fontWeight: "600",
              color: "#333"
            }}>
              {doc.document_name} ({doc.document_code})
            </h6>
            
            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              {user?.role === "Admin" && (
                <>
                  <span
                    style={{
                      cursor: "pointer",
                      color: "#007bff",
                      fontSize: "14px"
                    }}
                    onClick={() => handleOpenDialog(doc, true)}
                    title="Edit Document"
                  >
                    <i className="fas fa-edit"></i>
                  </span>
                  <span
                    style={{ 
                      cursor: "pointer", 
                      color: "#dc3545",
                      fontSize: "14px"
                    }}
                    onClick={() => handleOpenDialog(doc, false)}
                    title="Delete Document"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </span>
                </>
              )}
{/* Action Buttons */}
<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  {user?.role === "Admin" && (
    <>
      <span
        style={{
          cursor: "pointer",
          color: "#007bff",
          fontSize: "14px"
        }}
        onClick={() => handleOpenDialog(doc, true)}
        title="Edit Document"
      >
        <i className="fas fa-edit"></i>
      </span>
      <span
        style={{ 
          cursor: "pointer", 
          color: "#dc3545",
          fontSize: "14px"
        }}
        onClick={() => handleOpenDialog(doc, false)}
        title="Delete Document"
      >
        <i className="fas fa-trash-alt"></i>
      </span>
    </>
  )}
  
  {/* Remove Button - Icon Only */}
  <DeleteIcon
    style={{ 
      cursor: "pointer", 
      color: "#dc3545",
      fontSize: "18px"
    }}
    onClick={() => {
      if (window.confirm(`Remove "${doc.document_name}" from the list?`)) {
        const updatedDocuments = cthDocuments.filter((_, i) => i !== index);
        setCthDocuments(updatedDocuments);
      }
    }}
    title="Remove document from list"
  />
</div>


            </div>
          </div>

          {/* Document Details Row */}
          <Row style={{ marginBottom: "15px" }}>
            {/* Document Check Date */}
            <Col xs={12} md={6} style={{ marginBottom: "10px" }}>
              <div style={{
                padding: "8px 12px",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                backgroundColor: "#f9f9f9",
                fontSize: "14px",
                color: "#555"
              }}>
                <strong style={{ color: "#333", marginRight: "8px" }}>
                  Completed Date:
                </strong>
                {doc.document_check_date ? 
                  new Date(doc.document_check_date).toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }) : 
                  <span style={{ color: "#999", fontStyle: "italic" }}>Not set</span>
                }
              </div>
            </Col>

            {/* Is Sent to E-Sanchit Checkbox */}
            <Col xs={12} md={6} style={{ 
              display: "flex", 
              alignItems: "center",
              marginBottom: "10px"
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={doc.is_sent_to_esanchit || false}
                    onChange={(e) => {
                      const updatedDocuments = [...cthDocuments];
                      updatedDocuments[index].is_sent_to_esanchit = e.target.checked;
                      setCthDocuments(updatedDocuments);
                    }}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <span style={{ fontSize: "14px", color: "#555" }}>
                    Sent to E-Sanchit
                  </span>
                }
              />
            </Col>
          </Row>

          {/* File Upload Section */}
          <div style={{ marginBottom: "15px" }}>
            <FileUpload
              label="Upload Documents"
              bucketPath={`cth-documents/${doc.document_name}`}
              onFilesUploaded={(urls) => {
                const updatedDocuments = [...cthDocuments];
                updatedDocuments[index].url = [
                  ...(updatedDocuments[index].url || []),
                  ...urls,
                ];
                setCthDocuments(updatedDocuments);
              }}
              multiple={true}
            />
          </div>

          {/* Image Preview Section */}
          <ImagePreview
            images={doc.url || []}
            isDsr= {true}
            onDeleteImage={(deleteIndex) => {
              const updatedDocuments = [...cthDocuments];
              updatedDocuments[index].url = updatedDocuments[index].url.filter(
                (_, i) => i !== deleteIndex
              );
              setCthDocuments(updatedDocuments);
            }}
            readOnly={false}
          />
        </div>
      </Col>
    ))}
  </Row>

  {/* Add Document Section */}
  <div style={{ 
    backgroundColor: "#f8f9fa", 
    border: "2px dashed #dee2e6", 
    borderRadius: "8px", 
    padding: "20px", 
    marginTop: "20px" 
  }}>
    <h6 style={{ 
      marginBottom: "15px", 
      color: "#6c757d",
      fontWeight: "500"
    }}>
      Add New Document
    </h6>
    
    <Row>
      <Col xs={12} lg={4}>
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
            {cth_Dropdown
              .filter(doc => 
                !cthDocuments.some(
                  existingDoc => existingDoc.document_code === doc.document_code
                )
              )
              .map((doc) => (
                <MenuItem
                  key={doc.document_code}
                  value={doc.document_code}
                >
                  {doc.document_name}
                </MenuItem>
              ))
            }
            <MenuItem value="other">
              <em>Other (Custom Document)</em>
            </MenuItem>
          </Select>
        </FormControl>
      </Col>

      {selectedDocument === "other" && (
        <>
          <Col xs={12} lg={3}>
            <TextField
              fullWidth
              size="small"
              margin="normal"
              variant="outlined"
              label="Document Name"
              value={newDocumentName}
              onChange={(e) => setNewDocumentName(e.target.value)}
              onKeyDown={preventFormSubmitOnEnter}
              required
            />
          </Col>
          <Col xs={12} lg={3}>
            <TextField
              fullWidth
              size="small"
              margin="normal"
              variant="outlined"
              label="Document Code"
              value={newDocumentCode}
              onChange={(e) => setNewDocumentCode(e.target.value)}
              onKeyDown={preventFormSubmitOnEnter}
              required
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
          className="btn btn-outline-primary"
          style={{ 
            marginTop: "8px", 
            height: "fit-content",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
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
                  is_sent_to_esanchit: false,
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
                  document_name: newDocumentName.trim(),
                  document_code: newDocumentCode.trim(),
                  url: [],
                  document_check_date: "",
                  is_sent_to_esanchit: false,
                },
              ]);
              setNewDocumentName("");
              setNewDocumentCode("");
            }
            setSelectedDocument("");
          }}
          disabled={
            !selectedDocument || 
            (selectedDocument === "other" && 
              (!newDocumentName.trim() || !newDocumentCode.trim())
            )
          }
        >
          <i className="fas fa-plus"></i>
          Add Document
        </button>
      </Col>
    </Row>
  </div>
</div>

          {/* charges section */}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Charges" />
            <br />

            {/* All Charges Documents (Predefined + Custom) in same row structure */}
            <Row>
              {DsrCharges?.map((doc, index) => {
                const selectedChargesDoc =
                  selectedChargesDocuments.find(
                    (selected) => selected.document_name === doc.document_name
                  ) || {};

                return (
                  <Col
                    xs={12}
                    lg={4}
                    key={`charges-${index}`}
                    style={{ marginBottom: "20px", position: "relative" }}
                  >
                    <div style={{ display: "inline" }}>
                      <FileUpload
                        label={doc.document_name}
                        bucketPath={`charges-documents/${doc.document_name}`}
                        onFilesUploaded={(urls) => {
                          const updatedChargesDocuments = [
                            ...selectedChargesDocuments,
                          ];
                          const existingIndex =
                            updatedChargesDocuments.findIndex(
                              (selected) =>
                                selected.document_name === doc.document_name
                            );

                          if (existingIndex !== -1) {
                            updatedChargesDocuments[existingIndex].url = [
                              ...(updatedChargesDocuments[existingIndex].url ||
                                []),
                              ...urls,
                            ];
                          } else {
                            updatedChargesDocuments.push({
                              document_name: doc.document_name,
                              url: urls,
                              document_check_date: "",
                              document_amount_details: "",
                            });
                          }
                          setSelectedChargesDocuments(updatedChargesDocuments);
                        }}
                        multiple={true}
                      />
                      <div style={{ marginTop: "10px" }}>
                        <TextField
                          label="Amount Details"
                          variant="outlined"
                          size="small"
                          fullWidth
                          type="number"
                          inputProps={{
                            min: 0,
                            step: "0.01",
                            pattern: "[0-9]+(\\.[0-9]+)?",
                          }}
                          value={
                            selectedChargesDoc.document_amount_details || ""
                          }
                          onChange={(e) => {
                            // Only allow numbers and decimal points
                            const value = e.target.value;
                            if (value === "" || /^\d+(\.\d*)?$/.test(value)) {
                              const updatedChargesDocuments = [
                                ...selectedChargesDocuments,
                              ];
                              const existingIndex =
                                updatedChargesDocuments.findIndex(
                                  (selected) =>
                                    selected.document_name === doc.document_name
                                );

                              if (existingIndex !== -1) {
                                updatedChargesDocuments[
                                  existingIndex
                                ].document_amount_details = value;
                              } else {
                                updatedChargesDocuments.push({
                                  document_name: doc.document_name,
                                  url: [],
                                  document_check_date: "",
                                  document_amount_details: value,
                                });
                              }
                              setSelectedChargesDocuments(
                                updatedChargesDocuments
                              );
                            }
                          }}
                          style={{ marginTop: "5px" }}
                        />
                      </div>
                    </div>
                    <ImagePreview
                      images={selectedChargesDoc.url || []}
                      onDeleteImage={(deleteIndex) => {
                        const updatedChargesDocuments = [
                          ...selectedChargesDocuments,
                        ];
                        const docIndex = updatedChargesDocuments.findIndex(
                          (selected) =>
                            selected.document_name === doc.document_name
                        );
                        if (docIndex !== -1) {
                          updatedChargesDocuments[docIndex].url =
                            updatedChargesDocuments[docIndex].url.filter(
                              (_, i) => i !== deleteIndex
                            );
                          setSelectedChargesDocuments(updatedChargesDocuments);
                        }
                      }}
                      readOnly={false}
                    />

                    {/* Delete button for custom documents only */}
                    {![
                      "Notary",
                      "Duty",
                      "MISC",
                      "CE Certification Charges",
                      "ADC/NOC Charges",
                    ].includes(doc.document_name) && (
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          cursor: "pointer",
                          color: "#dc3545",
                        }}
                        onClick={() => {
                          // Remove from DsrCharges
                          const updatedDsrCharges = DsrCharges.filter(
                            (_, i) => i !== index
                          );
                          setDsrCharges(updatedDsrCharges);

                          // Remove from selectedChargesDocuments
                          const updatedSelectedChargesDocuments =
                            selectedChargesDocuments.filter(
                              (selected) =>
                                selected.document_name !== doc.document_name
                            );
                          setSelectedChargesDocuments(
                            updatedSelectedChargesDocuments
                          );
                        }}
                      >
                        <i className="fas fa-trash-alt" title="Delete"></i>
                      </div>
                    )}
                  </Col>
                );
              })}
            </Row>

            {/* Add Custom Charges Document Section */}
            <Row style={{ marginTop: "20px", marginBottom: "20px" }}>
              <Col xs={12} lg={4}>
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  label="Custom Charge Document Name"
                  value={newChargesDocumentName}
                  onChange={(e) => setNewChargesDocumentName(e.target.value)}
                  onKeyDown={preventFormSubmitOnEnter}
                />
              </Col>

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
                      newChargesDocumentName.trim() &&
                      !DsrCharges.some(
                        (doc) =>
                          doc.document_name === newChargesDocumentName.trim()
                      )
                    ) {
                      setDsrCharges([
                        ...DsrCharges,
                        {
                          document_name: newChargesDocumentName.trim(),
                        },
                      ]);
                      setNewChargesDocumentName("");
                    }
                  }}
                  disabled={
                    !newChargesDocumentName.trim() ||
                    DsrCharges.some(
                      (doc) =>
                        doc.document_name === newChargesDocumentName.trim()
                    )
                  }
                >
                  Add Custom Charge Document
                </button>
              </Col>
            </Row>
          </div>
          {/* charges section end */}

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
                    container_rail_out_date: "",
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
                    <Row>
                      <Col xs={12} md={4} lg={3} className="mb-2">
                        <h6 style={{ marginBottom: 0 }}>
                          <strong>
                            {index + 1}. Container Number:&nbsp;
                            <span ref={container_number_ref[index]}>
                              <TextField
                                fullWidth
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
                      </Col>

                      <Col xs={12} md={4} lg={3} className="mb-2">
                        <strong>Size:&nbsp;</strong>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          variant="outlined"
                          id={`size_${index}`}
                          name={`container_nos[${index}].size`}
                          value={container.size}
                          onChange={formik.handleChange}
                        >
                          <MenuItem value="20">20</MenuItem>
                          <MenuItem value="40">40</MenuItem>
                        </TextField>
                      </Col>

                      <Col xs={12} md={4} lg={3} className="mb-2">
                        <div className="job-detail-input-container">
                          <strong>Seal Number:&nbsp;</strong>
                          <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            id={`seal_number${index}`}
                            name={`container_nos[${index}].seal_number`}
                            value={container.seal_number}
                            onChange={formik.handleChange}
                          />
                        </div>
                      </Col>

                      <Col xs={12} md={4} lg={3} className="mb-2">
                        <div className="job-detail-input-container">
                          <strong>Railout Date:&nbsp;</strong>
                          <TextField
                            fullWidth
                            size="small"
                            margin="normal"
                            variant="outlined"
                            type="datetime-local"
                            id={`container_rail_out_date${index}`}
                            name={`container_nos[${index}].container_rail_out_date`}
                            disabled={LCLFlag || ExBondflag} // Disable if the user is not Admin
                            value={container.container_rail_out_date}
                            onChange={formik.handleChange}
                          />
                        </div>
                      </Col>

                      {LCLFlag && (
                        <Col xs={12} md={4} lg={3} className="mb-2">
                          <div className="job-detail-input-container">
                            <strong>By Road Movement Date:&nbsp;</strong>
                            <TextField
                              fullWidth
                              size="small"
                              variant="outlined"
                              type="datetime-local"
                              id={`by_road_movement_date${index}`}
                              name={`container_nos[${index}].by_road_movement_date`}
                              value={container.by_road_movement_date}
                              disabled={ExBondflag} // Optional: Disable if ExBondflag is true
                              onChange={formik.handleChange}
                            />
                          </div>
                        </Col>
                      )}
                    </Row>

                    <br />
                    <Row>
                      <Col xs={12} lg={3}>
                        <div className="job-detail-input-container">
                          <strong>Arrival Date:&nbsp;</strong>
                          {formik.values.checked ? (
                            <span>
                              {container.arrival_date || "Not Available"}
                            </span>
                          ) : (
                            <TextField
                              fullWidth
                              size="small"
                              margin="normal"
                              variant="outlined"
                              type="datetime-local"
                              id={`arrival_date_${index}`}
                              name={`container_nos[${index}].arrival_date`}
                              value={container.arrival_date}
                              disabled={
                                ExBondflag ||
                                (LCLFlag
                                  ? !container.by_road_movement_date
                                  : !container.container_rail_out_date)
                              }
                              onChange={formik.handleChange}
                            />
                          )}
                        </div>
                      </Col>
                      <Col xs={12} lg={2} className="flex-div">
                        <strong>Detention From:&nbsp;</strong>
                        {detentionFrom[index]}
                      </Col>
                      <Col xs={12} lg={2} className="flex-div">
                        <strong>DO Validity:&nbsp;</strong>
                        {subtractOneDay(detentionFrom[index])}
                      </Col>
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

                      <Col xs={12} md={4} lg={3} className="mb-2">
                        <div className="job-detail-input-container">
                          <strong>Netweight As Per PL:&nbsp;</strong>
                          <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            id={`net_weight_as_per_PL_document${index}`}
                            name={`container_nos[${index}].net_weight_as_per_PL_document`}
                            value={container.net_weight_as_per_PL_document}
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
                          {container.container_gross_weight &&
                          container.container_gross_weight !== "0" ? (
                            <>{container.weight_shortage || ""}</>
                          ) : (
                            ""
                          )}
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

                    <Row
                      style={{
                        marginTop: "20px",
                        displayflex: "flex",
                        alignItems: "baseline",
                      }}
                    >
                      <Col xs={12} md={4} lg={3} className="mb-2">
                        <div className="job-detail-input-container">
                          <strong>Delivery Date:&nbsp;</strong>
                          <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            type="datetime-local"
                            id={`delivery_date${index}`}
                            name={`container_nos[${index}].delivery_date`}
                            value={formatDateForInput(container.delivery_date)}
                            onChange={formik.handleChange}
                          />
                        </div>
                      </Col>
                      <Col xs={12} md={4} lg={3} className="mb-2">
                        <div className="job-detail-input-container">
                          <strong>Empty Cont. Off-Load Date.&nbsp;</strong>
                          <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            type="datetime-local"
                            id={`emptyContainerOffLoadDate${index}`}
                            name={`container_nos[${index}].emptyContainerOffLoadDate`}
                            value={formatDateForInput(
                              container.emptyContainerOffLoadDate
                            )}
                            disabled={LCLFlag} // Disable if the user is not Admin
                            onChange={formik.handleChange}
                          />
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "20px",
                        }}
                      >
                        <DeliveryChallanPdf
                          year={params.selected_year}
                          jobNo={params.job_no}
                          containerIndex={index}
                        />
                        <IgstCalculationPDF
                          year={params.selected_year}
                          jobNo={params.job_no}
                          containerIndex={index}
                        />
                      </div>
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
                  </div>{" "}
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

          {/*************************** Row 8 ****************************/}

          {/*************************** Row 9 ****************************/}

          {/*************************** Row 11 ****************************/}

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
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>
          {confirmDialog.type === "delete"
            ? "Delete Query?"
            : "Mark as Resolved?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.type === "delete"
              ? "Are you sure you want to delete this query?"
              : "Are you sure you want to mark this query as resolved?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              const { queryKey, queryIndex, type } = confirmDialog;
              const updated = [...formik.values[queryKey]];

              if (type === "delete") {
                updated.splice(queryIndex, 1);
              } else if (type === "resolve") {
                updated[queryIndex].resolved = true;
              }

              formik.setFieldValue(queryKey, updated);
              setConfirmDialog({
                open: false,
                type: "",
                queryKey: "",
                queryIndex: null,
              });
            }}
            color={confirmDialog.type === "delete" ? "error" : "success"}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* IGST Modal */}
      <IgstModal
        open={dutyModalOpen}
        onClose={handleCloseDutyModal}
        onSubmit={handleDutySubmit}
        rowData={{
          ...formik.values,
          job_no: params.job_no,
        }}
        dates={{
          assessment_date: formik.values.assessment_date,
          duty_paid_date: formik.values.duty_paid_date,
        }}
        containers={formik.values.container_nos || []}
      />

      {/* Delete Confirmation Dialog */}
<Dialog
  open={deleteDialogOpen}
  onClose={() => setDeleteDialogOpen(false)}
  aria-labelledby="delete-dialog-title"
>
  <DialogTitle id="delete-dialog-title">
    Confirm Removal
  </DialogTitle>
  <DialogContent>
    <DialogContentText>
      Are you sure you want to remove "{documentToDelete !== null ? cthDocuments[documentToDelete]?.document_name : ''}" from the list? This action cannot be undone.
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button 
      onClick={() => setDeleteDialogOpen(false)}
      color="primary"
    >
      Cancel
    </Button>
    <Button 
      onClick={() => {
        if (documentToDelete !== null) {
          const updatedDocuments = cthDocuments.filter((_, i) => i !== documentToDelete);
          setCthDocuments(updatedDocuments);
          setDeleteDialogOpen(false);
          setDocumentToDelete(null);
        }
      }}
      color="secondary"
      variant="contained"
    >
      Remove
    </Button>
  </DialogActions>
</Dialog>

    </>
  );
}

export default React.memo(JobDetails);

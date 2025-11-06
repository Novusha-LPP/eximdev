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
import { Edit, Delete } from "@mui/icons-material";
import FileUpload from "../../components/gallery/FileUpload.js";
import ConfirmDialog from "../../components/gallery/ConfirmDialog.js";
import { TabContext } from "../documentation/DocumentationTab.js";
import DeliveryChallanPdf from "./DeliveryChallanPDF.js";
import IgstModal from "../gallery/IgstModal.js";
import IgstCalculationPDF from "./IgstCalculationPDF.js";
import { preventFormSubmitOnEnter } from "../../utils/preventFormSubmitOnEnter.js";
import QueriesComponent from "../../utils/QueriesComponent.js";
import TrackingStatusSection from "./TrackingStatusSection.js";

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

  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (!text || text === "N/A") return;
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => console.log("Copied:", text))
        .catch((err) => console.error("Copy failed:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Copied (fallback):", text);
      } catch (err) {
        console.error("Fallback failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

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

  useEffect(() => {
    // Check if assessable_amount has a value and assessment_date is set
    if (
      formik.values.assessable_ammount &&
      formik.values.assessable_ammount.trim() !== "" &&
      formik.values.assessment_date &&
      formik.values.payment_method === "Deferred"
    ) {
      // Set duty_paid_date to the same value as assessment_date
      formik.setFieldValue("duty_paid_date", formik.values.assessment_date);
    }
  }, [formik.values.assessable_ammount, formik.values.assessment_date]);

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
  const InBondflag = formik.values.type_of_b_e === "In-Bond";
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

            {/* Row 1: Status Display - Documentation, E-Sanchit, Submission, DO */}
            <Row style={{ marginBottom: "0px", padding: "0px" }}>
              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#495057" }}>
                    Documentation:
                  </span>
                  <span
                    style={{
                      fontWeight: "500",
                      color: formik.values.documentation_completed_date_time
                        ? "#28a745"
                        : "#dc3545",
                    }}
                  >
                    {formik.values.documentation_completed_date_time
                      ? new Date(
                          formik.values.documentation_completed_date_time
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "Pending"}
                  </span>
                </div>
                {user?.role === "Admin" && (
                  <div>
                    <TextField
                      type="datetime-local"
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="documentation_completed_date_time"
                      name="documentation_completed_date_time"
                      value={
                        formik.values.documentation_completed_date_time || ""
                      }
                      onChange={(e) =>
                        formik.setFieldValue(
                          "documentation_completed_date_time",
                          e.target.value
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": { height: "32px" },
                        "& .MuiOutlinedInput-input": {
                          padding: "6px 8px",
                          fontSize: "0.8rem",
                        },
                      }}
                    />
                  </div>
                )}
              </Col>

              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#495057" }}>
                    E-Sanchit:
                  </span>
                  <span
                    style={{
                      fontWeight: "500",
                      color: formik.values.esanchit_completed_date_time
                        ? "#28a745"
                        : "#dc3545",
                    }}
                  >
                    {formik.values.esanchit_completed_date_time
                      ? new Date(
                          formik.values.esanchit_completed_date_time
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "Pending"}
                  </span>
                </div>
                {user?.role === "Admin" && (
                  <div>
                    <TextField
                      type="datetime-local"
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="esanchit_completed_date_time"
                      name="esanchit_completed_date_time"
                      value={formik.values.esanchit_completed_date_time || ""}
                      onChange={(e) =>
                        formik.setFieldValue(
                          "esanchit_completed_date_time",
                          e.target.value
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": { height: "32px" },
                        "& .MuiOutlinedInput-input": {
                          padding: "6px 8px",
                          fontSize: "0.8rem",
                        },
                      }}
                    />
                  </div>
                )}
              </Col>

              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#495057" }}>
                    Submission:
                  </span>
                  <span
                    style={{
                      fontWeight: "500",
                      color: formik.values.submission_completed_date_time
                        ? "#28a745"
                        : "#dc3545",
                    }}
                  >
                    {formik.values.submission_completed_date_time
                      ? new Date(
                          formik.values.submission_completed_date_time
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "Pending"}
                  </span>
                </div>
                {user?.role === "Admin" && (
                  <div>
                    <TextField
                      type="datetime-local"
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="submission_completed_date_time"
                      name="submission_completed_date_time"
                      value={formik.values.submission_completed_date_time || ""}
                      onChange={(e) =>
                        formik.setFieldValue(
                          "submission_completed_date_time",
                          e.target.value
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": { height: "32px" },
                        "& .MuiOutlinedInput-input": {
                          padding: "6px 8px",
                          fontSize: "0.8rem",
                        },
                      }}
                    />
                  </div>
                )}
              </Col>

              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#495057" }}>
                    DO:
                  </span>
                  <span
                    style={{
                      fontWeight: "500",
                      color: formik.values.do_completed ? "#28a745" : "#dc3545",
                    }}
                  >
                    {formik.values.do_completed
                      ? new Date(formik.values.do_completed).toLocaleString(
                          "en-US",
                          {
                            timeZone: "Asia/Kolkata",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          }
                        )
                      : "Pending"}
                  </span>
                </div>
                {user?.role === "Admin" && (
                  <div>
                    <TextField
                      type="datetime-local"
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="do_completed"
                      name="do_completed"
                      value={
                        formik.values.do_completed
                          ? new Date(formik.values.do_completed)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        formik.setFieldValue("do_completed", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": { height: "32px" },
                        "& .MuiOutlinedInput-input": {
                          padding: "6px 8px",
                          fontSize: "0.8rem",
                        },
                      }}
                    />
                  </div>
                )}
              </Col>
            </Row>

            {/* Row 2: Operation Completion, Delivery Completion, Status, Detailed Status */}
            <Row style={{ marginBottom: "0px", padding: "0px" }}>
              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#495057" }}>
                    Operation Completed:
                  </span>
                  <span
                    style={{
                      fontWeight: "500",
                      color: formik.values.completed_operation_date
                        ? "#28a745"
                        : "#212529",
                    }}
                  >
                    {formik.values.completed_operation_date
                      ? new Date(
                          formik.values.completed_operation_date
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "-"}
                  </span>
                </div>
                {user?.role === "Admin" && (
                  <div>
                    <TextField
                      type="datetime-local"
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="completed_operation_date"
                      name="completed_operation_date"
                      value={formik.values.completed_operation_date || ""}
                      onChange={(e) =>
                        formik.setFieldValue(
                          "completed_operation_date",
                          e.target.value
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": { height: "32px" },
                        "& .MuiOutlinedInput-input": {
                          padding: "6px 8px",
                          fontSize: "0.8rem",
                        },
                      }}
                    />
                  </div>
                )}
              </Col>

              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#495057" }}>
                    Delivery Completed:
                  </span>
                  <span
                    style={{
                      fontWeight: "500",
                      color: data?.bill_document_sent_to_accounts
                        ? "#28a745"
                        : "#212529",
                    }}
                  >
                    {data?.bill_document_sent_to_accounts
                      ? new Date(
                          data.bill_document_sent_to_accounts
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "-"}
                  </span>
                </div>
                {user?.role === "Admin" && (
                  <div>
                    <TextField
                      type="datetime-local"
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="bill_document_sent_to_accounts"
                      name="bill_document_sent_to_accounts"
                      value={
                        data?.bill_document_sent_to_accounts
                          ? formatDateForInput(
                              data.bill_document_sent_to_accounts
                            )
                          : ""
                      }
                      onChange={(e) =>
                        formik.setFieldValue(
                          "bill_document_sent_to_accounts",
                          e.target.value
                        )
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": { height: "32px" },
                        "& .MuiOutlinedInput-input": {
                          padding: "6px 8px",
                          fontSize: "0.8rem",
                        },
                      }}
                    />
                  </div>
                )}
              </Col>

              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div style={{ fontSize: "0.875rem", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontWeight: "600",
                      color: "#495057",
                      marginRight: "8px",
                    }}
                  >
                    Status:
                  </span>
                </div>
                <TextField
                  select
                  fullWidth
                  size="small"
                  variant="outlined"
                  id="status"
                  name="status"
                  value={formik.values.status || ""}
                  onChange={formik.handleChange}
                  sx={{
                    "& .MuiOutlinedInput-root": { height: "32px" },
                    "& .MuiOutlinedInput-input": {
                      padding: "6px 8px",
                      fontSize: "0.8rem",
                    },
                  }}
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </TextField>
              </Col>

              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div style={{ fontSize: "0.875rem", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontWeight: "600",
                      color: "#495057",
                      marginRight: "8px",
                    }}
                  >
                    Detailed Status:
                  </span>
                </div>
                <TextField
                  select
                  fullWidth
                  size="small"
                  variant="outlined"
                  id="detailed_status"
                  name="detailed_status"
                  value={formik.values.detailed_status || ""}
                  onChange={formik.handleChange}
                  sx={{
                    "& .MuiOutlinedInput-root": { height: "32px" },
                    "& .MuiOutlinedInput-input": {
                      padding: "6px 8px",
                      fontSize: "0.8rem",
                    },
                  }}
                >
                  <MenuItem value="ETA Date Pending">ETA Date Pending</MenuItem>
                  <MenuItem value="Estimated Time of Arrival">ETA</MenuItem>
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
                    Cus.Clearance Completed
                  </MenuItem>
                  <MenuItem value="Billing Pending">Billing Pending</MenuItem>
                  <MenuItem value="Status Completed">Status Completed</MenuItem>
                </TextField>
              </Col>
            </Row>

            {/* Row 3: Bill Agency, Bill Reimbursement, Bill Date */}
            <Row style={{ marginBottom: "0px", padding: "0px" }}>
              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6c757d",
                    marginBottom: "2px",
                  }}
                >
                  Bill Agency
                </div>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder="Enter Bill Agency"
                  value={(formik.values.bill_no?.split(",")[0] || "").trim()}
                  onChange={(e) => {
                    const currentBillNo = formik.values.bill_no || "";
                    const billParts = currentBillNo.split(",");
                    const newBillNo = `${e.target.value.trim()},${(
                      billParts[1] || ""
                    ).trim()}`;
                    formik.setFieldValue("bill_no", newBillNo);
                  }}
                  disabled={user?.role !== "Admin" && isSubmissionDate}
                  sx={{
                    "& .MuiOutlinedInput-root": { height: "32px" },
                    "& .MuiOutlinedInput-input": {
                      padding: "6px 8px",
                      fontSize: "0.8rem",
                    },
                  }}
                />
              </Col>

              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6c757d",
                    marginBottom: "2px",
                  }}
                >
                  Bill Reimbursement
                </div>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder="Enter Bill Reimbursement"
                  value={(formik.values.bill_no?.split(",")[1] || "").trim()}
                  onChange={(e) => {
                    const currentBillNo = formik.values.bill_no || "";
                    const billParts = currentBillNo.split(",");
                    const newBillNo = `${(
                      billParts[0] || ""
                    ).trim()},${e.target.value.trim()}`;
                    formik.setFieldValue("bill_no", newBillNo);
                  }}
                  disabled={user?.role !== "Admin" && isSubmissionDate}
                  sx={{
                    "& .MuiOutlinedInput-root": { height: "32px" },
                    "& .MuiOutlinedInput-input": {
                      padding: "6px 8px",
                      fontSize: "0.8rem",
                    },
                  }}
                />
              </Col>

              <Col xs={12} md={6} lg={3} style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6c757d",
                    marginBottom: "2px",
                  }}
                >
                  Bill Date
                </div>
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
                  disabled={user?.role !== "Admin" && isSubmissionDate}
                  sx={{
                    "& .MuiOutlinedInput-root": { height: "32px" },
                    "& .MuiOutlinedInput-input": {
                      padding: "6px 8px",
                      fontSize: "0.8rem",
                    },
                  }}
                />
              </Col>
            </Row>
          </div>

          {/* completion status end  */}
          {/* Tracking status start*/}
        <TrackingStatusSection
          formik={formik}
          user={user}
          isSubmissionDate={isSubmissionDate}
          ExBondflag={ExBondflag}
          handleBlStatusChange={handleBlStatusChange}
          resetOtherDetails={resetOtherDetails}
          handleDateChange={handleDateChange}
          formatDateTime={formatDateTime}
          handleGenerate={handleGenerate}
          handleOpenDutyModal={handleOpenDutyModal}
          isDutyPaidDateDisabled={isDutyPaidDateDisabled}
          canChangeClearance={canChangeClearance}
          filteredClearanceOptions={filteredClearanceOptions}
          jobDetails={jobDetails}
          beTypeOptions={beTypeOptions}
          importTerms={formik.values.import_terms}
          handleImportTermsChange={handleImportTermsChange}
          options={options}
          data={data}
        />
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
                  <div
                    className="document-card"
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      padding: "15px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    {/* Document Header with Title and Actions */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "15px",
                        borderBottom: "1px solid #e0e0e0",
                        paddingBottom: "10px",
                      }}
                    >
                      <h6
                        style={{
                          margin: 0,
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        {doc.document_name} ({doc.document_code})
                      </h6>

                      {/* Action Buttons */}
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            cursor: "pointer",
                            color: "#007bff",
                            fontSize: "18px",
                          }}
                          onClick={() => handleOpenDialog(doc, true)}
                          title="Edit Document"
                        >
                          <Edit fontSize="inherit" />
                        </span>
                        <span
                          style={{
                            cursor: "pointer",
                            color: "#dc3545",
                            fontSize: "18px",
                          }}
                          onClick={() => handleOpenDialog(doc, false)}
                          title="Delete Document"
                        >
                          <Delete fontSize="inherit" />
                        </span>
                      </div>
                    </div>

                    {/* Document Details Row */}
                    <Row style={{ marginBottom: "15px" }}>
                      {/* Document Check Date */}
                      <Col xs={12} md={6} style={{ marginBottom: "10px" }}>
                        <div
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #e0e0e0",
                            borderRadius: "4px",
                            backgroundColor: "#f9f9f9",
                            fontSize: "14px",
                            color: "#555",
                          }}
                        >
                          <strong style={{ color: "#333", marginRight: "8px" }}>
                            Completed Date:
                          </strong>
                          {doc.document_check_date ? (
                            new Date(doc.document_check_date).toLocaleString(
                              "en-IN",
                              {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              }
                            )
                          ) : (
                            <span
                              style={{ color: "#999", fontStyle: "italic" }}
                            >
                              Not set
                            </span>
                          )}
                        </div>
                      </Col>

                      {/* Is Sent to E-Sanchit Checkbox */}
                      <Col
                        xs={12}
                        md={6}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={doc.is_sent_to_esanchit || false}
                              onChange={(e) => {
                                const updatedDocuments = [...cthDocuments];
                                updatedDocuments[index].is_sent_to_esanchit =
                                  e.target.checked;
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
                      isDsr={true}
                      onDeleteImage={(deleteIndex) => {
                        const updatedDocuments = [...cthDocuments];
                        updatedDocuments[index].url = updatedDocuments[
                          index
                        ].url.filter((_, i) => i !== deleteIndex);
                        setCthDocuments(updatedDocuments);
                      }}
                      readOnly={false}
                    />
                  </div>
                </Col>
              ))}
            </Row>

            {/* Add Document Section */}
            <div
              style={{
                backgroundColor: "#f8f9fa",
                border: "2px dashed #dee2e6",
                borderRadius: "8px",
                padding: "20px",
                marginTop: "20px",
              }}
            >
              <h6
                style={{
                  marginBottom: "15px",
                  color: "#6c757d",
                  fontWeight: "500",
                }}
              >
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
                        .filter(
                          (doc) =>
                            !cthDocuments.some(
                              (existingDoc) =>
                                existingDoc.document_code === doc.document_code
                            )
                        )
                        .map((doc) => (
                          <MenuItem
                            key={doc.document_code}
                            value={doc.document_code}
                          >
                            {doc.document_name}
                          </MenuItem>
                        ))}
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
                      gap: "5px",
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
                      !(user?.role === "Admin") &&
                      (!selectedDocument ||
                        (selectedDocument === "other" &&
                          (!newDocumentName.trim() || !newDocumentCode.trim())))
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
                    !(user?.role === "Admin") &&
                    (!newChargesDocumentName.trim() ||
                      DsrCharges.some(
                        (doc) =>
                          doc.document_name === newChargesDocumentName.trim()
                      ))
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
                            disabled={
                              !(user?.role === "Admin") &&
                              (LCLFlag || ExBondflag)
                            }
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
                              disabled={user?.role !== "Admin" && ExBondflag} // Optional: Disable if ExBondflag is true
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
                                !(user?.role === "Admin") &&
                                (ExBondflag ||
                                  (LCLFlag
                                    ? !container.by_road_movement_date
                                    : !container.container_rail_out_date))
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
                                  disabled={
                                    user?.role !== "Admin" &&
                                    !formik.values.out_of_charge
                                  }
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
                            disabled={user?.role !== "Admin" && LCLFlag} // Disable if the user is not Admin
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
        <DialogTitle id="delete-dialog-title">Confirm Removal</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove "
            {documentToDelete !== null
              ? cthDocuments[documentToDelete]?.document_name
              : ""}
            " from the list? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (documentToDelete !== null) {
                const updatedDocuments = cthDocuments.filter(
                  (_, i) => i !== documentToDelete
                );
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

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
  Tabs,
  Tab,
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

const compactInputSx = {
  "& .MuiOutlinedInput-root": { height: "32px" },
  "& .MuiOutlinedInput-input": { padding: "6px 8px", fontSize: "0.95rem", fontWeight: "bold" },
  "& .MuiInputLabel-root": { fontSize: "0.95rem", fontWeight: "bold", top: "-4px" }, // Adjust label position if needed
  "& .MuiInputLabel-shrink": { top: "0px" }
};

function JobDetails() {
  const [viewJobTab, setViewJobTab] = useState(0);
  const handleViewJobTabChange = (event, newValue) => {
    setViewJobTab(newValue);
  };

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

  const options = Array.from({ length: 41 }, (_, index) => index);
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
  const [selectedContainerIndex, setSelectedContainerIndex] = useState(0);

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
      be_no,
      container_nos,
      out_of_charge,
      pcv_date,
      discharge_date,
      gateway_igm_date,
      vessel_berthing,
      type_of_b_e,
      consignment_type,
    } = formik.values;

    const isValidDate = (date) => {
      if (!date) return false;
      const d = new Date(date);
      return !isNaN(d.getTime());
    };

    const anyArrival = Array.isArray(container_nos)
      ? container_nos.some((c) => isValidDate(c?.arrival_date))
      : false;

    const anyRailOut = Array.isArray(container_nos)
      ? container_nos.some((c) => isValidDate(c?.container_rail_out_date))
      : false;

    const hasContainers =
      Array.isArray(container_nos) && container_nos.length > 0;

    const allDelivered = hasContainers
      ? container_nos.every((c) => isValidDate(c?.delivery_date))
      : false;

    const allEmptyOffloaded = hasContainers
      ? container_nos.every((c) => isValidDate(c?.emptyContainerOffLoadDate))
      : false;

    const validOOC = isValidDate(out_of_charge);
    const validPCV = isValidDate(pcv_date);
    const validDischarge = isValidDate(discharge_date);
    const validIGM = isValidDate(gateway_igm_date);
    const validETA = isValidDate(vessel_berthing);

    const norm = (s) =>
      String(s || "")
        .trim()
        .toLowerCase();
    const isExBond = norm(type_of_b_e) === "ex-bond";
    const isLCL = norm(consignment_type) === "lcl";

    // Ex-Bond: return early to avoid fall-through
    if (isExBond) {
      if (be_no && validOOC && allDelivered) {
        formik.setFieldValue("detailed_status", "Billing Pending");
        return;
      }
      if (be_no && validOOC) {
        formik.setFieldValue("detailed_status", "Custom Clearance Completed");
        return;
      }
      if (be_no && validPCV) {
        formik.setFieldValue(
          "detailed_status",
          "PCV Done, Duty Payment Pending"
        );
        return;
      }
      formik.setFieldValue("detailed_status", "ETA Date Pending");
      return;
    }

    // Non Ex-Bond (original import flow)
    const billingComplete = isLCL ? allDelivered : allEmptyOffloaded;

    if (be_no && anyArrival && validOOC && billingComplete) {
      formik.setFieldValue("detailed_status", "Billing Pending");
    } else if (be_no && anyArrival && validOOC) {
      formik.setFieldValue("detailed_status", "Custom Clearance Completed");
    } else if (be_no && anyArrival && validPCV) {
      formik.setFieldValue("detailed_status", "PCV Done, Duty Payment Pending");
    } else if (be_no && anyArrival) {
      formik.setFieldValue("detailed_status", "BE Noted, Clearance Pending");
    } else if (!be_no && anyArrival) {
      formik.setFieldValue("detailed_status", "Arrived, BE Note Pending");
    } else if (be_no && !anyArrival) {
      formik.setFieldValue("detailed_status", "BE Noted, Arrival Pending");
    } else if (anyRailOut) {
      formik.setFieldValue("detailed_status", "Rail Out");
    } else if (validDischarge) {
      formik.setFieldValue("detailed_status", "Discharged");
    } else if (validIGM) {
      formik.setFieldValue("detailed_status", "Gateway IGM Filed");
    } else if (validETA) {
      formik.setFieldValue("detailed_status", "Estimated Time of Arrival");
    } else {
      formik.setFieldValue("detailed_status", "ETA Date Pending");
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
    } catch (err) { }
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

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2, bgcolor: "white", borderRadius: 1 }}>
            <Tabs value={viewJobTab} onChange={handleViewJobTabChange} aria-label="job details tabs"
              variant="scrollable" scrollButtons="auto"
              sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "1rem" } }}
            >
              <Tab label="Completion Status" />
              <Tab label="Tracking Status" />
              <Tab label="Containers" />
              <Tab label="Documents" />
              <Tab label="Charges" />
            </Tabs>
          </Box>

          {viewJobTab === 0 && (
            <>
              {/* completion status start*/}
              <div className="job-details-container">
                <JobDetailsRowHeading heading="Completion Status" />

                <Row>
                  {/* Left Column: Completion Stages (Grid) */}
                  <Col lg={9}>
                    <Row>
                      <Col xs={12} md={6} lg={3} className="pb-3">
                        <div
                          style={{
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontWeight: "600", color: "#495057" }}>
                            Documentation:
                          </span>
                          <span
                            style={{
                              fontWeight: "700",
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
                              sx={compactInputSx}
                            />
                          </div>
                        )}
                      </Col>

                      <Col xs={12} md={6} lg={3} className="pb-3">
                        <div
                          style={{
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontWeight: "600", color: "#495057" }}>
                            E-Sanchit:
                          </span>
                          <span
                            style={{
                              fontWeight: "700",
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
                              sx={compactInputSx}
                            />
                          </div>
                        )}
                      </Col>

                      <Col xs={12} md={6} lg={3} className="pb-3">
                        <div
                          style={{
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontWeight: "600", color: "#495057" }}>
                            Submission:
                          </span>
                          <span
                            style={{
                              fontWeight: "700",
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
                              sx={compactInputSx}
                            />
                          </div>
                        )}
                      </Col>

                      <Col xs={12} md={6} lg={3} className="pb-3">
                        <div
                          style={{
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontWeight: "600", color: "#495057" }}>
                            DO:
                          </span>
                          <span
                            style={{
                              fontWeight: "700",
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
                              sx={compactInputSx}
                            />
                          </div>
                        )}
                      </Col>

                      <Col xs={12} md={6} lg={3} className="pb-3">
                        <div
                          style={{
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontWeight: "600", color: "#495057" }}>
                            Operation Completed:
                          </span>
                          <span
                            style={{
                              fontWeight: "700",
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
                              sx={compactInputSx}
                            />
                          </div>
                        )}
                      </Col>

                      <Col xs={12} md={6} lg={3} className="pb-3">
                        <div
                          style={{
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontWeight: "600", color: "#495057" }}>
                            Delivery Completed:
                          </span>
                          <span
                            style={{
                              fontWeight: "700",
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
                              sx={compactInputSx}
                            />
                          </div>
                        )}
                      </Col>

                      <Col xs={12} md={6} lg={3} className="pb-3">
                        <div style={{ fontSize: "0.95rem", marginBottom: "6px" }}>
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
                          sx={compactInputSx}
                        >
                          <MenuItem value="Pending">Pending</MenuItem>
                          <MenuItem value="Completed">Completed</MenuItem>
                          <MenuItem value="Cancelled">Cancelled</MenuItem>
                        </TextField>
                      </Col>

                      <Col xs={12} md={6} lg={3} className="pb-3">
                        <div style={{ fontSize: "0.95rem", marginBottom: "6px" }}>
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
                          sx={compactInputSx}
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
                  </Col>

                  {/* Right Column: Billing Details (Vertical Stack) */}
                  <Col lg={3} style={{ borderLeft: '1px solid #dee2e6', paddingLeft: '20px' }}>
                    <div className="mb-3">
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#000000",
                          marginBottom: "4px",
                          fontWeight: "600"
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
                        sx={compactInputSx}
                      />
                    </div>

                    <div className="mb-3">
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#000000",
                          marginBottom: "4px",
                          fontWeight: "600"
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
                        sx={compactInputSx}
                      />
                    </div>

                    <div className="mb-3">
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#000000",
                          marginBottom: "4px",
                          fontWeight: "600"
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
                        sx={compactInputSx}
                      />
                    </div>
                  </Col>
                </Row>
              </div>
              {/* completion status end  */}
            </>
          )}

          {viewJobTab === 1 && (
            <>
              {/* Tracking status start*/}
              <div className="job-details-container">
                <JobDetailsRowHeading
                  heading="Tracking Status"
                  rightContent={
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ marginRight: '10px', fontWeight: '600', fontSize: '1rem', color: '#6c757d' }}>Priority:</div>
                      <RadioGroup row name="priorityJob" value={formik.values.priorityJob || ""} onChange={formik.handleChange} >
                        <FormControlLabel value="normal" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} style={{ color: 'green' }} />} label={<span style={{ fontSize: '1rem' }}>Normal</span>} />
                        <FormControlLabel value="Priority" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} style={{ color: 'orange' }} />} label={<span style={{ fontSize: '1rem' }}>Priority</span>} />
                        <FormControlLabel value="High Priority" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} style={{ color: 'red' }} />} label={<span style={{ fontSize: '1rem' }}>High</span>} />
                      </RadioGroup>
                    </div>
                  }
                />

                {/* --- Section: Shipment Journey --- */}
                <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <h6 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#495057", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                    Shipment Journey & Identifiers
                  </h6>
                  <Row>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>BL Number</label>
                      <TextField fullWidth size="small" variant="outlined" id="awb_bl_no" name="awb_bl_no" value={formik.values.awb_bl_no || ""}
                        onChange={formik.handleChange} placeholder="Enter BL No" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>BL Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="awb_bl_date" name="awb_bl_date"
                        value={formik.values.awb_bl_date ? (formik.values.awb_bl_date.length === 10 ? `${formik.values.awb_bl_date}T00:00` : formik.values.awb_bl_date) : ""}
                        onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>HAWBL Number</label>
                      <TextField fullWidth size="small" variant="outlined" id="hawb_hbl_no" name="hawb_hbl_no" value={formik.values.hawb_hbl_no || ""}
                        onChange={formik.handleChange} placeholder="Enter HAWBL No" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>HAWBL Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="hawb_hbl_date" name="hawb_hbl_date"
                        value={formik.values.hawb_hbl_date ? (formik.values.hawb_hbl_date.length === 10 ? `${formik.values.hawb_hbl_date}T00:00` : formik.values.hawb_hbl_date) : ""}
                        onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Gross Weight (KGS)</label>
                      <TextField fullWidth size="small" variant="outlined" id="gross_weight" name="gross_weight" value={formik.values.gross_weight || ""}
                        onChange={formik.handleChange} InputLabelProps={{ shrink: true }} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Net Weight (KGS)</label>
                      <TextField fullWidth size="small" variant="outlined" id="job_net_weight" name="job_net_weight" value={formik.values.job_net_weight || ""}
                        onChange={formik.handleChange} InputLabelProps={{ shrink: true }} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>ETA Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="vessel_berthing" name="vessel_berthing"
                        value={formik.values.vessel_berthing ? (formik.values.vessel_berthing.length === 10 ? `${formik.values.vessel_berthing}T00:00` : formik.values.vessel_berthing) : ""}
                        disabled={!(user?.role === "Admin") && (ExBondflag || isSubmissionDate)} onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Gateway IGM No</label>
                      <TextField fullWidth size="small" variant="outlined" id="gateway_igm" name="gateway_igm" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.gateway_igm || ""} onChange={formik.handleChange} placeholder="Enter Gateway IGM" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Gateway IGM Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="gateway_igm_date" name="gateway_igm_date" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.gateway_igm_date ? (formik.values.gateway_igm_date.length === 10 ? `${formik.values.gateway_igm_date}T00:00` : formik.values.gateway_igm_date) : ""}
                        onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>IGM Number</label>
                      <TextField fullWidth size="small" variant="outlined" id="igm_no" name="igm_no" value={formik.values.igm_no || ""}
                        disabled={user?.role !== "Admin" && isSubmissionDate} onChange={formik.handleChange} placeholder="Enter IGM No" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>IGM Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="igm_date" name="igm_date"
                        value={formik.values.igm_date ? (formik.values.igm_date.length === 10 ? `${formik.values.igm_date}T00:00` : formik.values.igm_date) : ""}
                        disabled={!(user?.role === "Admin") && (ExBondflag || isSubmissionDate)} onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Discharge / L-IGM Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="discharge_date" name="discharge_date"
                        disabled={!(user?.role === "Admin") && (!formik.values.vessel_berthing || ExBondflag || isSubmissionDate)}
                        value={formik.values.discharge_date ? (formik.values.discharge_date.length === 10 ? `${formik.values.discharge_date}T00:00` : formik.values.discharge_date) : ""}
                        onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                    <Col xs={6} md={2} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Line No</label>
                      <TextField fullWidth size="small" variant="outlined" id="line_no" name="line_no" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.line_no || ""} onChange={formik.handleChange} placeholder="Line No" sx={compactInputSx} />
                    </Col>
                    <Col xs={6} md={2} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>No of Packages</label>
                      <TextField fullWidth size="small" variant="outlined" id="no_of_pkgs" name="no_of_pkgs" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.no_of_pkgs || ""} onChange={formik.handleChange} placeholder="No of Pkgs" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={2} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>HSS</label>
                      <TextField fullWidth select size="small" variant="outlined" id="hss" name="hss"
                        disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss || "No"} onChange={formik.handleChange} sx={compactInputSx}>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                    </Col>
                    {formik.values.hss === "Yes" && (
                      <Col xs={12} md={4} lg={3} className="mb-3">
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Seller Name</label>
                        <TextField fullWidth size="small" variant="outlined" id="saller_name" name="saller_name"
                          disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.saller_name || ""} onChange={formik.handleChange} sx={compactInputSx} />
                      </Col>
                    )}

                    {formik.values.consignment_type !== "LCL" && (
                      <Col xs={12} md={2} lg={2} className="mb-3">
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Free Time</label>
                        <TextField fullWidth select size="small" variant="outlined" id="free_time" name="free_time"
                          value={formik.values.free_time || ""} disabled={user?.role !== "Admin" && isSubmissionDate} onChange={formik.handleChange} sx={compactInputSx}>
                          {options?.map((option, id) => (<MenuItem key={id} value={option}>{option}</MenuItem>))}
                        </TextField>
                      </Col>
                    )}
                  </Row>
                </div>

                {/* --- Section: Cargo & Terms --- */}
                <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <h6 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#495057", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                    Invoice Terms & Priority
                  </h6>
                  <Row>


                    <Col xs={12} md={2} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>AD Code</label>
                      <TextField fullWidth size="small" variant="outlined" id="adCode" name="adCode" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.adCode || ""} onChange={formik.handleChange} placeholder="Enter AD Code" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={2} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Bank Name</label>
                      <TextField fullWidth size="small" variant="outlined" id="bank_name" name="bank_name" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.bank_name || ""} onChange={formik.handleChange} placeholder="Enter Bank Name" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={2} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Invoice No</label>
                      <TextField fullWidth size="small" variant="outlined" id="invoice_number" name="invoice_number" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.invoice_number || ""} onChange={formik.handleChange} placeholder="Invoice No" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={2} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Invoice Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="date" id="invoice_date" name="invoice_date" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.invoice_date || ""} onChange={formik.handleChange} InputLabelProps={{ shrink: true }} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={4} lg={3} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Invoice Value</label>
                      <TextField fullWidth size="small" variant="outlined" id="total_inv_value" name="total_inv_value" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.total_inv_value || ""} onChange={formik.handleChange} placeholder={`${data?.inv_currency || ""} ${((formik.values.cifValue || data?.cifValue) && (data?.exrate)) ? ((formik.values.cifValue || data?.cifValue) / data?.exrate).toFixed(2) : ""}`} sx={compactInputSx} />
                    </Col>
                  </Row>

                  <div style={{ marginTop: "16px", padding: "16px", background: "#f8f9fa", borderRadius: "6px" }}>
                    <FormLabel component="legend" sx={{ fontWeight: 600, fontSize: "1rem", color: "#34495e", mb: 1 }}> Terms of Invoice & Payment </FormLabel>

                    <Row className="align-items-center">
                      {/* 1. Import Terms Radios */}
                      <Col xs={12} lg={4} className="mb-2">
                        <RadioGroup row name="import_terms" value={formik.values.import_terms || importTerms} onChange={handleImportTermsChange}>
                          <FormControlLabel value="CIF" control={<Radio size="small" />} label={<span style={{ fontSize: '0.9rem' }}>CIF</span>} />
                          <FormControlLabel value="FOB" control={<Radio size="small" />} label={<span style={{ fontSize: '0.9rem' }}>FOB</span>} />
                          <FormControlLabel value="CF" control={<Radio size="small" />} label={<span style={{ fontSize: '0.9rem' }}>C&F</span>} />
                          <FormControlLabel value="CI" control={<Radio size="small" />} label={<span style={{ fontSize: '0.9rem' }}>C&I</span>} />
                        </RadioGroup>
                      </Col>

                      {/* 2. Values Inputs (Conditionals) */}
                      <Col xs={12} lg={4} className="mb-2">
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <TextField label={`${formik.values.import_terms || importTerms} Value (₹)`} type="number" name="cifValue"
                            value={formik.values.cifValue || ""} onChange={formik.handleChange} size="small" variant="outlined" sx={{ width: 140, bgcolor: 'white', ...compactInputSx }} />

                          {((formik.values.import_terms || importTerms) === "FOB" || (formik.values.import_terms || importTerms) === "CI") && (
                            <TextField label="Freight (₹)" type="number" name="freight" value={formik.values.freight || ""}
                              onChange={formik.handleChange} size="small" variant="outlined" sx={{ width: 140, bgcolor: 'white', ...compactInputSx }} />
                          )}
                          {((formik.values.import_terms || importTerms) === "FOB" || (formik.values.import_terms || importTerms) === "CF") && (
                            <TextField label="Insurance (₹)" type="number" name="insurance" value={formik.values.insurance || ""}
                              onChange={formik.handleChange} size="small" variant="outlined" sx={{ width: 140, bgcolor: 'white', ...compactInputSx }} />
                          )}
                        </div>
                      </Col>

                      {/* Payment radios moved beside FTA Benefit Date (see below) */}
                    </Row>

                    <Row className="align-items-center">
                      <Col xs={12} lg={3} className="mt-2">
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>FTA Benefit Date</label>
                        <TextField fullWidth size="small" variant="outlined" type="datetime-local" name="fta_Benefit_date_time"
                          value={formik.values.fta_Benefit_date_time || ""} InputLabelProps={{ shrink: true }}
                          onChange={(e) => formik.setFieldValue("fta_Benefit_date_time", e.target.value)}
                          disabled={user?.role !== "Admin" && isSubmissionDate} sx={{ bgcolor: 'white', ...compactInputSx }} />
                      </Col>

                      <Col xs={12} lg={4} className="mt-2 d-flex align-items-center">
                        <div style={{ marginRight: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#6c757d' }}>Payment:</div>
                        <RadioGroup row name="payment_method" value={formik.values.payment_method || ""} onChange={formik.handleChange}>
                          <FormControlLabel value="Transaction" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} />} label={<span style={{ fontSize: '0.9rem' }}>Transaction</span>} />
                          <FormControlLabel value="Deferred" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} />} label={<span style={{ fontSize: '0.9rem' }}>Deferred</span>} />
                        </RadioGroup>
                      </Col>
                    </Row>
                  </div>

                  <Row>
                    <Col xs={12} lg={6} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Description</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <TextField size="small" fullWidth multiline rows={2} variant="outlined" id="description" name="description"
                          value={formik.values.description || ""} onChange={formik.handleChange} disabled={user?.role !== "Admin" && isSubmissionDate} />
                        <IconButton size="small" onClick={(event) => handleCopy(event, formik.values.description)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </Col>
                    <Col xs={12} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>CTH No.</label>
                      <TextField fullWidth size="small" variant="outlined" id="cth_no" name="cth_no" value={formik.values.cth_no || ""}
                        onChange={formik.handleChange} disabled={user?.role !== "Admin" && isSubmissionDate} sx={compactInputSx} />
                    </Col>
                  </Row>
                </div>

                {/* --- Section: Clearance, Weights & BE Details --- */}
                <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <h6 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#495057", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                    Clearance & BE Details
                  </h6>
                  <Row>
                    <Col xs={12} md={4} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>BOE Type</label>
                      <TextField select fullWidth size="small" variant="outlined" name="type_of_b_e" value={formik.values.type_of_b_e || ""}
                        onChange={formik.handleChange} disabled={user?.role !== "Admin" && isSubmissionDate} displayEmpty sx={compactInputSx}>
                        <MenuItem value="" disabled>Select BE Type</MenuItem>
                        {beTypeOptions.map((option, index) => (<MenuItem key={index} value={option}>{option}</MenuItem>))}
                      </TextField>
                    </Col>
                    <Col xs={12} md={4} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Clearance Under</label>
                      <TextField select fullWidth size="small" variant="outlined" name="clearanceValue" value={formik.values.clearanceValue || ""}
                        onChange={(e) => { if (canChangeClearance()) { formik.setFieldValue("clearanceValue", e.target.value); } else { alert("Please clear Ex-Bond details before changing Clearance Under."); } }} sx={compactInputSx}>
                        <MenuItem value="" disabled>Select Clearance Type</MenuItem>
                        {filteredClearanceOptions.map((option, index) => (<MenuItem key={index} value={option.value || ""}>{option.label}</MenuItem>))}
                      </TextField>
                    </Col>

                    {ExBondflag && (
                      <Col xs={12} md={4} lg={2} className="mb-3">
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>In Bond</label>
                        <TextField select fullWidth size="small" variant="outlined" name="exBondValue" value={formik.values.exBondValue || ""} onChange={formik.handleChange} sx={compactInputSx}>
                          <MenuItem value="" disabled>Select In-Bond Type</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                          {jobDetails.map((job) => (<MenuItem key={job.job_no} value={job.job_no}>{`${job.job_no} - ${job.importer}`}</MenuItem>))}
                        </TextField>
                      </Col>
                    )}
                  </Row>

                  {/* Ex-Bond "Other" Logic */}
                  {formik.values.exBondValue === "other" && (
                    <div style={{ background: "#f8f9fa", padding: "16px", borderRadius: "6px", marginBottom: "16px" }}>
                      <h6 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px", color: "#555" }}>In-Bond Details (Other)</h6>
                      <Row>
                        <Col xs={12} md={3} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>InBond BE Number</label>
                          <TextField fullWidth size="small" variant="outlined" name="in_bond_be_no" value={formik.values.in_bond_be_no || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                        <Col xs={12} md={3} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>InBond BE Date</label>
                          <TextField fullWidth size="small" variant="outlined" type="date" InputLabelProps={{ shrink: true }} name="in_bond_be_date"
                            value={formik.values.in_bond_be_date || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                        <Col xs={12} className="mb-3">
                          <FileUpload label="Upload InBond BE Copy" bucketPath="ex_be_copy_documents" multiple
                            onFilesUploaded={(newFiles) => formik.setFieldValue("in_bond_ooc_copies", [...formik.values.in_bond_ooc_copies, ...newFiles])} />
                          <ImagePreview images={formik.values.in_bond_ooc_copies || []} onDeleteImage={(index) => {
                            const updatedFiles = [...formik.values.in_bond_ooc_copies]; updatedFiles.splice(index, 1); formik.setFieldValue("in_bond_ooc_copies", updatedFiles);
                          }} />
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* Ex-Bond Selected Job Logic */}
                  {formik.values.exBondValue !== "other" && formik.values.exBondValue !== "" && (() => {
                    const matchedJob = jobDetails.find((job) => job.job_no === formik.values.exBondValue);
                    return matchedJob ? (
                      <div style={{ background: "#f0f4ff", padding: "16px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #d0d7de" }}>
                        <Row>
                          <Col xs={12} md={4} className="mb-2"><strong>BE No:</strong> {matchedJob.be_no || "N/A"}</Col>
                          <Col xs={12} md={4} className="mb-2"><strong>BE Date:</strong> {matchedJob.be_date || "N/A"}</Col>
                          <Col xs={12} md={4} className="mb-2">
                            <strong>OOC copy:</strong>
                            <ImagePreview images={matchedJob.ooc_copies || []} readOnly />
                          </Col>
                        </Row>
                      </div>
                    ) : null;
                  })()}

                  {ExBondflag && (
                    <Row className="mb-3">
                      <Col xs={12}>
                        <Button variant="contained" color="secondary" size="small" onClick={resetOtherDetails}>Reset Ex-Bond Details</Button>
                      </Col>
                    </Row>
                  )}



                  <Row className="mt-2">
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>BOE Number</label>
                      <TextField fullWidth size="small" variant="outlined" id="be_no" name="be_no" value={formik.values.be_no || ""}
                        onChange={formik.handleChange} InputLabelProps={{ shrink: true }} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>BOE Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="date" id="be_date" name="be_date" value={formik.values.be_date || ""}
                        onChange={formik.handleChange} InputLabelProps={{ shrink: true }} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Assessment Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="assessment_date" name="assessment_date"
                        value={formik.values.assessment_date} onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={6} lg={4} className="mb-3 d-flex align-items-center">
                      <div style={{ marginRight: '10px', fontWeight: '600', fontSize: '1rem', color: '#6c757d' }}>BOE Filing:</div>
                      <RadioGroup row name="be_filing_type" value={formik.values.be_filing_type || ""} onChange={formik.handleChange}
                        disabled={user?.role !== "Admin" && isSubmissionDate}>
                        <FormControlLabel value="Discharge" control={<Radio size="small" />} label={<span style={{ fontSize: '1rem' }}>Discharge</span>} />
                        <FormControlLabel value="Railout" control={<Radio size="small" />} label={<span style={{ fontSize: '1rem' }}>Railout</span>} />
                        <FormControlLabel value="Advanced" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} />} label={<span style={{ fontSize: '1rem' }}>Advanced</span>} />
                        <FormControlLabel value="Prior" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} />} label={<span style={{ fontSize: '1rem' }}>Prior</span>} />
                      </RadioGroup>
                    </Col>
                  </Row>
                </div>
                {/* --- Section: Process Verification & Documents --- */}
                <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <h6 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#495057", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                    Process Verification & Documents
                  </h6>

                  {/* Checklist Section */}
                  <Row className="mb-4">
                    <Col xs={12} md={6}>
                      <div style={{ padding: "12px", border: "1px dashed #ced4da", borderRadius: "6px", background: "#fcfcfc" }}>
                        <h6 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "8px" }}>Checklist</h6>
                        <div className="d-flex gap-3 align-items-start">
                          <div style={{ flex: 1 }}>
                            <FileUpload label="Upload Checklist" bucketPath="checklist" singleFileOnly={true} replaceMode={true}
                              onFilesUploaded={(newFiles, replaceMode) => {
                                if (replaceMode) { formik.setFieldValue("checklist", newFiles); }
                                else { const existing = formik.values.checklist || []; formik.setFieldValue("checklist", [...existing, ...newFiles]); }
                              }} />
                            <ImagePreview images={formik.values.checklist || []}
                              onDeleteImage={(index) => { const u = [...formik.values.checklist]; u.splice(index, 1); formik.setFieldValue("checklist", u); }}
                              onImageClick={() => formik.setFieldValue("is_checklist_clicked", true)} />
                          </div>

                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
                            <Checkbox checked={formik.values.is_checklist_aprroved}
                              disabled={user?.role !== "Admin" && !formik.values.is_checklist_clicked}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                if (isChecked) {
                                  const dt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                  formik.setFieldValue("is_checklist_aprroved", true);
                                  formik.setFieldValue("is_checklist_aprroved_date", dt);
                                } else {
                                  formik.setFieldValue("is_checklist_aprroved", false);
                                  formik.setFieldValue("is_checklist_aprroved_date", "");
                                }
                              }} />
                            <div>
                              <div style={{ fontSize: "0.95rem", fontWeight: "600" }}>Approved</div>
                              {formik.values.is_checklist_aprroved_date && (
                                <div style={{ fontSize: "0.9rem", color: "#28a745" }}>
                                  {new Date(formik.values.is_checklist_aprroved_date).toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: true })}
                                </div>
                              )}
                              {!formik.values.is_checklist_clicked && <div style={{ fontSize: "0.7rem", color: "#dc3545" }}>(View file to enable)</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Col>

                    <Col xs={12} md={6}>
                      <div style={{ padding: "12px", border: "1px dashed #ced4da", borderRadius: "6px", background: "#fcfcfc" }}>
                        <h6 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "8px" }}>Job Sticker</h6>
                        <div className="d-flex gap-2 align-items-center mb-2">
                          <JobStickerPDF ref={pdfRef} jobData={{
                            job_no: formik.values.job_no, year: formik.values.year, importer: formik.values.importer, be_no: formik.values.be_no, be_date: formik.values.be_date,
                            invoice_number: formik.values.invoice_number, invoice_date: formik.values.invoice_date, loading_port: formik.values.loading_port,
                            no_of_pkgs: formik.values.no_of_pkgs, description: formik.values.description, gross_weight: formik.values.gross_weight,
                            job_net_weight: formik.values.job_net_weight, gateway_igm: formik.values.gateway_igm, gateway_igm_date: formik.values.gateway_igm_date,
                            igm_no: formik.values.igm_no, igm_date: formik.values.igm_date, awb_bl_no: formik.values.awb_bl_no, awb_bl_date: formik.values.awb_bl_date,
                            shipping_line_airline: formik.values.shipping_line_airline, custom_house: formik.values.custom_house, container_nos: formik.values.container_nos,
                          }} data={data} />
                          <Button variant="contained" size="small" onClick={handleGenerate}>Generate</Button>
                        </div>
                        <FileUpload label="Upload Job Sticker" bucketPath="job-sticker" multiple={true}
                          onFilesUploaded={(newFiles) => { const existing = formik.values.job_sticker_upload || []; formik.setFieldValue("job_sticker_upload", [...existing, ...newFiles]); }} />
                        <ImagePreview images={formik.values.job_sticker_upload || []}
                          onDeleteImage={(index) => { const u = [...formik.values.job_sticker_upload]; u.splice(index, 1); formik.setFieldValue("job_sticker_upload", u); }} />
                      </div>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col xs={12} md={4} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}> Examination Planning & Details</label>
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <Checkbox checked={formik.values.examinationPlanning} onChange={(e) => {
                            if (e.target.checked) {
                              const dt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                              formik.setFieldValue("examinationPlanning", true); formik.setFieldValue("examination_planning_date", dt);
                            } else { formik.setFieldValue("examinationPlanning", false); formik.setFieldValue("examination_planning_date", ""); }
                          }} />
                          <span style={{ fontSize: "0.95rem" }}>Exam Planning</span>
                        </div>
                        {formik.values.examination_planning_date && (
                          <div style={{ fontSize: "0.9rem", color: "green", paddingLeft: "30px" }}>
                            {new Date(formik.values.examination_planning_date).toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: true })}
                          </div>
                        )}

                        <div className="d-flex align-items-center gap-2 mt-2">
                          <Switch checked={Boolean(formik.values.firstCheck)} disabled={user?.role !== "Admin" && Boolean(formik.values.out_of_charge?.trim())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const dt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                formik.setFieldValue("firstCheck", dt);
                              } else { formik.setFieldValue("firstCheck", ""); }
                            }} />
                          <span style={{ fontSize: "0.95rem" }}>First Check</span>
                        </div>
                        {formik.values.firstCheck && (
                          <div style={{ fontSize: "0.9rem", color: "green", paddingLeft: "30px" }}>
                            YES {new Date(formik.values.firstCheck).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}
                          </div>
                        )}
                      </div>
                    </Col>

                    <Col xs={12} md={3} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Dates</label>
                      <div className="mb-4">
                        <TextField fullWidth size="small" variant="outlined" label="Examination Date" value={data.examination_date || ""} InputProps={{ readOnly: true }} disabled sx={compactInputSx} />
                      </div>
                      <div className="mb-2">
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "700", color: "#000000" }}>PCV Date</label>
                        <TextField fullWidth size="small" variant="outlined" type="datetime-local" InputLabelProps={{ shrink: true }}
                          name="pcv_date" value={formik.values.pcv_date ? (formik.values.pcv_date.length === 10 ? `${formik.values.pcv_date}T00:00` : formik.values.pcv_date) : ""} onChange={formik.handleChange} sx={{ ...compactInputSx, maxWidth: "220px" }} />
                      </div>
                    </Col>

                    <Col xs={12} md={3} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "700", color: "#000000" }}>Duty & OOC</label>
                      <div className="d-flex gap-1 mb-4 align-items-end">
                        <div style={{ flexGrow: 1, maxWidth: "220px" }}>
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "700", color: "#000000" }}>Duty Paid Date</label>
                          <TextField fullWidth size="small" variant="outlined" type="datetime-local" InputLabelProps={{ shrink: true }}
                            name="duty_paid_date" value={formik.values.duty_paid_date} onChange={formik.handleChange} disabled={user?.role !== "Admin" && isDutyPaidDateDisabled} sx={compactInputSx} />
                        </div>
                        <IconButton onClick={handleOpenDutyModal} size="small" style={{ marginBottom: "4px" }}><AddIcon /></IconButton>
                      </div>
                      <div className="mb-2">
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "700", color: "#000000" }}>Out of Charge Date</label>
                        <TextField fullWidth size="small" variant="outlined" type="datetime-local" InputLabelProps={{ shrink: true }}
                          name="out_of_charge" value={formik.values.out_of_charge ? (formik.values.out_of_charge.length === 10 ? `${formik.values.out_of_charge}T00:00` : formik.values.out_of_charge) : ""} onChange={formik.handleChange} sx={{ ...compactInputSx, maxWidth: "220px" }} />
                      </div>
                    </Col>
                  </Row>

                  <Row>
                    <Col xs={12} md={4} className="mb-3">
                      <FileUpload label="Upload Processed BE" bucketPath="processed_be_attachment" multiple={true}
                        onFilesUploaded={(newFiles) => { const existing = formik.values.processed_be_attachment || []; formik.setFieldValue("processed_be_attachment", [...existing, ...newFiles]); }} />
                      <ImagePreview images={formik.values.processed_be_attachment || []}
                        onDeleteImage={(index) => { const u = [...formik.values.processed_be_attachment]; u.splice(index, 1); formik.setFieldValue("processed_be_attachment", u); }} />
                    </Col>
                    <Col xs={12} md={4} className="mb-3">
                      <FileUpload label="Upload OOC Copy" bucketPath="ooc_copies" multiple={true}
                        onFilesUploaded={(newFiles) => { const existing = formik.values.ooc_copies || []; formik.setFieldValue("ooc_copies", [...existing, ...newFiles]); }} />
                      <ImagePreview images={formik.values.ooc_copies || []}
                        onDeleteImage={(index) => { const u = [...formik.values.ooc_copies]; u.splice(index, 1); formik.setFieldValue("ooc_copies", u); }} />
                    </Col>
                    <Col xs={12} md={4} className="mb-3">
                      <FileUpload label="Upload Gate Pass" bucketPath="gate_pass_copies" multiple={true}
                        onFilesUploaded={(newFiles) => { const existing = formik.values.gate_pass_copies || []; formik.setFieldValue("gate_pass_copies", [...existing, ...newFiles]); }} />
                      <ImagePreview images={formik.values.gate_pass_copies || []}
                        onDeleteImage={(index) => { const u = [...formik.values.gate_pass_copies]; u.splice(index, 1); formik.setFieldValue("gate_pass_copies", u); }} />
                    </Col>
                  </Row>
                </div>

                {/* --- Section: Original Document & DO Planning --- */}
                <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <h6 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#495057", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                    Original Document & DO Planning
                  </h6>
                  <Row>
                    <Col xs={12} md={6} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>OBL / Document Status</label>
                      <RadioGroup row name="radio-buttons-group" value={formik.values.obl_telex_bl} onChange={handleBlStatusChange}>
                        <FormControlLabel value="OBL" control={<Radio checked={formik.values.obl_telex_bl === "OBL"} size="small" />} label={<span style={{ fontSize: '1rem' }}>Original</span>} />
                        <FormControlLabel value="Telex" control={<Radio checked={formik.values.obl_telex_bl === "Telex"} size="small" />} label={<span style={{ fontSize: '1rem' }}>Telex</span>} />
                        <FormControlLabel value="Surrender BL" control={<Radio checked={formik.values.obl_telex_bl === "Surrender BL"} size="small" />} label={<span style={{ fontSize: '1rem' }}>Surrender</span>} />
                        <FormControlLabel value="Waybill" control={<Radio checked={formik.values.obl_telex_bl === "Waybill"} size="small" />} label={<span style={{ fontSize: '1rem' }}>Waybill</span>} />
                        <FormControlLabel value="clear" control={<Radio size="small" />} label={<span style={{ fontSize: '1rem' }}>Clear</span>} />
                      </RadioGroup>

                      {user.role === "Admin" && (
                        <div className="mt-2">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "700", color: "#000000" }}>
                            {formik.values.obl_telex_bl === "OBL" ? "Original Doc Received Date" : "Doc Received Date"}
                          </label>
                          <TextField fullWidth size="small" variant="outlined" type="datetime-local"
                            InputLabelProps={{ shrink: true }} name="document_received_date" value={formik.values.document_received_date || ""}
                            onChange={(e) => { const v = e.target.value; formik.setFieldValue("document_received_date", v ? v : ""); }} sx={{ ...compactInputSx, maxWidth: "220px" }} />
                        </div>
                      )}
                    </Col>

                    <Col xs={12} md={6} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>DO Planning</label>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Checkbox checked={formik.values.doPlanning} onChange={(e) => {
                          if (e.target.checked) {
                            const dt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                            formik.setFieldValue("doPlanning", true); formik.setFieldValue("do_planning_date", dt);
                          } else { formik.setFieldValue("doPlanning", false); formik.setFieldValue("do_planning_date", ""); }
                        }} />
                        <span style={{ fontSize: "1rem", fontWeight: "600" }}>DO Planning Active</span>
                      </div>
                      <RadioGroup row name="type_of_Do" value={formik.values.type_of_Do} onChange={(e) => {
                        const val = e.target.value; formik.setFieldValue("type_of_Do", val === "Clear" ? "" : val);
                      }}>
                        <FormControlLabel value="ICD" control={<Radio style={{ color: formik.values.type_of_Do === "ICD" ? "green" : "inherit" }} size="small" />} label={<span style={{ fontSize: '1rem' }}>ICD</span>} />
                        <FormControlLabel value="Factory" control={<Radio style={{ color: formik.values.type_of_Do === "Factory" ? "green" : "inherit" }} size="small" />} label={<span style={{ fontSize: '1rem' }}>Factory</span>} />
                        <FormControlLabel value="Clear" control={<Radio style={{ color: formik.values.type_of_Do === "Clear" ? "red" : "inherit" }} size="small" />} label={<span style={{ fontSize: '1rem' }}>Clear</span>} />
                      </RadioGroup>

                      {user.role === "Admin" && (
                        <div className="mt-2">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "700", color: "#000000" }}>DO Planning Date (Admin)</label>
                          <TextField fullWidth size="small" variant="outlined" type="datetime-local"
                            InputLabelProps={{ shrink: true }} name="do_planning_date" value={formik.values.do_planning_date || ""}
                            onChange={(e) => { if (e.target.value) formik.setFieldValue("do_planning_date", e.target.value); }} sx={{ ...compactInputSx, maxWidth: "220px" }} />
                        </div>
                      )}
                    </Col>
                  </Row>
                </div>

                {/* --- Section: Delivery Order Details --- */}
                <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <h6 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#495057", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                    Delivery Order Details
                  </h6>
                  <Row className="mb-3">
                    <Col xs={12} md={3} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>DO Validity</label>
                      {formik.values.do_revalidation ? (
                        <div style={{ padding: "8px", background: "#f8f9fa", borderRadius: "4px", border: "1px solid #ced4da", fontSize: "0.9rem" }}>
                          {formik.values.do_validity_upto_job_level || "-"}
                        </div>
                      ) : (
                        <TextField fullWidth size="small" variant="outlined" type="date"
                          id="do_validity_upto_job_level" name="do_validity_upto_job_level"
                          value={formik.values.do_validity_upto_job_level || ""} onChange={formik.handleChange}
                          InputLabelProps={{ shrink: true }} sx={compactInputSx} />
                      )}
                    </Col>
                    <Col xs={12} md={3} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Required DO Validity Upto</label>
                      <TextField fullWidth size="small" variant="outlined" type="date"
                        id="required_do_validity_upto_0" name="container_nos[0].required_do_validity_upto"
                        value={formik.values.container_nos?.[0]?.required_do_validity_upto || ""}
                        onChange={(e) => handleDateChange(e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>DO Revalidation</label>
                      <div className="d-flex align-items-center gap-2">
                        <Checkbox checked={formik.values.do_revalidation} onChange={(e) => {
                          if (e.target.checked) {
                            const dt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                            formik.setFieldValue("do_revalidation", true);
                            formik.setFieldValue("do_revalidation_date", dt);
                          } else {
                            formik.setFieldValue("do_revalidation", false);
                            formik.setFieldValue("do_revalidation_date", "");
                          }
                        }} />
                        <span style={{ fontSize: "1rem" }}>Revalidation Active</span>
                      </div>
                      {formik.values.do_revalidation_date && (
                        <div style={{ fontSize: "0.9rem", color: "green", marginTop: "4px" }}>
                          {new Date(formik.values.do_revalidation_date).toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: true })}
                        </div>
                      )}
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    {user.role === "Admin" && (
                      <Col xs={12} md={3} className="mb-3">
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>DO Revalidation Date (Admin)</label>
                        <TextField fullWidth size="small" variant="outlined" type="datetime-local"
                          id="do_revalidation_date" name="do_revalidation_date"
                          value={formik.values.do_revalidation_date || ""}
                          onChange={(e) => {
                            if (e.target.value) { formik.setFieldValue("do_revalidation", true); formik.setFieldValue("do_revalidation_date", e.target.value); }
                            else { formik.setFieldValue("do_revalidation", false); formik.setFieldValue("do_revalidation_date", ""); }
                          }}
                          InputLabelProps={{ shrink: true }} sx={compactInputSx} />
                      </Col>
                    )}
                    <Col xs={12} md={3} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>DO Received Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local"
                        id="do_completed" name="do_completed"
                        value={formik.values.do_completed ? (formik.values.do_completed.length === 10 ? `${formik.values.do_completed}T00:00` : formik.values.do_completed) : ""}
                        onChange={(e) => formik.setFieldValue("do_completed", e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>DO Valid Up to</label>
                      <div style={{ padding: "8px", background: "#f8f9fa", borderRadius: "4px", border: "1px solid #ced4da", fontSize: "0.9rem", minHeight: "38px" }}>
                        {formik.values.do_validity_upto_job_level || "-"}
                      </div>
                    </Col>
                  </Row>

                  <Row>
                    <Col xs={12} md={4} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>DO Copies</label>
                      <ImagePreview images={formik.values.do_copies || []} readOnly />
                    </Col>
                    <Col xs={12} md={8} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Remarks</label>
                      <TextField multiline minRows={2} fullWidth size="small" variant="outlined"
                        id="remarks" name="remarks" value={formik.values.remarks || ""} onChange={formik.handleChange} />
                    </Col>
                  </Row>
                </div>
              </div>
              {/* Tracking status end*/}
            </>
          )}

          {/* document section */}
          {viewJobTab === 3 && (
            <div className="job-details-container">
              <JobDetailsRowHeading heading="CTH Documents" />
              <br />

              {/* CTH Documents Section */}
              <div className="table-responsive">
                <table className="table table-bordered table-hover" style={{ backgroundColor: "#fff", fontSize: "0.9rem" }}>
                  <thead style={{ backgroundColor: "#f8f9fa" }}>
                    <tr>
                      <th style={{ width: "25%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Document Name</th>
                      <th style={{ width: "15%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Completed Date</th>
                      <th style={{ width: "10%", fontWeight: "600", color: "#495057", textAlign: "center", padding: "4px 8px" }}>E-Sanchit</th>
                      <th style={{ width: "1%", fontWeight: "600", color: "#495057", padding: "4px 8px", whiteSpace: "nowrap" }}>Upload</th>
                      <th style={{ width: "auto", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cthDocuments?.map((doc, index) => (
                      <tr key={`cth-${index}`}>
                        <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: "600", color: "#212529" }}>{doc.document_name}</div>
                              <div style={{ fontSize: "0.95rem", color: "#000000" }}>{doc.document_code}</div>
                            </div>
                            <div style={{ display: "flex", gap: "2px" }}>
                              <IconButton size="small" onClick={() => handleOpenDialog(doc, true)} style={{ padding: "4px" }}><Edit style={{ fontSize: "1rem" }} color="primary" /></IconButton>
                              <IconButton size="small" onClick={() => handleOpenDialog(doc, false)} style={{ padding: "4px" }}><Delete style={{ fontSize: "1rem" }} color="error" /></IconButton>
                            </div>
                          </div>
                        </td>
                        <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                          <span style={{ fontSize: "1rem", color: doc.document_check_date ? "#28a745" : "#6c757d", fontWeight: doc.document_check_date ? "600" : "normal" }}>
                            {doc.document_check_date ? new Date(doc.document_check_date).toLocaleString("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }) : "-"}
                          </span>
                        </td>
                        <td style={{ verticalAlign: "middle", textAlign: "center", padding: "4px 8px" }}>
                          <Checkbox size="small" checked={doc.is_sent_to_esanchit || false} style={{ padding: "4px" }} onChange={(e) => {
                            const updatedDocuments = [...cthDocuments];
                            updatedDocuments[index].is_sent_to_esanchit = e.target.checked;
                            setCthDocuments(updatedDocuments);
                          }} />
                        </td>
                        <td style={{ verticalAlign: "middle", padding: "4px 8px", whiteSpace: "nowrap" }}>
                          <FileUpload
                            label="Upload"
                            bucketPath={`cth-documents/${doc.document_name}`}
                            multiple={true}
                            containerStyles={{ marginTop: 0 }}
                            buttonSx={{ fontSize: "0.9rem", padding: "2px 10px", minWidth: "auto", textTransform: "none" }}
                            onFilesUploaded={(urls) => {
                              const updatedDocuments = [...cthDocuments];
                              updatedDocuments[index].url = [...(updatedDocuments[index].url || []), ...urls];
                              setCthDocuments(updatedDocuments);
                            }} />
                        </td>
                        <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                          <ImagePreview images={doc.url || []} isDsr={true} readOnly={false}
                            onDeleteImage={(deleteIndex) => {
                              const updatedDocuments = [...cthDocuments];
                              updatedDocuments[index].url = updatedDocuments[index].url.filter((_, i) => i !== deleteIndex);
                              setCthDocuments(updatedDocuments);
                            }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add New Document Card */}
              <div style={{ background: "#f8f9fa", borderRadius: "8px", border: "1px dashed #ced4da", padding: "20px", marginTop: "20px" }}>
                <h6 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#495057", marginBottom: "15px" }}>Add New Document</h6>
                <Row className="align-items-center">
                  <Col xs={12} lg={4} className="mb-2">
                    <FormControl fullWidth size="small" variant="outlined">
                      <InputLabel>Select Document</InputLabel>
                      <Select label="Select Document" value={selectedDocument} onChange={(e) => {
                        const val = e.target.value;
                        if (val === "other") { setNewDocumentName(""); setNewDocumentCode(""); }
                        setSelectedDocument(val);
                      }}>
                        {cth_Dropdown
                          .filter(doc => !cthDocuments.some(existing => existing.document_code === doc.document_code))
                          .map(doc => (
                            <MenuItem key={doc.document_code} value={doc.document_code}>{doc.document_name}</MenuItem>
                          ))}
                        <MenuItem value="other"><em>Other (Custom Document)</em></MenuItem>
                      </Select>
                    </FormControl>
                  </Col>

                  {selectedDocument === "other" && (
                    <>
                      <Col xs={12} lg={3} className="mb-2">
                        <TextField fullWidth size="small" label="Document Name" variant="outlined" value={newDocumentName} onChange={(e) => setNewDocumentName(e.target.value)} onKeyDown={preventFormSubmitOnEnter} sx={compactInputSx} />
                      </Col>
                      <Col xs={12} lg={3} className="mb-2">
                        <TextField fullWidth size="small" label="Document Code" variant="outlined" value={newDocumentCode} onChange={(e) => setNewDocumentCode(e.target.value)} onKeyDown={preventFormSubmitOnEnter} sx={compactInputSx} />
                      </Col>
                    </>
                  )}

                  <Col xs={12} lg={2} className="mb-2">
                    <Button variant="contained" color="primary" startIcon={<AddIcon />}
                      disabled={!(user?.role === "Admin") && (!selectedDocument || (selectedDocument === "other" && (!newDocumentName.trim() || !newDocumentCode.trim())))}
                      onClick={() => {
                        if (selectedDocument !== "other" && selectedDocument) {
                          const sel = cth_Dropdown.find(d => d.document_code === selectedDocument);
                          if (sel) setCthDocuments([...cthDocuments, { document_name: sel.document_name, document_code: sel.document_code, url: [], document_check_date: "", is_sent_to_esanchit: false }]);
                        } else if (selectedDocument === "other") {
                          setCthDocuments([...cthDocuments, { document_name: newDocumentName.trim(), document_code: newDocumentCode.trim(), url: [], document_check_date: "", is_sent_to_esanchit: false }]);
                          setNewDocumentName(""); setNewDocumentCode("");
                        }
                        setSelectedDocument("");
                      }}>
                      Add
                    </Button>
                  </Col>
                </Row>
              </div>

              {/* All Documents Section */}
              <JobDetailsRowHeading heading="All General Documents" />
              <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", padding: "20px", marginTop: "15px", marginBottom: "30px" }}>
                <Row>
                  <Col xs={12} md={6}>
                    <FileUpload label="Upload General Documents" bucketPath="all_documents" multiple={true}
                      onFilesUploaded={(urls) => formik.setFieldValue("all_documents", [...(formik.values.all_documents || []), ...urls])} />
                  </Col>
                  <Col xs={12} md={12}>
                    <div className="mt-3">
                      <ImagePreview images={formik.values.all_documents || []}
                        onDeleteImage={(idx) => {
                          const updated = [...formik.values.all_documents];
                          updated.splice(idx, 1);
                          formik.setFieldValue("all_documents", updated);
                        }} />
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          )}

          {/* charges section */}
          {viewJobTab === 4 && (
            <div className="job-details-container">
              {/* Charges Section */}
              <JobDetailsRowHeading heading="Charges" />
              <div className="table-responsive">
                <table className="table table-bordered table-hover" style={{ backgroundColor: "#fff", fontSize: "0.9rem" }}>
                  <thead style={{ backgroundColor: "#f8f9fa" }}>
                    <tr>
                      <th style={{ width: "25%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Document Name</th>
                      <th style={{ width: "20%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Amount Details</th>
                      <th style={{ width: "1%", fontWeight: "600", color: "#495057", padding: "4px 8px", whiteSpace: "nowrap" }}>Upload</th>
                      <th style={{ width: "auto", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DsrCharges?.map((doc, index) => {
                      const selectedChargesDoc = selectedChargesDocuments.find(s => s.document_name === doc.document_name) || {};
                      const isCustom = !["Notary", "Duty", "MISC", "CE Certification Charges", "ADC/NOC Charges"].includes(doc.document_name);

                      return (
                        <tr key={`charges-${index}`}>
                          <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ fontWeight: "600", color: "#212529" }}>{doc.document_name}</div>
                              {isCustom && (
                                <IconButton size="small" color="error" onClick={() => {
                                  const updatedDsrCharges = DsrCharges.filter((_, i) => i !== index);
                                  setDsrCharges(updatedDsrCharges);
                                  const updatedSelected = selectedChargesDocuments.filter(s => s.document_name !== doc.document_name);
                                  setSelectedChargesDocuments(updatedSelected);
                                }} style={{ padding: "4px" }}>
                                  <Delete style={{ fontSize: "1rem" }} fontSize="small" />
                                </IconButton>
                              )}
                            </div>
                          </td>
                          <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Amount"
                              type="number"
                              variant="outlined"
                              value={selectedChargesDoc.document_amount_details || ""}
                              inputProps={{ min: 0, step: "0.01", pattern: "[0-9]+(\\.[0-9]+)?" }}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || /^\d+(\.\d*)?$/.test(value)) {
                                  const updated = [...selectedChargesDocuments];
                                  const idx = updated.findIndex(s => s.document_name === doc.document_name);
                                  if (idx !== -1) updated[idx].document_amount_details = value;
                                  else updated.push({ document_name: doc.document_name, url: [], document_check_date: "", document_amount_details: value });
                                  setSelectedChargesDocuments(updated);
                                }
                              }}
                              sx={{
                                ...compactInputSx,
                                "& .MuiOutlinedInput-root": { height: "30px" }, // Match table row height better
                              }}
                            />
                          </td>
                          <td style={{ verticalAlign: "middle", padding: "4px 8px", whiteSpace: "nowrap" }}>
                            <FileUpload
                              label="Upload"
                              bucketPath={`charges-documents/${doc.document_name}`}
                              multiple={true}
                              containerStyles={{ marginTop: 0 }}
                              buttonSx={{ fontSize: "0.9rem", padding: "2px 10px", minWidth: "auto", textTransform: "none" }}
                              onFilesUploaded={(urls) => {
                                const updated = [...selectedChargesDocuments];
                                const idx = updated.findIndex(s => s.document_name === doc.document_name);
                                if (idx !== -1) updated[idx].url = [...(updated[idx].url || []), ...urls];
                                else updated.push({ document_name: doc.document_name, url: urls, document_check_date: "", document_amount_details: "" });
                                setSelectedChargesDocuments(updated);
                              }}
                            />
                          </td>
                          <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                            <ImagePreview
                              images={selectedChargesDoc.url || []}
                              readOnly={false}
                              onDeleteImage={(delIdx) => {
                                const updated = [...selectedChargesDocuments];
                                const idx = updated.findIndex(s => s.document_name === doc.document_name);
                                if (idx !== -1) {
                                  updated[idx].url = updated[idx].url.filter((_, i) => i !== delIdx);
                                  setSelectedChargesDocuments(updated);
                                }
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Custom Charge */}
              <div style={{ background: "#f8f9fa", borderRadius: "8px", border: "1px dashed #ced4da", padding: "20px", marginTop: "10px", marginBottom: "30px" }}>
                <h6 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#495057", marginBottom: "15px" }}>Add Custom Charge Document</h6>
                <Row className="align-items-center">
                  <Col xs={12} lg={6}>
                    <TextField fullWidth size="small" label="Document Name" variant="outlined" value={newChargesDocumentName}
                      onChange={(e) => setNewChargesDocumentName(e.target.value)} onKeyDown={preventFormSubmitOnEnter} sx={compactInputSx} />
                  </Col>
                  <Col xs={12} lg={2}>
                    <Button variant="contained" color="primary"
                      disabled={!(user?.role === "Admin") && (!newChargesDocumentName.trim() || DsrCharges.some(d => d.document_name === newChargesDocumentName.trim()))}
                      onClick={() => {
                        if (newChargesDocumentName.trim() && !DsrCharges.some(d => d.document_name === newChargesDocumentName.trim())) {
                          setDsrCharges([...DsrCharges, { document_name: newChargesDocumentName.trim() }]);
                          setNewChargesDocumentName("");
                        }
                      }}>
                      Add
                    </Button>
                  </Col>
                </Row>
              </div>


            </div>
          )}

          {viewJobTab === 2 && (
            <div className="job-details-container">
              <JobDetailsRowHeading heading="Container Details" />
              <Row>
                <Col md={2} style={{ borderRight: "1px solid #e0e0e0" }}>
                  <div style={{ maxHeight: "80vh", overflowY: "auto", paddingRight: "5px" }}>
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
                    ).map((container, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedContainerIndex(i)}
                        style={{
                          padding: "10px",
                          marginBottom: "5px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          backgroundColor: selectedContainerIndex === i ? "#e9ecef" : "#fff",
                          border: selectedContainerIndex === i ? "1px solid #007bff" : "1px solid #dee2e6",
                        }}
                      >
                        <div style={{ fontWeight: "600", color: "#495057", fontSize: "0.9rem" }}>
                          {container.container_number || `Container ${i + 1}`}
                        </div>
                        {container.size && (
                          <div style={{ fontSize: "0.9rem", color: "#000000" }}>
                            Size: {container.size}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Button variant="contained" color="primary" fullWidth onClick={() => {
                      handleAddContainer();
                      // Switch to the newly added container (next index)
                      setSelectedContainerIndex(formik.values.container_nos.length);
                    }} startIcon={<AddIcon />}>
                      Add Container
                    </Button>
                  </div>
                </Col>

                <Col md={10}>
                  {(() => {
                    const containerList =
                      formik.values.status !== "" &&
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
                        ];

                    const index =
                      selectedContainerIndex < containerList.length
                        ? selectedContainerIndex
                        : 0;
                    const container = containerList[index];

                    const labelStyle = {
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "0.9rem",
                      fontWeight: "700",
                      color: "#000000",
                    };
                    const readOnlyStyle = {
                      padding: "8px",
                      background: "#f8f9fa",
                      borderRadius: "4px",
                      border: "1px solid #ced4da",
                      fontSize: "0.9rem",
                      minHeight: "38px",
                    };

                    return (
                      <div
                        style={{
                          marginBottom: "30px",
                          background: "#fff",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0",
                          overflow: "hidden",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                        }}
                      >

                        {/* Header */}
                        <div
                          style={{
                            background: "#f8f9fa",
                            padding: "12px 20px",
                            borderBottom: "1px solid #e0e0e0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <h6
                              style={{
                                margin: 0,
                                fontWeight: "700",
                                color: "#495057",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              #{index + 1} Container:
                              <span
                                style={{ color: "#007bff", minWidth: "150px" }}
                                ref={(el) => (container_number_ref.current[index] = el)}
                              >
                                <TextField
                                  variant="standard"
                                  size="small"
                                  value={container.container_number}
                                  onChange={formik.handleChange}
                                  name={`container_nos[${index}].container_number`}
                                  InputProps={{
                                    disableUnderline: true,
                                    style: { fontWeight: "bold", fontSize: "1rem" },
                                  }}
                                />
                              </span>
                            </h6>
                            <IconButton
                              onClick={() =>
                                handleCopyContainerNumber(
                                  container.container_number,
                                  setSnackbar
                                )
                              }
                              size="small"
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </div>
                          <div>
                            <IconButton
                              onClick={() => {
                                setOpenDialog(true);
                                setContainerToDelete(index);
                              }}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </div>
                        </div>

                        <div style={{ padding: "20px" }}>
                          {/* Row 1: Basic Info */}
                          <Row className="mb-3">
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>Size</label>
                              <TextField
                                select
                                fullWidth
                                size="small"
                                variant="outlined"
                                name={`container_nos[${index}].size`}
                                value={container.size}
                                onChange={formik.handleChange}
                                sx={compactInputSx}
                              >
                                <MenuItem value="20">20</MenuItem>
                                <MenuItem value="40">40</MenuItem>
                              </TextField>
                            </Col>
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>Seal Number</label>
                              <TextField
                                fullWidth
                                size="small"
                                variant="outlined"
                                name={`container_nos[${index}].seal_number`}
                                value={container.seal_number}
                                onChange={formik.handleChange}
                                sx={compactInputSx}
                              />
                            </Col>
                            <Col xs={12} md={6} lg={4} className="mb-3">
                              <label style={labelStyle}>Transporter</label>
                              {/* Transporter Logic */}
                              <div className="d-flex align-items-center gap-3">
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={container.transporter === "SRCC"}
                                      disabled={
                                        user?.role !== "Admin" &&
                                        !formik.values.out_of_charge
                                      }
                                      onChange={(e) =>
                                        handleTransporterChange(e, index)
                                      }
                                    />
                                  }
                                  label={
                                    <span style={{ fontSize: "1rem" }}>
                                      SRCC
                                    </span>
                                  }
                                />

                                {container.transporter !== "SRCC" && (
                                  <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    label="Transporter Name"
                                    InputLabelProps={{ shrink: true }}
                                    name={`container_nos[${index}].transporter`}
                                    value={container.transporter}
                                    onChange={formik.handleChange}
                                    sx={compactInputSx}
                                  />
                                )}
                              </div>
                            </Col>
                          </Row>

                          {/* Row 2: Dates */}
                          <Row className="mb-3">
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>Railout Date</label>
                              <TextField
                                fullWidth
                                size="small"
                                type="datetime-local"
                                variant="outlined"
                                name={`container_nos[${index}].container_rail_out_date`}
                                value={container.container_rail_out_date}
                                disabled={
                                  !(user?.role === "Admin") &&
                                  (LCLFlag || ExBondflag)
                                }
                                onChange={formik.handleChange}
                                InputLabelProps={{ shrink: true }}
                                sx={compactInputSx}
                              />
                            </Col>
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>Arrival Date</label>
                              {formik.values.checked ? (
                                <div style={readOnlyStyle}>
                                  {container.arrival_date || "Not Available"}
                                </div>
                              ) : (
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="datetime-local"
                                  variant="outlined"
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
                                  InputLabelProps={{ shrink: true }}
                                  sx={compactInputSx}
                                />
                              )}
                            </Col>
                            {LCLFlag && (
                              <Col xs={12} md={3} lg={2} className="mb-3">
                                <label style={labelStyle}>
                                  By Road Movement Date
                                </label>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="datetime-local"
                                  variant="outlined"
                                  name={`container_nos[${index}].by_road_movement_date`}
                                  value={container.by_road_movement_date}
                                  disabled={user?.role !== "Admin" && ExBondflag}
                                  onChange={formik.handleChange}
                                  InputLabelProps={{ shrink: true }}
                                  sx={compactInputSx}
                                />
                              </Col>
                            )}
                            {!InBondflag && (
                              <Col xs={12} md={3} lg={2} className="mb-3">
                                <label style={labelStyle}>Delivery Date</label>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="datetime-local"
                                  variant="outlined"
                                  name={`container_nos[${index}].delivery_date`}
                                  value={formatDateForInput(
                                    container.delivery_date
                                  )}
                                  onChange={formik.handleChange}
                                  InputLabelProps={{ shrink: true }}
                                  sx={compactInputSx}
                                />
                              </Col>
                            )}
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>
                                {InBondflag
                                  ? "Destuffing Date"
                                  : "Empty Off-Load Date"}
                              </label>
                              <TextField
                                fullWidth
                                size="small"
                                type="datetime-local"
                                variant="outlined"
                                name={`container_nos[${index}].emptyContainerOffLoadDate`}
                                value={formatDateForInput(
                                  container.emptyContainerOffLoadDate
                                )}
                                disabled={LCLFlag}
                                onChange={formik.handleChange}
                                InputLabelProps={{ shrink: true }}
                                sx={compactInputSx}
                              />
                            </Col>
                          </Row>

                          {/* Row 3: DO & Detention */}
                          <Row className="mb-3">
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>Detention From</label>
                              <div style={readOnlyStyle}>
                                {detentionFrom[index]}
                              </div>
                            </Col>
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>DO Validity</label>
                              <div style={readOnlyStyle}>
                                {subtractOneDay(detentionFrom[index])}
                              </div>
                            </Col>
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>
                                Required DO Validity Upto
                              </label>
                              <TextField
                                fullWidth
                                size="small"
                                type="date"
                                variant="outlined"
                                name={`container_nos[${index}].required_do_validity_upto`}
                                value={container.required_do_validity_upto}
                                onChange={(e) => handleDateChange(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={compactInputSx}
                              />
                            </Col>
                            <Col
                              xs={12}
                              md={3}
                              lg={6}
                              className="mb-3"
                              style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
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
                            </Col>
                          </Row>

                          {/* Row 4: DO Revalidations */}
                          {container.do_revalidation?.map((item, id) => (
                            <Row
                              key={id}
                              className="mb-2 mx-1"
                              style={{
                                background: "#fafafa",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px dashed #ced4da",
                              }}
                            >
                              <Col xs={12} md={3}>
                                <label style={labelStyle}>
                                  DO Revalidation Upto
                                </label>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="date"
                                  variant="outlined"
                                  name={`container_nos[${index}].do_revalidation[${id}].do_revalidation_upto`}
                                  value={item.do_revalidation_upto}
                                  onChange={formik.handleChange}
                                  InputLabelProps={{ shrink: true }}
                                  sx={compactInputSx}
                                />
                              </Col>
                              <Col xs={12} md={8}>
                                <label style={labelStyle}>Remarks</label>
                                <TextField
                                  fullWidth
                                  size="small"
                                  variant="outlined"
                                  name={`container_nos[${index}].do_revalidation[${id}].remarks`}
                                  value={item.remarks}
                                  onChange={formik.handleChange}
                                />
                              </Col>
                              <Col
                                xs={12}
                                md={1}
                                className="d-flex align-items-end"
                              >
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    handleDeleteRevalidation(index, id)
                                  }
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Col>
                            </Row>
                          ))}
                          <div className="mb-3">
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<AddIcon />}
                              onClick={() => {
                                const newRevalidation = {
                                  do_revalidation_upto: "",
                                  remarks: "",
                                };
                                formik.setFieldValue(
                                  `container_nos[${index}].do_revalidation`,
                                  [
                                    ...(container.do_revalidation || []),
                                    newRevalidation,
                                  ]
                                );
                              }}
                              sx={{ textTransform: "none", fontWeight: 600 }}
                            >
                              Add DO Revalidation
                            </Button>
                          </div>

                          {/* Row 5: Weights */}
                          <Row className="mb-3">
                            <Col xs={6} md={2} className="mb-3">
                              <label style={labelStyle}>Physical Weight</label>
                              <div style={readOnlyStyle}>
                                {container.physical_weight}
                              </div>
                            </Col>
                            <Col xs={6} md={2} className="mb-3">
                              <label style={labelStyle}>Tare Weight</label>
                              <div style={readOnlyStyle}>
                                {container.tare_weight}
                              </div>
                            </Col>
                            <Col xs={6} md={2} className="mb-3">
                              <label style={labelStyle}>Actual Weight</label>
                              <div style={readOnlyStyle}>
                                {container.actual_weight}
                              </div>
                            </Col>
                            <Col xs={6} md={2} className="mb-3">
                              <label style={labelStyle}>
                                Gross Weight (Doc)
                              </label>
                              <TextField
                                fullWidth
                                size="small"
                                variant="outlined"
                                name={`container_nos[${index}].container_gross_weight`}
                                value={container.container_gross_weight}
                                onChange={(e) =>
                                  handleGrossWeightChange(e, index, formik)
                                }
                                sx={compactInputSx}
                              />
                            </Col>
                            <Col xs={6} md={2} className="mb-3">
                              <label style={labelStyle}>Net Weight (PL)</label>
                              <TextField
                                fullWidth
                                size="small"
                                variant="outlined"
                                name={`container_nos[${index}].net_weight_as_per_PL_document`}
                                value={container.net_weight_as_per_PL_document}
                                onChange={formik.handleChange}
                                sx={compactInputSx}
                              />
                            </Col>
                            <Col xs={6} md={2} className="mb-3">
                              <label style={labelStyle}>Excess/Shortage</label>
                              <div
                                style={{
                                  ...readOnlyStyle,
                                  color:
                                    container.weight_shortage < 0
                                      ? "white"
                                      : "inherit",
                                  background:
                                    container.weight_shortage < 0
                                      ? "#dc3545"
                                      : "#f8f9fa",
                                }}
                              >
                                {container.container_gross_weight &&
                                  container.container_gross_weight !== "0"
                                  ? container.weight_shortage
                                  : "-"}
                              </div>
                            </Col>
                          </Row>

                          {/* Uploads Grid */}
                          <Row>
                            <Col xs={12} md={6}>
                              <div className="mb-3">
                                <label
                                  htmlFor={`weighmentSlip${index}`}
                                  style={{
                                    ...labelStyle,
                                    cursor: "pointer",
                                    color: "#007bff",
                                  }}
                                >
                                  Upload Weighment Slip
                                </label>
                                <input
                                  type="file"
                                  multiple
                                  id={`weighmentSlip${index}`}
                                  style={{ display: "none" }}
                                  onChange={(e) =>
                                    handleWeighmentSlip(
                                      e,
                                      container.container_number,
                                      "weighment_slip_images"
                                    )
                                  }
                                  ref={weighmentSlipRef}
                                />
                                <ImagePreview
                                  images={container?.weighment_slip_images || []}
                                  onDeleteImage={(imageIndex) => {
                                    const updatedContainers = [
                                      ...formik.values.container_nos,
                                    ];
                                    const imgs = [
                                      ...(updatedContainers[index]
                                        .weighment_slip_images || []),
                                    ];
                                    imgs.splice(imageIndex, 1);
                                    updatedContainers[
                                      index
                                    ].weighment_slip_images = imgs;
                                    formik.setFieldValue(
                                      "container_nos",
                                      updatedContainers
                                    );
                                  }}
                                />
                              </div>
                              <div className="mb-3">
                                <label style={labelStyle}>
                                  Container Pre-Damage Images
                                </label>
                                <ImagePreview
                                  images={
                                    container?.container_pre_damage_images || []
                                  }
                                  onDeleteImage={(imageIndex) => {
                                    const updatedContainers = [
                                      ...formik.values.container_nos,
                                    ];
                                    const imgs = [
                                      ...(updatedContainers[index]
                                        .container_pre_damage_images || []),
                                    ];
                                    imgs.splice(imageIndex, 1);
                                    updatedContainers[
                                      index
                                    ].container_pre_damage_images = imgs;
                                    formik.setFieldValue(
                                      "container_nos",
                                      updatedContainers
                                    );
                                  }}
                                />
                              </div>
                            </Col>
                            <Col xs={12} md={6}>
                              <div className="mb-3">
                                <label style={labelStyle}>Container Images</label>
                                <ImagePreview
                                  images={container?.container_images || []}
                                  onDeleteImage={(imageIndex) => {
                                    const updatedContainers = [
                                      ...formik.values.container_nos,
                                    ];
                                    const imgs = [
                                      ...(updatedContainers[index]
                                        .container_images || []),
                                    ];
                                    imgs.splice(imageIndex, 1);
                                    updatedContainers[index].container_images =
                                      imgs;
                                    formik.setFieldValue(
                                      "container_nos",
                                      updatedContainers
                                    );
                                  }}
                                />
                              </div>
                              <div className="mb-3">
                                <label style={labelStyle}>
                                  Loose Material Images
                                </label>
                                <ImagePreview
                                  images={container?.loose_material || []}
                                  onDeleteImage={(imageIndex) => {
                                    const updatedContainers = [
                                      ...formik.values.container_nos,
                                    ];
                                    const imgs = [
                                      ...(updatedContainers[index]
                                        .loose_material || []),
                                    ];
                                    imgs.splice(imageIndex, 1);
                                    updatedContainers[index].loose_material =
                                      imgs;
                                    formik.setFieldValue(
                                      "container_nos",
                                      updatedContainers
                                    );
                                  }}
                                />
                              </div>
                              <div className="mb-3">
                                <label style={labelStyle}>
                                  Examination Videos
                                </label>
                                <ImagePreview
                                  images={container?.examination_videos || []}
                                  onDeleteImage={(imageIndex) => {
                                    const updatedContainers = [
                                      ...formik.values.container_nos,
                                    ];
                                    const imgs = [
                                      ...(updatedContainers[index]
                                        .examination_videos || []),
                                    ];
                                    imgs.splice(imageIndex, 1);
                                    updatedContainers[index].examination_videos =
                                      imgs;
                                    formik.setFieldValue(
                                      "container_nos",
                                      updatedContainers
                                    );
                                  }}
                                />
                              </div>
                            </Col>
                          </Row>
                        </div>
                      </div>
                    );
                  })()}
                </Col>
              </Row>
            </div>
          )}

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
        </form >
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

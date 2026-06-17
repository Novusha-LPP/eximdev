import React, { useState, useRef, useContext, useEffect, useMemo } from "react";
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
  Autocomplete,
  Alert,
  AlertTitle,
  Slider,
} from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import axios from "axios";
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
import ChargesGrid from "../ChargesGrid";
import { TabValueContext } from "../../contexts/TabValueContext";
import { handleGrossWeightChange } from "../../utils/handleNetWeightChange";
import { UserContext } from "../../contexts/UserContext";
import DeleteIcon from "@mui/icons-material/Delete";
import Switch from "@mui/material/Switch";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ErrorIcon from "@mui/icons-material/Error";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
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
  CircularProgress,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import FileUpload from "../../components/gallery/FileUpload.js";
import ConfirmDialog from "../../components/gallery/ConfirmDialog.js";
import { TabContext } from "../documentation/DocumentationTab.js";
import DeliveryChallanPdf from "./DeliveryChallanPDF.js";
import IgstModal from "../gallery/IgstModal.js";
import IgstCalculationPDF from "./IgstCalculationPDF.js";
import { preventFormSubmitOnEnter } from "../../utils/preventFormSubmitOnEnter.js";
import JobDocRequests from "../document-collection/JobDocRequests.js";
import DocRequestCheckbox from "../document-collection/DocRequestCheckbox.js";
import QueriesComponent from "../../utils/QueriesComponent.js";
import { BranchContext } from "../../contexts/BranchContext";
import {
  getContainerOrPackageLabel,
  getAwbOrBlLabel,
  getAirlineOrShippingLineLabel,
  isAirMode,
  shouldHideField,
} from "../../utils/modeLogic";

const getFormattedDateForRates = (dateInput) => {
  if (!dateInput) dateInput = new Date();
  if (dateInput instanceof Date) {
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}-${month}-${year}`;
  }
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-');
      return `${d}-${m}-${y}`;
    }
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateInput)) {
      return dateInput.replace(/\//g, '-');
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const fetchExrateForCurrency = async (currency, date) => {
  if (!currency || currency.toUpperCase() === "INR") return 1;
  const formattedDate = getFormattedDateForRates(date);
  try {
    const response = await axios.get(
      `${process.env.REACT_APP_API_STRING}/currency-rates/by-date/${formattedDate}`
    );
    if (response.data.success && response.data.data?.exchange_rates) {
      const rateObj = response.data.data.exchange_rates.find(
        r => r.currency_code.toUpperCase() === currency.toUpperCase()
      );
      if (rateObj) {
        return parseFloat(rateObj.import_rate) || 1;
      }
    }
  } catch (err) {
    console.error("Error fetching exchange rate:", err);
  }

  const currentDateFormatted = getFormattedDateForRates(new Date());
  if (formattedDate !== currentDateFormatted) {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/currency-rates/by-date/${currentDateFormatted}`
      );
      if (response.data.success && response.data.data?.exchange_rates) {
        const rateObj = response.data.data.exchange_rates.find(
          r => r.currency_code.toUpperCase() === currency.toUpperCase()
        );
        if (rateObj) {
          return parseFloat(rateObj.import_rate) || 1;
        }
      }
    } catch (err) {
      console.error("Error fetching fallback exchange rate:", err);
    }
  }
  return 1;
};

const compactInputSx = {
  "& .MuiOutlinedInput-root": {
    height: "34px",
    borderRadius: "6px",
    fontSize: "0.85rem",
    backgroundColor: "#ffffff",
    transition: "all 0.2s ease-in-out",
    "& fieldset": {
      borderColor: "#cbd5e1",
      borderWidth: "1px",
    },
    "&:hover fieldset": {
      borderColor: "#94a3b8 !important",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#1e293b !important",
      borderWidth: "1.5px",
    },
    "&.Mui-disabled": {
      backgroundColor: "#f8fafc",
      color: "#64748b",
      "& fieldset": {
        borderColor: "#e2e8f0 !important",
      }
    }
  },
  "& .MuiOutlinedInput-input": {
    padding: "6px 10px",
    color: "#334155",
    fontWeight: "500",
  },
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.85rem",
    top: "-3px",
  },
};


const schemeOptions = ["Full Duty", "DEEC", "EPCG", "RODTEP", "ROSCTL", "TQ", "SIL", "SEZ", "EOU", "DFIA", "Jobbing"];

function JobDetails() {
  const [viewJobTab, setViewJobTab] = useState(0);
  const handleViewJobTabChange = (event, newValue) => {
    setViewJobTab(newValue);
  };

  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [productSubTab, setProductSubTab] = useState("Main");

  const [invoiceSubTab, setInvoiceSubTab] = useState(0);
  const handleInvoiceSubTabChange = (event, newValue) => {
    setInvoiceSubTab(newValue);
  };
  const [invoiceTableWidth, setInvoiceTableWidth] = useState(1800);
  const [productTableWidth, setProductTableWidth] = useState(1800);

  // State to track which containers have expanded seal number lists
  const [expandedSealIndices, setExpandedSealIndices] = useState({});
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-currencies`);
        setCurrencies(res.data);
      } catch (error) {
        console.error("Error fetching currencies:", error);
      }
    };
    fetchCurrencies();
  }, []);

  // Fetch units from master directory
  const [unitOptions, setUnitOptions] = useState([]);
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-units`);
        setUnitOptions(res.data || []);
      } catch (error) {
        console.error("Error fetching units:", error);
      }
    };
    fetchUnits();
  }, []);

  // Fetch transporters from master directory
  const [transportersList, setTransportersList] = useState([]);
  useEffect(() => {
    const fetchTransporters = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-transporters`);
        if (Array.isArray(res.data)) {
          setTransportersList(res.data.map(t => t.name).filter(Boolean));
        }
      } catch (error) {
        console.error("Error fetching transporters:", error);
      }
    };
    fetchTransporters();
  }, []);



  const toggleSealExpansion = (index) => {
    setExpandedSealIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const [expandedWireSealIndices, setExpandedWireSealIndices] = useState({});

  const toggleWireSealExpansion = (index) => {
    setExpandedWireSealIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  const { currentTab } = useContext(TabContext); // Access context
  const { branches, selectedBranch } = useContext(BranchContext);
  const activeBranchConfig = branches.find(b => b._id === selectedBranch)?.configuration || { railout_enabled: true, gateway_igm_enabled: true, gateway_igm_date_enabled: true };
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [openManualSubmissionDialog, setOpenManualSubmissionDialog] = useState(false);

  const handleManualSubmissionToggle = () => {
    const isCurrentlySent = formik.values.is_sent_to_submission;
    if (!isCurrentlySent) {
      setOpenManualSubmissionDialog(true);
    } else {
      formik.setFieldValue("is_sent_to_submission", false);
      formik.setFieldValue("sent_to_submission_user_name", "");
      formik.setFieldValue("sent_to_submission_date_time", "");
    }
  };

  const confirmManualSubmission = () => {
    const now = new Date();
    const formattedDateTime = format(now, "dd/MM/yyyy HH:mm:ss");
    const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "Unknown User";

    formik.setFieldValue("is_sent_to_submission", true);
    formik.setFieldValue("sent_to_submission_user_name", fullName);
    formik.setFieldValue("sent_to_submission_date_time", formattedDateTime);
    setOpenManualSubmissionDialog(false);
  };
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
    if (location.state && location.state.fromAnalytics) {
      navigate('/analytics');
      return;
    }
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

  // IMEXCUBE upload state
  const [imexcubeUploading, setImexcubeUploading] = useState(false);
  const [imexcubeSnackbar, setImexcubeSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [imexcubeDialogOpen, setImexcubeDialogOpen] = useState(false);
  const [imexcubePreviewData, setImexcubePreviewData] = useState(null);
  const [imexcubePreviewLoading, setImexcubePreviewLoading] = useState(false);

  // IMEXCUBE details state
  const [imexcubeDetailsLoading, setImexcubeDetailsLoading] = useState(false);
  const [imexcubeDetailsDialogOpen, setImexcubeDetailsDialogOpen] = useState(false);
  const [imexcubeDetailsData, setImexcubeDetailsData] = useState(null);

  // JSON Editor state
  const [imexcubeShowEditor, setImexcubeShowEditor] = useState(false);
  const [imexcubeErrorDialog, setImexcubeErrorDialog] = useState({ open: false, title: "", message: "", details: null });
  const [imexcubeRawPayloadString, setImexcubeRawPayloadString] = useState("");

  // Import Terms state
  const [importTerms, setImportTerms] = useState("CIF");

  // Step 1: Fetch job data preview and show in dialog
  const handleUploadToImexcube = async () => {
    const jobNumber = data?.job_number;
    if (!jobNumber) {
      setImexcubeSnackbar({ open: true, message: "Job number not found", severity: "error" });
      setTimeout(() => setImexcubeSnackbar(prev => ({ ...prev, open: false })), 4000);
      return;
    }
    setImexcubePreviewLoading(true);
    setImexcubeDialogOpen(true);
    setImexcubeShowEditor(false);
    setImexcubePreviewData(null);
    setImexcubeRawPayloadString("");
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/scmCube/job-data-preview`,
        { params: { job_number: jobNumber } }
      );
      setImexcubePreviewData(res.data);
      setImexcubeRawPayloadString(JSON.stringify(res.data.rawPayload || res.data, null, 2));
    } catch (err) {
      const errMsg = err?.response?.data?.error || err.message || "Failed to fetch job data";
      setImexcubePreviewData({ error: errMsg });
    } finally {
      setImexcubePreviewLoading(false);
    }
  };

  // Fetch job details directly from IMEXCUBE
  const handleGetImexcubeDetails = async () => {
    const jobNumber = data?.job_number;
    if (!jobNumber) {
      setImexcubeSnackbar({ open: true, message: "Job number not found", severity: "error" });
      setTimeout(() => setImexcubeSnackbar(prev => ({ ...prev, open: false })), 4000);
      return;
    }
    setImexcubeDetailsLoading(true);
    setImexcubeDetailsDialogOpen(true);
    setImexcubeDetailsData(null);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/scmCube/get-imexcube-job-details`,
        { params: { job_number: jobNumber } }
      );
      setImexcubeDetailsData(res.data);
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.error || err?.response?.data?.details || err.message || "Failed to fetch job details from IMEXCUBE";
      setImexcubeDetailsData({ error: errMsg });
    } finally {
      setImexcubeDetailsLoading(false);
    }
  };

  // Step 2: Confirm and push to IMEXCUBE
  const handleConfirmImexcubeUpload = async () => {
    const jobNumber = data?.job_number;
    setImexcubeDialogOpen(false);
    setImexcubeUploading(true);

    // Check if JSON is valid before sending
    let parsedPayload = null;
    if (imexcubeShowEditor) {
      try {
        parsedPayload = JSON.parse(imexcubeRawPayloadString);
      } catch (err) {
        setImexcubeSnackbar({ open: true, message: "Invalid JSON format in editor", severity: "error" });
        setImexcubeUploading(false);
        setTimeout(() => setImexcubeSnackbar(prev => ({ ...prev, open: false })), 5000);
        return;
      }
    }

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/scmCube/upload-to-imexcube`,
        {
          job_number: jobNumber,
          ...(parsedPayload && { customPayload: parsedPayload })
        }
      );
      const action = res?.data?.action;
      const successMsg =
        action === "updated"
          ? "Job updated in IMEXCUBE successfully"
          : "Job created in IMEXCUBE successfully";
      setImexcubeSnackbar({
        open: true,
        message: res.data?.message || successMsg,
        severity: "success",
      });

      // Mark uploaded only for successful create/update actions.
      if (setData) {
        setData(prev => ({
          ...prev,
          imexcube_uploaded: true,
          imexcube_uploaded_at: new Date(),
          imexcube_last_action: action || "created",
          imexcube_last_status_code: res?.data?.vendorStatusCode,
          imexcube_last_message: res?.data?.vendorMessage || res?.data?.message,
          imexcube_response: res?.data?.imexcubeResponse || prev?.imexcube_response,
        }));
      }
    } catch (err) {
      let errMsg = "Upload failed";
      let errDetails = null;
      const resData = err?.response?.data;

      if (resData) {
        if (resData.action === "duplicate" || err?.response?.status === 409) {
          errMsg = resData.message || "Job already exists in IMEXCUBE";
          errDetails = resData.imexcubeResponse || resData.details || null;
        } else if (resData.details?.errors && Array.isArray(resData.details.errors)) {
          errMsg = "Validation Failed. Please correct the following fields:";
          errDetails = resData.details.errors;
        } else if (resData.details) {
          errMsg = resData.error || "IMEXCUBE Error";
          errDetails = resData.details;
        } else if (resData.error) {
          errMsg = resData.error;
        }
      } else if (err.message) {
        errMsg = err.message;
      }

      setImexcubeErrorDialog({
        open: true,
        title: (resData?.action === "duplicate" || err?.response?.status === 409) ? "Duplicate Job" : "Upload Failed",
        message: errMsg,
        details: errDetails
      });
    } finally {
      setImexcubeUploading(false);
      setTimeout(() => setImexcubeSnackbar(prev => ({ ...prev, open: false })), 5000);
    }
  };

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
    setData,
    isCthDocsLoading,
    // schemeOptions,
  } = useFetchJobDetails(
    params,
    checked,
    setSelectedRegNo,
    setTabValue,
    setFileSnackbar,
    storedSearchParams
  );

  const totalInvoiceValue = (formik?.values?.invoice_details || []).reduce((acc, row) => acc + (parseFloat(row.product_value) || 0), 0);
  const totalProductAmount = (formik?.values?.description_details || []).reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);

  // Fetch authorizations by IEC
  const [authorizationsList, setAuthorizationsList] = useState([]);
  useEffect(() => {
    const fetchAuthorizations = async () => {
      const iec = data?.ie_code_no;
      if (!iec) return;
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-authorizations-by-iec?iec_no=${iec}`
        );
        setAuthorizationsList(res.data || []);
      } catch (error) {
        console.error("Error fetching authorizations by IEC:", error);
      }
    };
    if (data?.ie_code_no) {
      fetchAuthorizations();
    }
  }, [data?.ie_code_no]);

  const isAdmin = user?.role === "Admin";
  const billNos = (data?.bill_no || "").split(",");
  const hasBillGenerated = billNos.some(no => no && no.trim().length > 0);
  const isJobLocked = hasBillGenerated && !isAdmin;

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
      type_of_Do,
      do_completed,
      igm_no,
      igm_date,
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
    const validDoCompleted = isValidDate(do_completed);

    const railoutDisabled = activeBranchConfig?.railout_enabled === false;
    const gatewayIgmDisabled = activeBranchConfig?.gateway_igm_enabled === false;
    const validAltIGM = railoutDisabled && gatewayIgmDisabled && isValidDate(igm_date) && igm_no;

    const norm = (s) =>
      String(s || "")
        .trim()
        .toLowerCase();
    const isExBond = norm(type_of_b_e) === "ex-bond";
    const isInBond = norm(type_of_b_e) === "in-bond";
    const isLCL = norm(consignment_type) === "lcl";
    const isTypeDoIcd = norm(type_of_Do) === "icd";

    // New logic for LCL In-Bond jobs with Out of Charge Date
    if (isLCL && isInBond && validOOC) {
      formik.setFieldValue("detailed_status", "Billing Pending");
      return;
    }

    // Ex-Bond: return early to avoid fall-through
    if (isExBond) {
      if (be_no && validOOC && allDelivered) {
        formik.setFieldValue("detailed_status", "Billing Pending");
        return;
      }
      if (validDoCompleted && !allDelivered) {
        formik.setFieldValue("detailed_status", "Do completed and Delivery pending");
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
    let billingComplete = false;
    if (isInBond) {
      // In-Bond Logic
      if (isTypeDoIcd) {
        // In-Bond ICD: Needs Destuffing/EmptyOff
        billingComplete = allEmptyOffloaded;
      } else {
        // In-Bond Factory: Needs EmptyOff AND Delivery
        billingComplete = allEmptyOffloaded && allDelivered;
      }
    } else {
      // Standard Logic (Home Consumption, etc.)
      billingComplete = (isLCL || isTypeDoIcd) ? allDelivered : allEmptyOffloaded;
    }

    if (be_no && anyArrival && validOOC && billingComplete) {
      formik.setFieldValue("detailed_status", "Billing Pending");
    } else if (validDoCompleted && !allDelivered) {
      formik.setFieldValue("detailed_status", "Do completed and Delivery pending");
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
    } else if (validIGM || validAltIGM) {
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
    formik.values.do_completed,
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

  const handleDateChange = (newDate, index) => {
    const updatedContainers = formik.values.container_nos.map((container, i) =>
      i === index
        ? { ...container, required_do_validity_upto: newDate }
        : container
    );

    formik.setFieldValue("container_nos", updatedContainers);
  };

  const handleJobLevelDateChange = (newDate) => {
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
  };

  const handleDutyAutosave = async (updateData) => {
    try {
      Object.keys(updateData).forEach((key) => {
        formik.setFieldValue(key, updateData[key]);
      });
      await formik.submitForm();
    } catch (error) {
      console.error("Error autosaving duty data:", error);
    }
  };

  // Check if duty_paid_date should be disabled
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
  const isDescriptionTableReadOnly = user?.role !== "Admin" && isSubmissionDate;
  const descriptionRows = useMemo(() => {
    return Array.isArray(formik.values.description_details) &&
      formik.values.description_details.length > 0
      ? formik.values.description_details
      : [
        {
          description: "",
          cth_no: "",
          clearance_under: formik.values.clearanceValue || "",
          sr_no_invoice: "",
          sr_no_lic: "",
          quantity: "",
          unit: "",
          unit_price: "",
          amount: "",
          foc_item: "No",
          license_no: "",
          license_date: "",
          license_sr: "",
          utilized_qty: "",
          utilized_unit: "",
          utilized_amount: "",
          amount_currency: "USD",

          exim_code: "",
          nfei_category: "",
          reward_item: false,
          str_code: "",
          end_use: "",
          district_of_origin: "",
          origin_state: "",
          pta_fta_code: "",
          alternate_qty: "",
          sqc_qty: "",
          sqc_unit: "",
          material_code: "",
          medicinal_plant: "",
          formulation: "",
          surface_material: "",
          lab_grown_diamond: "",
          per: "1",
          per_unit: "",

          pmv_currency: "INR",
          pmv_calc_method: "%AGE",
          pmv_calc_val: "",
          pmv_unit: "",
          pmv_rate: "",
          total_pmv: "",

          igst_payment_status: "",
          taxable_value_inr: "",
          taxable_value_manual: false,
          igst_rate: "",
          igst_amount_inr: "",
          igst_amount_manual: false,
          comp_cess_percent: "",
          comp_cess_amount: ""
        },
      ];
  }, [formik.values.description_details, formik.values.clearanceValue]);

  const updateDescriptionRowMultiple = (rowIndex, updates) => {
    const updatedRows = [...descriptionRows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      ...updates,
    };

    // Auto-populate amount based on matched invoice's value if sr_no_invoice is updated
    if (updates.sr_no_invoice !== undefined) {
      const invoiceNum = parseInt(updates.sr_no_invoice) || 0;
      if (invoiceNum > 0 && invoiceRows[invoiceNum - 1]) {
        updatedRows[rowIndex].amount = invoiceRows[invoiceNum - 1].product_value || "";
      }
    }

    // Auto-calculate amount or unit_price based on what changes
    if (updates.quantity !== undefined || updates.unit_price !== undefined || updates.amount !== undefined) {
      const qValue = updates.quantity !== undefined ? updates.quantity : updatedRows[rowIndex].quantity;
      const pValue = updates.unit_price !== undefined ? updates.unit_price : updatedRows[rowIndex].unit_price;
      const aValue = updates.amount !== undefined ? updates.amount : updatedRows[rowIndex].amount;

      const qty = parseFloat(qValue);
      const price = parseFloat(pValue);
      const amt = parseFloat(aValue);

      if (updates.quantity !== undefined) {
        if (!isNaN(qty) && qty > 0 && !isNaN(amt)) {
          updatedRows[rowIndex].unit_price = (amt / qty).toFixed(2);
        } else if (!isNaN(qty) && !isNaN(price)) {
          updatedRows[rowIndex].amount = (qty * price).toFixed(2);
        }
      } else if (updates.unit_price !== undefined) {
        if (!isNaN(qty) && !isNaN(price)) {
          updatedRows[rowIndex].amount = (qty * price).toFixed(2);
        }
      } else if (updates.amount !== undefined) {
        if (!isNaN(amt) && !isNaN(qty) && qty > 0) {
          updatedRows[rowIndex].unit_price = (amt / qty).toFixed(2);
        }
      }
    }

    // Auto-select license_sr if cth_no changes
    if (updates.cth_no !== undefined) {
      const licNum = updatedRows[rowIndex].sr_no_lic || updatedRows[rowIndex].license_no;
      const cthNoNormalized = updates.cth_no ? String(updates.cth_no).replace(/[^a-zA-Z0-9]/g, "") : "";

      if (licNum && cthNoNormalized) {
        const selectedAuth = authorizationsList.find(a => a.authorization_no === licNum);
        const importItems = selectedAuth?.import_details_array || [];
        const matchingItems = importItems.filter(item => {
          const itemNormalizedHs = item.hs_code ? String(item.hs_code).replace(/[^a-zA-Z0-9]/g, "") : "";
          return itemNormalizedHs === cthNoNormalized;
        });
        if (matchingItems.length === 1) {
          updatedRows[rowIndex].license_sr = Number(matchingItems[0].sr_no) || 1;
        } else {
          updatedRows[rowIndex].license_sr = "";
        }
      }
    }

    formik.setFieldValue("description_details", updatedRows);

    // Sync top-level fields for the first row
    if (rowIndex === 0) {
      if (updates.description !== undefined) {
        formik.setFieldValue("description", updates.description);
      }
      if (updates.cth_no !== undefined) {
        formik.setFieldValue("cth_no", updates.cth_no);
      }
    }
  };

  const updateDescriptionRow = (rowIndex, field, value) => {
    updateDescriptionRowMultiple(rowIndex, { [field]: value });
  };


  const addDescriptionRow = () => {
    formik.setFieldValue("description_details", [
      ...descriptionRows,
      {
        sr_no_invoice: "",
        description: "",
        quantity: "",
        unit: "",
        unit_price: "",
        amount: "",
        cth_no: "",
        foc_item: "No",
        clearance_under: formik.values.clearanceValue || "",
        sr_no_lic: "",
        license_no: "",
        license_date: "",
        license_sr: "",
        utilized_qty: "",
        utilized_unit: "",
        utilized_amount: "",
        amount_currency: "USD",

        exim_code: "",
        nfei_category: "",
        reward_item: false,
        str_code: "",
        end_use: "",
        district_of_origin: "",
        origin_state: "",
        pta_fta_code: "",
        alternate_qty: "",
        sqc_qty: "",
        sqc_unit: "",
        material_code: "",
        medicinal_plant: "",
        formulation: "",
        surface_material: "",
        lab_grown_diamond: "",
        per: "1",
        per_unit: "",

        pmv_currency: "INR",
        pmv_calc_method: "%AGE",
        pmv_calc_val: "",
        pmv_unit: "",
        pmv_rate: "",
        total_pmv: "",

        igst_payment_status: "",
        taxable_value_inr: "",
        taxable_value_manual: false,
        igst_rate: "",
        igst_amount_inr: "",
        igst_amount_manual: false,
        comp_cess_percent: "",
        comp_cess_amount: ""
      },
    ]);
  };

  const removeDescriptionRow = (rowIndex) => {
    if (descriptionRows.length <= 1) return;
    const updatedRows = descriptionRows.filter((_, index) => index !== rowIndex);
    formik.setFieldValue("description_details", updatedRows);
  };

  // ---- Invoice Details helpers ----
  const invoiceRows = useMemo(() => {
    return Array.isArray(formik.values.invoice_details) &&
      formik.values.invoice_details.length > 0
      ? formik.values.invoice_details.map(inv => ({
        ...inv,
        po_details: inv.po_details && inv.po_details.length > 0
          ? inv.po_details.map(p => ({ po_no: p.po_no || "", po_date: p.po_date || "" }))
          : [{ po_no: inv.po_no || "", po_date: inv.po_date || "" }],
        freight_currency: inv.freight_currency || inv.inv_currency || "",
        insurance_currency: inv.insurance_currency || "INR",
        other_charges_currency: inv.other_charges_currency || "USD",
      }))
      : [
        {
          invoice_number: "",
          invoice_date: "",
          po_no: "",
          po_details: [{ po_no: "", po_date: "" }],
          product_value: "",
          other_charges: "",
          total_inv_value: "",
          inv_currency: "",
          toi: "CIF",
          freight: "",
          insurance: "",
          freight_currency: "",
          insurance_currency: "INR",
          other_charges_currency: "USD",
        },
      ];
  }, [formik.values.invoice_details]);

  const updateInvoiceRow = (rowIndex, field, value) => {
    const updatedRows = [...invoiceRows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };

    if (field === "po_details") {
      if (Array.isArray(value) && value[0]) {
        updatedRows[rowIndex].po_no = value[0].po_no || "";
        updatedRows[rowIndex].po_date = value[0].po_date || "";
      }
    }

    // Auto-sync product_value (Invoice Value) to linked description row(s) amount in product tab
    if (field === "product_value") {
      const matchedInvoiceSr = String(rowIndex + 1);
      const updatedDescRows = descriptionRows.map(dRow => {
        if (dRow.sr_no_invoice === matchedInvoiceSr || (matchedInvoiceSr === "1" && !dRow.sr_no_invoice)) {
          let newPrice = dRow.unit_price;
          const qty = parseFloat(dRow.quantity);
          const amt = parseFloat(value);
          if (!isNaN(qty) && qty > 0 && !isNaN(amt)) {
            newPrice = (amt / qty).toFixed(2);
          }
          return { ...dRow, amount: value || "", unit_price: newPrice };
        }
        return dRow;
      });
      formik.setFieldValue("description_details", updatedDescRows);
    }

    // Auto-calculate freight and insurance based on TOI
    const toiValue = field === "toi" ? value : (updatedRows[rowIndex].toi || "CIF");
    const pv = parseFloat(field === "product_value" ? value : (updatedRows[rowIndex].product_value || 0)) || 0;

    const calculateInsuranceValue = () => {
      if (pv <= 0) return "";
      const baseInsurance = pv * 0.01125;
      const invCurr = field === "inv_currency" ? value : (updatedRows[rowIndex].inv_currency || "");
      const insCurr = field === "insurance_currency" ? value : (updatedRows[rowIndex].insurance_currency || "INR");
      const exRate = parseFloat(field === "exchange_rate" ? value : (updatedRows[rowIndex].exchange_rate || formik.values.exrate || 1)) || 1;

      if (insCurr === "INR" && invCurr !== "INR") {
        return (baseInsurance * exRate).toFixed(2);
      }
      return baseInsurance.toFixed(2);
    };

    if (toiValue === "FOB") {
      if (["product_value", "toi", "exchange_rate", "insurance_currency", "inv_currency"].includes(field)) {
        updatedRows[rowIndex].freight = pv > 0 ? (pv * 0.20).toFixed(2) : "";
        updatedRows[rowIndex].insurance = calculateInsuranceValue();
      }
    } else if (toiValue === "CF") {
      // C&F: auto-calculate insurance as 1.125% of invoice value
      if (["product_value", "toi", "exchange_rate", "insurance_currency", "inv_currency"].includes(field)) {
        updatedRows[rowIndex].freight = "";
        updatedRows[rowIndex].insurance = calculateInsuranceValue();
      }
    } else if (toiValue === "CI") {
      // C&I: auto-calculate freight as 20% of invoice value
      if (["product_value", "toi", "exchange_rate", "insurance_currency", "inv_currency"].includes(field)) {
        updatedRows[rowIndex].freight = pv > 0 ? (pv * 0.20).toFixed(2) : "";
        updatedRows[rowIndex].insurance = "";
      }
    } else if (field === "toi") {
      // CIF or other
      updatedRows[rowIndex].freight = "";
      updatedRows[rowIndex].insurance = "";
    }

    // Auto-calculate total invoice value if any contributing field changes
    const fieldsToSum = ["product_value", "freight", "insurance", "other_charges", "toi", "exchange_rate", "freight_exchange_rate", "insurance_exchange_rate", "other_charges_exchange_rate"];
    if (fieldsToSum.includes(field)) {
      const prod = parseFloat(field === "product_value" ? value : (updatedRows[rowIndex].product_value || 0)) || 0;
      const frt = parseFloat(field === "freight" ? value : (updatedRows[rowIndex].freight || 0)) || 0;
      const ins = parseFloat(field === "insurance" ? value : (updatedRows[rowIndex].insurance || 0)) || 0;
      const other = parseFloat(field === "other_charges" ? value : (updatedRows[rowIndex].other_charges || 0)) || 0;

      // Exchange rates for conversion to invoice currency
      const invEx = parseFloat(field === "exchange_rate" ? value : (updatedRows[rowIndex].exchange_rate || formik.values.exrate || 1)) || 1;
      const frEx = parseFloat(field === "freight_exchange_rate" ? value : (updatedRows[rowIndex].freight_exchange_rate || formik.values.exrate || 1)) || 1;
      const insEx = parseFloat(field === "insurance_exchange_rate" ? value : (updatedRows[rowIndex].insurance_exchange_rate || 1)) || 1;
      const othEx = parseFloat(field === "other_charges_exchange_rate" ? value : (updatedRows[rowIndex].other_charges_exchange_rate || 1)) || 1;

      const prodInInv = prod; // already in invoice currency
      const frtInInv = (frt * frEx) / invEx;
      const insInInv = (ins * insEx) / invEx;
      const othInInv = (other * othEx) / invEx;

      const total = (prodInInv + frtInInv + insInInv + othInInv).toFixed(2);

      updatedRows[rowIndex].total_inv_value = total;
    }

    formik.setFieldValue("invoice_details", updatedRows);

    // Also sync F & I Charges tab amounts and rates based on FOB/CF/CI invoices
    const hasFOB = updatedRows.some(row => row.toi === "FOB");
    const hasCF = updatedRows.some(row => row.toi === "CF");
    const hasCI = updatedRows.some(row => row.toi === "CI");

    if (hasFOB || hasCF || hasCI) {
      const totalFreight = updatedRows.reduce((sum, row) => sum + (parseFloat(row.freight) || 0), 0);
      const totalInsurance = updatedRows.reduce((sum, row) => sum + (parseFloat(row.insurance) || 0), 0);

      if (hasFOB || hasCI) {
        formik.setFieldValue("other_charges_details.freight.amount", totalFreight > 0 ? totalFreight.toFixed(2) : "");
        formik.setFieldValue("other_charges_details.freight.rate", "20");
      } else {
        formik.setFieldValue("other_charges_details.freight.amount", "");
        formik.setFieldValue("other_charges_details.freight.rate", 0);
      }

      if (hasFOB || hasCF) {
        formik.setFieldValue("other_charges_details.insurance.amount", totalInsurance > 0 ? totalInsurance.toFixed(2) : "");
        formik.setFieldValue("other_charges_details.insurance.rate", "1.125");
      } else {
        formik.setFieldValue("other_charges_details.insurance.amount", "");
        formik.setFieldValue("other_charges_details.insurance.rate", 0);
      }
    } else if (field === "toi") {
      formik.setFieldValue("other_charges_details.freight.amount", "");
      formik.setFieldValue("other_charges_details.freight.rate", 0);
      formik.setFieldValue("other_charges_details.insurance.amount", "");
      formik.setFieldValue("other_charges_details.insurance.rate", 0);
    }

    // Auto-sync currency for all charge heads in other_charges_details when invoice currency changes
    if (field === "inv_currency" && invoiceRows[rowIndex]?.inv_currency !== value) {
      updatedRows[rowIndex].freight_currency = value || "";
      updatedRows[rowIndex].insurance_currency = "INR";
      updatedRows[rowIndex].other_charges_currency = "USD";
      updatedRows[rowIndex].exchange_rate = "";
      updatedRows[rowIndex].freight_exchange_rate = "";
      updatedRows[rowIndex].insurance_exchange_rate = "";
      updatedRows[rowIndex].other_charges_exchange_rate = "";

      ["freight"].forEach(key => {
        formik.setFieldValue(`other_charges_details.${key}.currency`, value || "");
        formik.setFieldValue(`other_charges_details.${key}.exchange_rate`, "");
      });
      ["insurance", "miscellaneous", "agency", "discount", "loading", "addl_charge"].forEach(key => {
        formik.setFieldValue(`other_charges_details.${key}.currency`, "INR");
        formik.setFieldValue(`other_charges_details.${key}.exchange_rate`, 1);
      });

      // Clear the exrate to force re-fetch only if BE No is NOT present!
      const hasBeNo = formik.values.be_no && String(formik.values.be_no).trim().length > 0;
      if (!hasBeNo) {
        formik.setFieldValue("exrate", "");
      }
    }

    if (field === "freight_currency" && invoiceRows[rowIndex]?.freight_currency !== value) {
      updatedRows[rowIndex].freight_exchange_rate = "";
    }
    if (field === "insurance_currency" && invoiceRows[rowIndex]?.insurance_currency !== value) {
      updatedRows[rowIndex].insurance_exchange_rate = "";
    }
    if (field === "other_charges_currency" && invoiceRows[rowIndex]?.other_charges_currency !== value) {
      updatedRows[rowIndex].other_charges_exchange_rate = "";
    }

    formik.setFieldValue("invoice_details", updatedRows);

    const totalCif = updatedRows.reduce((sum, row) => sum + (parseFloat(row.total_inv_value) || 0), 0);
    const totalProductVal = updatedRows.reduce((sum, row) => sum + (parseFloat(row.product_value) || 0), 0);

    if (totalCif > 0) {
      formik.setFieldValue("total_inv_value", totalProductVal.toFixed(2));
    } else {
      formik.setFieldValue("total_inv_value", "");
    }
  };

  const addInvoiceRow = () => {
    formik.setFieldValue("invoice_details", [
      ...invoiceRows,
      {
        invoice_number: "",
        invoice_date: "",
        po_no: "",
        po_details: [{ po_no: "", po_date: "" }],
        product_value: "",
        other_charges: "",
        total_inv_value: "",
        inv_currency: invoiceRows[0]?.inv_currency || "",
        exchange_rate: "",
        freight_exchange_rate: "",
        insurance_exchange_rate: "",
        other_charges_exchange_rate: "",
        toi: "CIF",
        freight: "",
        insurance: "",
        freight_currency: invoiceRows[0]?.inv_currency || "",
        insurance_currency: "INR",
        other_charges_currency: "USD",
      },
    ]);
  };

  const removeInvoiceRow = (rowIndex) => {
    if (invoiceRows.length <= 1) return;
    const updatedRows = invoiceRows.filter((_, index) => index !== rowIndex);
    formik.setFieldValue("invoice_details", updatedRows);
  };

  // ---- Misc Charges Details helpers ----
  const miscChargesRows =
    Array.isArray(formik.values.misc_charges)
      ? formik.values.misc_charges
      : [];

  const updateMiscChargeRow = (rowIndex, field, value) => {
    const updatedRows = [...miscChargesRows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };

    // Auto-calculate amount_inr if exchange_rate or amount changes
    if (field === "exchange_rate" || field === "amount") {
      const exRate = parseFloat(field === "exchange_rate" ? value : (updatedRows[rowIndex].exchange_rate || 1)) || 1;
      const amt = parseFloat(field === "amount" ? value : (updatedRows[rowIndex].amount || 0)) || 0;
      updatedRows[rowIndex].amount_inr = (exRate * amt).toFixed(2);
    }

    formik.setFieldValue("misc_charges", updatedRows);
  };

  const addMiscChargeRow = () => {
    formik.setFieldValue("misc_charges", [
      ...miscChargesRows,
      {
        charge_type: "",
        currency: "USD",
        exchange_rate: 1,
        rate_percent: 0,
        amount: 0,
        amount_inr: 0,
        remark: ""
      },
    ]);
  };

  const removeMiscChargeRow = (rowIndex) => {
    const updatedRows = miscChargesRows.filter((_, index) => index !== rowIndex);
    formik.setFieldValue("misc_charges", updatedRows);
  };

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
          {user?.role === "Admin" && (
            <Box sx={{ position: "fixed", top: 80, right: 30, zIndex: 999, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={imexcubeUploading ? null : <CloudUploadIcon />}
                  onClick={handleUploadToImexcube}
                  disabled={imexcubeUploading}
                  sx={{
                    backgroundColor: data?.imexcube_uploaded ? "#2e7d32" : "#1565c0",
                    color: "white",
                    "&:hover": {
                      backgroundColor: data?.imexcube_uploaded ? "#1b5e20" : "#0d47a1",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: data?.imexcube_uploaded ? "#a5d6a7" : "#90caf9",
                      color: "white",
                    },
                  }}
                >
                  {imexcubeUploading ? "Uploading..." : data?.imexcube_uploaded ? "Job Uploaded to IMEXCUBE" : "Upload to IMEXCUBE (TEST)"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleGetImexcubeDetails}
                  disabled={imexcubeDetailsLoading}
                  sx={{
                    borderColor: "#1565c0",
                    color: "#1565c0",
                    backgroundColor: "white",
                    "&:hover": {
                      borderColor: "#0d47a1",
                      backgroundColor: "rgba(21, 101, 192, 0.04)"
                    },
                    "&.Mui-disabled": {
                      borderColor: "#90caf9",
                      color: "#90caf9"
                    }
                  }}
                >
                  {imexcubeDetailsLoading ? "Fetching..." : "Get Job Data from IMEXCUBE"}
                </Button>
              </Box>
              {data?.imexcube_uploaded && data?.imexcube_uploaded_at && (
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 0.5, color: '#2e7d32', fontWeight: 700, width: "100%" }}>
                  Uploaded on: {new Date(data.imexcube_uploaded_at).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  })}
                </Typography>
              )}
            </Box>
          )}

          {/* Importer info start*/}
          <div style={{ marginTop: "70px" }}>
            <JobDetailsStaticData
              data={{
                ...data,
                cif_amount: formik.values.cif_amount || data.cif_amount,
                total_inv_value: formik.values.total_inv_value || data.total_inv_value
              }}
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
              <Tab label="Invoice Details" />
              <Tab label="Product Details" />
              <Tab label={getContainerOrPackageLabel(data?.mode)} />
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
                              color: formik.values.bill_document_sent_to_accounts
                                ? "#28a745"
                                : "#212529",
                            }}
                          >
                            {formik.values.bill_document_sent_to_accounts
                              ? new Date(
                                formik.values.bill_document_sent_to_accounts
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
                                formik.values.bill_document_sent_to_accounts
                                  ? formatDateForInput(
                                    formik.values.bill_document_sent_to_accounts
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
                          <MenuItem value="Do completed and Delivery pending">
                            Do completed and Delivery pending
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

              {/* Sent to Dock Status Block */}
              <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                <h6 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#495057", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                  Sent to Submission Status
                </h6>
                <Row className="align-items-center">
                  <Col xs={12} md={6} lg={4}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formik.values.is_sent_to_submission}
                            onChange={handleManualSubmissionToggle}
                            color="primary"
                          />
                        }
                        label={<span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Its sent to submission</span>}
                      />
                    </div>
                  </Col>
                  {formik.values.is_sent_to_submission && (
                    <>
                      <Col xs={12} md={6} lg={4}>
                        <Typography variant="body2" style={{ fontWeight: '600', color: '#6c757d' }}>
                          Sent By: <span style={{ color: '#212529' }}>{formik.values.sent_to_submission_user_name || "N/A"}</span>
                        </Typography>
                      </Col>
                      <Col xs={12} md={6} lg={4}>
                        <Typography variant="body2" style={{ fontWeight: '600', color: '#6c757d' }}>
                          Time: <span style={{ color: '#212529' }}>{formik.values.sent_to_submission_date_time || "N/A"}</span>
                        </Typography>
                      </Col>
                    </>
                  )}
                </Row>
              </div>
            </>
          )}

          {viewJobTab === 1 && (
            <>
              {/* Tracking status start*/}
              <div className="job-details-container">
                <JobDetailsRowHeading
                  heading="Tracking Status"
                  rightContent={
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <DocRequestCheckbox job={data} />
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ marginRight: '10px', fontWeight: '600', fontSize: '1rem', color: '#6c757d' }}>Priority:</div>
                        <RadioGroup row name="priorityJob" value={formik.values.priorityJob || ""} onChange={formik.handleChange} >
                          <FormControlLabel value="normal" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} style={{ color: 'green' }} />} label={<span style={{ fontSize: '1rem' }}>Normal</span>} />
                          <FormControlLabel value="Priority" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} style={{ color: 'orange' }} />} label={<span style={{ fontSize: '1rem' }}>Priority</span>} />
                          <FormControlLabel value="High Priority" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} style={{ color: 'red' }} />} label={<span style={{ fontSize: '1rem' }}>High</span>} />
                        </RadioGroup>
                      </div>
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
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>{getAwbOrBlLabel(data?.mode)} Number</label>
                      <TextField fullWidth size="small" variant="outlined" id="awb_bl_no" name="awb_bl_no" value={formik.values.awb_bl_no || ""}
                        onChange={formik.handleChange} placeholder="Enter BL No" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>{getAwbOrBlLabel(data?.mode)} Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="awb_bl_date" name="awb_bl_date"
                        value={formik.values.awb_bl_date ? (formik.values.awb_bl_date.length === 10 ? `${formik.values.awb_bl_date}T00:00` : formik.values.awb_bl_date) : ""}
                        onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>H{getAwbOrBlLabel(data?.mode)} Number</label>
                      <TextField fullWidth size="small" variant="outlined" id="hawb_hbl_no" name="hawb_hbl_no" value={formik.values.hawb_hbl_no || ""}
                        onChange={formik.handleChange} placeholder="Enter HAWBL No" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>H{getAwbOrBlLabel(data?.mode)} Date</label>
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
                    {activeBranchConfig.gateway_igm_enabled && (
                      <Col xs={12} md={3} lg={2} className="mb-3">
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Gateway IGM No</label>
                        <TextField fullWidth size="small" variant="outlined" id="gateway_igm" name="gateway_igm" disabled={user?.role !== "Admin" && isSubmissionDate}
                          value={formik.values.gateway_igm || ""} onChange={formik.handleChange} placeholder="Enter Gateway IGM" sx={compactInputSx} />
                      </Col>
                    )}
                    {activeBranchConfig.gateway_igm_date_enabled && (
                      <Col xs={12} md={3} lg={2} className="mb-3">
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Gateway IGM Date</label>
                        <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="gateway_igm_date" name="gateway_igm_date" disabled={user?.role !== "Admin" && isSubmissionDate}
                          value={formik.values.gateway_igm_date ? (formik.values.gateway_igm_date.length === 10 ? `${formik.values.gateway_igm_date}T00:00` : formik.values.gateway_igm_date) : ""}
                          onChange={formik.handleChange} sx={compactInputSx} />
                      </Col>
                    )}
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
                      <>
                        <Col xs={12} md={4} lg={3} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Seller Name</label>
                          <TextField fullWidth size="small" variant="outlined" id="saller_name" name="saller_name"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.saller_name || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                        <Col xs={12} md={3} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Address Type</label>
                          <TextField fullWidth select size="small" variant="outlined" id="hss_address" name="hss_address"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss_address || ""} onChange={formik.handleChange} sx={compactInputSx}>
                            <MenuItem value="Office">Office</MenuItem>
                            <MenuItem value="Warehouse">Warehouse</MenuItem>
                            <MenuItem value="Factory">Factory</MenuItem>
                          </TextField>
                        </Col>
                        <Col xs={12} md={12} lg={12} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Address Details</label>
                          <TextField fullWidth multiline minRows={2} size="small" variant="outlined" id="hss_address_details" name="hss_address_details"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss_address_details || ""} onChange={formik.handleChange}
                            sx={{
                              ...compactInputSx,
                              "& .MuiOutlinedInput-root": {
                                ...compactInputSx["& .MuiOutlinedInput-root"],
                                height: "auto",
                                minHeight: "54px"
                              },
                              "& .MuiOutlinedInput-input": {
                                ...compactInputSx["& .MuiOutlinedInput-input"],
                                padding: "4px 8px",
                                lineHeight: "1.3"
                              }
                            }}
                          />
                        </Col>
                        <Col xs={6} md={2} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Branch SNo</label>
                          <TextField fullWidth size="small" variant="outlined" id="hss_branch_id" name="hss_branch_id"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss_branch_id || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                        <Col xs={6} md={2} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>IE Code No</label>
                          <TextField fullWidth size="small" variant="outlined" id="hss_ie_code_no" name="hss_ie_code_no"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss_ie_code_no || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                        <Col xs={6} md={2} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>City</label>
                          <TextField fullWidth size="small" variant="outlined" id="hss_city" name="hss_city"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss_city || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                        <Col xs={6} md={2} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>State</label>
                          <TextField fullWidth size="small" variant="outlined" id="hss_state" name="hss_state"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss_state || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                        <Col xs={6} md={2} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Postal Code</label>
                          <TextField fullWidth size="small" variant="outlined" id="hss_postal_code" name="hss_postal_code"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss_postal_code || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                        <Col xs={12} md={3} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Country</label>
                          <TextField fullWidth size="small" variant="outlined" id="hss_country" name="hss_country"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss_country || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                        <Col xs={12} md={3} lg={2} className="mb-3">
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>AD Code</label>
                          <TextField fullWidth size="small" variant="outlined" id="hss_ad_code" name="hss_ad_code"
                            disabled={user?.role !== "Admin" && isSubmissionDate} value={formik.values.hss_ad_code || ""} onChange={formik.handleChange} sx={compactInputSx} />
                        </Col>
                      </>
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
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>NfIMS No</label>
                      <TextField fullWidth size="small" variant="outlined" id="nfims_no" name="nfims_no"
                        value={formik.values.nfims_no || ""} onChange={formik.handleChange} placeholder="Enter NfIMS No" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>NfIMS Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="nfims_date" name="nfims_date"
                        value={formik.values.nfims_date ? (formik.values.nfims_date.length === 10 ? `${formik.values.nfims_date}T00:00` : formik.values.nfims_date) : ""}
                        onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>SIMS No</label>
                      <TextField fullWidth size="small" variant="outlined" id="sims_no" name="sims_no"
                        value={formik.values.sims_no || ""} onChange={formik.handleChange} placeholder="Enter SIMS No" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={3} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>SIMS Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" id="sims_date" name="sims_date"
                        value={formik.values.sims_date ? (formik.values.sims_date.length === 10 ? `${formik.values.sims_date}T00:00` : formik.values.sims_date) : ""}
                        onChange={formik.handleChange} sx={compactInputSx} />
                    </Col>
                  </Row>
                </div>

                <JobDocRequests jobNumber={formik.values.job_number || formik.values.job_no} />

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
                              <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "4px" }}>
                                Remark: {formik.values.client_remark || " - "}
                              </div>
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
                            invoice_number: formik.values.invoice_number, invoice_date: formik.values.invoice_date, po_no: formik.values.po_no, loading_port: formik.values.loading_port,
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
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>O{getAwbOrBlLabel(data?.mode).charAt(0)}BL / Document Status</label>
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
                        id="required_do_validity_upto_job"
                        value={formik.values.container_nos?.[0]?.required_do_validity_upto || ""}
                        onChange={(e) => handleJobLevelDateChange(e.target.value)}
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

          {viewJobTab === 2 && (
            <div className="job-details-container">
              <JobDetailsRowHeading heading="Invoice Details" />

              {Math.abs(totalInvoiceValue - totalProductAmount) > 0.01 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: "#fff9db",
                  border: "1px solid #fcc419",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  color: "#856404",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  marginTop: "8px"
                }}>
                  <span style={{ fontSize: "18px" }}>⚠️</span>
                  <div>
                    <strong>Mismatch Warning:</strong> Total Invoice Value (<strong>{totalInvoiceValue.toFixed(2)}</strong>) and Total Product Amount (<strong>{totalProductAmount.toFixed(2)}</strong>) do not match!
                  </div>
                </div>
              )}

              <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                <Tabs value={invoiceSubTab} onChange={handleInvoiceSubTabChange} sx={{ minHeight: "40px" }}>
                  <Tab label="Main Details" sx={{ textTransform: "none", fontWeight: "600" }} />
                  <Tab label="F & I Charges" sx={{ textTransform: "none", fontWeight: "600" }} />
                  <Tab label="Other Charges" sx={{ textTransform: "none", fontWeight: "600" }} />
                </Tabs>
              </Box>

              {invoiceSubTab === 0 && (
                <div style={{ background: "#ffffff", border: "1px solid #dee2e6", borderRadius: "4px", padding: "16px", marginBottom: "20px" }}>
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
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>Exchange Rate</label>
                      <TextField fullWidth size="small" variant="outlined" id="exrate" name="exrate" disabled={user?.role !== "Admin" && isSubmissionDate}
                        value={formik.values.exrate || ""}
                        onChange={(e) => {
                          const newExrate = e.target.value;
                          formik.setFieldValue("exrate", newExrate);

                          const exrateNum = parseFloat(newExrate) || 0;
                          const invoiceDetails = formik.values.invoice_details || [];

                          // Also recalculate auto-derived insurance amounts in invoices based on the new exchange rate
                          const updatedInvoiceDetails = invoiceDetails.map(row => {
                            const toiValue = row.toi || "CIF";
                            if (row.insurance_currency === "INR" && row.inv_currency !== "INR" && (toiValue === "FOB" || toiValue === "CF")) {
                              const rowExRate = parseFloat(row.exchange_rate);
                              if (isNaN(rowExRate)) {
                                const pv = parseFloat(row.product_value) || 0;
                                const baseInsurance = pv * 0.01125;
                                const newInsurance = (baseInsurance * exrateNum).toFixed(2);
                                
                                // Recalculate row's total invoice value too
                                const frt = parseFloat(row.freight) || 0;
                                const ins = parseFloat(newInsurance) || 0;
                                const other = parseFloat(row.other_charges) || 0;
                                
                                // Exchange rates for summing
                                const invEx = exrateNum || 1;
                                const frEx = parseFloat(row.freight_exchange_rate || exrateNum || 1) || 1;
                                const insEx = parseFloat(row.insurance_exchange_rate || 1) || 1;
                                const othEx = parseFloat(row.other_charges_exchange_rate || 1) || 1;
                                
                                const prodInInv = pv;
                                const frtInInv = (frt * frEx) / invEx;
                                const insInInv = (ins * insEx) / invEx;
                                const othInInv = (other * othEx) / invEx;
                                
                                const total = (prodInInv + frtInInv + insInInv + othInInv).toFixed(2);
                                
                                return {
                                  ...row,
                                  insurance: newInsurance,
                                  total_inv_value: total
                                };
                              }
                            }
                            return row;
                          });

                          formik.setFieldValue("invoice_details", updatedInvoiceDetails);

                          const totalCif = updatedInvoiceDetails.reduce((sum, r) => sum + (parseFloat(r.total_inv_value) || 0), 0);
                          const fallbackVal = parseFloat(formik.values.total_inv_value) || 0;
                          const effectiveCif = totalCif > 0 ? totalCif : fallbackVal;

                          if (effectiveCif > 0 && exrateNum > 0) {
                            const cifInr = effectiveCif * exrateNum;
                            formik.setFieldValue("cif_amount", cifInr.toFixed(2));
                            formik.setFieldValue("cifValue", cifInr.toFixed(2));
                          }
                        }}
                        placeholder="Exchange Rate" sx={compactInputSx} />
                    </Col>
                    <Col xs={12} md={2} lg={2} className="mb-3">
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "0.9rem", fontWeight: "600", color: "#000000" }}>FTA Benefit Date</label>
                      <TextField fullWidth size="small" variant="outlined" type="datetime-local" name="fta_Benefit_date_time"
                        value={formik.values.fta_Benefit_date_time || ""} InputLabelProps={{ shrink: true }}
                        onChange={(e) => formik.setFieldValue("fta_Benefit_date_time", e.target.value)}
                        disabled={user?.role !== "Admin" && isSubmissionDate} sx={{ bgcolor: "white", ...compactInputSx }} />
                    </Col>
                    <Col xs={12} lg={4} className="mb-3 d-flex align-items-center" style={{ paddingTop: '22px' }}>
                      <div style={{ marginRight: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#6c757d" }}>Payment:</div>
                      <RadioGroup row name="payment_method" value={formik.values.payment_method || ""} onChange={formik.handleChange}>
                        <FormControlLabel value="Transaction" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} />} label={<span style={{ fontSize: "0.9rem" }}>Transaction</span>} />
                        <FormControlLabel value="Deferred" control={<Radio size="small" disabled={user?.role !== "Admin" && isSubmissionDate} />} label={<span style={{ fontSize: "0.9rem" }}>Deferred</span>} />
                      </RadioGroup>
                    </Col>
                  </Row>

                  {/* Invoice Details Table */}
                  <Row>
                    <Col xs={12} className="mb-3">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", gap: "24px" }}>
                        <label style={{ marginBottom: 0, fontSize: "0.9rem", fontWeight: "600", color: "#000000", whiteSpace: "nowrap" }}>
                          Invoice Details
                        </label>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '250px' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Table Width:
                          </Typography>
                          <Slider
                            value={invoiceTableWidth}
                            onChange={(e, val) => setInvoiceTableWidth(val)}
                            min={1200}
                            max={2500}
                            step={100}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(val) => `${val}px`}
                            sx={{ color: '#1e293b' }}
                          />
                        </Box>
                        {!isDescriptionTableReadOnly && (
                          <Button
                            variant="contained"
                            type="button"
                            startIcon={<AddIcon />}
                            onClick={addInvoiceRow}
                            sx={{
                              backgroundColor: "#1e293b",
                              color: "#ffffff",
                              "&:hover": {
                                backgroundColor: "#0f172a"
                              },
                              textTransform: "none",
                              fontWeight: "600",
                              fontSize: "0.85rem",
                              padding: "7px 16px",
                              borderRadius: "6px",
                              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                              marginBottom: "12px"
                            }}
                          >
                            Add Invoice
                          </Button>
                        )}
                      </div>

                      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: `${invoiceTableWidth}px`, backgroundColor: "#ffffff" }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                              {[
                                { label: "Sr No", width: "45px", align: "center" },
                                { label: "Invoice Number", width: "150px", align: "left" },
                                { label: "Date", width: "120px", align: "left" },
                                { label: "PO Details", width: "280px", align: "left" },
                                { label: "TOI", width: "90px", align: "left" },
                                { label: "Invoice Value", width: "130px", align: "left" },
                                { label: "Currency", width: "95px", align: "left" },
                                { label: "Ex. Rate", width: "100px", align: "left" },
                                { label: "Freight", width: "170px", align: "left" },
                                { label: "Insurance", width: "170px", align: "left" },
                                { label: "Other Chrgs", width: "170px", align: "left" },
                                { label: "CIF Value", width: "130px", align: "left" },
                                { label: "Action", width: "50px", align: "center" }
                              ].map((col) => (
                                <th
                                  key={col.label}
                                  style={{
                                    padding: "10px 8px",
                                    fontSize: "0.8rem",
                                    fontWeight: "600",
                                    textAlign: col.align || "left",
                                    whiteSpace: "nowrap",
                                    color: "#475569",
                                    width: col.width || "auto",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em"
                                  }}
                                >
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {invoiceRows.map((row, rowIndex) => (
                              <tr
                                key={`inv-row-${rowIndex}`}
                                style={{
                                  borderBottom: "1px solid #e2e8f0",
                                  background: "transparent",
                                  transition: "background-color 0.2s"
                                }}
                              >
                                <td style={{ padding: "8px 6px", textAlign: "center", width: "45px", fontSize: "12px", fontWeight: "bold", color: "#64748b", verticalAlign: "middle" }}>
                                  {rowIndex + 1}
                                </td>
                                <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={row.invoice_number || ""}
                                    onChange={(e) => updateInvoiceRow(rowIndex, "invoice_number", e.target.value)}
                                    disabled={isDescriptionTableReadOnly}
                                    placeholder="Invoice No"
                                    sx={compactInputSx}
                                  />
                                </td>
                                <td style={{ padding: "8px 6px", width: "120px", verticalAlign: "middle" }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    type="date"
                                    value={row.invoice_date || ""}
                                    onChange={(e) => updateInvoiceRow(rowIndex, "invoice_date", e.target.value)}
                                    disabled={isDescriptionTableReadOnly}
                                    InputLabelProps={{ shrink: true }}
                                    sx={compactInputSx}
                                  />
                                </td>
                                <td style={{ padding: "8px 6px", width: "280px", verticalAlign: "middle" }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {(row.po_details || [{ po_no: "", po_date: "" }]).map((po, poIndex) => (
                                      <div key={poIndex} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <TextField
                                          size="small"
                                          value={po.po_no || ""}
                                          placeholder="PO No"
                                          disabled={isDescriptionTableReadOnly}
                                          onChange={(e) => {
                                            const updatedPoList = [...(row.po_details || [{ po_no: "", po_date: "" }])];
                                            updatedPoList[poIndex] = { ...updatedPoList[poIndex], po_no: e.target.value };
                                            updateInvoiceRow(rowIndex, "po_details", updatedPoList);
                                          }}
                                          sx={{ ...compactInputSx, width: "100px", minWidth: "100px" }}
                                        />
                                        <TextField
                                          size="small"
                                          type="date"
                                          value={po.po_date || ""}
                                          disabled={isDescriptionTableReadOnly}
                                          InputLabelProps={{ shrink: true }}
                                          onChange={(e) => {
                                            const updatedPoList = [...(row.po_details || [{ po_no: "", po_date: "" }])];
                                            updatedPoList[poIndex] = { ...updatedPoList[poIndex], po_date: e.target.value };
                                            updateInvoiceRow(rowIndex, "po_details", updatedPoList);
                                          }}
                                          sx={{ ...compactInputSx, width: "110px", minWidth: "110px" }}
                                        />
                                        {!isDescriptionTableReadOnly && (
                                          <div style={{ display: "flex", gap: "2px" }}>
                                            <IconButton
                                              size="small"
                                              onClick={() => {
                                                const updatedPoList = [...(row.po_details || [{ po_no: "", po_date: "" }])];
                                                updatedPoList.push({ po_no: "", po_date: "" });
                                                updateInvoiceRow(rowIndex, "po_details", updatedPoList);
                                              }}
                                              sx={{ padding: "2px" }}
                                            >
                                              <AddIcon sx={{ fontSize: "0.95rem" }} />
                                            </IconButton>
                                            {(row.po_details || [{ po_no: "", po_date: "" }]).length > 1 && (
                                              <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => {
                                                  const updatedPoList = (row.po_details || [{ po_no: "", po_date: "" }]).filter((_, i) => i !== poIndex);
                                                  updateInvoiceRow(rowIndex, "po_details", updatedPoList);
                                                }}
                                                sx={{ padding: "2px" }}
                                              >
                                                <RemoveIcon sx={{ fontSize: "0.95rem" }} />
                                              </IconButton>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ padding: "8px 6px", width: "90px", verticalAlign: "middle" }}>
                                  <TextField
                                    select
                                    size="small"
                                    fullWidth
                                    value={row.toi || "CIF"}
                                    onChange={(e) => updateInvoiceRow(rowIndex, "toi", e.target.value)}
                                    disabled={isDescriptionTableReadOnly}
                                    sx={compactInputSx}
                                  >
                                    <MenuItem value="CIF">CIF</MenuItem>
                                    <MenuItem value="FOB">FOB</MenuItem>
                                    <MenuItem value="CF">C&F</MenuItem>
                                    <MenuItem value="CI">C&I</MenuItem>
                                  </TextField>
                                </td>
                                <td style={{ padding: "8px 6px", width: "130px", verticalAlign: "middle" }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={row.product_value || ""}
                                    onChange={(e) => updateInvoiceRow(rowIndex, "product_value", e.target.value)}
                                    disabled={isDescriptionTableReadOnly}
                                    placeholder="Invoice Value"
                                    sx={compactInputSx}
                                  />
                                </td>
                                <td style={{ padding: "8px 6px", width: "95px", verticalAlign: "middle" }}>
                                  <Autocomplete
                                    freeSolo
                                    size="small"
                                    options={currencies.map(c => c.code)}
                                    value={row.inv_currency || ""}
                                    onInputChange={(event, newValue) => updateInvoiceRow(rowIndex, "inv_currency", newValue)}
                                    onChange={(event, newValue) => updateInvoiceRow(rowIndex, "inv_currency", newValue || "")}
                                    disabled={isDescriptionTableReadOnly}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        variant="outlined"
                                        size="small"
                                        placeholder="Currency"
                                        sx={compactInputSx}
                                      />
                                    )}
                                  />
                                </td>
                                <td style={{ padding: "8px 6px", width: "100px", verticalAlign: "middle" }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    type="number"
                                    value={row.exchange_rate || ""}
                                    onChange={(e) => updateInvoiceRow(rowIndex, "exchange_rate", e.target.value)}
                                    disabled={isDescriptionTableReadOnly}
                                    placeholder="Ex. Rate"
                                    sx={compactInputSx}
                                  />
                                </td>
                                <td style={{ padding: "8px 6px", width: "170px", verticalAlign: "middle" }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <TextField
                                        size="small"
                                        fullWidth
                                        value={row.freight || ""}
                                        onChange={(e) => updateInvoiceRow(rowIndex, "freight", e.target.value)}
                                        disabled={isDescriptionTableReadOnly || !(row.toi === "FOB" || row.toi === "CI")}
                                        placeholder="Freight"
                                        sx={compactInputSx}
                                      />
                                      <Autocomplete
                                        freeSolo
                                        size="small"
                                        options={currencies.map(c => c.code)}
                                        value={row.freight_currency || ""}
                                        onInputChange={(event, newValue) => updateInvoiceRow(rowIndex, "freight_currency", newValue)}
                                        onChange={(event, newValue) => updateInvoiceRow(rowIndex, "freight_currency", newValue || "")}
                                        disabled={isDescriptionTableReadOnly || !(row.toi === "FOB" || row.toi === "CI")}
                                        renderInput={(params) => (
                                          <TextField
                                            {...params}
                                            variant="outlined"
                                            size="small"
                                            placeholder="Cur"
                                            sx={{ ...compactInputSx, width: '60px', minWidth: '60px' }}
                                          />
                                        )}
                                      />
                                    </div>
                                    {row.freight_currency && row.freight_currency.toUpperCase() !== 'INR' && (
                                      <TextField
                                        size="small"
                                        type="number"
                                        placeholder="Fr. Ex Rate"
                                        value={row.freight_exchange_rate || ""}
                                        onChange={(e) => updateInvoiceRow(rowIndex, "freight_exchange_rate", e.target.value)}
                                        disabled={isDescriptionTableReadOnly || !(row.toi === "FOB" || row.toi === "CI")}
                                        sx={compactInputSx}
                                      />
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: "8px 6px", width: "170px", verticalAlign: "middle" }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <TextField
                                        size="small"
                                        fullWidth
                                        value={row.insurance || ""}
                                        onChange={(e) => updateInvoiceRow(rowIndex, "insurance", e.target.value)}
                                        disabled={isDescriptionTableReadOnly || !(row.toi === "FOB" || row.toi === "CF")}
                                        placeholder="Insurance"
                                        sx={compactInputSx}
                                      />
                                      <Autocomplete
                                        freeSolo
                                        size="small"
                                        options={currencies.map(c => c.code)}
                                        value={row.insurance_currency || ""}
                                        onInputChange={(event, newValue) => updateInvoiceRow(rowIndex, "insurance_currency", newValue)}
                                        onChange={(event, newValue) => updateInvoiceRow(rowIndex, "insurance_currency", newValue || "")}
                                        disabled={isDescriptionTableReadOnly || !(row.toi === "FOB" || row.toi === "CF")}
                                        renderInput={(params) => (
                                          <TextField
                                            {...params}
                                            variant="outlined"
                                            size="small"
                                            placeholder="Cur"
                                            sx={{ ...compactInputSx, width: '60px', minWidth: '60px' }}
                                          />
                                        )}
                                      />
                                    </div>
                                    {row.insurance_currency && row.insurance_currency.toUpperCase() !== 'INR' && (
                                      <TextField
                                        size="small"
                                        type="number"
                                        placeholder="Ins. Ex Rate"
                                        value={row.insurance_exchange_rate || ""}
                                        onChange={(e) => updateInvoiceRow(rowIndex, "insurance_exchange_rate", e.target.value)}
                                        disabled={isDescriptionTableReadOnly || !(row.toi === "FOB" || row.toi === "CF")}
                                        sx={compactInputSx}
                                      />
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: "8px 6px", width: "170px", verticalAlign: "middle" }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <TextField
                                        size="small"
                                        fullWidth
                                        value={row.other_charges || ""}
                                        onChange={(e) => updateInvoiceRow(rowIndex, "other_charges", e.target.value)}
                                        disabled={isDescriptionTableReadOnly}
                                        placeholder="Other"
                                        sx={compactInputSx}
                                      />
                                      <Autocomplete
                                        freeSolo
                                        size="small"
                                        options={currencies.map(c => c.code)}
                                        value={row.other_charges_currency || ""}
                                        onInputChange={(event, newValue) => updateInvoiceRow(rowIndex, "other_charges_currency", newValue)}
                                        onChange={(event, newValue) => updateInvoiceRow(rowIndex, "other_charges_currency", newValue || "")}
                                        disabled={isDescriptionTableReadOnly}
                                        renderInput={(params) => (
                                          <TextField
                                            {...params}
                                            variant="outlined"
                                            size="small"
                                            placeholder="Cur"
                                            sx={{ ...compactInputSx, width: '60px', minWidth: '60px' }}
                                          />
                                        )}
                                      />
                                    </div>
                                    {row.other_charges_currency && row.other_charges_currency.toUpperCase() !== 'INR' && (
                                      <TextField
                                        size="small"
                                        type="number"
                                        placeholder="Oth. Ex Rate"
                                        value={row.other_charges_exchange_rate || ""}
                                        onChange={(e) => updateInvoiceRow(rowIndex, "other_charges_exchange_rate", e.target.value)}
                                        disabled={isDescriptionTableReadOnly}
                                        sx={compactInputSx}
                                      />
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: "8px 6px", width: "130px", verticalAlign: "middle" }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={(() => {
                                      const pv = parseFloat(row.product_value) || 0;
                                      const pvEx = parseFloat(row.exchange_rate) || parseFloat(formik.values.exrate) || 1;
                                      const fr = parseFloat(row.freight) || 0;
                                      const frEx = parseFloat(row.freight_exchange_rate) || parseFloat(formik.values.exrate) || 1;
                                      const ins = parseFloat(row.insurance) || 0;
                                      const insEx = parseFloat(row.insurance_exchange_rate) || 1;
                                      const oth = parseFloat(row.other_charges) || 0;
                                      const othEx = parseFloat(row.other_charges_exchange_rate) || 1;
                                      return ((pv * pvEx) + (fr * frEx) + (ins * insEx) + (oth * othEx)).toFixed(2);
                                    })()}
                                    InputProps={{ readOnly: true }}
                                    disabled={isDescriptionTableReadOnly}
                                    placeholder="CIF Value"
                                    sx={compactInputSx}
                                  />
                                </td>
                                <td style={{ padding: "8px 6px", textAlign: "center", width: "50px", verticalAlign: "middle" }}>
                                  {!isDescriptionTableReadOnly && (
                                    <IconButton
                                      size="small"
                                      disabled={invoiceRows.length <= 1}
                                      onClick={() => removeInvoiceRow(rowIndex)}
                                      sx={{
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "6px",
                                        color: "#94a3b8",
                                        padding: "6px",
                                        transition: "all 0.2s",
                                        "&:hover": {
                                          color: "#ef4444",
                                          borderColor: "#fecaca",
                                          backgroundColor: "#fef2f2"
                                        },
                                        "&.Mui-disabled": {
                                          color: "#cbd5e1",
                                          borderColor: "#f1f5f9"
                                        }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {invoiceRows.map((invRow, idx) => {
                        const invVal = parseFloat(invRow.product_value) || 0;
                        const prodSum = descriptionRows.reduce((sum, dRow) =>
                          (dRow.sr_no_invoice === String(idx + 1) || (!dRow.sr_no_invoice && idx === 0)) ? sum + (parseFloat(dRow.amount) || 0) : sum, 0
                        );
                        const hasMismatch = (invVal > 0 || prodSum > 0) && Math.abs(invVal - prodSum) > 0.01;
                        if (!hasMismatch) return null;
                        return (
                          <div key={idx} style={{ marginTop: "8px", padding: "8px 12px", background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "4px", color: "#b45309", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>⚠️</span>
                            <span><strong>Note:</strong> Invoice Sr No. {idx + 1} Value ({invVal.toFixed(2)}) and Product Details Amount ({prodSum.toFixed(2)}) do not match!</span>
                          </div>
                        );
                      })}
                    </Col>
                  </Row>
                </div>
              )}

              {invoiceSubTab === 1 && (
                <div style={{ background: "#ffffff", border: "1px solid #dee2e6", borderRadius: "4px", padding: "16px", marginBottom: "20px" }}>
                  <div className="d-flex align-items-center mb-3">
                    <Checkbox
                      checked={formik.values.other_charges_details?.is_single_for_all}
                      onChange={(e) => formik.setFieldValue("other_charges_details.is_single_for_all", e.target.checked)}
                    />
                    <label style={{ fontSize: "0.95rem", fontWeight: "600", color: "#495057", marginBottom: 0 }}>
                      Single Freight, Insurance & other charges for all Invoices
                    </label>
                  </div>

                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px", backgroundColor: "#ffffff" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          {[
                            { label: "Charge Head", width: "20%" },
                            { label: "Currency", width: "12%" },
                            { label: "Exch. Rate", width: "12%" },
                            { label: "Rate %", width: "12%" },
                            { label: "Amount", width: "12%" },
                            { label: "Description/Remark", width: "32%" }
                          ].map((col) => (
                            <th
                              key={col.label}
                              style={{
                                padding: "10px 8px",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                textAlign: "left",
                                whiteSpace: "nowrap",
                                color: "#475569",
                                width: col.width,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em"
                              }}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: "miscellaneous", label: "Miscellaneous Chrgs." },
                          { id: "agency", label: "Agency" },
                          { id: "discount", label: "Discount, if any" },
                          { id: "loading", label: "Loading" },
                          { id: "freight", label: "Freight" },
                          { id: "insurance", label: "Insurance" },
                          { id: "addl_charge", label: "Addl Chrg(High Sea)" },
                        ].map((row) => (
                          <tr
                            key={row.id}
                            style={{
                              borderBottom: "1px solid #e2e8f0",
                              background: "transparent",
                              transition: "background-color 0.2s"
                            }}
                          >
                            <td style={{ padding: "8px 6px", verticalAlign: "middle", fontWeight: "500", fontSize: "0.85rem", color: "#475569" }}>{row.label}</td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <Autocomplete
                                freeSolo
                                size="small"
                                options={currencies.map(c => c.code)}
                                sx={compactInputSx}
                                value={formik.values.other_charges_details?.[row.id]?.currency || ""}
                                onInputChange={(event, newValue) => {
                                  formik.setFieldValue(`other_charges_details.${row.id}.currency`, newValue);
                                  formik.setFieldValue(`other_charges_details.${row.id}.exchange_rate`, "");
                                }}
                                onChange={(event, newValue) => {
                                  formik.setFieldValue(`other_charges_details.${row.id}.currency`, newValue || "");
                                  formik.setFieldValue(`other_charges_details.${row.id}.exchange_rate`, "");
                                }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    variant="outlined"
                                    size="small"
                                    placeholder="Currency"
                                    sx={compactInputSx}
                                  />
                                )}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                sx={compactInputSx}
                                value={formik.values.other_charges_details?.[row.id]?.exchange_rate || ""}
                                onChange={(e) => formik.setFieldValue(`other_charges_details.${row.id}.exchange_rate`, e.target.value)}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                sx={compactInputSx}
                                value={formik.values.other_charges_details?.[row.id]?.rate || ""}
                                onChange={(e) => formik.setFieldValue(`other_charges_details.${row.id}.rate`, e.target.value)}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                sx={compactInputSx}
                                value={formik.values.other_charges_details?.[row.id]?.amount || ""}
                                onChange={(e) => formik.setFieldValue(`other_charges_details.${row.id}.amount`, e.target.value)}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                fullWidth
                                size="small"
                                sx={compactInputSx}
                                placeholder="Remark"
                                value={formik.values.other_charges_details?.[row.id]?.remark || ""}
                                onChange={(e) => formik.setFieldValue(`other_charges_details.${row.id}.remark`, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Row className="mt-4">
                    <Col xs={12} md={5}>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <label style={{ fontSize: "0.9rem", fontWeight: "600", minWidth: "120px" }}>Revenue Deposit</label>
                        <TextField
                          size="small"
                          type="number"
                          sx={compactInputSx}
                          style={{ width: "80px" }}
                          value={formik.values.other_charges_details?.revenue_deposit?.rate || ""}
                          onChange={(e) => formik.setFieldValue("other_charges_details.revenue_deposit.rate", e.target.value)}
                        />
                        <span style={{ fontSize: "0.9rem" }}>% on</span>
                        <TextField
                          select
                          size="small"
                          sx={compactInputSx}
                          style={{ width: "120px" }}
                          value={formik.values.other_charges_details?.revenue_deposit?.on || "Assessable"}
                          onChange={(e) => formik.setFieldValue("other_charges_details.revenue_deposit.on", e.target.value)}
                        >
                          <MenuItem value="Assessable">Assessable</MenuItem>
                          <MenuItem value="Duty">Duty</MenuItem>
                          <MenuItem value="Total">Total</MenuItem>
                        </TextField>
                      </div>
                    </Col>
                    <Col xs={12} md={4}>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <label style={{ fontSize: "0.9rem", fontWeight: "600", minWidth: "120px" }}>Landing Charge</label>
                        <TextField
                          size="small"
                          type="number"
                          sx={compactInputSx}
                          style={{ width: "80px" }}
                          value={formik.values.other_charges_details?.landing_charge?.rate ?? 0}
                          onChange={(e) => formik.setFieldValue("other_charges_details.landing_charge.rate", e.target.value)}
                        />
                        <span style={{ fontSize: "0.9rem" }}>%</span>
                      </div>
                    </Col>
                  </Row>
                </div>
              )}

              {invoiceSubTab === 2 && (
                <div style={{ background: "#ffffff", border: "1px solid #dee2e6", borderRadius: "4px", padding: "16px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                    <h6 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#495057", marginBottom: 0 }}>
                      Miscellaneous Charges
                    </h6>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        type="button"
                        startIcon={<AddIcon />}
                        onClick={addMiscChargeRow}
                        sx={{
                          backgroundColor: "#1e293b",
                          color: "#ffffff",
                          "&:hover": {
                            backgroundColor: "#0f172a"
                          },
                          textTransform: "none",
                          fontWeight: "600",
                          fontSize: "0.85rem",
                          padding: "7px 16px",
                          borderRadius: "6px",
                          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                        }}
                      >
                        Add Charge
                      </Button>
                    </Box>
                  </div>

                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px", backgroundColor: "#ffffff" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          {[
                            { label: "Sr No", width: "45px", align: "center" },
                            { label: "Charge Type", width: "220px", align: "left" },
                            { label: "Currency", width: "100px", align: "left" },
                            { label: "Ex. Rate", width: "100px", align: "left" },
                            { label: "Rate %", width: "100px", align: "left" },
                            { label: "Amount", width: "120px", align: "left" },
                            { label: "Amount (Rs.)", width: "120px", align: "left" },
                            { label: "Remark", width: "auto", align: "left" },
                            { label: "Action", width: "50px", align: "center" }
                          ].map((col) => (
                            <th
                              key={col.label}
                              style={{
                                padding: "10px 8px",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                textAlign: col.align || "left",
                                whiteSpace: "nowrap",
                                color: "#475569",
                                width: col.width,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em"
                              }}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {miscChargesRows.map((row, rowIndex) => (
                          <tr
                            key={`misc-row-${rowIndex}`}
                            style={{
                              borderBottom: "1px solid #e2e8f0",
                              background: "transparent",
                              transition: "background-color 0.2s"
                            }}
                          >
                            <td style={{ padding: "8px 6px", textAlign: "center", width: "45px", fontSize: "12px", fontWeight: "bold", color: "#64748b", verticalAlign: "middle" }}>
                              {rowIndex + 1}
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                select
                                size="small"
                                fullWidth
                                value={row.charge_type || ""}
                                onChange={(e) => updateMiscChargeRow(rowIndex, "charge_type", e.target.value)}
                                sx={compactInputSx}
                              >
                                {[
                                  "Brokerage and commissions",
                                  "Cost of Packing",
                                  "Cost of Goods and Services",
                                  "Country of Origin Certificate",
                                  "Value of proceeds which accrue",
                                  "Cost of containers",
                                  "Handling Charges",
                                  "Documentation",
                                  "Royalties and licence fees",
                                  "Cost of Warranty Services",
                                  "Other Cost or Payment",
                                  "Other Charges and Payments",
                                  "Loading Charges",
                                  "UnLoading Charges"
                                ].map((option) => (
                                  <MenuItem key={option} value={option}>{option}</MenuItem>
                                ))}
                              </TextField>
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <Autocomplete
                                freeSolo
                                size="small"
                                options={currencies.map(c => c.code)}
                                sx={compactInputSx}
                                value={row.currency || "USD"}
                                onInputChange={(event, newValue) => updateMiscChargeRow(rowIndex, "currency", newValue)}
                                onChange={(event, newValue) => updateMiscChargeRow(rowIndex, "currency", newValue || "")}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    variant="outlined"
                                    size="small"
                                    placeholder="Currency"
                                    sx={compactInputSx}
                                  />
                                )}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                value={row.exchange_rate || ""}
                                onChange={(e) => updateMiscChargeRow(rowIndex, "exchange_rate", e.target.value)}
                                sx={compactInputSx}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                value={row.rate_percent || ""}
                                onChange={(e) => updateMiscChargeRow(rowIndex, "rate_percent", e.target.value)}
                                sx={compactInputSx}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                value={row.amount || ""}
                                onChange={(e) => updateMiscChargeRow(rowIndex, "amount", e.target.value)}
                                sx={compactInputSx}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                value={row.amount_inr || ""}
                                InputProps={{ readOnly: true }}
                                sx={{ ...compactInputSx, "& .MuiInputBase-root": { bgcolor: "#f8f9fa" } }}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="Remark"
                                value={row.remark || ""}
                                onChange={(e) => updateMiscChargeRow(rowIndex, "remark", e.target.value)}
                                sx={compactInputSx}
                              />
                            </td>
                            <td style={{ padding: "8px 6px", textAlign: "center", width: "50px", verticalAlign: "middle" }}>
                              <IconButton
                                size="small"
                                onClick={() => removeMiscChargeRow(rowIndex)}
                                sx={{
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "6px",
                                  color: "#94a3b8",
                                  padding: "6px",
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    color: "#ef4444",
                                    borderColor: "#fecaca",
                                    backgroundColor: "#fef2f2"
                                  }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {miscChargesRows.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#fbfbfb', border: '1px dashed #ddd', mt: 1, borderRadius: '4px' }}>
                      <Typography variant="body2" color="textSecondary">
                        No miscellaneous charges added. Click "Add Charge" to begin.
                      </Typography>
                    </Box>
                  )}
                </div>
              )}
            </div>
          )}

          {viewJobTab === 3 && (
            <div className="job-details-container">
              <JobDetailsRowHeading heading="Product Details" />

              {Math.abs(totalInvoiceValue - totalProductAmount) > 0.01 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: "#fff9db",
                  border: "1px solid #fcc419",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  color: "#856404",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  marginTop: "8px"
                }}>
                  <span style={{ fontSize: "18px" }}>⚠️</span>
                  <div>
                    <strong>Mismatch Warning:</strong> Total Invoice Value (<strong>{totalInvoiceValue.toFixed(2)}</strong>) and Total Product Amount (<strong>{totalProductAmount.toFixed(2)}</strong>) do not match!
                  </div>
                </div>
              )}

              {/* Product Circles Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap", background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#334155" }}>Product</span>
                {descriptionRows.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveProductIndex(idx)}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      border: activeProductIndex === idx ? "2px solid #0066cc" : "1px solid #cbd5e1",
                      background: activeProductIndex === idx ? "#2563eb" : "#ffffff",
                      color: activeProductIndex === idx ? "#ffffff" : "#334155",
                      fontWeight: "bold",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}
                {!isDescriptionTableReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      addDescriptionRow();
                      setActiveProductIndex(descriptionRows.length);
                    }}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      border: "1px dashed #2563eb",
                      background: "#f0f7ff",
                      color: "#2563eb",
                      fontWeight: "bold",
                      fontSize: "16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                      marginLeft: "6px"
                    }}
                    title="Add New Product"
                  >
                    +
                  </button>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '250px', marginLeft: 'auto' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Table Width:
                  </Typography>
                  <Slider
                    value={productTableWidth}
                    onChange={(e, val) => setProductTableWidth(val)}
                    min={1200}
                    max={2500}
                    step={100}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(val) => `${val}px`}
                    sx={{ color: '#1e293b' }}
                  />
                </Box>
              </div>

              {/* Tab Content */}
              <div style={{ background: "#ffffff", border: "1px solid #dee2e6", borderRadius: "4px", padding: "16px", marginBottom: "20px" }}>
                <div>
                  {/* Selected Invoice box */}
                  {(() => {
                    const activeRow = descriptionRows[activeProductIndex] || {};
                    const invIndex = Number(activeRow.sr_no_invoice) - 1;
                    const activeInvoice = (formik.values.invoice_details || [])[invIndex] || {};
                    const invoiceNo = activeInvoice.invoice_number || "None";
                    const invoiceCurr = activeInvoice.inv_currency || "USD";
                    return (
                      <div style={{ background: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: "4px", padding: "12px", marginBottom: "16px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333333" }}>
                          Selected Invoice: {invoiceNo}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666666", marginTop: "4px" }}>
                          Active Currency: <strong>{invoiceCurr}</strong> (Used for unit and total price)
                        </div>
                      </div>
                    );
                  })()}

                  {/* Product Items Table */}
                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: `${productTableWidth}px`, backgroundColor: "#ffffff" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          {[
                            { label: "Sr No", width: "45px", align: "center" },
                            { label: "Inv SR", width: "80px", align: "left" },
                            { label: "Description", minWidth: "280px", align: "left" },
                            { label: "RITC (HS Code)", width: "120px", align: "left" },
                            { label: "Quantity", width: "240px", align: "left" },
                            { label: "Unit Price", width: "100px", align: "left" },
                            { label: "Currency", width: "90px", align: "left" },
                            { label: "Amount", width: "115px", align: "left" },
                            { label: "License No", width: "180px", align: "left" },
                            { label: "License Date", width: "120px", align: "left" },
                            { label: "License SR", width: "90px", align: "left" },
                            { label: "Action", width: "50px", align: "center" }
                          ].map((col) => (
                            <th
                              key={col.label}
                              style={{
                                padding: "10px 8px",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                textAlign: col.align || "left",
                                whiteSpace: "nowrap",
                                color: "#475569",
                                width: col.width || "auto",
                                minWidth: col.minWidth || "auto",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em"
                              }}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {descriptionRows.map((row, rowIndex) => (
                          <tr
                            key={`main-desc-row-${rowIndex}`}
                            style={{
                              borderBottom: "1px solid #e2e8f0",
                              background: activeProductIndex === rowIndex ? "#f8fafc" : "transparent",
                              transition: "background-color 0.2s"
                            }}
                          >
                            {/* Sr No */}
                            <td style={{ padding: "8px 6px", textAlign: "center", width: "45px", fontSize: "12px", fontWeight: "bold", color: "#64748b", verticalAlign: "middle" }}>
                              {rowIndex + 1}
                            </td>
                            {/* Inv SR */}
                            <td style={{ padding: "8px 6px", width: "80px", verticalAlign: "middle" }}>
                              <TextField
                                select
                                size="small"
                                fullWidth
                                value={row.sr_no_invoice || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const invIdx = Number(val) - 1;
                                  const activeInvoice = (formik.values.invoice_details || [])[invIdx] || {};
                                  const exrate = parseFloat(activeInvoice.exchange_rate) || parseFloat(formik.values.exrate) || 84;
                                  const qty = parseFloat(row.quantity) || 0;
                                  const price = parseFloat(row.unit_price) || 0;
                                  const amount = qty * price;

                                  updateDescriptionRowMultiple(rowIndex, {
                                    sr_no_invoice: val,
                                    ...(!row.taxable_value_manual && {
                                      taxable_value_inr: (amount * exrate).toFixed(2),
                                      ...(!row.igst_amount_manual && {
                                        igst_amount_inr: ((amount * exrate * (parseFloat(row.igst_rate) || 0)) / 100).toFixed(2)
                                      })
                                    })
                                  });
                                }}
                                disabled={isDescriptionTableReadOnly}
                                sx={compactInputSx}
                              >
                                <MenuItem value="">Select</MenuItem>
                                {invoiceRows.map((_, idx) => (
                                  <MenuItem key={idx + 1} value={String(idx + 1)}>
                                    {idx + 1}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </td>
                            {/* Description */}
                            <td style={{ padding: "8px 6px", minWidth: "280px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                multiline
                                minRows={2}
                                value={row.description || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "description", e.target.value)}
                                disabled={isDescriptionTableReadOnly}
                                sx={{
                                  ...compactInputSx,
                                  "& .MuiOutlinedInput-root": {
                                    ...compactInputSx["& .MuiOutlinedInput-root"],
                                    height: "auto",
                                    minHeight: "58px"
                                  },
                                  "& .MuiOutlinedInput-input": {
                                    ...compactInputSx["& .MuiOutlinedInput-input"],
                                    padding: "4px 8px",
                                    lineHeight: "1.3"
                                  }
                                }}
                              />
                            </td>
                            {/* RITC (HS Code) */}
                            <td style={{ padding: "8px 6px", width: "120px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.cth_no || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "cth_no", e.target.value)}
                                disabled={isDescriptionTableReadOnly}
                                sx={compactInputSx}
                              />
                            </td>
                            {/* Quantity */}
                            <td style={{ padding: "8px 6px", width: "240px", verticalAlign: "middle" }}>
                              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <TextField
                                  size="small"
                                  value={row.quantity || ""}
                                  onChange={(e) => {
                                    const qty = e.target.value;
                                    const qtyNum = parseFloat(qty) || 0;
                                    const existingAmt = parseFloat(row.amount) || 0;
                                    const price = parseFloat(row.unit_price) || 0;

                                    let calculatedPrice = price;
                                    let calculatedAmount = existingAmt;

                                    if (qtyNum > 0 && existingAmt > 0) {
                                      calculatedPrice = existingAmt / qtyNum;
                                    } else if (qtyNum > 0 && price > 0) {
                                      calculatedAmount = qtyNum * price;
                                    }

                                    const invIndex = Number(row.sr_no_invoice) - 1;
                                    const activeInvoice = (formik.values.invoice_details || [])[invIndex] || {};
                                    const exrate = parseFloat(activeInvoice.exchange_rate) || parseFloat(formik.values.exrate) || 84;

                                    updateDescriptionRowMultiple(rowIndex, {
                                      quantity: qty,
                                      unit_price: calculatedPrice > 0 ? calculatedPrice.toFixed(4) : "",
                                      amount: calculatedAmount > 0 ? calculatedAmount.toFixed(2) : "",
                                      ...(!row.taxable_value_manual && {
                                        taxable_value_inr: (calculatedAmount * exrate).toFixed(2),
                                        ...(!row.igst_amount_manual && {
                                          igst_amount_inr: ((calculatedAmount * exrate * (parseFloat(row.igst_rate) || 0)) / 100).toFixed(2)
                                        })
                                      })
                                    });
                                  }}
                                  disabled={isDescriptionTableReadOnly}
                                  sx={{ flex: 1.5, ...compactInputSx }}
                                />
                                <div style={{ flex: 1 }}>
                                  <Autocomplete
                                    size="small"
                                    freeSolo
                                    options={unitOptions.map(u => u.code)}
                                    value={row.unit || ""}
                                    onChange={(e, newValue) => updateDescriptionRow(rowIndex, "unit", newValue || "")}
                                    onInputChange={(e, newInputValue, reason) => {
                                      if (reason === "input") updateDescriptionRow(rowIndex, "unit", newInputValue);
                                    }}
                                    disabled={isDescriptionTableReadOnly}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        size="small"
                                        placeholder="Unit"
                                        sx={compactInputSx}
                                      />
                                    )}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Unit Price */}
                            <td style={{ padding: "8px 6px", width: "100px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.unit_price || ""}
                                onChange={(e) => {
                                  const price = e.target.value;
                                  const priceNum = parseFloat(price) || 0;
                                  const qty = parseFloat(row.quantity) || 0;
                                  const amount = qty * priceNum;
                                  const invIndex = Number(row.sr_no_invoice) - 1;
                                  const activeInvoice = (formik.values.invoice_details || [])[invIndex] || {};
                                  const exrate = parseFloat(activeInvoice.exchange_rate) || parseFloat(formik.values.exrate) || 84;

                                  updateDescriptionRowMultiple(rowIndex, {
                                    unit_price: price,
                                    amount: amount.toFixed(2),
                                    ...(!row.taxable_value_manual && {
                                      taxable_value_inr: (amount * exrate).toFixed(2),
                                      ...(!row.igst_amount_manual && {
                                        igst_amount_inr: ((amount * exrate * (parseFloat(row.igst_rate) || 0)) / 100).toFixed(2)
                                      })
                                    })
                                  });
                                }}
                                disabled={isDescriptionTableReadOnly}
                                sx={compactInputSx}
                              />
                            </td>
                            {/* Currency */}
                            <td style={{ padding: "8px 6px", width: "90px", verticalAlign: "middle" }}>
                              <TextField
                                select
                                size="small"
                                fullWidth
                                value={row.amount_currency || "USD"}
                                onChange={(e) => updateDescriptionRow(rowIndex, "amount_currency", e.target.value)}
                                disabled={isDescriptionTableReadOnly}
                                sx={compactInputSx}
                              >
                                <MenuItem value="USD">USD</MenuItem>
                                <MenuItem value="INR">INR</MenuItem>
                                <MenuItem value="EUR">EUR</MenuItem>
                                <MenuItem value="GBP">GBP</MenuItem>
                              </TextField>
                            </td>

                            {/* Amount */}
                            <td style={{ padding: "8px 6px", width: "115px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.amount || ""}
                                onChange={(e) => {
                                  const amt = e.target.value;
                                  const amtNum = parseFloat(amt) || 0;
                                  const qty = parseFloat(row.quantity) || 0;

                                  let calculatedPrice = parseFloat(row.unit_price) || 0;
                                  if (qty > 0 && amtNum > 0) {
                                    calculatedPrice = amtNum / qty;
                                  }

                                  const invIndex = Number(row.sr_no_invoice) - 1;
                                  const activeInvoice = (formik.values.invoice_details || [])[invIndex] || {};
                                  const exrate = parseFloat(activeInvoice.exchange_rate) || parseFloat(formik.values.exrate) || 84;

                                  updateDescriptionRowMultiple(rowIndex, {
                                    amount: amt,
                                    unit_price: calculatedPrice > 0 ? calculatedPrice.toFixed(4) : "",
                                    ...(!row.taxable_value_manual && {
                                      taxable_value_inr: (amtNum * exrate).toFixed(2),
                                      ...(!row.igst_amount_manual && {
                                        igst_amount_inr: ((amtNum * exrate * (parseFloat(row.igst_rate) || 0)) / 100).toFixed(2)
                                      })
                                    })
                                  });
                                }}
                                disabled={isDescriptionTableReadOnly}
                                sx={compactInputSx}
                              />
                            </td>
                            {/* License No */}
                            <td style={{ padding: "8px 6px", width: "180px", verticalAlign: "middle" }}>
                              <Autocomplete
                                size="small"
                                fullWidth
                                freeSolo
                                options={authorizationsList.map((auth) => auth.authorization_no)}
                                value={row.sr_no_lic || row.license_no || ""}
                                onChange={async (e, newValue) => {
                                  if (newValue) {
                                    const selectedAuth = authorizationsList.find(a => a.authorization_no === newValue);
                                    let licenseDate = "";
                                    let importItems = [];
                                    if (selectedAuth) {
                                      licenseDate = selectedAuth.authorization_date || "";
                                      importItems = selectedAuth.import_details_array || [];
                                    } else {
                                      try {
                                        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-authorization-by-no?authorization_no=${newValue}`);
                                        if (res.data) {
                                          licenseDate = res.data.licence_date || res.data.auth_date || "";
                                          importItems = res.data.import_details_array || [];
                                        }
                                      } catch (err) {
                                        console.error("Error fetching license:", err);
                                      }
                                    }

                                    const rowNormalizedHs = row.cth_no ? String(row.cth_no).replace(/[^a-zA-Z0-9]/g, "") : "";
                                    let autoSr = "";
                                    if (rowNormalizedHs && importItems.length > 0) {
                                      const matchingItems = importItems.filter(item => {
                                        const itemNormalizedHs = item.hs_code ? String(item.hs_code).replace(/[^a-zA-Z0-9]/g, "") : "";
                                        return itemNormalizedHs === rowNormalizedHs;
                                      });
                                      if (matchingItems.length === 1) {
                                        autoSr = Number(matchingItems[0].sr_no) || 1;
                                      }
                                    }

                                    updateDescriptionRowMultiple(rowIndex, {
                                      sr_no_lic: newValue,
                                      license_no: newValue,
                                      license_date: licenseDate,
                                      license_sr: autoSr
                                    });
                                  } else {
                                    updateDescriptionRowMultiple(rowIndex, {
                                      sr_no_lic: "",
                                      license_no: "",
                                      license_date: "",
                                      license_sr: ""
                                    });
                                  }
                                }}
                                onInputChange={(e, newInputValue, reason) => {
                                  if (reason === "input") {
                                    updateDescriptionRowMultiple(rowIndex, {
                                      sr_no_lic: newInputValue,
                                      license_no: newInputValue
                                    });
                                  }
                                }}
                                disabled={isDescriptionTableReadOnly}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    size="small"
                                    sx={compactInputSx}
                                  />
                                )}
                              />
                            </td>
                            {/* License Date */}
                            <td style={{ padding: "8px 6px", width: "120px", verticalAlign: "middle" }}>
                              <TextField
                                size="small"
                                fullWidth
                                value={row.license_date || ""}
                                onChange={(e) => updateDescriptionRow(rowIndex, "license_date", e.target.value)}
                                disabled={isDescriptionTableReadOnly}
                                sx={compactInputSx}
                              />
                            </td>
                            {/* License SR */}
                            <td style={{ padding: "8px 6px", width: "90px", verticalAlign: "middle" }}>
                              {(() => {
                                const licNum = row.sr_no_lic || row.license_no;
                                const selectedAuth = authorizationsList.find(a => a.authorization_no === licNum);
                                const importItems = selectedAuth?.import_details_array || [];

                                const rowNormalizedHs = row.cth_no ? String(row.cth_no).replace(/[^a-zA-Z0-9]/g, "") : "";
                                const filteredItems = rowNormalizedHs
                                  ? importItems.filter(item => {
                                    const itemNormalizedHs = item.hs_code ? String(item.hs_code).replace(/[^a-zA-Z0-9]/g, "") : "";
                                    return itemNormalizedHs === rowNormalizedHs;
                                  })
                                  : importItems;

                                if (filteredItems.length > 0) {
                                  return (
                                    <TextField
                                      select
                                      size="small"
                                      fullWidth
                                      value={String(row.license_sr || "")}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateDescriptionRow(rowIndex, "license_sr", val ? Number(val) : "");
                                      }}
                                      disabled={isDescriptionTableReadOnly}
                                      sx={compactInputSx}
                                    >
                                      <MenuItem value="">Select</MenuItem>
                                      {filteredItems.map((item) => (
                                        <MenuItem key={item.sr_no || item.value_usd} value={String(item.sr_no)}>
                                          {item.sr_no}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  );
                                } else {
                                  return (
                                    <TextField
                                      size="small"
                                      fullWidth
                                      value={row.license_sr || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateDescriptionRow(rowIndex, "license_sr", val ? Number(val) : "");
                                      }}
                                      disabled={isDescriptionTableReadOnly}
                                      sx={compactInputSx}
                                    />
                                  );
                                }
                              })()}
                            </td>
                            {/* Action */}
                            <td style={{ padding: "8px 6px", textAlign: "center", width: "50px", verticalAlign: "middle" }}>
                              {!isDescriptionTableReadOnly && (
                                <IconButton
                                  size="small"
                                  disabled={descriptionRows.length <= 1}
                                  onClick={() => removeDescriptionRow(rowIndex)}
                                  sx={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "6px",
                                    color: "#94a3b8",
                                    padding: "6px",
                                    transition: "all 0.2s",
                                    "&:hover": {
                                      color: "#ef4444",
                                      borderColor: "#fecaca",
                                      backgroundColor: "#fef2f2"
                                    },
                                    "&.Mui-disabled": {
                                      color: "#cbd5e1",
                                      borderColor: "#f1f5f9"
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!isDescriptionTableReadOnly && (
                    <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-start" }}>
                      <Button
                        variant="contained"
                        type="button"
                        onClick={() => {
                          addDescriptionRow();
                          setActiveProductIndex(descriptionRows.length);
                        }}
                        sx={{
                          backgroundColor: "#1e293b",
                          color: "#ffffff",
                          "&:hover": {
                            backgroundColor: "#0f172a"
                          },
                          textTransform: "none",
                          fontWeight: "600",
                          fontSize: "0.85rem",
                          padding: "7px 16px",
                          borderRadius: "6px",
                          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                        }}
                      >
                        + Add New Product
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* document section */}
          {viewJobTab === 5 && (
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
          {viewJobTab === 6 && (
            <div className="job-details-container">

              {/* NEW CHARGES COMPONENT */}

              {/* NEW CHARGES COMPONENT */}
              <div style={{ marginTop: '40px' }}>
                <JobDetailsRowHeading heading="Charges Management (New)" />
                <ChargesGrid
                  parentId={data?._id}
                  parentModule="Job"
                  shippingLineAirline={data?.shipping_line_airline}
                  importerName={data?.importer}
                  jobNumber={data?.job_no}
                  jobDisplayNumber={data?.job_number}
                  jobYear={data?.year}
                  invoiceNumber={data?.invoice_number}
                  invoiceDate={data?.invoice_date}
                  poNo={data?.po_no}
                  invoiceValue={data?.total_inv_value}
                  cthNo={data?.cth_no}
                  awbBlNo={data?.awb_bl_no}
                  awbBlDate={data?.awb_bl_date}
                  jobStatus={data?.status}
                  billNo={data?.bill_no}
                  readOnly={isJobLocked}
                />
              </div>

            </div>
          )}

          {viewJobTab === 4 && (
            <div className="job-details-container">
              <JobDetailsRowHeading heading={`${getContainerOrPackageLabel(data?.mode)} Details`} />
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
                          {container.container_number || `${getContainerOrPackageLabel(data?.mode)} ${i + 1}`}
                        </div>
                        {container.size && !isAirMode(data?.mode) && (
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
                      Add {getContainerOrPackageLabel(data?.mode)}
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
                              #{index + 1} {getContainerOrPackageLabel(data?.mode)}:
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
                            {!isAirMode(data?.mode) && (
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
                            )}
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>{isAirMode(data?.mode) ? "Seal Number" : "Seal Number"}</label>
                              {(() => {
                                const seals = Array.isArray(container.seal_number) ? container.seal_number : [];
                                const isExpanded = expandedSealIndices[index];
                                const visibleSeals = isExpanded
                                  ? seals.map((seal, i) => ({ seal, i }))
                                  : (seals.length > 0 ? [{ seal: seals[seals.length - 1], i: seals.length - 1 }] : []);

                                const renderAddButton = () => (
                                  <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                      const currentSeals = Array.isArray(container.seal_number) ? container.seal_number : [];
                                      if (!isExpanded && currentSeals.length > 0) {
                                        setExpandedSealIndices(prev => ({ ...prev, [index]: true }));
                                      }
                                      formik.setFieldValue(`container_nos[${index}].seal_number`, [...currentSeals, ""]);
                                    }}
                                    sx={{ minWidth: 'auto', marginRight: '5px', whiteSpace: 'nowrap' }}
                                  >
                                    Add
                                  </Button>
                                );

                                return (
                                  <>
                                    {visibleSeals.length === 0 && (
                                      <div style={{ display: 'flex', alignItems: 'center', minHeight: '40px', marginBottom: '5px' }}>
                                        {renderAddButton()}
                                      </div>
                                    )}

                                    {visibleSeals.map(({ seal, i: sIndex }, vIndex) => (
                                      <div key={sIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '5px' }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          variant="outlined"
                                          name={`container_nos[${index}].seal_number[${sIndex}]`}
                                          value={seal}
                                          onChange={formik.handleChange}
                                          sx={compactInputSx}
                                        />

                                        {vIndex === visibleSeals.length - 1 && renderAddButton()}

                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => {
                                            const newSeals = [...seals];
                                            newSeals.splice(sIndex, 1);
                                            formik.setFieldValue(`container_nos[${index}].seal_number`, newSeals);
                                          }}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </div>
                                    ))}

                                    {seals.length > 1 && (
                                      <div style={{ marginBottom: '5px', marginLeft: '2px' }}>
                                        <span
                                          style={{ color: '#1976d2', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                                          onClick={() => toggleSealExpansion(index)}
                                        >
                                          {isExpanded ? "Show Less" : `Show ${seals.length - 1} More...`}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </Col>
                            <Col xs={12} md={3} lg={2} className="mb-3">
                              <label style={labelStyle}>Wire Seal</label>
                              {(() => {
                                const wireSeals = Array.isArray(container.wire_seal) ? container.wire_seal : [];
                                const isExpanded = expandedWireSealIndices[index];
                                const visibleWireSeals = isExpanded
                                  ? wireSeals.map((seal, i) => ({ seal, i }))
                                  : (wireSeals.length > 0 ? [{ seal: wireSeals[wireSeals.length - 1], i: wireSeals.length - 1 }] : []);

                                const renderAddWireSealButton = () => (
                                  <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                      const currentWireSeals = Array.isArray(container.wire_seal) ? container.wire_seal : [];
                                      if (!isExpanded && currentWireSeals.length > 0) {
                                        setExpandedWireSealIndices(prev => ({ ...prev, [index]: true }));
                                      }
                                      formik.setFieldValue(`container_nos[${index}].wire_seal`, [...currentWireSeals, ""]);
                                    }}
                                    sx={{ minWidth: 'auto', marginRight: '5px', whiteSpace: 'nowrap' }}
                                  >
                                    Add
                                  </Button>
                                );

                                return (
                                  <>
                                    {visibleWireSeals.length === 0 && (
                                      <div style={{ display: 'flex', alignItems: 'center', minHeight: '40px', marginBottom: '5px' }}>
                                        {renderAddWireSealButton()}
                                      </div>
                                    )}

                                    {visibleWireSeals.map(({ seal, i: sIndex }, vIndex) => (
                                      <div key={sIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '5px' }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          variant="outlined"
                                          name={`container_nos[${index}].wire_seal[${sIndex}]`}
                                          value={seal}
                                          onChange={formik.handleChange}
                                          sx={compactInputSx}
                                        />

                                        {vIndex === visibleWireSeals.length - 1 && renderAddWireSealButton()}

                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => {
                                            const newWireSeals = [...wireSeals];
                                            newWireSeals.splice(sIndex, 1);
                                            formik.setFieldValue(`container_nos[${index}].wire_seal`, newWireSeals);
                                          }}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </div>
                                    ))}

                                    {wireSeals.length > 1 && (
                                      <div style={{ marginBottom: '5px', marginLeft: '2px' }}>
                                        <span
                                          style={{ color: '#1976d2', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                                          onClick={() => toggleWireSealExpansion(index)}
                                        >
                                          {isExpanded ? "Show Less" : `Show ${wireSeals.length - 1} More...`}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
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
                                  <Autocomplete
                                    freeSolo
                                    fullWidth
                                    sx={{ flex: 1, minWidth: "200px" }}
                                    size="small"
                                    options={transportersList}
                                    value={container.transporter || ""}
                                    onChange={(event, newValue) => {
                                      formik.setFieldValue(`container_nos[${index}].transporter`, newValue || "");
                                    }}
                                    onInputChange={(event, newInputValue) => {
                                      formik.setFieldValue(`container_nos[${index}].transporter`, newInputValue || "");
                                    }}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        fullWidth
                                        variant="outlined"
                                        label="Transporter Name"
                                        InputLabelProps={{ shrink: true }}
                                        name={`container_nos[${index}].transporter`}
                                        sx={compactInputSx}
                                      />
                                    )}
                                  />
                                )}
                              </div>
                            </Col>
                          </Row>

                          {/* Row 2: Dates */}
                          <Row className="mb-3">
                            {activeBranchConfig.railout_enabled && !isAirMode(data?.mode) && (
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
                            )}
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
                                    !isAirMode(data?.mode) &&
                                    (ExBondflag ||
                                      (LCLFlag
                                        ? !container.by_road_movement_date
                                        : activeBranchConfig.railout_enabled ? !container.container_rail_out_date : false))
                                  }
                                  onChange={formik.handleChange}
                                  InputLabelProps={{ shrink: true }}
                                  sx={compactInputSx}
                                />
                              )}
                            </Col>
                            {LCLFlag && !isAirMode(data?.mode) && (
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
                            {(!InBondflag || formik.values.type_of_Do === "Factory") && (
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
                            {!isAirMode(data?.mode) && (
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
                            )}
                          </Row>

                          {/* Row 3: DO & Detention (hidden for AIR) */}
                          {!isAirMode(data?.mode) && (
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
                                  onChange={(e) => handleDateChange(e.target.value, index)}
                                  InputLabelProps={{ shrink: true }}
                                  disabled={user.role !== "Admin"}
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
                                  branch_code={params.branch_code}
                                  trade_type={params.trade_type}
                                  mode={params.mode}
                                  containerIndex={index}
                                />
                                <IgstCalculationPDF
                                  year={params.selected_year}
                                  jobNo={params.job_no}
                                  branch_code={params.branch_code}
                                  trade_type={params.trade_type}
                                  mode={params.mode}
                                  containerIndex={index}
                                />
                              </Col>
                            </Row>
                          )}

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
              <Box
                sx={{
                  position: "fixed",
                  bottom: 40,
                  right: 40,
                  zIndex: 1000,
                  display: "flex",
                  gap: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  padding: "8px 16px",
                  borderRadius: "30px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  backdropFilter: "blur(4px)"
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isCthDocsLoading}
                  sx={{
                    backgroundColor: "#000000",
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: "#333333",
                    },
                    padding: "8px 24px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    textTransform: "none"
                  }}
                >
                  {isCthDocsLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    "Submit"
                  )}
                </Button>
              </Box>
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
      <Snackbar
        open={imexcubeSnackbar.open}
        message={imexcubeSnackbar.message}
        sx={{
          left: "auto !important",
          right: "24px !important",
          "& .MuiSnackbarContent-root": {
            backgroundColor: imexcubeSnackbar.severity === "error" ? "#d32f2f" : "#2e7d32",
          },
        }}
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
            : (() => {
              if (!currentDocument) return "";
              const hasUrls = Array.isArray(currentDocument.url)
                ? currentDocument.url.length > 0
                : !!currentDocument.url;
              const isSent = currentDocument.is_sent_to_esanchit;
              const isVerified = !!currentDocument.document_check_date;

              const warnings = [];
              if (hasUrls) warnings.push("contains uploaded files");
              if (isSent) warnings.push("has been marked as sent to e-Sanchit");
              if (isVerified) warnings.push("has been verified/checked");

              if (warnings.length > 0) {
                return (
                  <Box sx={{ mt: 1 }}>
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: "6px" }}>
                      <AlertTitle sx={{ fontWeight: "700" }}>Critical Warning</AlertTitle>
                      This document <strong>{warnings.join(", and ")}</strong>.
                      Deleting it will permanently remove it along with all associated files and data.
                    </Alert>
                    <Typography variant="body1">
                      Are you sure you want to delete the document <strong>"{currentDocument.document_name}"</strong>? This action cannot be undone.
                    </Typography>
                  </Box>
                );
              }
              return `Are you sure you want to delete the document "${currentDocument.document_name}"?`;
            })()
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
        onAutosave={handleDutyAutosave}
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

      {/* Manual Submission Warning Dialog */}
      <Dialog
        open={openManualSubmissionDialog}
        onClose={() => setOpenManualSubmissionDialog(false)}
        aria-labelledby="manual-submission-dialog-title"
      >
        <DialogTitle id="manual-submission-dialog-title" style={{ color: '#d32f2f', fontWeight: 'bold' }}>
          Warning: Manual Submission Override
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to mark this job as **"Sent to Submission"** manually?
            This will bypass the standard system validations for this job. Your name and the current timestamp will be recorded.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManualSubmissionDialog(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={confirmManualSubmission}
            color="error"
            variant="contained"
          >
            Confirm & Send
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMEXCUBE Preview & Upload Dialog */}
      <Dialog
        open={imexcubeDialogOpen}
        onClose={() => setImexcubeDialogOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="imexcube-dialog-title"
      >
        <DialogTitle id="imexcube-dialog-title" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <CloudUploadIcon color="primary" />
          Upload Job to IMEXCUBE (TEST)
        </DialogTitle>
        <DialogContent dividers>
          {imexcubePreviewLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
              <Typography variant="body1" color="text.secondary">Loading job data...</Typography>
            </Box>
          ) : imexcubePreviewData?.error ? (
            <Box sx={{ p: 2, bgcolor: "#fff3f3", borderRadius: 1, border: "1px solid #ffcdd2" }}>
              <Typography variant="body1" color="error" fontWeight={600}>
                Error: {imexcubePreviewData.error}
              </Typography>
            </Box>
          ) : imexcubePreviewData ? (
            <Box>
              <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: "#666", mb: 1 }}>
                    Review the job data before uploading:
                  </Typography>
                  {!imexcubeShowEditor && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: "flex", gap: 1.5, fontSize: "0.75rem", mb: 1.5 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 2, background: "#e8f5e9", border: "1px solid #a5d6a7" }}></span> Valid
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 2, background: "#ffebee", border: "1px solid #ef9a9a" }}></span> Missing (Mandatory)
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: "#d32f2f", fontWeight: 700 }}>*</span> Mandatory
                        </span>
                      </Box>

                      {/* Validation Summary */}
                      {(() => {
                        const allErrors = [];
                        Object.values(imexcubePreviewData.annotated || {}).forEach(section => {
                          if (Array.isArray(section)) {
                            section.forEach((item, idx) => {
                              Object.entries(item).forEach(([field, data]) => {
                                if (data?.mandatory && !data?.valid) {
                                  allErrors.push(`${field}${section.length > 1 ? ` (Row ${idx + 1})` : ""}`);
                                }
                              });
                            });
                          } else {
                            Object.entries(section).forEach(([field, data]) => {
                              if (data?.mandatory && !data?.valid) {
                                allErrors.push(field);
                              }
                            });
                          }
                        });

                        if (allErrors.length > 0) {
                          return (
                            <Alert severity="error" sx={{ mb: 2, py: 0.5 }}>
                              <AlertTitle sx={{ fontSize: "0.85rem", fontWeight: 700, mb: 0 }}>Missing Mandatory Fields:</AlertTitle>
                              <Box component="ul" sx={{ m: 0, pl: 2, fontSize: "0.8rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                                {allErrors.map((err, i) => <li key={i}>{err}</li>)}
                              </Box>
                            </Alert>
                          );
                        }
                        return <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>All mandatory fields are present.</Alert>;
                      })()}
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<Edit fontSize="small" />}
                    variant={imexcubeShowEditor ? "contained" : "outlined"}
                    color={imexcubeShowEditor ? "primary" : "inherit"}
                    onClick={() => setImexcubeShowEditor(!imexcubeShowEditor)}
                    sx={{ textTransform: "none" }}
                  >
                    Edit Raw JSON
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    variant="outlined"
                    onClick={() => {
                      navigator.clipboard.writeText(imexcubeShowEditor ? imexcubeRawPayloadString : JSON.stringify(imexcubePreviewData, null, 2));
                      setImexcubeSnackbar({ open: true, message: "JSON copied to clipboard", severity: "success" });
                      setTimeout(() => setImexcubeSnackbar(prev => ({ ...prev, open: false })), 3000);
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Copy JSON Upload
                  </Button>
                </Box>
              </Box>
              <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
                {imexcubeShowEditor ? (
                  <TextField
                    multiline
                    fullWidth
                    minRows={15}
                    maxRows={30}
                    value={imexcubeRawPayloadString}
                    onChange={(e) => setImexcubeRawPayloadString(e.target.value)}
                    variant="outlined"
                    inputProps={{
                      style: {
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                        lineHeight: 1.4,
                      }
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "#fafafa",
                      }
                    }}
                  />
                ) : (
                  Object.entries(imexcubePreviewData.annotated || {}).map(([sectionName, sectionData]) => (
                    <Box key={sectionName} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{
                        fontWeight: 700, bgcolor: "#1565c0", color: "#fff",
                        px: 1.5, py: 0.5, borderRadius: "4px 4px 0 0", fontSize: "0.85rem"
                      }}>
                        {sectionName}
                      </Typography>
                      {Array.isArray(sectionData) ? (
                        sectionData.map((item, idx) => (
                          <Box key={idx} sx={{ border: "1px solid #e0e0e0", borderTop: idx > 0 ? "2px solid #1565c0" : "none", mb: idx < sectionData.length - 1 ? 0 : 0 }}>
                            {idx > 0 && (
                              <Typography sx={{ bgcolor: "#e3f2fd", px: 1.5, py: 0.3, fontSize: "0.75rem", fontWeight: 600, color: "#1565c0" }}>
                                #{idx + 1}
                              </Typography>
                            )}
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <tbody>
                                {Object.entries(item).map(([fieldName, fieldData]) => {
                                  const isMandatory = fieldData?.mandatory;
                                  const isValid = fieldData?.valid;
                                  const value = fieldData?.value;
                                  const displayVal = value === null || value === undefined || value === "" ? "—" : String(value);
                                  const bgColor = isMandatory
                                    ? (isValid ? "#e8f5e9" : "#ffebee")
                                    : (displayVal !== "—" ? "#f1f8e9" : "#fafafa");
                                  return (
                                    <tr key={fieldName}>
                                      <td style={{
                                        padding: "4px 10px", borderBottom: "1px solid #f0f0f0",
                                        width: "45%", fontSize: "0.8rem", fontWeight: 600, color: "#333",
                                        whiteSpace: "nowrap"
                                      }}>
                                        {fieldName}
                                        {isMandatory && <span style={{ color: "#d32f2f", marginLeft: 2, fontWeight: 800 }}>*</span>}
                                      </td>
                                      <td style={{
                                        padding: "4px 10px", borderBottom: "1px solid #f0f0f0",
                                        fontSize: "0.8rem", fontFamily: "monospace",
                                        backgroundColor: bgColor,
                                        color: displayVal === "—" ? "#bbb" : "#222",
                                        fontWeight: displayVal === "—" ? 400 : 500,
                                        wordBreak: "break-word",
                                      }}>
                                        {displayVal}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </Box>
                        ))
                      ) : (
                        <Box sx={{ border: "1px solid #e0e0e0", borderTop: "none" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              {Object.entries(sectionData).map(([fieldName, fieldData]) => {
                                const isMandatory = fieldData?.mandatory;
                                const isValid = fieldData?.valid;
                                const value = fieldData?.value;
                                const displayVal = value === null || value === undefined || value === "" ? "—" : String(value);
                                const bgColor = isMandatory
                                  ? (isValid ? "#e8f5e9" : "#ffebee")
                                  : (displayVal !== "—" ? "#f1f8e9" : "#fafafa");
                                return (
                                  <tr key={fieldName}>
                                    <td style={{
                                      padding: "4px 10px", borderBottom: "1px solid #f0f0f0",
                                      width: "45%", fontSize: "0.8rem", fontWeight: 600, color: "#333",
                                      whiteSpace: "nowrap"
                                    }}>
                                      {fieldName}
                                      {isMandatory && <span style={{ color: "#d32f2f", marginLeft: 2, fontWeight: 800 }}>*</span>}
                                    </td>
                                    <td style={{
                                      padding: "4px 10px", borderBottom: "1px solid #f0f0f0",
                                      fontSize: "0.8rem", fontFamily: "monospace",
                                      backgroundColor: bgColor,
                                      color: displayVal === "—" ? "#bbb" : "#222",
                                      fontWeight: displayVal === "—" ? 400 : 500,
                                      wordBreak: "break-word",
                                    }}>
                                      {displayVal}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </Box>
                      )}
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setImexcubeDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmImexcubeUpload}
            variant="contained"
            disabled={
              imexcubePreviewLoading ||
              imexcubePreviewData?.error ||
              (() => {
                if (!imexcubePreviewData?.annotated) return false;
                let found = false;
                Object.values(imexcubePreviewData.annotated).forEach(section => {
                  if (Array.isArray(section)) {
                    section.forEach(item => {
                      Object.values(item).forEach(data => {
                        if (data?.mandatory && !data?.valid) found = true;
                      });
                    });
                  } else {
                    Object.values(section).forEach(data => {
                      if (data?.mandatory && !data?.valid) found = true;
                    });
                  }
                });
                return found;
              })()
            }
            startIcon={<CloudUploadIcon />}
            sx={{
              backgroundColor: "#1565c0",
              "&:hover": { backgroundColor: "#0d47a1" },
            }}
          >
            Confirm & Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMEXCUBE Detailed Error Dialog */}
      <Dialog
        open={imexcubeErrorDialog.open}
        onClose={() => setImexcubeErrorDialog({ ...imexcubeErrorDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "#d32f2f" }}>
          <ErrorIcon />
          {imexcubeErrorDialog.title}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
            {imexcubeErrorDialog.message}
          </Typography>
          {imexcubeErrorDialog.details && (
            <Box sx={{
              p: 1.5,
              bgcolor: "#f5f5f5",
              borderRadius: 1,
              border: "1px solid #e0e0e0",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              maxHeight: "300px",
              overflow: "auto"
            }}>
              {Array.isArray(imexcubeErrorDialog.details) ? (
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                  {imexcubeErrorDialog.details.map((detail, idx) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>{detail}</li>
                  ))}
                </ul>
              ) : typeof imexcubeErrorDialog.details === "object" ? (
                <pre style={{ margin: 0 }}>{JSON.stringify(imexcubeErrorDialog.details, null, 2)}</pre>
              ) : (
                <Typography variant="body2">{imexcubeErrorDialog.details}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImexcubeErrorDialog({ ...imexcubeErrorDialog, open: false })} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMEXCUBE Job Details Dialog */}
      <Dialog
        open={imexcubeDetailsDialogOpen}
        onClose={() => setImexcubeDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="imexcube-details-dialog-title"
      >
        <DialogTitle id="imexcube-details-dialog-title" sx={{ fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CloudUploadIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>IMEXCUBE Job Details</Typography>
          </Box>
          {imexcubeDetailsData && !imexcubeDetailsData.error && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(imexcubeDetailsData, null, 2));
                setImexcubeSnackbar({ open: true, message: "JSON copied to clipboard", severity: "success" });
                setTimeout(() => setImexcubeSnackbar(prev => ({ ...prev, open: false })), 3000);
              }}
              sx={{ textTransform: "none", fontSize: "0.75rem" }}
            >
              Copy JSON
            </Button>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {imexcubeDetailsLoading ? (
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 250, gap: 2 }}>
              <CircularProgress />
              <Typography variant="body1" color="text.secondary">Fetching details from IMEXCUBE...</Typography>
            </Box>
          ) : imexcubeDetailsData?.error ? (
            <Box sx={{ p: 2, bgcolor: "#fff3f3", borderRadius: 1, border: "1px solid #ffcdd2" }}>
              <Typography variant="body1" color="error" fontWeight={600} sx={{ mb: 1 }}>
                Failed to Fetch Job Details
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                {typeof imexcubeDetailsData.error === "object" ? JSON.stringify(imexcubeDetailsData.error, null, 2) : String(imexcubeDetailsData.error)}
              </Typography>
            </Box>
          ) : imexcubeDetailsData ? (
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#666", mb: 2 }}>
                Raw response from IMEXCUBE for Job Number: <strong>{data?.job_number}</strong>
              </Typography>
              <Box sx={{
                p: 2,
                bgcolor: "#1e1e1e",
                color: "#d4d4d4",
                borderRadius: 1,
                fontFamily: "Fira Code, Consolas, Monaco, monospace",
                fontSize: "0.85rem",
                maxHeight: "500px",
                overflow: "auto",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)"
              }}>
                <pre style={{ margin: 0, color: "#9cdcfe" }}>
                  {JSON.stringify(imexcubeDetailsData, null, 2)}
                </pre>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 150 }}>
              <Typography variant="body1" color="text.secondary">No data available.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImexcubeDetailsDialogOpen(false)} variant="contained" sx={{ backgroundColor: "#1565c0", "&:hover": { backgroundColor: "#0d47a1" } }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default React.memo(JobDetails);

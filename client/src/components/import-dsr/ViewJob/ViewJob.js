import React, { useState, useRef, useContext, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSearchQuery } from "../../../contexts/SearchQueryContext";
import JobStickerPDF from "../JobStickerPDF";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  IconButton,
  TextField,
  Tooltip,
  InputLabel,
  Select,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box,
  Paper,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import "../../../styles/job-details.scss";
import useFetchJobDetails from "../../../customHooks/useFetchJobDetails";
import Checkbox from "@mui/material/Checkbox";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Snackbar from "@mui/material/Snackbar";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import AWS from "aws-sdk";
import { handleCopyContainerNumber } from "../../../utils/handleCopyContainerNumber";
import JobDetailsStaticData from "../JobDetailsStaticData";
import JobDetailsRowHeading from "../JobDetailsRowHeading";
import FormGroup from "@mui/material/FormGroup";
import { TabValueContext } from "../../../contexts/TabValueContext";
import { handleGrossWeightChange } from "../../../utils/handleNetWeightChange";
import { UserContext } from "../../../contexts/UserContext";
import DeleteIcon from "@mui/icons-material/Delete";
import Switch from "@mui/material/Switch";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ImagePreview from "../../gallery/ImagePreview.js";
import AddIcon from "@mui/icons-material/Add";
import FileUpload from "../../gallery/FileUpload.js";
import ConfirmDialog from "../../gallery/ConfirmDialog.js";
import { TabContext } from "../../documentation/DocumentationTab.js";
import DeliveryChallanPdf from "../DeliveryChallanPDF.js";
import IgstModal from "../../gallery/IgstModal.js";
import IgstCalculationPDF from "../IgstCalculationPDF.js";
import { preventFormSubmitOnEnter } from "../../../utils/preventFormSubmitOnEnter.js";

// Import the decomposed components
import CompletionStatus from "./CompletionStatus";
import TrackingStatus from "./TrackingStatus";
import DocumentsSection from "./DocumentsSection";
import ChargesSection from "./ChargesSection";
import ContainerDetails from "./ContainerDetails";
import QueriesSection from "./QueriesSection";
import ImportTermsSection from "./ImportTermsSection";

// TabPanel component for tab content
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function JobDetails() {
  const { currentTab } = useContext(TabContext);
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { setTabValue } = React.useContext(TabValueContext);
  const {
    setSearchQuery,
    setSelectedImporter,
  } = useSearchQuery();

  const [storedSearchParams, setStoredSearchParams] = useState(null);
  const [checked, setChecked] = useState(false);
  const [selectedRegNo, setSelectedRegNo] = useState();
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const bl_no_ref = useRef();
  const weighmentSlipRef = useRef();
  const container_number_ref = useRef([]);
  const pdfRef = useRef(null);
  
  // Delete modal states
  const [openDialog, setOpenDialog] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [dutyModalOpen, setDutyModalOpen] = useState(false);

  // Import Terms state
  const [importTerms, setImportTerms] = useState('CIF');
  
  // Tab state for sections
  const [activeTab, setActiveTab] = useState(0);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: "", // "delete" or "resolve"
    queryKey: "",
    queryIndex: null,
  });

  // Other states
  const [isSubmissionDate, setIsSubmissiondate] = useState(false);
  const [emptyContainerOffLoadDate, setEmptyContainerOffLoadDate] = useState(false);
  const [deleveryDate, setDeliveryDate] = useState(false);

  // Fetch job details using custom hook
  const {
    data,
    detentionFrom,
    formik,
    cthDocuments,
    setCthDocuments,
    newDocumentName,
    setNewDocumentName,
    setNewDocumentCode,
    newDocumentCode,
    cth_Dropdown,
    selectedDocument,
    setSelectedDocument,
    jobDetails,
    beTypeOptions,
    filteredClearanceOptions,
    canChangeClearance,
    resetOtherDetails,
    DsrCharges,
    setDsrCharges,
    selectedChargesDocuments,
    setSelectedChargesDocuments,
    selectedChargesDocument,
    setSelectedChargesDocument,
    newChargesDocumentName,
    setNewChargesDocumentName,
  } = useFetchJobDetails(
    params,
    checked,
    setSelectedRegNo,
    setTabValue,
    setFileSnackbar,
    storedSearchParams
  );

  // Effects
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

  React.useEffect(() => {
    if (
      currentTab === 1 &&
      !(location.state && location.state.fromJobDetails)
    ) {
      setSearchQuery("");
      setSelectedImporter("");
    }
  }, [currentTab, setSearchQuery, setSelectedImporter, location.state]);

  useEffect(() => {
    const submissionDateTime = formik.values.submission_completed_date_time;
    if (submissionDateTime && submissionDateTime.trim() !== "") {
      setIsSubmissiondate(true);
    } else {
      setIsSubmissiondate(false);
    }
  }, [formik.values.submission_completed_date_time]);

  useEffect(() => {
    if (formik.values.import_terms && formik.values.import_terms !== importTerms) {
      setImportTerms(formik.values.import_terms);
    }
  }, [formik.values.import_terms]);

  // Handlers
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 0;
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

  const handleImportTermsChange = (event) => {
    const value = event.target.value;
    setImportTerms(value);
    formik.setFieldValue('import_terms', value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDutySubmit = async (updateData) => {
    try {
      Object.keys(updateData).forEach((key) => {
        formik.setFieldValue(key, updateData[key]);
      });
      await formik.submitForm();
      setDutyModalOpen(false);
    } catch (error) {
      console.error("Error submitting duty data:", error);
    }
  };

  // Utility functions
  const formatDateTime = (date) => {
    return date ? new Date(date).toISOString().slice(0, 16) : "";
  };

  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const subtractOneDay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to update the detailed_status based on form values
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

    // Add your detailed status logic here
  };

  // Flags
  const isDutyPaidDateDisabled = !formik.values.assessment_date || !formik.values.igst_ammount;
  const ExBondflag = formik.values.type_of_b_e === "Ex-Bond";
  const LCLFlag = formik.values.consignment_type === "LCL";

  // Shared props for child components
  const commonProps = {
    formik,
    data,
    params,
    user,
    formatDateTime,
    calculateDaysBetween,
    subtractOneDay,
    updateDetailedStatus,
    ExBondflag,
    LCLFlag,
    isDutyPaidDateDisabled,
  };

  const queriesProps = {
    ...commonProps,
    confirmDialog,
    setConfirmDialog,
  };

  const completionStatusProps = {
    ...commonProps,
    isSubmissionDate,
  };

  const trackingStatusProps = {
    ...commonProps,
    detentionFrom,
    emptyContainerOffLoadDate,
    setEmptyContainerOffLoadDate,
    deleveryDate,
    setDeliveryDate,
    importTerms,
    handleImportTermsChange,
    beTypeOptions,
    filteredClearanceOptions,
    canChangeClearance,
    resetOtherDetails,
    jobDetails,
    isSubmissionDate,
  };

  const documentsProps = {
    ...commonProps,
    cthDocuments,
    setCthDocuments,
    newDocumentName,
    setNewDocumentName,
    newDocumentCode,
    setNewDocumentCode,
    cth_Dropdown,
    selectedDocument,
    setSelectedDocument,
    dialogOpen,
    setDialogOpen,
    currentDocument,
    setCurrentDocument,
    isEditMode,
    setIsEditMode,
    editValues,
    setEditValues,
  };

  const chargesProps = {
    ...commonProps,
    DsrCharges,
    setDsrCharges,
    selectedChargesDocuments,
    setSelectedChargesDocuments,
    selectedChargesDocument,
    setSelectedChargesDocument,
    newChargesDocumentName,
    setNewChargesDocumentName,
  };

  const containerProps = {
    ...commonProps,
    bl_no_ref,
    weighmentSlipRef,
    container_number_ref,
    openDialog,
    setOpenDialog,
    containerToDelete,
    setContainerToDelete,
    deleteConfirmText,
    setDeleteConfirmText,
    snackbar,
    setSnackbar,
    detentionFrom,
  };

  const importTermsProps = {
    ...commonProps,
    importTerms,
    handleImportTermsChange,
    dutyModalOpen,
    setDutyModalOpen,
    handleDutySubmit,
  };

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <>

      <form onSubmit={formik.handleSubmit} onKeyDown={preventFormSubmitOnEnter}>
        <Box sx={{ position: "fixed", top: 80, left: 80, zIndex: 999 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            sx={{
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

        {/* DEBUG: Check if this renders */}
        

        {/* Tabbed Interface for Sections */}
        <Paper sx={{ margin: '20px' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minWidth: 120,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#1976d2',
                },
              }}
            >
              <Tab label="Queries" {...a11yProps(0)} />
              <Tab label="Status" {...a11yProps(1)} />
              <Tab label="Tracking" {...a11yProps(2)} />
              <Tab label="Import Terms" {...a11yProps(3)} />
              <Tab label="Documents" {...a11yProps(4)} />
              <Tab label="Charges" {...a11yProps(5)} />
              <Tab label="Containers" {...a11yProps(6)} />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Queries </h3>
              <QueriesSection {...queriesProps} />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Status </h3>
              <CompletionStatus {...completionStatusProps} />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Tracking </h3>
              <TrackingStatus {...trackingStatusProps} />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Import Terms </h3>
              <ImportTermsSection {...importTermsProps} />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Documents </h3>
              <DocumentsSection {...documentsProps} />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Charges </h3>
              <ChargesSection {...chargesProps} />
            </div>
          </TabPanel>

          <TabPanel value={activeTab} index={6}>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
              <h3>Containers </h3>
              <ContainerDetails {...containerProps} />
            </div>
          </TabPanel>
        </Paper>

        {/* Submit Button - Fixed Position */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            boxShadow: 3,
          }}
        >
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{
              backgroundColor: "#2f2f30ff",
              color: "white",
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              "&:hover": {
                backgroundColor: "#0e0e0fff",
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
              },
            }}
          >
            Submit
          </Button>
        </Box>

        {/* File Upload Component */}
        {/* <FileUpload 
          params={params} 
          setFileSnackbar={setFileSnackbar} 
          fileSnackbar={fileSnackbar} 
        /> */}

        {/* Modals and Dialogs */}
        <ConfirmDialog 
          open={confirmDialog.open}
          handleClose={() => setConfirmDialog({ open: false, type: "", queryKey: "", queryIndex: null })}
          handleConfirm={() => {
            // Handle confirm action based on confirmDialog.type
            if (confirmDialog.type === "delete") {
              // Handle delete logic
              console.log("Delete confirmed for:", confirmDialog.queryKey);
            } else if (confirmDialog.type === "resolve") {
              // Handle resolve logic
              console.log("Resolve confirmed for:", confirmDialog.queryKey);
            }
            setConfirmDialog({ open: false, type: "", queryKey: "", queryIndex: null });
          }}
          message={`Are you sure you want to ${confirmDialog.type} this item?`}
        />

        {/* <IgstModal
          open={dutyModalOpen}
          onClose={() => setDutyModalOpen(false)}
          onSubmit={handleDutySubmit}
          rowData={formik.values}
          dates={{
            assessment_date: formik.values.assessment_date,
            duty_paid_date: formik.values.duty_paid_date,
          }}
          containers={formik.values.container_nos || []}
        /> */}

        {/* PDF Components */}
        {/* <JobStickerPDF ref={pdfRef} />
        <DeliveryChallanPdf />
        <IgstCalculationPDF /> */}

      </form>
    </>
  );
}

export default JobDetails;



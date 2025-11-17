// src/pages/job-details/JobDetails.jsx
import React, {
  useState,
  useRef,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Row, Col } from "react-bootstrap";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  TextField,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { TabValueContext } from "../../contexts/TabValueContext";
import { TabContext } from "../documentation/DocumentationTab";
import { UserContext } from "../../contexts/UserContext";

import useFetchJobDetails from "../../customHooks/useFetchJobDetails";
import JobDetailsStaticData from "./JobDetailsStaticData";
import JobDetailsRowHeading from "./JobDetailsRowHeading";
import QueriesComponent from "../../utils/QueriesComponent";
import ConfirmDialog from "../../components/gallery/ConfirmDialog";
import IgstModal from "../gallery/IgstModal";
import { preventFormSubmitOnEnter } from "../../utils/preventFormSubmitOnEnter";
import { handleCopyContainerNumber } from "../../utils/handleCopyContainerNumber";

// NEW TABBED SECTION COMPONENTS (you will create these next)
import TrackingTab from "./tabs/TrackingTab";
import DocumentsTab from "./tabs/DocumentsTab";
import ContainersTab from "./tabs/ContainersTab";
import ChargesTab from "./tabs/ChargesTab";

// Optional: plain CSS/SCSS for compact layout
import "../../styles/job-details.scss";

function JobDetails() {
  // --------------------------------------------------
  // Global state, context, navigation
  // --------------------------------------------------
  const { currentTab } = useContext(TabContext);
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { setTabValue } = useContext(TabValueContext);
  const { setSearchQuery, setSelectedImporter } = useSearchQuery();

  const [storedSearchParams, setStoredSearchParams] = useState(null);
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);

  // local tab within JobDetails: "tracking" | "documents" | "containers" | "charges"
  const [activeInnerTab, setActiveInnerTab] = useState("tracking");

  // delete modal (containers)
  const [openContainerDeleteDialog, setOpenContainerDeleteDialog] =
    useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // generic confirm dialog (queries)
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: "",
    queryKey: "",
    queryIndex: null,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});

  const [dutyModalOpen, setDutyModalOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  const [importTerms, setImportTerms] = useState("CIF");

  const [checked, setChecked] = useState(false);
  const [selectedRegNo, setSelectedRegNo] = useState();
  const [isSubmissionDate, setIsSubmissiondate] = useState(false);

  const [emptyContainerOffLoadDate, setEmptyContainerOffLoadDate] =
    useState(false);
  const [deleveryDate, setDeliveryDate] = useState(false);

  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");

  const [newChargesDocumentName, setNewChargesDocumentName] = useState("");

  const [selectedDocument, setSelectedDocument] = useState("");
  const [selectedChargesDocuments, setSelectedChargesDocuments] = useState([]);
  const [selectedChargesDocument, setSelectedChargesDocument] = useState(null);

  const bl_no_ref = useRef();
  const container_number_ref = useRef([]);
  const pdfRef = useRef(null);

  // --------------------------------------------------
  // Restore search params when navigating back
  // --------------------------------------------------
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

  useEffect(() => {
    if (currentTab === 1 && !(location.state && location.state.fromJobDetails)) {
      setSearchQuery("");
      setSelectedImporter("");
    }
  }, [currentTab, setSearchQuery, setSelectedImporter, location.state]);

  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 0;
    navigate("/import-dsr", {
      state: {
        fromJobDetails: true,
        tabIndex,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          detailedStatus: storedSearchParams.detailedStatus,
          selectedICD: storedSearchParams.selectedICD,
          selectedImporter: storedSearchParams.selectedImporter,
        }),
      },
    });
  };

  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (!text || text === "N/A") return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => setSnackbar(true))
        .catch(() => {});
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setSnackbar(true);
      } catch (err) {
      } finally {
        document.body.removeChild(textArea);
      }
    }
    setTimeout(() => setSnackbar(false), 2000);
  };

  // --------------------------------------------------
  // Fetch job data + formik via custom hook
  // --------------------------------------------------
  const options = Array.from({ length: 41 }, (_, index) => index);

  const {
    data,
    detentionFrom,
    formik,
    cthDocuments,
    setCthDocuments,
    cth_Dropdown,
    jobDetails,
    beTypeOptions,
    filteredClearanceOptions,
    canChangeClearance,
    resetOtherDetails,
    DsrCharges,
    setDsrCharges,
    setData,
  } = useFetchJobDetails(
    params,
    checked,
    setSelectedRegNo,
    setTabValue,
    setFileSnackbar,
    storedSearchParams
  );

  // --------------------------------------------------
  // Derived flags, helpers
  // --------------------------------------------------
  const ExBondflag = formik.values.type_of_b_e === "Ex-Bond";
  const InBondflag = formik.values.type_of_b_e === "In-Bond";
  const LCLFlag = formik.values.consignment_type === "LCL";

  const formatDateTime = (date) => {
    return date ? new Date(date).toISOString().slice(0, 16) : "";
  };

  const formatDateForInput = (date) => {
    if (!date) return "";
    if (date.length === 10) return `${date}T00:00`;
    return date.replace(" ", "T");
  };

  const toISTLocalInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset() + 330);
    return d.toISOString().slice(0, 16);
  };

  // keep local importTerms in sync with formik
  useEffect(() => {
    if (formik.values.import_terms && formik.values.import_terms !== importTerms) {
      setImportTerms(formik.values.import_terms);
    }
  }, [formik.values.import_terms, importTerms]);

  const handleImportTermsChange = (event) => {
    const value = event.target.value;
    setImportTerms(value);
    formik.setFieldValue("import_terms", value);
  };

  // submission date flag
  useEffect(() => {
    const v = formik.values.submission_completed_date_time;
    setIsSubmissiondate(Boolean(v && v.trim() !== ""));
  }, [formik.values.submission_completed_date_time]);

  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Detailed status updater (unchanged logic, just kept as helper)
  const updateDetailedStatus = useCallback(() => {
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

    const norm = (s) => String(s || "").trim().toLowerCase();
    const isExBond = norm(type_of_b_e) === "ex-bond";
    const isLCL = norm(consignment_type) === "lcl";

    if (isExBond) {
      if (be_no && validOOC && allDelivered) {
        formik.setFieldValue("detailed_status", "Billing Pending");
        return;
      }
      if (be_no && validOOC) {
        formik.setFieldValue(
          "detailed_status",
          "Custom Clearance Completed"
        );
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

    const billingComplete = isLCL ? allDelivered : allEmptyOffloaded;

    if (be_no && anyArrival && validOOC && billingComplete) {
      formik.setFieldValue("detailed_status", "Billing Pending");
    } else if (be_no && anyArrival && validOOC) {
      formik.setFieldValue(
        "detailed_status",
        "Custom Clearance Completed"
      );
    } else if (be_no && anyArrival && validPCV) {
      formik.setFieldValue(
        "detailed_status",
        "PCV Done, Duty Payment Pending"
      );
    } else if (be_no && anyArrival) {
      formik.setFieldValue(
        "detailed_status",
        "BE Noted, Clearance Pending"
      );
    } else if (!be_no && anyArrival) {
      formik.setFieldValue(
        "detailed_status",
        "Arrived, BE Note Pending"
      );
    } else if (be_no && !anyArrival) {
      formik.setFieldValue(
        "detailed_status",
        "BE Noted, Arrival Pending"
      );
    } else if (anyRailOut) {
      formik.setFieldValue("detailed_status", "Rail Out");
    } else if (validDischarge) {
      formik.setFieldValue("detailed_status", "Discharged");
    } else if (validIGM) {
      formik.setFieldValue("detailed_status", "Gateway IGM Filed");
    } else if (validETA) {
      formik.setFieldValue(
        "detailed_status",
        "Estimated Time of Arrival"
      );
    } else {
      formik.setFieldValue("detailed_status", "ETA Date Pending");
    }
  }, [formik.values]);

  useEffect(() => {
    updateDetailedStatus();
  }, [
    updateDetailedStatus,
    formik.values.vessel_berthing,
    formik.values.gateway_igm_date,
    formik.values.discharge_date,
    formik.values.arrival_date,
    formik.values.container_rail_out_date,
    formik.values.out_of_charge,
    formik.values.pcv_date,
    formik.values.completed_operation_date,
    formik.values.be_no,
    formik.values.emptyContainerOffLoadDate,
    formik.values.delivery_date,
    formik.values.container_nos,
  ]);

  const getDeliveryCompletedDate = () => {
    const containers = formik.values.container_nos || [];
    if (!containers.length) return null;
    const isLCL = formik.values.consignment_type === "LCL";
    const key = isLCL ? "delivery_date" : "emptyContainerOffLoadDate";
    const allHaveDate = containers.every((c) => c[key]);
    if (!allHaveDate) return null;
    const lastDate = containers[containers.length - 1][key];
    return lastDate || null;
  };

  const deliveryCompletedDate = getDeliveryCompletedDate();

  const handleBlStatusChange = (event) => {
    const selectedValue = event.target.value;
    if (selectedValue === "clear") {
      formik.setFieldValue("obl_telex_bl", "");
      formik.setFieldValue("document_received_date", "");
    } else {
      formik.setFieldValue("obl_telex_bl", selectedValue);
      const currentDateTime = new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      formik.setFieldValue("document_received_date", currentDateTime);
    }
  };

  const handleWeighmentSlip = async (
    e,
    container_number,
    fileType,
    AWSInstance
  ) => {
    if (!e.target.files.length) {
      alert("No file selected");
      return;
    }

    try {
      const s3 = new AWSInstance.S3({
        accessKeyId: process.env.REACT_APP_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
        region: "ap-south-1",
      });

      const updatedContainers = await Promise.all(
        (formik.values.container_nos || []).map(async (container) => {
          if (container.container_number === container_number) {
            const fileUrls = [];

            for (let i = 0; i < e.target.files.length; i++) {
              const file = e.target.files[i];
              const params = {
                Bucket: process.env.REACT_APP_S3_BUCKET,
                Key: `${fileType}/${container_number}/${file.name}`,
                Body: file,
              };
              const data = await s3.upload(params).promise();
              fileUrls.push({ url: data.Location, container_number });
            }

            return {
              ...container,
              [fileType]: fileUrls,
            };
          }
          return container;
        })
      );

      formik.setValues((values) => ({
        ...values,
        container_nos: updatedContainers,
      }));

      setFileSnackbar(true);
      setTimeout(() => setFileSnackbar(false), 3000);
    } catch (err) {}
  };

  const handleTransporterChange = (e, index) => {
    if (e.target.checked) {
      formik.setFieldValue(`container_nos[${index}].transporter`, "SRCC");
    } else {
      formik.setFieldValue(`container_nos[${index}].transporter`, "");
    }
  };

  const handleAddContainer = () => {
    formik.setFieldValue("container_nos", [
      ...(formik.values.container_nos || []),
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
        (formik.values.container_nos || []).filter(
          (_, i) => i !== containerToDelete
        )
      );
      setOpenContainerDeleteDialog(false);
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

  const handleRequiredDoDateChange = (newDate) => {
    const updatedContainers = (formik.values.container_nos || []).map(
      (container) => ({
        ...container,
        required_do_validity_upto: newDate,
      })
    );
    formik.setFieldValue("container_nos", updatedContainers);
  };

const handleGenerateSticker = () => {
  if (pdfRef.current && typeof pdfRef.current.generatePdf === "function") {
    pdfRef.current.generatePdf();
  } else {
    console.warn("JobStickerPDF ref not ready");
  }
};


  const handleOpenDutyModal = () => {
    setDutyModalOpen(true);
  };

  const handleCloseDutyModal = () => {
    setDutyModalOpen(false);
  };

  const handleQueriesChange = (updatedQueries) => {
    setData((prev) => ({ ...prev, dsr_queries: updatedQueries }));
  };

  const handleResolveQuery = (resolvedQuery, index) => {
    // custom side effects if needed
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

  const isDutyPaidDateDisabled =
    !formik.values.assessment_date || !formik.values.igst_ammount;

  const subtractOneDay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // --------------------------------------------------
  // TABS RENDERING
  // --------------------------------------------------

  if (data == null) return null;

  return (
    <>
      <form onSubmit={formik.handleSubmit}>
        {/* Back button */}
        <Box sx={{ position: "fixed", top: 80, left: 80, zIndex: 999 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            sx={{
              backgroundColor: "black",
              color: "white",
              "&:hover": { backgroundColor: "#333" },
            }}
          >
            Back to Job List
          </Button>
        </Box>

        {/* Static header */}
        <div style={{ marginTop: "70px" }}>
          <JobDetailsStaticData
            data={data}
            params={params}
            bl_no_ref={bl_no_ref}
            setSnackbar={setSnackbar}
            container_nos={formik.values.container_nos}
          />
        </div>

        {/* Queries */}
        <div>
          <QueriesComponent
            queries={data.dsr_queries}
            currentModule="Import DSR"
            onQueriesChange={handleQueriesChange}
            title="DSR Queries"
            showResolveButton
            readOnlyReply={false}
            onResolveQuery={handleResolveQuery}
            userName={user?.username}
          />
        </div>

        {/* TOP: Completion status (kept in main view for context) */}
        {/* ...you can optionally move Completion Status to its own tab later... */}

        {/* -------- INNER TABS BAR -------- */}
        <Box
          sx={{
            marginTop: 2,
            marginBottom: 2,
            borderBottom: "1px solid #ddd",
            display: "flex",
            gap: 1,
          }}
        >
          {[
            { id: "tracking", label: "Tracking" },
            { id: "documents", label: "Documents" },
            { id: "containers", label: "Containers" },
            { id: "charges", label: "Charges" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveInnerTab(tab.id)}
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                border: "none",
                borderBottom:
                  activeInnerTab === tab.id
                    ? "2px solid #007bff"
                    : "2px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontWeight: activeInnerTab === tab.id ? "600" : "400",
                color: activeInnerTab === tab.id ? "#007bff" : "#555",
              }}
            >
              {tab.label}
            </button>
          ))}
        </Box>

        {/* -------- TAB CONTENT -------- */}

        {activeInnerTab === "tracking" && (
          <TrackingTab
            user={user}
            formik={formik}
            data={data}
            options={options}
            importTerms={importTerms}
            handleImportTermsChange={handleImportTermsChange}
            ExBondflag={ExBondflag}
            InBondflag={InBondflag}
            LCLFlag={LCLFlag}
            beTypeOptions={beTypeOptions}
            filteredClearanceOptions={filteredClearanceOptions}
            canChangeClearance={canChangeClearance}
            resetOtherDetails={resetOtherDetails}
            jobDetails={jobDetails}
            formatDateTime={formatDateTime}
            formatDateForInput={formatDateForInput}
            handleCopy={handleCopy}
            handleBlStatusChange={handleBlStatusChange}
            isSubmissionDate={isSubmissionDate}
            pdfRef={pdfRef}
            handleGenerateSticker={handleGenerateSticker}
            setSnackbar={setSnackbar}
            deliveryCompletedDate={deliveryCompletedDate}
            subtractOneDay={subtractOneDay}
            handleOpenDutyModal={handleOpenDutyModal}
            isDutyPaidDateDisabled={isDutyPaidDateDisabled}
          />
        )}

        {activeInnerTab === "documents" && (
          <DocumentsTab
            user={user}
            formik={formik}
            cthDocuments={cthDocuments}
            setCthDocuments={setCthDocuments}
            cth_Dropdown={cth_Dropdown}
            selectedDocument={selectedDocument}
            setSelectedDocument={setSelectedDocument}
            newDocumentName={newDocumentName}
            setNewDocumentName={setNewDocumentName}
            newDocumentCode={newDocumentCode}
            setNewDocumentCode={setNewDocumentCode}
            preventFormSubmitOnEnter={preventFormSubmitOnEnter}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            currentDocument={currentDocument}
            setCurrentDocument={setCurrentDocument}
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
            editValues={editValues}
            setEditValues={setEditValues}
          />
        )}

        {activeInnerTab === "containers" && (
          <ContainersTab
            user={user}
            formik={formik}
            LCLFlag={LCLFlag}
            ExBondflag={ExBondflag}
            handleAddContainer={handleAddContainer}
            handleDeleteContainer={() => {
              setOpenContainerDeleteDialog(true);
            }}
            setContainerToDelete={setContainerToDelete}
            container_number_ref={container_number_ref}
            handleCopyContainerNumber={handleCopyContainerNumber}
            setSnackbar={setSnackbar}
            handleWeighmentSlip={handleWeighmentSlip}
            handleTransporterChange={handleTransporterChange}
            handleDeleteRevalidation={handleDeleteRevalidation}
            handleRequiredDoDateChange={handleRequiredDoDateChange}
            emptyContainerOffLoadDate={emptyContainerOffLoadDate}
            setEmptyContainerOffLoadDate={setEmptyContainerOffLoadDate}
            deleveryDate={deleveryDate}
            setDeliveryDate={setDeliveryDate}
          />
        )}

        {activeInnerTab === "charges" && (
          <ChargesTab
            user={user}
            formik={formik}
            DsrCharges={DsrCharges}
            setDsrCharges={setDsrCharges}
            selectedChargesDocuments={selectedChargesDocuments}
            setSelectedChargesDocuments={setSelectedChargesDocuments}
            newChargesDocumentName={newChargesDocumentName}
            setNewChargesDocumentName={setNewChargesDocumentName}
            preventFormSubmitOnEnter={preventFormSubmitOnEnter}
          />
        )}

        {/* Submit button */}
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

      {/* Generic snackbar: copy or file upload */}
      <Snackbar
        open={snackbar || fileSnackbar}
        message={
          snackbar ? "Copied to clipboard" : "File uploaded successfully!"
        }
        sx={{ left: "auto !important", right: "24px !important" }}
      />

      {/* Container delete dialog */}
      <Dialog
        open={openContainerDeleteDialog}
        onClose={() => setOpenContainerDeleteDialog(false)}
      >
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
          <Button onClick={() => setOpenContainerDeleteDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteContainer} color="error">
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* CTH document edit / delete dialog */}
      <ConfirmDialog
        open={dialogOpen}
        handleClose={() => setDialogOpen(false)}
        handleConfirm={() => {
          if (isEditMode) {
            setCthDocuments((prevDocs) =>
              prevDocs.map((doc) =>
                doc === currentDocument ? { ...doc, ...editValues } : doc
              )
            );
          } else {
            setCthDocuments((prevDocs) =>
              prevDocs.filter((doc) => doc !== currentDocument)
            );
          }
          setDialogOpen(false);
          setIsEditMode(false);
          setCurrentDocument(null);
          setEditValues({});
        }}
        message={
          isEditMode
            ? undefined
            : `Are you sure you want to delete the document "${currentDocument?.document_name}"?`
        }
        isEdit={isEditMode}
        editValues={editValues}
        onEditChange={setEditValues}
      />

      {/* Query delete/resolve dialog (for dsr_queries inside formik) */}
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
            onClick={() =>
              setConfirmDialog({ ...confirmDialog, open: false })
            }
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              const { queryKey, queryIndex, type } = confirmDialog;
              const updated = [...(formik.values[queryKey] || [])];

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

      {/* IGST (Duty) Modal */}
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
    </>
  );
}

export default JobDetails;

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import { useFormik } from "formik";
import axios from "axios";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import { TabContext } from "./ImportDO";
import {
  Checkbox,
  FormControlLabel,
  TextField,
  IconButton,
  Button,
  Box,
  FormGroup,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
// Import your user context or authentication hook here
import { UserContext } from "../../contexts/UserContext";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import QueriesComponent from "../../utils/QueriesComponent.js";

function EditDoCompleted() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kycData, setKycData] = useState("");
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [showWireTransferOptions, setShowWireTransferOptions] = useState({});

  const params = useParams();
  const { job_no, year } = params;

  // Modal and other states
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [currentField, setCurrentField] = useState(null);
  const [openImageDeleteModal, setOpenImageDeleteModal] = useState(false);
  const container_number_ref = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedJobId } = location.state || {};
  const { setCurrentTab } = useContext(TabContext);
  const { user } = useContext(UserContext);

  const [storedSearchParams, setStoredSearchParams] = useState(null);
  const [param] = useSearchParams();

  const jobId = param.get("jobId");
  // Helper function to get current ISO string
  const getCurrentISOString = () => {
    return new Date().toISOString();
  };

  // Helper function to get local datetime string
  const getLocalDatetimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `0${now.getMonth() + 1}`.slice(-2);
    const day = `0${now.getDate()}`.slice(-2);
    const hours = `0${now.getHours()}`.slice(-2);
    const minutes = `0${now.getMinutes()}`.slice(-2);
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Store search parameters from location state
  useEffect(() => {
    if (location.state) {
      const {
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentTab,
        currentPage,
      } = location.state;

      const params = {
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentTab: currentTab ?? 3,
        currentPage,
      };

      setStoredSearchParams(params);
    }
  }, [location.state]);

  // Handle back click function
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 3;

    navigate("/import-do", {
      state: {
        fromJobDetails: true,
        tabIndex: tabIndex,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          selectedImporter: storedSearchParams.selectedImporter,
          selectedJobId: storedSearchParams.selectedJobId,
          currentPage: storedSearchParams.currentPage,
        }),
      },
    });
  };

  // Helper function to convert date to 'YYYY-MM-DD' format
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  };

  // Fetch data on component mount
  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-job-by-id/${jobId}`
        );

        const jobData = res.data.job;

        let do_completed = "";
        if (
          typeof jobData.do_completed === "string" &&
          jobData.do_completed.trim() !== ""
        ) {
          const parsedDate = new Date(jobData.do_completed);
          if (!isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear();
            const month = `0${parsedDate.getMonth() + 1}`.slice(-2);
            const day = `0${parsedDate.getDate()}`.slice(-2);
            const hours = `0${parsedDate.getHours()}`.slice(-2);
            const minutes = `0${parsedDate.getMinutes()}`.slice(-2);
            do_completed = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }

        // Process new fields
        const doShippingLineInvoice = jobData.do_shipping_line_invoice || {
          document_name: "Shipping Line Invoice",
          url: [],
          is_draft: false,
          is_final: false,
          document_check_date: "",
          payment_mode: [],
          document_amount_details: "",
          payment_request_date: "",
          payment_made_date: "",
          is_tds: false,
          is_non_tds: false,
        };

        const insuranceCopy = jobData.insurance_copy || {
          document_name: "Insurance",
          url: [],
          document_check_date: "",
          document_amount_details: "",
        };

        const otherDoDocuments = jobData.other_do_documents || {
          document_name: "",
          url: [],
          document_check_date: "",
          document_amount_details: "",
        };

        setData({
          ...jobData,
          shipping_line_invoice: jobData.shipping_line_invoice === "Yes",
          payment_made: jobData.payment_made === "Yes",
          do_processed: jobData.do_processed === "Yes",
          other_invoices: jobData.other_invoices === "Yes",
          security_deposit: jobData.security_deposit === "Yes",
          do_completed,
          do_shipping_line_invoice: doShippingLineInvoice,
          insurance_copy: insuranceCopy,
          other_do_documents: otherDoDocuments,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    }

    getData();
  }, [selectedJobId]);

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
      do_completed: "",
      do_Revalidation_Completed: false,
      container_nos: [],

      do_shipping_line_invoice: [
        {
          document_name: "Shipping Line Invoice",
          url: [],
          is_draft: false,
          is_final: false,
          document_check_date: "",
          document_check_status: false,
          payment_mode: "",
          wire_transfer_method: "",
          document_amount_details: "",
          payment_request_date: "",
          payment_made_date: "",
          is_tds: false,
          is_non_tds: false,
        },
      ],

      insurance_copy: [
        {
          document_name: "Insurance",
          url: [],
          document_check_date: "",
          document_amount_details: "",
        },
      ],

      other_do_documents: [],

      security_deposit: [
        {
          document_name: "Security Deposit",
          url: [],
          document_check_date: "",
          document_amount_details: "",
          utr: "",
          Validity_upto: "",
        },
      ],
    },

    onSubmit: async (values, { resetForm }) => {
      const dataToSubmit = {
        ...values,
        selectedJobId,
        do_Revalidation_Completed: values.do_Revalidation_Completed,
        shipping_line_invoice: values.shipping_line_invoice ? "Yes" : "No",
        payment_made: values.payment_made ? "Yes" : "No",
        do_processed: values.do_processed ? "Yes" : "No",
        other_invoices: values.other_invoices ? "Yes" : "No",
        security_deposit: values.security_deposit ? "Yes" : "No",
        do_completed:
          typeof values.do_completed === "string" &&
            values.do_completed.trim() !== ""
            ? new Date(values.do_completed).toISOString()
            : "",
        do_shipping_line_invoice: values.do_shipping_line_invoice.map(
          (doc) => ({
            ...doc,
            payment_mode: Array.isArray(doc.payment_mode)
              ? doc.payment_mode.join(",")
              : doc.payment_mode,
          })
        ),
        insurance_copy: values.insurance_copy,
        other_do_documents: values.other_do_documents,
        security_deposit: values.security_deposit,
      };

      try {
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };
        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-do-planning`,
          dataToSubmit,
          {
            headers: headers,
          }
        );

        resetForm();
        const currentState = window.history.state || {};
        const scrollPosition = currentState.scrollPosition || 0;
        const tabIndex = storedSearchParams?.currentTab ?? 3;

        // Close the tab after successful submit
        // setTimeout(() => {
        //   window.close();
        // }, 500);

        setCurrentTab(tabIndex);
      } catch (error) {
        console.error("Error submitting form:", error);
      }
    },
  });

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

  // Handle payment mode change
  const handlePaymentModeChange = (docIndex, mode) => (e) => {
    formik.setFieldValue(
      `do_shipping_line_invoice[${docIndex}].payment_mode`,
      mode
    );
    if (mode !== "Wire Transfer") {
      formik.setFieldValue(
        `do_shipping_line_invoice[${docIndex}].wire_transfer_method`,
        ""
      );
    }
    setShowWireTransferOptions((prev) => ({
      ...prev,
      [docIndex]: mode === "Wire Transfer",
    }));
  };

  // Document check status handler
  const handleDocumentCheckChange = (docIndex, docType) => (e) => {
    const isChecked = e.target.checked;
    const currentTime = isChecked ? getCurrentISOString() : "";

    formik.setFieldValue(
      `${docType}[${docIndex}].document_check_status`,
      isChecked
    );
    formik.setFieldValue(
      `${docType}[${docIndex}].document_check_date`,
      currentTime
    );
  };

  const handleAddDocument = () => {
    if (!selectedDocumentType) return;

    const newDocument = {
      document_name:
        selectedDocumentType === "other" ? "" : selectedDocumentType,
      url: [],
      document_check_date: "",
      document_amount_details: "",
    };

    if (selectedDocumentType === "Shipping Line Invoice") {
      newDocument.is_draft = false;
      newDocument.is_final = false;
      newDocument.payment_mode = "";
      newDocument.wire_transfer_method = "";
      newDocument.document_amount_details = "";
      newDocument.payment_request_date = "";
      newDocument.payment_made_date = "";
      newDocument.is_tds = false;
      newDocument.is_non_tds = false;
    } else if (selectedDocumentType === "Security Deposit") {
      newDocument.utr = "";
      newDocument.Validity_upto = "";
    }

    if (selectedDocumentType === "Shipping Line Invoice") {
      const currentDocs = [...formik.values.do_shipping_line_invoice];
      currentDocs.push(newDocument);
      formik.setFieldValue("do_shipping_line_invoice", currentDocs);
    } else if (selectedDocumentType === "Insurance") {
      const currentDocs = [...formik.values.insurance_copy];
      currentDocs.push(newDocument);
      formik.setFieldValue("insurance_copy", currentDocs);
    } else if (selectedDocumentType === "Security Deposit") {
      const currentDocs = [...formik.values.security_deposit];
      currentDocs.push(newDocument);
      formik.setFieldValue("security_deposit", currentDocs);
    } else {
      const currentDocs = [...formik.values.other_do_documents];
      currentDocs.push(newDocument);
      formik.setFieldValue("other_do_documents", currentDocs);
    }

    setSelectedDocumentType("");
  };

  const handleRemoveDocument = (docType, index) => {
    if (docType === "do_shipping_line_invoice") {
      const currentDocs = [...formik.values.do_shipping_line_invoice];
      currentDocs.splice(index, 1);
      formik.setFieldValue("do_shipping_line_invoice", currentDocs);
    } else if (docType === "insurance_copy") {
      const currentDocs = [...formik.values.insurance_copy];
      currentDocs.splice(index, 1);
      formik.setFieldValue("insurance_copy", currentDocs);
    } else if (docType === "security_deposit") {
      const currentDocs = [...formik.values.security_deposit];
      currentDocs.splice(index, 1);
      formik.setFieldValue("security_deposit", currentDocs);
    } else if (docType === "other_do_documents") {
      const currentDocs = [...formik.values.other_do_documents];
      currentDocs.splice(index, 1);
      formik.setFieldValue("other_do_documents", currentDocs);
    }
  };

  // Fetch KYC documents once data is loaded
  useEffect(() => {
    if (data) {
      const doShippingLineInvoice =
        Array.isArray(data.do_shipping_line_invoice) &&
          data.do_shipping_line_invoice.length > 0
          ? data.do_shipping_line_invoice
          : [
            {
              document_name: "Shipping Line Invoice",
              url: [],
              is_draft: false,
              is_final: false,
              document_check_date: "",
              payment_mode: [],
              document_amount_details: "",
              payment_request_date: "",
              payment_made_date: "",
              is_tds: false,
              is_non_tds: false,
            },
          ];

      const securityDeposit =
        Array.isArray(data.security_deposit) && data.security_deposit.length > 0
          ? data.security_deposit
          : [
            {
              document_name: "Security Deposit",
              url: [],
              document_check_date: "",
              document_amount_details: "",
              utr: "",
              Validity_upto: "",
            },
          ];

      const wireTransferState = {};
      doShippingLineInvoice.forEach((doc, index) => {
        wireTransferState[index] = doc.payment_mode === "Wire Transfer";
      });
      setShowWireTransferOptions(wireTransferState);

      const insuranceCopy =
        Array.isArray(data.insurance_copy) && data.insurance_copy.length > 0
          ? data.insurance_copy
          : [
            {
              document_name: "Insurance",
              url: [],
              document_check_date: "",
              document_amount_details: "",
            },
          ];

      const otherDoDocuments = Array.isArray(data.other_do_documents)
        ? data.other_do_documents
        : [];

      const updatedData = {
        ...data,
        shipping_line_invoice:
          data.shipping_line_invoice === "Yes" ||
          data.shipping_line_invoice === true,
        shipping_line_invoice_date: formatDate(data.shipping_line_invoice_date),
        payment_made: data.payment_made === "Yes" || data.payment_made === true,
        do_processed: data.do_processed === "Yes" || data.do_processed === true,
        other_invoices:
          data.other_invoices === "Yes" || data.other_invoices === true,
        security_deposit:
          data.security_deposit === "Yes" || data.security_deposit === true,
        do_Revalidation_Completed: data.do_Revalidation_Completed,
        do_queries: data.do_queries || [{ query: "", reply: "" }],
        container_nos: data.container_nos || [],
        do_shipping_line_invoice: doShippingLineInvoice,
        insurance_copy: insuranceCopy,
        other_do_documents: otherDoDocuments,
        security_deposit: securityDeposit,
      };

      formik.setValues(updatedData);

      async function getKycDocs() {
        const importer = data.importer;
        const shipping_line_airline = data.shipping_line_airline;
        try {
          const res = await axios.post(
            `${process.env.REACT_APP_API_STRING}/get-kyc-documents`,
            { importer, shipping_line_airline }
          );
          setKycData(res.data);
        } catch (error) {
          console.error("Error fetching KYC documents:", error);
        }
      }

      getKycDocs();
    }
  }, [data]);

  // Render editable charges section (all fields enabled, draft/final, add/remove, etc.)
  const renderChargesSection = () => (
    <div className="job-details-container">
      <JobDetailsRowHeading heading="Charges" />
      {/* Render all shipping line invoice documents */}
      {formik.values.do_shipping_line_invoice.map((doc, index) => (
        <React.Fragment key={index}>
          {renderDocumentSection(
            doc,
            index,
            "do_shipping_line_invoice",
            index > 0,
            user
          )}
        </React.Fragment>
      ))}
      {/* Render all insurance copy documents */}
      {formik.values.insurance_copy.map((doc, index) =>
        renderDocumentSection(doc, index, "insurance_copy", index > 0, user)
      )}
      {/* Render all security deposit documents */}
      {formik.values.security_deposit.map((doc, index) =>
        renderDocumentSection(doc, index, "security_deposit", index > 0, user)
      )}

      {/* DO Copies Row - show below security deposit */}
      <div
        style={{
          margin: "16px 0 8px 0",
          fontWeight: 600,
          fontSize: "1.1rem",
          color: "#1a237e",
        }}
      >
        DO Copies
      </div>
      <Row>
        <Col>
          <FileUpload
            label="Upload DO Copies"
            bucketPath="do_copies"
            onFilesUploaded={(newFiles) => {
              const existingFiles = formik.values.do_copies || [];
              const updatedFiles = [...existingFiles, ...newFiles];
              formik.setFieldValue("do_copies", updatedFiles);
              setFileSnackbar(true);
            }}
            multiple={true}
          />
          <ImagePreview
            images={formik.values.do_copies || []}
            onDeleteImage={(index) => {
              const updatedFiles = [...formik.values.do_copies];
              updatedFiles.splice(index, 1);
              formik.setFieldValue("do_copies", updatedFiles);
              setFileSnackbar(true);
            }}
          />
        </Col>
      </Row>

      {/* Render all other documents */}
      {formik.values.other_do_documents.map((doc, index) =>
        renderDocumentSection(doc, index, "other_do_documents", true, user)
      )}
      {/* Dropdown and Add Document Button (enabled) */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          border: "2px dashed #ccc",
          borderRadius: "5px",
        }}
      >
        <Row>
          <Col xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Document Type</InputLabel>
              <Select
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                label="Select Document Type"
              >
                <MenuItem value="Shipping Line Invoice">
                  Shipping Line Invoice
                </MenuItem>
                <MenuItem value="Insurance">Insurance Copy</MenuItem>
                <MenuItem value="Security Deposit">Security Deposit</MenuItem>
                <MenuItem value="other">Other Document</MenuItem>
              </Select>
            </FormControl>
          </Col>
          <Col xs={12} md={6}>
            <Button
              variant="contained"
              onClick={handleAddDocument}
              disabled={!selectedDocumentType}
              style={{ marginTop: "8px" }}
            >
              Add Document
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  );

  // Render document section function (all fields enabled, draft/final, add/remove, etc.)
  const renderDocumentSection = (
    doc,
    docIndex,
    docType,
    isRemovable = false,
    user
  ) => {
    const isShippingInvoice = docType === "do_shipping_line_invoice";
    const isSecurityDeposit = docType === "security_deposit";
    const bucketPath =
      docType === "do_shipping_line_invoice"
        ? "do_shipping_line_invoice"
        : docType === "insurance_copy"
          ? "insurance_copy"
          : docType === "security_deposit"
            ? "security_deposit"
            : "other_do_documents";
    // Draft/Final radio button handler
    const handleDraftFinalChange = (type) => (e) => {
      if (type === "draft") {
        formik.setFieldValue(
          `do_shipping_line_invoice[${docIndex}].is_draft`,
          true
        );
        formik.setFieldValue(
          `do_shipping_line_invoice[${docIndex}].is_final`,
          false
        );
      } else {
        formik.setFieldValue(
          `do_shipping_line_invoice[${docIndex}].is_draft`,
          false
        );
        formik.setFieldValue(
          `do_shipping_line_invoice[${docIndex}].is_final`,
          true
        );
      }
    };
    // Payment mode change handler
    const handlePaymentModeChange = (mode) => (e) => {
      formik.setFieldValue(
        `do_shipping_line_invoice[${docIndex}].payment_mode`,
        mode
      );
      if (mode !== "Wire Transfer") {
        formik.setFieldValue(
          `do_shipping_line_invoice[${docIndex}].wire_transfer_method`,
          ""
        );
      }
      setShowWireTransferOptions((prev) => ({
        ...prev,
        [docIndex]: mode === "Wire Transfer",
      }));
    };
    // Document check status handler
    const handleDocumentCheckChange = (e) => {
      const isChecked = e.target.checked;
      const currentTime = isChecked ? new Date().toISOString() : "";
      formik.setFieldValue(
        `${docType}[${docIndex}].document_check_status`,
        isChecked
      );
      formik.setFieldValue(
        `${docType}[${docIndex}].document_check_date`,
        currentTime
      );
    };
    return (
      <div
        key={docIndex}
        style={{
          marginBottom: "32px",
          padding: "24px 32px",
          border: "1.5px solid #e0e0e0",
          borderRadius: "12px",
          background: "#fafbfc",
          boxShadow: "0 2px 8px 0 rgba(60,72,88,0.06)",
          position: "relative",
          transition: "box-shadow 0.2s",
        }}
        className="charges-section-card"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <h5
            style={{
              margin: 0,
              fontWeight: 600,
              color: "#1a237e",
              letterSpacing: 0.5,
            }}
          >
            {doc.document_name || "Document"}
          </h5>
          {isRemovable && user?.role === "Admin" && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => handleRemoveDocument(docType, docIndex)}
              sx={{ borderRadius: 2, fontWeight: 500 }}
            >
              Remove
            </Button>
          )}
        </div>
        {/* Draft/Final radio buttons directly below document name for Shipping Line Invoice */}
        {isShippingInvoice && (
          <Row style={{ marginBottom: 8 }}>
            <Col xs={12}>
              <FormControl component="fieldset" sx={{ width: "100%" }}>
                <FormLabel
                  component="legend"
                  sx={{ fontWeight: 500, color: "#333" }}
                >
                  Document Status
                </FormLabel>
                <div
                  style={{
                    display: "flex",
                    gap: "32px",
                    marginTop: 12,
                    alignItems: "center",
                  }}
                >
                  <FormControlLabel
                    control={
                      <input
                        type="radio"
                        checked={doc.is_draft}
                        onChange={handleDraftFinalChange("draft")}
                        name={`draft_final_${docIndex}`}
                        style={{ marginRight: 8 }}
                      />
                    }
                    label={<span style={{ marginLeft: 4 }}>Draft</span>}
                    sx={{ mr: 3 }}
                  />
                  <FormControlLabel
                    control={
                      <input
                        type="radio"
                        checked={doc.is_final}
                        onChange={handleDraftFinalChange("final")}
                        name={`draft_final_${docIndex}`}
                        style={{ marginRight: 8 }}
                      />
                    }
                    label={<span style={{ marginLeft: 4 }}>Final</span>}
                    sx={{ mr: 3 }}
                  />
                </div>
              </FormControl>
            </Col>
          </Row>
        )}
        <Row>
          <Col
            xs={12}
            md={6}
            style={{ borderRight: "1px solid #f0f0f0", paddingRight: 24 }}
          >
            {docType === "other_do_documents" && (
              <TextField
                fullWidth
                size="small"
                margin="normal"
                variant="outlined"
                id={`${docType}[${docIndex}].document_name`}
                name={`${docType}[${docIndex}].document_name`}
                label="Document Name"
                value={doc.document_name}
                onChange={formik.handleChange}
                sx={{ mb: 2 }}
              />
            )}
            <FileUpload
              label={`Upload ${doc.document_name}`}
              bucketPath={bucketPath}
              onFilesUploaded={(newFiles) => {
                const existingFiles = doc.url || [];
                const updatedFiles = [...existingFiles, ...newFiles];
                formik.setFieldValue(
                  `${docType}[${docIndex}].url`,
                  updatedFiles
                );
                setFileSnackbar(true);
              }}
              multiple={true}
            />
            <ImagePreview
              images={doc.url || []}
              onDeleteImage={(index) => {
                const updatedFiles = [...doc.url];
                updatedFiles.splice(index, 1);
                formik.setFieldValue(
                  `${docType}[${docIndex}].url`,
                  updatedFiles
                );
                setFileSnackbar(true);
              }}
            />
          </Col>
          <Col xs={12} md={6} style={{ paddingLeft: 24 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={doc.document_check_status || false}
                  onChange={handleDocumentCheckChange}
                  disabled={true}
                  name={`${docType}[${docIndex}].document_check_status`}
                  color="primary"
                />
              }
              label={<span style={{ fontWeight: 500 }}>Document Checked</span>}
              sx={{ mb: 1 }}
            />
            {/* Document Check Date field (read-only) */}
            {doc.document_check_status && doc.document_check_date && (
              <TextField
                fullWidth
                size="small"
                margin="normal"
                variant="outlined"
                id={`${docType}[${docIndex}].document_check_date`}
                name={`${docType}[${docIndex}].document_check_date`}
                label="Document Check Date"
                value={new Date(doc.document_check_date).toLocaleString(
                  "en-US",
                  {
                    timeZone: "Asia/Kolkata",
                    hour12: true,
                  }
                )}
                disabled={true}
                sx={{ mb: 2 }}
              />
            )}
            <TextField
              fullWidth
              size="small"
              margin="normal"
              variant="outlined"
              id={`${docType}[${docIndex}].document_amount_details`}
              name={`${docType}[${docIndex}].document_amount_details`}
              label="Amount Details"
              value={doc.document_amount_details}
              onChange={formik.handleChange}
              sx={{ mb: 2 }}
              type="number"
              inputProps={{ min: 0 }}
            />
            {isSecurityDeposit && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id={`${docType}[${docIndex}].utr`}
                  name={`${docType}[${docIndex}].utr`}
                  label="UTR"
                  value={doc.utr}
                  onChange={formik.handleChange}
                  sx={{ mb: 2 }}
                  type="number"
                  inputProps={{ min: 0 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  type="date"
                  id={`${docType}[${docIndex}].Validity_upto`}
                  name={`${docType}[${docIndex}].Validity_upto`}
                  label="Validity Upto"
                  value={doc.Validity_upto}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
              </>
            )}
          </Col>
        </Row>
        {isShippingInvoice && (
          <>
            <Row style={{ marginTop: 8 }}>
              <Col xs={12} md={6}>
                <FormControl component="fieldset" sx={{ width: "100%" }}>
                  <FormLabel
                    component="legend"
                    sx={{ fontWeight: 500, color: "#333" }}
                  >
                    Payment Mode
                  </FormLabel>
                  <div
                    style={{
                      display: "flex",
                      gap: "32px",
                      marginTop: 12,
                      alignItems: "center",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <input
                          type="radio"
                          checked={doc.payment_mode === "Odex"}
                          onChange={handlePaymentModeChange("Odex")}
                          name={`payment_mode_${docIndex}`}
                          style={{ marginRight: 8 }}
                        />
                      }
                      label={<span style={{ marginLeft: 4 }}>Odex</span>}
                      sx={{ mr: 3 }}
                    />
                    <FormControlLabel
                      control={
                        <input
                          type="radio"
                          checked={doc.payment_mode === "Wire Transfer"}
                          onChange={handlePaymentModeChange("Wire Transfer")}
                          name={`payment_mode_${docIndex}`}
                          style={{ marginRight: 8 }}
                        />
                      }
                      label={
                        <span style={{ marginLeft: 4 }}>Wire Transfer</span>
                      }
                      sx={{ mr: 3 }}
                    />
                  </div>
                  {doc.payment_mode === "Wire Transfer" && (
                    <div
                      style={{
                        marginLeft: "30px",
                        padding: "10px 0 0 0",
                        borderLeft: "2px solid #ddd",
                        marginTop: "10px",
                      }}
                    >
                      <FormLabel
                        component="legend"
                        sx={{ fontWeight: 500, color: "#333" }}
                      >
                        Wire Transfer Method
                      </FormLabel>
                      <div
                        style={{
                          display: "flex",
                          gap: "32px",
                          marginTop: 12,
                          alignItems: "center",
                        }}
                      >
                        {["RTGS", "NEFT", "IMPS"].map((method) => (
                          <FormControlLabel
                            key={method}
                            control={
                              <input
                                type="radio"
                                checked={doc.wire_transfer_method === method}
                                onChange={() =>
                                  formik.setFieldValue(
                                    `do_shipping_line_invoice[${docIndex}].wire_transfer_method`,
                                    method
                                  )
                                }
                                name={`wire_transfer_method_${docIndex}`}
                                style={{ marginRight: 8 }}
                              />
                            }
                            label={
                              <span style={{ marginLeft: 4 }}>{method}</span>
                            }
                            sx={{ mr: 3 }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </FormControl>
              </Col>
              <Col xs={12} md={6}>
                <FormControl component="fieldset" sx={{ width: "100%" }}>
                  <FormLabel
                    component="legend"
                    sx={{ fontWeight: 500, color: "#333" }}
                  >
                    TDS
                  </FormLabel>
                  <div
                    style={{
                      display: "flex",
                      gap: "32px",
                      marginTop: 12,
                      alignItems: "center",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <input
                          type="radio"
                          checked={doc.is_tds}
                          onChange={() => {
                            formik.setFieldValue(
                              `${docType}[${docIndex}].is_tds`,
                              true
                            );
                            formik.setFieldValue(
                              `${docType}[${docIndex}].is_non_tds`,
                              false
                            );
                          }}
                          name={`tds_group_${docIndex}`}
                          style={{ marginRight: 8 }}
                        />
                      }
                      label={<span style={{ marginLeft: 4 }}>TDS</span>}
                      sx={{ mr: 3 }}
                    />
                    <FormControlLabel
                      control={
                        <input
                          type="radio"
                          checked={doc.is_non_tds}
                          onChange={() => {
                            formik.setFieldValue(
                              `${docType}[${docIndex}].is_tds`,
                              false
                            );
                            formik.setFieldValue(
                              `${docType}[${docIndex}].is_non_tds`,
                              true
                            );
                          }}
                          name={`tds_group_${docIndex}`}
                          style={{ marginRight: 8 }}
                        />
                      }
                      label={<span style={{ marginLeft: 4 }}>Non-TDS</span>}
                      sx={{ mr: 3 }}
                    />
                  </div>
                </FormControl>
              </Col>
            </Row>
            <Row style={{ marginTop: 8 }}>
              <Col xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!doc.payment_request_date}
                      onChange={(e) => {
                        const value = e.target.checked
                          ? new Date().toISOString()
                          : "";
                        formik.setFieldValue(
                          `do_shipping_line_invoice[${docIndex}].payment_request_date`,
                          value
                        );
                        formik.setFieldValue(
                          `do_shipping_line_invoice[${docIndex}].is_payment_requested`,
                          e.target.checked
                        );
                      }}
                      name={`do_shipping_line_invoice[${docIndex}].is_payment_requested`}
                      color="primary"
                    />
                  }
                  label={
                    doc.payment_request_date
                      ? `Payment Requested: ${new Date(
                        doc.payment_request_date
                      ).toLocaleString("en-IN", { hour12: true })}`
                      : "Payment Requested"
                  }
                  sx={{ mb: 2 }}
                />
                {/* Show receipt documents below Payment Requested date */}
                {doc.payment_recipt && doc.payment_recipt.length > 0 && (
                  <div style={{ margin: "10px 0" }}>
                    <strong>Payment Receipt:</strong>
                    <div>
                      {doc.payment_recipt.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#007bff",
                            textDecoration: "underline",
                            display: "block",
                            marginTop: "4px",
                          }}
                        >
                          Receipt {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Col>
              <Col xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!doc.payment_made_date}
                      disabled={true}
                      name={`do_shipping_line_invoice[${docIndex}].is_payment_made`}
                      color="primary"
                    />
                  }
                  label={
                    doc.payment_made_date
                      ? `Payment Made: ${new Date(
                        doc.payment_made_date
                      ).toLocaleString("en-IN", { hour12: true })}`
                      : "Payment Made"
                  }
                  sx={{ mb: 2 }}
                />
              </Col>
            </Row>
          </>
        )}
      </div>
    );
  };

  const handleCopy = useCallback((event, text) => {
    // Optimized handleCopy function using useCallback to avoid re-creation on each render
    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

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

  // Handle checkbox change for do_completed
  const handleCheckboxChange = (event) => {
    if (event.target.checked) {
      // Set to current local date and time in 'YYYY-MM-DDTHH:MM' format
      const localDatetime = getLocalDatetimeString();
      formik.setFieldValue("do_completed", localDatetime);
    } else {
      // Set to empty string
      formik.setFieldValue("do_completed", "");
    }
  };

  // Handle admin date change
  const handleAdminDateChange = (event) => {
    formik.setFieldValue("do_completed", event.target.value);
  };

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
                <a
                  href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "blue", textDecoration: "none" }}
                >
                  {container.container_number || "N/A"}{" "}
                </a>
                | "{container.size}"
              </span>
            </strong>
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, container.container_number)}
            >
              <abbr title="Copy Container Number">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
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

  // Fix 7: Add loading state and error handling before return
  if (!job_no || !year) {
    return (
      <div>
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
        <div>Error: Missing job_no or year parameters in URL</div>
      </div>
    );
  }

  return (
    <>
      {/* Back to Job List Button */}
      <Box sx={{ position: "fixed", top: 80, left: 80, zIndex: 999 }}>
        <Button
          variant="contained"
          onClick={handleBackClick}
          sx={{
            backgroundColor: "#1976d2",
            color: "white",
            "&:hover": {
              backgroundColor: "#333",
            },
          }}
        >
          Back to Job List
        </Button>
      </Box>

      {data && <JobDetailsStaticData data={data} params={{ job_no, year }} />}

      {data && data.dsr_queries && (
        <div>
          <QueriesComponent
            queries={data.dsr_queries}
            currentModule="Do Completed"
            onQueriesChange={handleQueriesChange}
            title="DO Queries"
            showResolveButton={true}
            readOnlyReply={false}
            onResolveQuery={handleResolveQuery}
            userName={user?.username}
          />
        </div>
      )}

      <div style={{ margin: "20px 0" }}>
        {data && (
          <div>
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

              {/* DO Completed Section with Date Display and Admin Input */}
              <div className="job-details-container">
                <Row>
                  <Col xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formik.values.do_completed !== ""}
                          onChange={handleCheckboxChange}
                          disabled={true} // Disable based on derived state
                          name="do_completed"
                          color="primary"
                        />
                      }
                      label="DO Completed"
                    />
                    {formik.values.do_completed && (
                      <span
                        style={{
                          marginLeft: "10px",
                          fontWeight: "bold",
                        }}
                      >
                        {new Date(formik.values.do_completed).toLocaleString(
                          "en-US",
                          {
                            timeZone: "Asia/Kolkata",
                            hour12: true,
                          }
                        )}
                      </span>
                    )}
                  </Col>
                  {user?.role === "Admin" && (
                    <Col xs={12} md={6}>
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
                        onChange={handleAdminDateChange}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        disabled={true} // Disable based on derived state
                      />
                    </Col>
                  )}
                </Row>
              </div>

              <br />
              <div className="job-details-container">
                <JobDetailsRowHeading heading="Container Details" />

                {renderContainerDetails()}
              </div>

              {renderChargesSection()}
              <button
                className="btn sticky-btn"
                type="submit"
                style={{ float: "right", margin: "10px" }}
                aria-label="submit-btn"
              >
                Submit
              </button>
            </form>

            <Snackbar
              open={fileSnackbar}
              autoHideDuration={3000}
              onClose={() => setFileSnackbar(false)}
              message={"File uploaded successfully!"}
              sx={{ left: "auto !important", right: "24px !important" }}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default React.memo(EditDoCompleted);

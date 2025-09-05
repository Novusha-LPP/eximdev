import React, { useContext, useEffect, useRef, useState } from "react";
import { Checkbox, FormControlLabel, Button, Box, CircularProgress } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import { Row, Col } from "react-bootstrap";
import { TabContext } from "./ImportDO";
import { UserContext } from "../../contexts/UserContext";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSearchParams } from "react-router-dom";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import QueriesComponent from "../../utils/QueriesComponent";
import {
  TextField,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";

function EditDoList() {
  // CSS styles for upload containers
  const uploadContainerStyles = `
    .upload-container {
      border: 2px solid #e3e8ef;
      border-radius: 12px;
      padding: 20px;
      background-color: #ffffff;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e3e8ef;
    }
    
    .form-field {
      margin-bottom: 16px;
    }
    
    .field-label {
      display: block;
      margin-bottom: 6px;
      color: #4a5568;
      font-size: 14px;
      font-weight: 500;
    }
    
    .submit-section {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
    }
    
    .submit-btn {
      background: linear-gradient(135deg, #1d1e22ff 0%, #5e5b61ff 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 300px;
    }
  `;

  const param = useParams();
  const { job_no, year } = param;

  const [fileSnackbar, setFileSnackbar] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState(false);
  const [jobDetails, setJobDetails] = React.useState({
    job_no: "",
    importer: "",
    awb_bl_no: "",
  });
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [showWireTransferOptions, setShowWireTransferOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const location = useLocation();
  const [params] = useSearchParams();
  const jobId = params.get("jobId");
  const navigate = useNavigate();
  const { setCurrentTab } = useContext(TabContext);
  const { user } = useContext(UserContext);
  const [data, setData] = useState(null);
  const [storedSearchParams, setStoredSearchParams] = React.useState(null);

  // Store search parameters from location state
  React.useEffect(() => {
    if (location.state) {
      const {
        jobId,
        searchQuery,
        selectedImporter,
        selectedICD,
        selectedYearState,
        fromJobList,
        currentTab,
        currentPage,
      } = location.state;

      const params = {
        jobId,
        searchQuery,
        selectedImporter,
        selectedICD,
        selectedYearState,
        fromJobList,
        currentTab: currentTab ?? 1,
        currentPage,
      };
      setStoredSearchParams(params);
    }
  }, [location.state]);

  // Handle back to job list navigation
  const handleBackToJobList = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 1;
    setCurrentTab(tabIndex);

    navigate("/import-do", {
      state: {
        tabIndex: tabIndex,
        fromJobDetails: true,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          selectedImporter: storedSearchParams.selectedImporter,
          selectedICD: storedSearchParams.selectedICD,
          selectedYearState: storedSearchParams.selectedYearState,
          jobId: storedSearchParams.jobId,
          currentPage: storedSearchParams.currentPage,
        }),
      },
    });
  };

  // Fetch data from both APIs and merge them
  useEffect(() => {
    async function fetchAllData() {
      if (!jobId || !year || !job_no) {
        setError("Missing required parameters");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch data from both APIs in parallel
        const [jobRes, kycRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_STRING}/get-job/${year}/${job_no}`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-kyc-and-bond-status/${jobId}`)
        ]);

        // Merge the data from both APIs
        const mergedData = {
          ...jobRes.data,
          ...kycRes.data,
          // Ensure arrays exist
          kyc_documents: kycRes.data.kyc_documents || [],
          shipping_line_bond_docs: kycRes.data.shipping_line_bond_docs || [],
          shipping_line_insurance: kycRes.data.shipping_line_insurance || [],
          do_shipping_line_invoice: jobRes.data.do_shipping_line_invoice || [],
          insurance_copy: jobRes.data.insurance_copy || [],
          other_do_documents: jobRes.data.other_do_documents || [],
          do_copies: jobRes.data.do_copies || [],
        };

        setData(mergedData);
        setJobDetails({
          job_no: mergedData.job_no,
          importer: mergedData.importer,
          awb_bl_no: mergedData.awb_bl_no,
        });

        // Set formik values
        formik.setValues({
          shipping_line_kyc_completed: mergedData.shipping_line_kyc_completed === "Yes",
          shipping_line_bond_completed: mergedData.shipping_line_bond_completed === "Yes",
          shipping_line_invoice_received: mergedData.shipping_line_invoice_received === "Yes",
          kyc_documents: mergedData.kyc_documents,
          kyc_valid_upto: mergedData.kyc_valid_upto || "",
          shipping_line_bond_valid_upto: mergedData.shipping_line_bond_valid_upto || "",
          shipping_line_bond_docs: mergedData.shipping_line_bond_docs,
          shipping_line_bond_charges: mergedData.shipping_line_bond_charges || "",
          shipping_line_insurance: mergedData.shipping_line_insurance,
          do_shipping_line_invoice: mergedData.do_shipping_line_invoice.length > 0 
            ? mergedData.do_shipping_line_invoice 
            : [{
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
              }],
          insurance_copy: mergedData.insurance_copy.length > 0 
            ? mergedData.insurance_copy 
            : [{
                document_name: "Insurance",
                url: [],
                document_check_date: "",
                document_amount_details: "",
              }],
          other_do_documents: mergedData.other_do_documents,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please try again.");
        setLoading(false);
      }
    }

    fetchAllData();
  }, [jobId, year, job_no]);

  const handleQueriesChange = (updatedQueries) => {
    setData((prev) => ({
      ...prev,
      dsr_queries: updatedQueries,
    }));
  };

  const handleResolveQuery = (resolvedQuery, index) => {
    console.log("Query resolved:", resolvedQuery);
  };

  const getCurrentISOString = () => {
    return new Date().toISOString();
  };

  const formik = useFormik({
    initialValues: {
      shipping_line_bond_completed: false,
      shipping_line_kyc_completed: false,
      shipping_line_invoice_received: false,
      kyc_documents: [],
      kyc_valid_upto: "",
      shipping_line_bond_valid_upto: "",
      shipping_line_bond_docs: [],
      shipping_line_bond_charges: "",
      shipping_line_insurance: [],
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
      do_copies: [],
    },

    onSubmit: async (values, { resetForm }) => {
      try {
        const data = {
          ...values,
          _id: jobId,
          shipping_line_bond_completed: values.shipping_line_bond_completed
            ? "Yes"
            : "No",
          shipping_line_kyc_completed: values.shipping_line_kyc_completed
            ? "Yes"
            : "No",
          shipping_line_invoice_received: values.shipping_line_invoice_received
            ? "Yes"
            : "No",
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
        };
        
        // Get user info from localStorage for audit trail
        const username =
          user?.username || localStorage.getItem("username") || "unknown";
        const userId =
          user?.jobId || localStorage.getItem("userId") || "unknown";
        const userRole =
          user?.role || localStorage.getItem("userRole") || "unknown";
        const headers = {
          "Content-Type": "application/json",
          "user-id": userId,
          username: username,
          "user-role": userRole,
        };

        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-do-list`,
          data,
          { headers }
        );

        setSnackbar(true);
      } catch (error) {
        console.error("Error updating job:", error);
      }
          setTimeout(() => {
          window.close();
        }, 500);
    },
  });

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

  // Draft/Final radio button handler
  const handleDraftFinalChange = (docIndex, type) => (e) => {
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

  // Handle wire transfer method change
  const handleWireTransferMethodChange = (docIndex, method) => (e) => {
    formik.setFieldValue(
      `do_shipping_line_invoice[${docIndex}].wire_transfer_method`,
      method
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

    // Add additional fields based on document type
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
      newDocument.validity_upto = "";
    }

    // Determine which array to add to
    if (selectedDocumentType === "Shipping Line Invoice") {
      const currentDocs = [...formik.values.do_shipping_line_invoice];
      currentDocs.push(newDocument);
      formik.setFieldValue("do_shipping_line_invoice", currentDocs);
    } else if (selectedDocumentType === "Insurance") {
      const currentDocs = [...formik.values.insurance_copy];
      currentDocs.push(newDocument);
      formik.setFieldValue("insurance_copy", currentDocs);
    } else {
      const currentDocs = [...formik.values.other_do_documents];
      currentDocs.push(newDocument);
      formik.setFieldValue("other_do_documents", currentDocs);
    }

    setSelectedDocumentType("");
  };

  // Add function to handle document removal
  const handleRemoveDocument = (docType, index) => {
    if (docType === "do_shipping_line_invoice") {
      const currentDocs = [...formik.values.do_shipping_line_invoice];
      currentDocs.splice(index, 1);
      formik.setFieldValue("do_shipping_line_invoice", currentDocs);
    } else if (docType === "insurance_copy") {
      const currentDocs = [...formik.values.insurance_copy];
      currentDocs.splice(index, 1);
      formik.setFieldValue("insurance_copy", currentDocs);
    } else if (docType === "other_do_documents") {
      const currentDocs = [...formik.values.other_do_documents];
      currentDocs.splice(index, 1);
      formik.setFieldValue("other_do_documents", currentDocs);
    }
  };

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
      {/* DO Copies Row - show below security deposit */}
      <Row>
        <Col>
          <h6
            style={{ marginBottom: "8px", fontWeight: 600, color: "#1a237e" }}
          >
            DO Copies
          </h6>
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

      <br></br>

      {/* Render all other documents */}
      {formik.values.other_do_documents.map((doc, index) =>
        renderDocumentSection(doc, index, "other_do_documents", true, user)
      )}
      
      {/* Dropdown and Add Document Button */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          border: "2px dashed #ccc",
          borderRadius: "5px",
        }}
      >
        <Row className="g-3" style={{ alignItems: "center" }}>
          {/* Document Type Select */}
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

          {/* Add Document Button */}
          <Col xs={12} md={6}>
            <Button
              variant="contained"
              onClick={handleAddDocument}
              disabled={!selectedDocumentType}
              fullWidth
              style={{ height: "40px" }}
            >
              Add Document
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  );

  const renderDocumentSection = (
    doc,
    docIndex,
    docType,
    isRemovable = false,
    user
  ) => {
    const isShippingInvoice = docType === "do_shipping_line_invoice";
    const bucketPath =
      docType === "do_shipping_line_invoice"
        ? "do_shipping_line_invoice"
        : docType === "insurance_copy"
        ? "insurance_copy"
        : "other_do_documents";
    
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
                        onChange={handleDraftFinalChange(docIndex, "draft")}
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
                        onChange={handleDraftFinalChange(docIndex, "final")}
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
                onChange={(e) =>
                  formik.setFieldValue(
                    `${docType}[${docIndex}].document_name`,
                    e.target.value
                  )
                }
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
            {/* Document Check Status */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={doc.document_check_status || false}
                  onChange={handleDocumentCheckChange(docIndex, docType)}
                  name={`${docType}[${docIndex}].document_check_status`}
                  disabled={true}
                  color="primary"
                />
              }
              label={<span style={{ fontWeight: 500 }}>Document Checked</span>}
              sx={{ mb: 1 }}
            />
            
            {/* Disabled Document Check Date field */}
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
            
            {/* Amount Details as number only */}
            <TextField
              fullWidth
              size="small"
              margin="normal"
              variant="outlined"
              id={`${docType}[${docIndex}].document_amount_details`}
              name={`${docType}[${docIndex}].document_amount_details`}
              label="Amount Details"
              value={doc.document_amount_details}
              onChange={(e) =>
                formik.setFieldValue(
                  `${docType}[${docIndex}].document_amount_details`,
                  e.target.value.replace(/[^0-9.]/g, "")
                )
              }
              sx={{ mb: 2 }}
              type="number"
              inputProps={{ min: 0 }}
            />
          
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
                          onChange={handlePaymentModeChange(docIndex, "Odex")}
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
                          onChange={handlePaymentModeChange(
                            docIndex,
                            "Wire Transfer"
                          )}
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
                                onChange={handleWireTransferMethodChange(docIndex, method)}
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
                      disabled = {true}
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

  if (!job_no || !year) {
    return (
      <div>
        <Box sx={{ position: "fixed", top: 80, left: 80, zIndex: 999 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToJobList}
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
        <div>Error: Missing job_no or year parameters in URL</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <style>{uploadContainerStyles}</style>
        <div className="loading-container">
          <CircularProgress />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <style>{uploadContainerStyles}</style>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleBackToJobList}
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
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div>
      <style>{uploadContainerStyles}</style>
      {/* Back to Job List Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={handleBackToJobList}
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
            currentModule="Do List"
            onQueriesChange={handleQueriesChange}
            title="Do Queries"
            showResolveButton={true}
            readOnlyReply={false}
            onResolveQuery={handleResolveQuery}
            userName={user?.username}
          />
        </div>
      )}
      <form onSubmit={formik.handleSubmit}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.shipping_line_bond_completed}
              onChange={formik.handleChange}
              name="shipping_line_bond_completed"
              color="primary"
            />
          }
          label="Shipping line bond completed"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.shipping_line_kyc_completed}
              onChange={formik.handleChange}
              name="shipping_line_kyc_completed"
              color="primary"
            />
          }
          label="Shipping line KYC completed"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.shipping_line_invoice_received}
              onChange={formik.handleChange}
              name="shipping_line_invoice_received"
              color="primary"
            />
          }
          label="Shipping line invoice received"
        />

        <Row className="row">
          <Col className="col-md-4">
            <div className="upload-container">
              <div className="section-header">
                <h6>KYC Documents</h6>
              </div>

              <div className="form-field">
                <label className="field-label">KYC Valid Until</label>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  type="date"
                  id="kyc_valid_upto"
                  name="kyc_valid_upto"
                  placeholder="dd/mm/yyyy"
                  value={formik.values.kyc_valid_upto}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </div>

              <FileUpload
                label="Upload KYC Documents"
                bucketPath="kyc_documents"
                onFilesUploaded={(newFiles) => {
                  const existingFiles = formik.values.kyc_documents || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  formik.setFieldValue("kyc_documents", updatedFiles);
                  setFileSnackbar(true);
                }}
                multiple={true}
              />
              <ImagePreview
                images={formik.values.kyc_documents || []}
                onDeleteImage={(index) => {
                  const updatedFiles = [...formik.values.kyc_documents];
                  updatedFiles.splice(index, 1);
                  formik.setFieldValue("kyc_documents", updatedFiles);
                }}
              />
            </div>
          </Col>

          <Col className="col-md-4">
            <div className="upload-container">
              <div className="section-header">
                <h6>Shipping Line Bond Documents</h6>
              </div>

              <div className="form-field">
                <label className="field-label">Bond Charges (Optional)</label>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  id="shipping_line_bond_charges"
                  name="shipping_line_bond_charges"
                  placeholder="Enter bond charges"
                  value={formik.values.shipping_line_bond_charges}
                  onChange={formik.handleChange}
                />
              </div>

              <FileUpload
                label="Upload Bond Documents"
                bucketPath="shipping_line_bond_docs"
                onFilesUploaded={(newFiles) => {
                  const existingFiles =
                    formik.values.shipping_line_bond_docs || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  formik.setFieldValue("shipping_line_bond_docs", updatedFiles);
                  setFileSnackbar(true);
                }}
                multiple={true}
              />
              <ImagePreview
                images={formik.values.shipping_line_bond_docs || []}
                onDeleteImage={(index) => {
                  const updatedFiles = [
                    ...formik.values.shipping_line_bond_docs,
                  ];
                  updatedFiles.splice(index, 1);
                  formik.setFieldValue("shipping_line_bond_docs", updatedFiles);
                }}
              />
            </div>
          </Col>

          <Col className="col-md-4">
            <div className="upload-container">
              <div className="section-header">
                <h6>Shipping Line Insurance</h6>
              </div>

              <div className="form-field">
                <label className="field-label">Bond Valid Until</label>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  type="date"
                  id="shipping_line_bond_valid_upto"
                  name="shipping_line_bond_valid_upto"
                  placeholder="dd/mm/yyyy"
                  value={formik.values.shipping_line_bond_valid_upto}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </div>

              <FileUpload
                label="Upload Insurance Documents"
                bucketPath="shipping_line_insurance"
                onFilesUploaded={(newFiles) => {
                  const existingFiles =
                    formik.values.shipping_line_insurance || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  formik.setFieldValue("shipping_line_insurance", updatedFiles);
                  setFileSnackbar(true);
                }}
                multiple={true}
              />
              <ImagePreview
                images={formik.values.shipping_line_insurance || []}
                onDeleteImage={(index) => {
                  const updatedFiles = [
                    ...formik.values.shipping_line_insurance,
                  ];
                  updatedFiles.splice(index, 1);
                  formik.setFieldValue("shipping_line_insurance", updatedFiles);
                }}
              />
            </div>
          </Col>
        </Row>
        
        {renderChargesSection()}

        <div className="submit-section">
          <button className="submit-btn" type="submit" aria-label="submit-btn">
            Submit Documents
          </button>
        </div>
      </form>

      <Snackbar
        open={snackbar || fileSnackbar}
        message={
          snackbar ? "Submitted successfully!" : "File uploaded successfully!"
        }
        sx={{ left: "auto !important", right: "24px !important" }}
        onClose={() => {
          setSnackbar(false);
          setFileSnackbar(false);
        }}
      />
    </div>
  );
}

export default React.memo(EditDoList);
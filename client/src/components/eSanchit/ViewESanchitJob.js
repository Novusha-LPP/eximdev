import axios from "axios";
import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import Snackbar from "@mui/material/Snackbar";
import {
  TextField,
  Checkbox,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import ConfirmDialog from "../../components/gallery/ConfirmDialog";
import { useFormik } from "formik";
import { UserContext } from "../../contexts/UserContext";
import { TabContext } from "../eSanchit/ESanchitTab.js";
import { useLocation } from "react-router-dom";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import QueriesComponent from "../../utils/QueriesComponent.js";

const cth_Dropdown = [
  { document_name: "Certificate of Origin", document_code: "861000" },
  { document_name: "Contract", document_code: "315000" },
  { document_name: "Insurance", document_code: "91WH13" },
  {
    document_name: "Pre-Shipment Inspection Certificate",
    document_code: "856001",
  },
  { document_name: "Form 9 & Form 6", document_code: "0856001" },
  {
    document_name: "Registration Document (SIMS/NFMIMS/PIMS)",
    document_code: "101000",
  },
  { document_name: "Certificate of Analysis", document_code: "001000" },
];

const compactInputSx = {
  "& .MuiOutlinedInput-root": { height: "32px" },
  "& .MuiOutlinedInput-input": { padding: "6px 8px", fontSize: "0.8rem" },
  "& .MuiInputLabel-root": { fontSize: "0.8rem", top: "-4px" },
  "& .MuiInputLabel-shrink": { top: "0px" }
};

function ViewESanchitJob() {
  const routeLocation = useLocation();
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [data, setData] = useState({ cth_documents: [], esanchitCharges: [] });
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState(false); // true for edit, false for delete
  const [editDocument, setEditDocument] = useState(null);

  // Charges section state
  const [esanchitCharges, setEsanchitCharges] = useState([
    {
      document_name: "NFIMS/SIMS",
      url: [],
      document_check_date: "",
      document_charge_refrence_no: "",
      document_charge_recipt_copy: "",
    },
    {
      document_name: "PIMS",
      url: [],
      document_check_date: "",
      document_charge_refrence_no: "",
      document_charge_recipt_copy: "",
    },
  ]);

  const params = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { setCurrentTab } = useContext(TabContext);
  const isTrue = routeLocation.state?.currentTab || false;

  // Add stored search parameters state
  const [storedSearchParams, setStoredSearchParams] = useState(null);
  const {
    setSearchQuery,
    setSelectedImporter,
    setCurrentPageTab0,
    setCurrentPageTab1,
  } = useSearchQuery();

  const isAdmin = user.role === "Admin"; // Check if user is an Admin
  const isDisabled = !isAdmin && isTrue === 1;

  // Store search parameters from location state
  useEffect(() => {
    if (routeLocation.state) {
      const {
        searchQuery,
        selectedImporter,
        currentTab,
        selectedJobId,
        selectedICD,
        selectedYearState,
        detailedStatusExPlan,
        currentPage,
        tab_number,
      } = routeLocation.state;

      const params = {
        searchQuery,
        selectedImporter,
        currentTab: currentTab || tab_number, // Handle both property names
        selectedJobId,
        selectedICD,
        selectedYearState,
        detailedStatusExPlan,
        currentPage,
      };

      setStoredSearchParams(params);
    }
  }, [routeLocation.state]); // Handle back click function
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 0;
    // Set the current tab in context
    setCurrentTab(tabIndex);

    navigate("/e-sanchit", {
      state: {
        fromJobDetails: true,
        tabIndex: tabIndex,
        selectedJobId: params.job_no,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          selectedImporter: storedSearchParams.selectedImporter,
          selectedICD: storedSearchParams.selectedICD,
          selectedYearState: storedSearchParams.selectedYearState,
          detailedStatusExPlan: storedSearchParams.detailedStatusExPlan,
          currentPage: storedSearchParams.currentPage,
        }),
      },
    });
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
  // Fetch data
  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-esanchit-job/${params.job_no}/${params.year}`
        );
        const jobData = res.data || { cth_documents: [], esanchitCharges: [] };
        setData(jobData);

        // Initialize esanchitCharges with data from database
        if (jobData.esanchitCharges && jobData.esanchitCharges.length > 0) {
          setEsanchitCharges(jobData.esanchitCharges);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    getData();
  }, [params.job_no, params.year]);

  // Formik setup
  // Formik setup
  const formik = useFormik({
    initialValues: {
      cth_documents: data.cth_documents || [],
      esanchitCharges: esanchitCharges || [],
      queries: data.eSachitQueries || [{ query: "", reply: "" }],
      dsr_queries: data.dsr_queries || [],
      esanchit_completed_date_time: data.esanchit_completed_date_time || "",
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const formattedData = {
          cth_documents: values.cth_documents,
          esanchitCharges: values.esanchitCharges,
          queries: values.queries,
          esanchit_completed_date_time: values.esanchit_completed_date_time || "",
          dsr_queries: values.dsr_queries || [],
        };

        // Get user info from localStorage for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-esanchit-job/${params.job_no}/${params.year}`,
          formattedData,
          { headers }
        );

        // Update local data state to reflect the saved value
        setData(prev => ({
          ...prev,
          esanchit_completed_date_time: values.esanchit_completed_date_time
        }));

        setSnackbar(true);

        // Close the tab after successful submit
        setTimeout(() => {
          window.close();
        }, 500);
      } catch (error) {
        console.error("Error updating job:", error);
      }
    },
  });


  const renderAllDocuments = (documents) => {
    if (!documents || documents.length === 0) {
      return <p>No documents uploaded yet.</p>;
    }

    return (
      <div className="table-responsive">
        <table className="table table-bordered table-hover" style={{ backgroundColor: "#fff", fontSize: "0.9rem" }}>
          <thead style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              <th style={{ width: "80%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>File Name</th>
              <th style={{ width: "20%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((url, index) => (
              <tr key={index}>
                <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                  <div style={{ fontWeight: "600", color: "#212529" }}>{extractFileName(url)}</div>
                </td>
                <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "#1976d2", fontWeight: "600" }}
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const extractFileName = (url) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return url; // Fallback to original URL
    }
  };

  // Only consider docs that are sent to e-sanchit
  const getRelevantDocs = () =>
    (formik.values.cth_documents || []).filter(
      (doc) => doc.is_sent_to_esanchit
    );

  // Check if all relevant docs have IRN and Approved date
  const areAllApproved = () => {
    const docs = getRelevantDocs();
    if (docs.length === 0) return false; // no docs -> not completed

    return docs.every(
      (doc) =>
        !!doc.irn &&
        doc.irn.trim() !== "" &&
        !!doc.document_check_date
    );
  };

  // Get the latest approved document date among relevant docs
  const getLatestApprovedDate = () => {
    const approvedDocs = getRelevantDocs()
      .filter((doc) => doc.document_check_date)
      .map((doc) => new Date(doc.document_check_date))
      .sort((a, b) => b - a); // latest first

    return approvedDocs.length > 0 ? approvedDocs[0] : null;
  };

  // Auto-update esanchit_completed_date_time from CTH docs
  useEffect(() => {
    const docs = getRelevantDocs();

    // If no relevant docs at all, always clear
    if (docs.length === 0) {
      if (formik.values.esanchit_completed_date_time) {
        formik.setFieldValue("esanchit_completed_date_time", "");
      }
      return;
    }

    if (areAllApproved()) {
      const latestApprovedDate = getLatestApprovedDate();
      if (latestApprovedDate) {
        // Normalize to local datetime-local string (yyyy-MM-ddTHH:mm)
        const localISO = new Date(
          latestApprovedDate.getTime() -
          latestApprovedDate.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16);

        if (formik.values.esanchit_completed_date_time !== localISO) {
          formik.setFieldValue("esanchit_completed_date_time", localISO);
        }
      }
    } else {
      // NOT all approved -> clear completion time, even if it exists in DB
      if (formik.values.esanchit_completed_date_time) {
        formik.setFieldValue("esanchit_completed_date_time", "");
      }
    }
  }, [formik.values.cth_documents]); // keep deps as just docs


  // Sync esanchitCharges state with formik values
  useEffect(() => {
    formik.setFieldValue("esanchitCharges", esanchitCharges);
  }, [esanchitCharges]);

  const handleOpenDialog = (document, isEdit) => {
    setDialogMode(isEdit);
    setEditDocument({ ...document, originalCode: document.document_code });
    setDialogOpen(true);
  };

  const handleDeleteDocument = () => {
    const updatedDocuments = formik.values.cth_documents.filter(
      (d) => d.document_code !== editDocument.document_code
    );
    formik.setFieldValue("cth_documents", updatedDocuments);
    setDialogOpen(false);
  };

  const handleEditDocument = () => {
    const updatedDocuments = formik.values.cth_documents.map((document) =>
      document.document_code === editDocument.originalCode // Use the original code to identify the document
        ? { ...document, ...editDocument } // Update both name and code
        : document
    );
    formik.setFieldValue("cth_documents", updatedDocuments);
    setDialogOpen(false);
  };

  const addDocument = () => {
    if (
      selectedDocument === "other" &&
      newDocumentName.trim() &&
      newDocumentCode.trim()
    ) {
      formik.setFieldValue("cth_documents", [
        ...formik.values.cth_documents,
        {
          document_name: newDocumentName,
          document_code: newDocumentCode,
          url: [],
          irn: "",
          document_check_date: "",
        },
      ]);
      setNewDocumentName("");
      setNewDocumentCode("");
    } else if (selectedDocument) {
      const doc = cth_Dropdown.find(
        (d) => d.document_code === selectedDocument
      );
      formik.setFieldValue("cth_documents", [
        ...formik.values.cth_documents,
        {
          document_name: doc.document_name,
          document_code: doc.document_code,
          url: [],
          irn: "",
          document_check_date: "",
        },
      ]);
    }
    setSelectedDocument("");
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      {/* Back Button */}
      <Box sx={{ mb: 2 }}>
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

      <div style={{ margin: "20px 0" }}>
        {data && (
          <>
            <JobDetailsStaticData
              data={data}
              params={params}
              setSnackbar={setSnackbar}
            />

            <div>
              <QueriesComponent
                queries={data.dsr_queries}
                currentModule="E-Sanchit"
                onQueriesChange={handleQueriesChange}
                title="E-sanchit Queries"
                showResolveButton={true}
                readOnlyReply={false}
                onResolveQuery={handleResolveQuery}
                userName={user?.username}
              />
            </div>

            {/* Charges section */}
            <div className="job-details-container">
              <h4>Charges</h4>
              <div className="table-responsive">
                <table className="table table-bordered table-hover" style={{ backgroundColor: "#fff", fontSize: "0.9rem" }}>
                  <thead style={{ backgroundColor: "#f8f9fa" }}>
                    <tr>
                      <th style={{ width: "20%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Document Name</th>
                      <th style={{ width: "20%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Ref No</th>
                      <th style={{ width: "20%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Receipt Copy</th>
                      <th style={{ width: "1%", fontWeight: "600", color: "#495057", padding: "4px 8px", whiteSpace: "nowrap" }}>Upload</th>
                      <th style={{ width: "auto", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formik.values.esanchitCharges?.map((charge, index) => (
                      <tr key={index}>
                        <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                          <div style={{ fontWeight: "600", color: "#212529" }}>{charge.document_name}</div>
                        </td>
                        <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                          <TextField
                            size="small"
                            placeholder="Ref No"
                            name={`esanchitCharges[${index}].document_charge_refrence_no`}
                            value={formik.values.esanchitCharges[index]?.document_charge_refrence_no || ""}
                            onChange={formik.handleChange}
                            fullWidth
                            type="number"
                            disabled={isDisabled}
                            sx={compactInputSx}
                            InputProps={{ disableUnderline: true }}
                          />
                        </td>
                        <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                          <TextField
                            size="small"
                            placeholder="Receipt Copy"
                            name={`esanchitCharges[${index}].document_charge_recipt_copy`}
                            value={formik.values.esanchitCharges[index]?.document_charge_recipt_copy || ""}
                            onChange={formik.handleChange}
                            fullWidth
                            type="number"
                            disabled={isDisabled}
                            sx={compactInputSx}
                            InputProps={{ disableUnderline: true }}
                          />
                        </td>
                        <td style={{ verticalAlign: "middle", padding: "4px 8px", whiteSpace: "nowrap" }}>
                          <FileUpload
                            label="Upload"
                            bucketPath={`esanchit-charges/${charge.document_name}`}
                            onFilesUploaded={(urls) => {
                              const updatedCharges = [...formik.values.esanchitCharges];
                              updatedCharges[index].url = [...(updatedCharges[index].url || []), ...urls];
                              formik.setFieldValue("esanchitCharges", updatedCharges);
                              setFileSnackbar(true);
                            }}
                            multiple={true}
                            readOnly={isDisabled}
                            containerStyles={{ marginTop: 0 }}
                            buttonSx={{ fontSize: "0.75rem", padding: "2px 10px", minWidth: "auto", textTransform: "none" }}
                          />
                        </td>
                        <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                          <ImagePreview
                            images={charge.url || []}
                            onDeleteImage={(deleteIndex) => {
                              const updatedCharges = [...formik.values.esanchitCharges];
                              updatedCharges[index].url.splice(deleteIndex, 1);
                              formik.setFieldValue("esanchitCharges", updatedCharges);
                            }}
                            readOnly={isDisabled}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="job-details-container">
              <h4>Documents</h4>
              <div className="table-responsive">
                <table className="table table-bordered table-hover" style={{ backgroundColor: "#fff", fontSize: "0.9rem" }}>
                  <thead style={{ backgroundColor: "#f8f9fa" }}>
                    <tr>
                      <th style={{ width: "20%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Document Name</th>
                      <th style={{ width: "20%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>IRN</th>
                      <th style={{ width: "20%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Approved Date</th>
                      <th style={{ width: "1%", fontWeight: "600", color: "#495057", padding: "4px 8px", whiteSpace: "nowrap" }}>Upload</th>
                      <th style={{ width: "auto", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formik.values.cth_documents
                      ?.filter(document => document.is_sent_to_esanchit === true)
                      ?.map((document, index) => {
                        const originalIndex = formik.values.cth_documents.findIndex(
                          doc => doc.document_code === document.document_code &&
                            doc.document_name === document.document_name
                        );

                        return (
                          <tr key={index}>
                            <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontWeight: "600", color: "#212529" }}>{document.document_name}</div>
                                  <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>({document.document_code})</div>
                                </div>
                                <div style={{ display: "flex", gap: "2px" }}>
                                  {!isDisabled && (
                                    <>
                                      <span
                                        style={{ cursor: "pointer", marginRight: "10px", color: "#007bff" }}
                                        onClick={() => handleOpenDialog(document, true)}
                                      >
                                        <i className="fas fa-edit" title="Edit"></i>
                                      </span>
                                      <span
                                        style={{ cursor: "pointer", color: "#dc3545" }}
                                        onClick={() => handleOpenDialog(document, false)}
                                      >
                                        <i className="fas fa-trash-alt" title="Delete"></i>
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                              <TextField
                                size="small"
                                placeholder="IRN"
                                name={`cth_documents[${originalIndex}].irn`}
                                value={document.irn || ""}
                                onChange={(e) => {
                                  const updatedDocuments = [...formik.values.cth_documents];
                                  updatedDocuments[originalIndex].irn = e.target.value;
                                  formik.setFieldValue("cth_documents", updatedDocuments);
                                }}
                                fullWidth
                                disabled={isDisabled}
                                sx={compactInputSx}
                                InputProps={{ disableUnderline: true }}
                              />
                            </td>
                            <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <Checkbox
                                  checked={!!document.document_check_date}
                                  onChange={() => {
                                    const updatedDocuments = [...formik.values.cth_documents];
                                    if (updatedDocuments[originalIndex].document_check_date) {
                                      updatedDocuments[originalIndex].document_check_date = "";
                                    } else {
                                      updatedDocuments[originalIndex].document_check_date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    }
                                    formik.setFieldValue("cth_documents", updatedDocuments);
                                  }}
                                  disabled={isDisabled}
                                  size="small"
                                  style={{ padding: 0 }}
                                />
                                {document.document_check_date ? (
                                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#28a745" }}>
                                    {new Date(document.document_check_date).toLocaleString("en-US", {
                                      timeZone: "Asia/Kolkata",
                                      hour12: true,
                                      year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit"
                                    })}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>Not Approved</span>
                                )}
                              </div>
                              {user.role === "Admin" && (
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="datetime-local"
                                  name={`cth_documents[${originalIndex}].document_check_date`}
                                  value={document.document_check_date || ""}
                                  onChange={(e) => {
                                    const updatedDocuments = [...formik.values.cth_documents];
                                    updatedDocuments[originalIndex].document_check_date = e.target.value;
                                    formik.setFieldValue("cth_documents", updatedDocuments);
                                  }}
                                  disabled={isDisabled}
                                  sx={{ ...compactInputSx, marginTop: "4px", maxWidth: "250px" }}
                                />
                              )}
                            </td>
                            <td style={{ verticalAlign: "middle", padding: "4px 8px", whiteSpace: "nowrap" }}>
                              <FileUpload
                                label="Upload"
                                bucketPath={`cth-documents/${document.document_name}`}
                                onFilesUploaded={(urls) => {
                                  const updatedDocuments = [...formik.values.cth_documents];
                                  updatedDocuments[originalIndex].url = [...(updatedDocuments[originalIndex].url || []), ...urls];
                                  formik.setFieldValue("cth_documents", updatedDocuments);
                                  setFileSnackbar(true);
                                }}
                                multiple={true}
                                readOnly={isDisabled}
                                containerStyles={{ marginTop: 0 }}
                                buttonSx={{ fontSize: "0.75rem", padding: "2px 10px", minWidth: "auto", textTransform: "none" }}
                              />
                            </td>
                            <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                              <ImagePreview
                                images={document.url || []}
                                onDeleteImage={(deleteIndex) => {
                                  const updatedDocuments = [...formik.values.cth_documents];
                                  updatedDocuments[originalIndex].url.splice(deleteIndex, 1);
                                  formik.setFieldValue("cth_documents", updatedDocuments);
                                }}
                                readOnly={isDisabled}
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <Row style={{ marginBottom: "20px", alignItems: "center" }}>
                <Col xs={12} lg={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel shrink={true}>Select Document</InputLabel>
                    <Select
                      disabled={isDisabled}
                      value={selectedDocument}
                      onChange={(e) => {
                        setSelectedDocument(e.target.value);
                      }}
                      displayEmpty
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
                    <Col xs={12} lg={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="New Document Name"
                        value={newDocumentName}
                        onChange={(e) => setNewDocumentName(e.target.value)}
                      />
                    </Col>
                    <Col xs={12} lg={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="New Document Code"
                        value={newDocumentCode}
                        onChange={(e) => setNewDocumentCode(e.target.value)}
                      />
                    </Col>
                  </>
                )}
                <Col
                  xs={12}
                  lg={2}
                  style={{ display: "flex", justifyContent: "flex-end" }}
                >
                  <button type="button" className="btn" onClick={addDocument}>
                    Add Document
                  </button>
                </Col>
              </Row>
            </div>

            <div className="job-details-container">
              <h4>All Documents</h4>
              {renderAllDocuments(data.all_documents)}
            </div>

            <div className="job-details-container">
              <h4>All Cleared E-Sanchit</h4>
              <Row>
                <Col xs={12} lg={6}>
                  <div
                    className="job-detail-input-container"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <strong>E-Sanchit Completed:&nbsp;</strong>
                    <Checkbox
                      checked={!!formik.values.esanchit_completed_date_time}
                      disabled // Automatically handled; no manual interaction
                    />
                    {formik.values.esanchit_completed_date_time && (
                      <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                        {new Date(
                          formik.values.esanchit_completed_date_time
                        ).toLocaleString("en-US", {
                          timeZone: "Asia/Kolkata",
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                </Col>
                {user.role === "Admin" && (
                  <Col xs={12} lg={6}>
                    <div
                      className="job-detail-input-container"
                      style={{ justifyContent: "flex-start" }}
                    >
                      <strong>E-Sanchit Completed Date/Time:&nbsp;</strong>
                      <Box sx={{ maxWidth: "300px" }}>
                        <TextField
                          fullWidth
                          size="small"
                          margin="normal"
                          variant="outlined"
                          type="datetime-local"
                          id="esanchit_completed_date_time"
                          name="esanchit_completed_date_time"
                          value={formik.values.esanchit_completed_date_time || ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            if (!newValue) {
                              formik.setFieldValue(
                                "esanchit_completed_date_time",
                                ""
                              );
                            } else {
                              formik.setFieldValue(
                                "esanchit_completed_date_time",
                                newValue
                              );
                            }
                          }}
                          disabled={isDisabled}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          sx={compactInputSx}
                        />
                      </Box>

                    </div>
                  </Col>
                )}
              </Row>
            </div>

            {/* Removed checklist approval warning */}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {!isDisabled && (
                <button
                  className="btn sticky-btn"
                  style={{
                    float: "right",
                    margin: "20px",
                  }}
                  type="submit"
                >
                  Submit
                </button>
              )}
            </div>

            <ConfirmDialog
              open={dialogOpen}
              handleClose={() => setDialogOpen(false)}
              handleConfirm={
                dialogMode ? handleEditDocument : handleDeleteDocument
              }
              isEdit={dialogMode}
              editValues={editDocument || {}}
              onEditChange={(updatedDoc) => setEditDocument(updatedDoc)}
              message={
                dialogMode
                  ? undefined
                  : `Are you sure you want to delete the document "${editDocument?.document_name}"?`
              }
            />

            <Snackbar
              open={snackbar || fileSnackbar}
              message={
                snackbar
                  ? "Submitted successfully!"
                  : fileSnackbar
                    ? "File uploaded successfully!"
                    : ""
              }
              sx={{ left: "auto !important", right: "24px !important" }}
              autoHideDuration={6000}
              onClose={() => {
                setSnackbar(false);
                setFileSnackbar(false);
              }}
            />
          </>
        )}
      </div>
    </form >
  );
}

export default ViewESanchitJob;

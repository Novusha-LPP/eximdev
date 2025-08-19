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
          queries: values.queries, // Send queries as `eSachitQueries`
          esanchit_completed_date_time:
            values.esanchit_completed_date_time || "",
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
      <Box
        display="flex"
        flexWrap="wrap"
        gap={2}
        mt={2}
        sx={{
          justifyContent: "flex-start", // Center items on smaller devices
        }}
      >
        {documents.map((url, index) => (
          <Box
            key={index}
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              flex: "1 1 30%", // Flex-basis for 3 columns
              maxWidth: "30%", // Ensure proper width
              minWidth: "250px", // Minimum width for smaller devices
            }}
          >
            <Box mt={1} textAlign="center">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "blue" }}
              >
                {extractFileName(url)}
              </a>
            </Box>
          </Box>
        ))}
      </Box>
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

  // Check if all Approved checkboxes are true and all IRN numbers are non-empty strings
  const areAllApproved = () => {
    return (
      !isDisabled &&
      formik.values.cth_documents.every(
        (doc) =>
          !!doc.document_check_date && // Approved checkbox is checked (non-empty date)
          !!doc.irn && // IRN is a non-empty string
          doc.irn.trim() !== "" // IRN is not just whitespace
      )
    );
  };

  // Auto-update `esanchit_completed_date_time` based on Approved status and IRN validation
  useEffect(() => {
    if (areAllApproved()) {
      const currentDateTime = new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      formik.setFieldValue("esanchit_completed_date_time", currentDateTime);
    } else {
      formik.setFieldValue("esanchit_completed_date_time", "");
    }
  }, [formik.values.cth_documents]);

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
                onQueriesChange={handleQueriesChange}
                title="Esanchit Queries"
                showResolveButton={true}
                readOnlyReply={false}
                onResolveQuery={handleResolveQuery}
              />
            </div>

            {/* Charges section */}
            <div className="job-details-container">
              <h4>Charges</h4>
              {formik.values.esanchitCharges?.map((charge, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "20px",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                  }}
                >
                  <Row className="align-items-center">
                    {/* File Upload & Image Preview */}
                    <Col xs={12} lg={4} style={{ marginBottom: "20px" }}>
                      <FileUpload
                        label={charge.document_name}
                        bucketPath={`esanchit-charges/${charge.document_name}`}
                        onFilesUploaded={(urls) => {
                          const updatedCharges = [
                            ...formik.values.esanchitCharges,
                          ];
                          updatedCharges[index].url = [
                            ...(updatedCharges[index].url || []),
                            ...urls,
                          ];
                          formik.setFieldValue(
                            "esanchitCharges",
                            updatedCharges
                          );
                          setFileSnackbar(true);
                        }}
                        multiple={true}
                        readOnly={isDisabled}
                      />
                      <ImagePreview
                        images={charge.url || []}
                        onDeleteImage={(deleteIndex) => {
                          const updatedCharges = [
                            ...formik.values.esanchitCharges,
                          ];
                          updatedCharges[index].url.splice(deleteIndex, 1);
                          formik.setFieldValue(
                            "esanchitCharges",
                            updatedCharges
                          );
                        }}
                        readOnly={isDisabled}
                      />
                    </Col>

                    {/* Document Charge Reference No */}
                    <Col xs={12} lg={4}>
                      <TextField
                        size="small"
                        label="Document Charge Reference No"
                        name={`esanchitCharges[${index}].document_charge_refrence_no`}
                        value={
                          formik.values.esanchitCharges[index]
                            ?.document_charge_refrence_no || ""
                        }
                        onChange={formik.handleChange}
                        fullWidth
                        type="number"
                        disabled={isDisabled}
                      />
                    </Col>

                    {/* Document Charge Receipt Copy */}
                    <Col xs={12} lg={4}>
                      <TextField
                        size="small"
                        label="Document Charge Receipt Copy"
                        name={`esanchitCharges[${index}].document_charge_recipt_copy`}
                        value={
                          formik.values.esanchitCharges[index]
                            ?.document_charge_recipt_copy || ""
                        }
                        onChange={formik.handleChange}
                        fullWidth
                        type="number"
                        disabled={isDisabled}
                      />
                    </Col>
                  </Row>
                </div>
              ))}
            </div>

            <div className="job-details-container">
              <h4>Documents</h4>
              {formik.values.cth_documents?.map((document, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "20px",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                  }}
                >
                  <Row className="align-items-center">
                    {/* File Upload & Image Preview */}
                    <Col
                      xs={12}
                      lg={4}
                      key={`cth-${index}`}
                      style={{ marginBottom: "20px", position: "relative" }}
                    >
                      <FileUpload
                        label={`${document.document_name} (${document.document_code})`}
                        bucketPath={`cth-documents/${document.document_name}`}
                        onFilesUploaded={(urls) => {
                          const updatedDocuments = [
                            ...formik.values.cth_documents,
                          ];
                          updatedDocuments[index].url = [
                            ...(updatedDocuments[index].url || []),
                            ...urls,
                          ];
                          formik.setFieldValue(
                            "cth_documents",
                            updatedDocuments
                          );
                          setFileSnackbar(true);
                        }}
                        multiple={true}
                        readOnly={isDisabled}
                      />
                      <ImagePreview
                        images={document.url || []}
                        onDeleteImage={(deleteIndex) => {
                          const updatedDocuments = [
                            ...formik.values.cth_documents,
                          ];
                          updatedDocuments[index].url.splice(deleteIndex, 1);
                          formik.setFieldValue(
                            "cth_documents",
                            updatedDocuments
                          );
                        }}
                        readOnly={isDisabled}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                        }}
                      >
                        {!isDisabled && (
                          <>
                            <span
                              style={{
                                cursor: "pointer",
                                marginRight: "10px",
                                color: "#007bff",
                              }}
                              onClick={() => handleOpenDialog(document, true)}
                            >
                              <i className="fas fa-edit" title="Edit"></i>
                            </span>
                            <span
                              style={{ cursor: "pointer", color: "#dc3545" }}
                              onClick={() => handleOpenDialog(document, false)}
                            >
                              <i
                                className="fas fa-trash-alt"
                                title="Delete"
                              ></i>
                            </span>
                          </>
                        )}
                      </div>
                    </Col>

                    {/* IRN Input */}
                    <Col xs={12} lg={4}>
                      <TextField
                        size="small"
                        label="IRN"
                        name={`cth_documents[${index}].irn`}
                        value={formik.values.cth_documents[index]?.irn || ""}
                        onChange={formik.handleChange}
                        fullWidth
                        disabled={isDisabled}
                      />
                    </Col>

                    <Col xs={12} lg={4}>
                      <div>
                        <Checkbox
                          checked={
                            !!formik.values.cth_documents[index]
                              ?.document_check_date
                          }
                          onChange={() => {
                            const updatedDocuments = [
                              ...formik.values.cth_documents,
                            ];
                            if (updatedDocuments[index].document_check_date) {
                              // Clear the date-time when checkbox is unchecked
                              updatedDocuments[index].document_check_date = "";
                            } else {
                              // Set current date-time when checkbox is checked
                              updatedDocuments[index].document_check_date =
                                new Date(
                                  Date.now() -
                                    new Date().getTimezoneOffset() * 60000
                                )
                                  .toISOString()
                                  .slice(0, 16);
                            }
                            formik.setFieldValue(
                              "cth_documents",
                              updatedDocuments
                            );
                          }}
                          disabled={isDisabled}
                        />
                        <strong>Approved Date</strong>
                        {formik.values.cth_documents[index]
                          ?.document_check_date && (
                          <span
                            style={{ marginLeft: "10px", fontWeight: "bold" }}
                          >
                            {new Date(
                              formik.values.cth_documents[
                                index
                              ]?.document_check_date
                            ).toLocaleString("en-US", {
                              timeZone: "Asia/Kolkata",
                              hour12: true,
                            })}
                          </span>
                        )}
                      </div>
                      {user.role === "Admin" && (
                        <TextField
                          fullWidth
                          size="small"
                          type="datetime-local"
                          name={`cth_documents[${index}].document_check_date`}
                          value={
                            formik.values.cth_documents[index]
                              ?.document_check_date || ""
                          }
                          onChange={(e) => {
                            const updatedDocuments = [
                              ...formik.values.cth_documents,
                            ];
                            updatedDocuments[index].document_check_date =
                              e.target.value;
                            formik.setFieldValue(
                              "cth_documents",
                              updatedDocuments
                            );
                          }}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          disabled={isDisabled}
                        />
                      )}
                    </Col>
                  </Row>
                </div>
              ))}

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
                        InputLabelProps={{
                          shrink: true,
                        }}
                        disabled={!areAllApproved()} // Allow manual override only if all approved
                      />
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
    </form>
  );
}

export default ViewESanchitJob;

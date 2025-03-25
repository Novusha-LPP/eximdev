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
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import ConfirmDialog from "../../components/gallery/ConfirmDialog";
import { useFormik } from "formik";
import { UserContext } from "../../contexts/UserContext";
import { TabContext } from "../eSanchit/ESanchitTab.js";
import { useLocation } from "react-router-dom";

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
  const routeLocation = useLocation()
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [data, setData] = useState({ cth_documents: [] });
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState(false); // true for edit, false for delete
  const [editDocument, setEditDocument] = useState(null);
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isTrue = routeLocation.state?.currentTab || false;

 const isAdmin = user.role === "Admin"; // Check if user is an Admin
 const isDisabled = (!isAdmin && isTrue === 1);

  

  console.log(isDisabled);
  console.log(isTrue === 1);
  // Fetch data
  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-esanchit-job/${params.job_no}/${params.year}`
        );
        setData(res.data || { cth_documents: [] });
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
      queries: data.eSachitQueries || [{ query: "", reply: "" }], // Initialize from `eSachitQueries` in data
      esanchit_completed_date_time: data.esanchit_completed_date_time || "", // Default to an empty string if not present
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const formattedData = {
          cth_documents: values.cth_documents,
          eSachitQueries: values.queries, // Send queries as `eSachitQueries`
          esanchit_completed_date_time:
            values.esanchit_completed_date_time || "", // Send `null` if cleared
        };

        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-esanchit-job/${params.job_no}/${params.year}`,
          formattedData
        );
        setSnackbar(true);
        navigate("/e-sanchit");
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
            {/* <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor: "#333",
                color: "#fff",
                padding: "5px",
                borderRadius: "5px 5px 0 0",
              }}
            >
              Document {index + 1}
            </Typography> */}
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
  // Check if all Approved checkboxes are true
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
      <div style={{ margin: "20px 0" }}>
        {data && (
          <>
            <JobDetailsStaticData
              data={data}
              params={params}
              setSnackbar={setSnackbar}
            />
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
              <h4>Queries</h4>
              {formik.values.queries.map((item, id) => (
                <Row key={id}>
                  <Col xs={12} lg={5}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      label="Query"
                      name={`queries[${id}].query`}
                      value={item.query}
                      onChange={formik.handleChange}
                    />
                  </Col>
                  <Col xs={12} lg={5}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      label="Reply"
                      name={`queries[${id}].reply`}
                      value={item.reply}
                      onChange={formik.handleChange}
                      InputProps={{
                        readOnly: true, // Make the field read-only
                      }}
                    />
                  </Col>
                </Row>
              ))}
              <button
                type="button"
                onClick={() =>
                  formik.setFieldValue("queries", [
                    ...formik.values.queries,
                    { query: "", reply: "" },
                  ])
                }
                className="btn"
              >
                Add Query
              </button>
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

            {!isDisabled && (
              <button
                className="btn sticky-btn"
                style={{ float: "right", margin: "20px" }}
                type="submit"
              >
                Submit
              </button>
            )}

            {/* <ConfirmDialog
              open={dialogOpen}
              handleClose={() => setDialogOpen(false)}
              handleConfirm={
                dialogMode ? handleEditDocument : handleDeleteDocument
              }
              isEdit={dialogMode}
              editValues={editDocument || {}}
              onEditChange={setEditDocument}
            /> */}
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

            {/* <Snackbar
              open={snackbar || fileSnackbar}
              message={
                snackbar
                  ? "Submitted successfully!"
                  : "File uploaded successfully!"
              }
              sx={{ left: "auto !important", right: "24px !important" }}
              onClose={() => {
                setSnackbar(false);
                setFileSnackbar(false);
              }}
            /> */}
          </>
        )}
      </div>
    </form>
  );
}

export default ViewESanchitJob;

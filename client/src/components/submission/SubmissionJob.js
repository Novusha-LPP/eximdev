// SubmissionJob.js
import React, { useState, useEffect, useRef, useContext } from "react";
import {
  TextField,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
} from "@mui/material";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup"; // For form validation
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import { Row, Col } from "react-bootstrap";
import { UserContext } from "../../contexts/UserContext";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import QueriesComponent from "../../utils/QueriesComponent.js";

const compactInputSx = {
  "& .MuiOutlinedInput-root": { height: "32px" },
  "& .MuiOutlinedInput-input": { padding: "6px 8px", fontSize: "0.8rem" },
  "& .MuiInputLabel-root": { fontSize: "0.8rem", top: "-4px" },
  "& .MuiInputLabel-shrink": { top: "0px" }
};

// Utility function to get current local datetime in ISO format (YYYY-MM-DDTHH:MM)
const getCurrentLocalDateTime = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000; // in milliseconds
  const localISOTime = new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
  return localISOTime;
};

// Validation Schema (Optional but recommended)
const SubmissionJobSchema = Yup.object().shape({
  // Define validation rules as needed
  // Example:
  // be_no: Yup.string().trim().required("Bill of Entry No. is required"),
  // Additional validation rules can be added here
});

const SubmissionJob = () => {
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [data, setData] = useState(null);
  const [verifiedChecklistUploads, setVerifiedChecklistUploads] = useState([]);
  const [submissionQueries, setSubmissionQueries] = useState([]);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Add stored search parameters state
  const [storedSearchParams, setStoredSearchParams] = useState(null);
  // Store search parameters from location state
  useEffect(() => {
    if (location.state) {
      const { searchQuery, selectedImporter, selectedJobId, currentPage } =
        location.state;

      const params = {
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentPage,
      };
      setStoredSearchParams(params);
    }
  }, [location.state]);

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
  // Handle back click function
  const handleBackClick = () => {
    navigate("/submission", {
      state: {
        fromJobDetails: true,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          selectedImporter: storedSearchParams.selectedImporter,
          selectedJobId: storedSearchParams.selectedJobId,
          currentPage: storedSearchParams.currentPage,
        }),
      },
    });
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

  useEffect(() => {
    fetchJobDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job_no, year]);

  const fetchJobDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${year}/${job_no}`
      );
      setData(response.data);
      // Initialize uploads if data exists
      if (response.data.checklist) {
        setVerifiedChecklistUploads(response.data.checklist);
      }

      if (Array.isArray(response.data.submissionQueries)) {
        setSubmissionQueries(response.data.submissionQueries);
      } else {
        setSubmissionQueries([]);
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
      alert("Failed to fetch job details. Please try again later.");
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Prepare the payload
      const payload = {
        be_no: values.be_no,
        checklist: verifiedChecklistUploads,
        submission_completed_date_time: values.submission_completed_date_time,
        be_date: values.be_date,
        dsr_queries: data.dsr_queries,
      };

      // Get user data from localStorage for audit trail
      const userData = JSON.parse(localStorage.getItem("exim_user")) || {};

      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-submission-job/${data._id}`,
        payload,
        {
          headers: {
            "user-id": userData._id || user?._id || "unknown",
            username: userData.username || user?.username || "unknown",
            "user-role": userData.role || user?.role || "unknown",
          },
        }
      );

      // Close the tab after successful submit
      setTimeout(() => {
        window.close();
      }, 500);

      await fetchJobDetails();
    } catch (error) {
      console.error("Error updating job details:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifiedChecklistFilesUploaded = (files) => {
    // Assuming FileUpload returns an array of URLs
    setVerifiedChecklistUploads([...verifiedChecklistUploads, ...files]);
  };

  const handleDeleteVerifiedChecklist = (index) => {
    setVerifiedChecklistUploads(
      verifiedChecklistUploads.filter((_, i) => i !== index)
    );
  };

  const renderDocuments = (documents, type) => {
    if (!documents || documents.length === 0) {
      return <p>No {type} uploaded yet.</p>;
    }

    return (
      <div className="table-responsive">
        <table className="table table-bordered table-hover" style={{ backgroundColor: "#fff", fontSize: "0.9rem" }}>
          <thead style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              <th style={{ width: "40%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Document Name</th>
              <th style={{ width: "60%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Files</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, index) => (
              <tr key={index}>
                <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                  <div style={{ fontWeight: "600", color: "#212529" }}>{doc.document_name}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>({doc.document_code})</div>
                </td>
                <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                  <ImagePreview images={doc.url || []} readOnly={true} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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

  return (
    <div>
      {/* Back to Job List Button */}
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

      {data !== null ? (
        <Formik
          initialValues={{
            be_no: data.be_no || "",
            submission_completed_date_time:
              data.submission_completed_date_time || "",
            be_date: data.be_date || "",
          }}
          validationSchema={SubmissionJobSchema}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form>
              <JobDetailsStaticData
                data={data}
                bl_no_ref={bl_no_ref}
                params={{ job_no, year }}
              />

              <div>
                <QueriesComponent
                  queries={data.dsr_queries}
                  currentModule="Submission"
                  onQueriesChange={handleQueriesChange}
                  title="Submission Queries"
                  showResolveButton={true}
                  readOnlyReply={false}
                  onResolveQuery={handleResolveQuery}
                  userName={user?.username}
                />
              </div>

              <div className="job-details-container">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 3,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Left Side: Terms of Invoice & Financial Details */}
                  <Box sx={{ flex: "1 1 auto", minWidth: "300px" }}>
                    <JobDetailsRowHeading
                      heading="Terms of Invoice (FOB)"
                      variant="subtitle2"
                      sx={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#2c3e50",
                        marginBottom: "8px",
                      }}
                    />

                    {/* Financial Details Display - Government Style */}
                    <Box
                      sx={{
                        maxWidth: 320,
                        minWidth: 280,
                      }}
                    >
                      <Box
                        sx={{
                          backgroundColor: "#fafafa",
                          border: "1px solid #cccccc",
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}
                      >
                        {data.cifValue || data.freight || data.insurance ? (
                          <Box>
                            {/* Header */}
                            <Box
                              sx={{
                                backgroundColor: "#e8f4f8",
                                padding: "8px 12px",
                                borderBottom: "1px solid #cccccc",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#2c3e50",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                Financial Details
                              </Typography>
                            </Box>

                            {/* Data Rows */}
                            <Box>
                              {/* CIF/Primary Value */}
                              {data.cifValue && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    padding: "10px 12px",
                                    borderBottom: "1px solid #e5e5e5",
                                    backgroundColor: "#ffffff",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "13px",
                                      color: "#555555",
                                      flex: 1,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {data.import_terms || "CIF"} Value:
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: "13px",
                                      color: "#2c3e50",
                                      fontWeight: 600,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    ₹{" "}
                                    {parseFloat(data.cifValue).toLocaleString(
                                      "en-IN"
                                    )}
                                  </Typography>
                                </Box>
                              )}

                              {/* Freight */}
                              {data.freight && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    padding: "10px 12px",
                                    borderBottom: data.insurance
                                      ? "1px solid #e5e5e5"
                                      : "none",
                                    backgroundColor: "#ffffff",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "13px",
                                      color: "#555555",
                                      flex: 1,
                                      fontWeight: 500,
                                    }}
                                  >
                                    Freight:
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: "13px",
                                      color: "#2c3e50",
                                      fontWeight: 600,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    ₹{" "}
                                    {parseFloat(data.freight).toLocaleString(
                                      "en-IN"
                                    )}
                                  </Typography>
                                </Box>
                              )}

                              {/* Insurance */}
                              {data.insurance && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    padding: "10px 12px",
                                    backgroundColor: "#ffffff",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "13px",
                                      color: "#555555",
                                      flex: 1,
                                      fontWeight: 500,
                                    }}
                                  >
                                    Insurance:
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: "13px",
                                      color: "#2c3e50",
                                      fontWeight: 600,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    ₹{" "}
                                    {parseFloat(data.insurance).toLocaleString(
                                      "en-IN"
                                    )}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              padding: "20px 12px",
                              textAlign: "center",
                              backgroundColor: "#ffffff",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "13px",
                                color: "#888888",
                                fontStyle: "italic",
                              }}
                            >
                              No financial details available
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Right Side: Bill of Entry Details */}
                  <Box sx={{ flex: "1 1 auto", minWidth: "300px" }}>
                    <JobDetailsRowHeading
                      heading="Bill of Entry Details"
                      variant="subtitle2"
                      sx={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#2c3e50",
                        marginBottom: "8px",
                      }}
                    />
                    <div style={{ padding: "0" }}>
                      <Row>
                        {/* Bill of Entry No and Date Section */}
                        <Col xs={12} style={{ display: "flex", gap: "20px" }}>
                          <div style={{ flex: 1 }}>
                            <Field
                              as={TextField}
                              fullWidth
                              size="small"
                              margin="dense"
                              variant="outlined"
                              id="be_no"
                              name="be_no"
                              label="Bill of Entry No."
                              InputLabelProps={{ shrink: true, style: { fontWeight: 'bold' } }}
                              sx={compactInputSx}
                              inputProps={{ maxLength: 7 }}
                            />
                            <ErrorMessage
                              name="be_no"
                              component="div"
                              style={{ color: "red" }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <Field
                              as={TextField}
                              fullWidth
                              size="small"
                              margin="dense"
                              variant="outlined"
                              type="date"
                              id="be_date"
                              name="be_date"
                              value={values.be_date || ""}
                              onChange={(e) => {
                                setFieldValue("be_date", e.target.value);
                              }}
                              label="Bill of Entry Date"
                              InputLabelProps={{ shrink: true, style: { fontWeight: 'bold' } }}
                              sx={compactInputSx}
                            />
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Box>
                </Box>
              </div>

              <div className="job-details-container">
                <JobDetailsRowHeading heading="CTH Documents" />
                {renderDocuments(data.cth_documents, "CTH Documents")}
              </div>
              <div className="job-details-container">
                <JobDetailsRowHeading heading="All Documents" />
                {renderAllDocuments(data.all_documents)}
              </div>

              {/* Submission Queries and Checklist - previously inside Formik */}
              <div className="job-details-container">
                <JobDetailsRowHeading heading="Checklist Document" />
                <Row>
                  {/* Verified Checklist Upload Section */}
                  <Col xs={12}>
                    <div>
                      {/* <FileUpload
                        label="Checklist Upload"
                        bucketPath="verified-checklists"
                        onFilesUploaded={handleVerifiedChecklistFilesUploaded}
                        multiple={true}
                      /> */}
                      <ImagePreview
                        images={verifiedChecklistUploads}
                        onDeleteImage={(image) => {
                          handleDeleteVerifiedChecklist(image);
                        }}
                        readOnly={false}
                      />
                    </div>
                  </Col>
                </Row>
              </div>

              <div className="job-details-container">
                <JobDetailsRowHeading heading="Submission Completed" />
                <Row>
                  {/* Submission Completed Date/Time Section */}
                  <Col xs={12} lg={6}>
                    <div>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!values.submission_completed_date_time}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              if (isChecked) {
                                const currentDateTime =
                                  getCurrentLocalDateTime();
                                setFieldValue(
                                  "submission_completed_date_time",
                                  currentDateTime
                                );
                              } else {
                                setFieldValue(
                                  "submission_completed_date_time",
                                  ""
                                );
                              }
                            }}
                          />
                        }
                        label="Submission Completed Date/Time"
                      />

                      {values.submission_completed_date_time && (
                        <strong>
                          {new Date(
                            values.submission_completed_date_time
                          ).toLocaleString("en-US", {
                            timeZone: "Asia/Kolkata",
                            hour12: true,
                          })}
                        </strong>
                      )}
                    </div>
                  </Col>
                  <Col xs={12} lg={6}>
                    {user.role === "Admin" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px" }}>
                        <strong style={{ whiteSpace: "nowrap" }}>Submission Completed Date and Time:</strong>
                        <div style={{ maxWidth: "300px", width: "100%" }}>
                          <Field
                            as={TextField}
                            fullWidth
                            size="small"
                            variant="outlined"
                            type="datetime-local"
                            id="submission_completed_date_time"
                            name="submission_completed_date_time"
                            value={values.submission_completed_date_time || ""}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (newValue) {
                                setFieldValue(
                                  "submission_completed_date_time",
                                  newValue
                                );
                              } else {
                                setFieldValue(
                                  "submission_completed_date_time",
                                  ""
                                );
                              }
                            }}
                            InputLabelProps={{
                              shrink: true,
                            }}
                            sx={compactInputSx}
                          />
                          <ErrorMessage
                            name="submission_completed_date_time"
                            component="div"
                            style={{ color: "red", fontSize: "0.8rem" }}
                          />
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>
              </div>

              <button
                className="btn sticky-btn"
                type="submit"
                style={{ float: "right", margin: "10px" }}
                aria-label="submit-btn"
                disabled={isSubmitting}
              >
                Submit
              </button>
            </Form>
          )}
        </Formik>
      ) : (
        <p>Loading job details...</p>
      )}
    </div>
  );
};

export default SubmissionJob;

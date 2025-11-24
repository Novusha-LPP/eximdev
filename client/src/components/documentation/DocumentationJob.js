import React, { useState, useEffect, useRef, useContext } from "react";
import {
  TextField,
  Box,
  FormControlLabel,
  Typography,
  Button,
} from "@mui/material";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useParams } from "react-router-dom";
import axios from "axios";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import { Checkbox } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import QueriesComponent from "../../utils/QueriesComponent";

const DocumentationJob = () => {
  const routeLocation = useLocation();
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [data, setData] = useState(null);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // Add stored search parameters state
  const [storedSearchParams, setStoredSearchParams] = useState(null);
  const {
    setSearchQuery,
    setSelectedImporter,
    setCurrentPageDocTab0,
    setCurrentPageDocTab1,
  } = useSearchQuery();

  const isTrue = routeLocation.state?.currentTab || false;
  const isAdmin = user.role === "Admin"; // Check if user is an Admin
  const isDisabled = !isAdmin && isTrue === 1;
  // Store search parameters from location state
  useEffect(() => {
    if (routeLocation.state) {
      const { searchQuery, selectedImporter, currentTab, currentPage } =
        routeLocation.state;

      const params = {
        searchQuery,
        selectedImporter,
        currentTab,
        currentPage,
      };

      setStoredSearchParams(params);
    }
  }, [routeLocation.state]); // Handle back click function
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 0;

    navigate("/documentation", {
      state: {
        fromJobDetails: true,
        tabIndex: tabIndex, // Use tabIndex instead of currentTab
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          selectedImporter: storedSearchParams.selectedImporter,
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

  // Check if checklist exists and has items
  const hasChecklist = data?.checklist && data.checklist.length > 0;

  // Combined disabled state - disable if isDisabled OR no checklist
  const isFieldDisabled = isDisabled || !hasChecklist;

  useEffect(() => {
    fetchJobDetails();
  }, [job_no, year]);

  const fetchJobDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${year}/${job_no}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching job details:", error);
    }
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

  const handleCheckboxChange = (e) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      const currentDate = new Date();
      const isoDate = new Date(
        currentDate.getTime() - currentDate.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setData((prevData) => ({
        ...prevData,
        documentation_completed_date_time: isoDate,
      }));
    } else {
      setData((prevData) => ({
        ...prevData,
        documentation_completed_date_time: "",
      }));
    }
  };

  const handleAdminDateChange = (e) => {
    const newValue = e.target.value;
    setData((prevData) => ({
      ...prevData,
      documentation_completed_date_time: newValue,
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-documentation-job/${data.job_no}/${data.year}`,
        {
          documentation_completed_date_time:
            data.documentation_completed_date_time,
          dsr_queries: data.dsr_queries || [],
        },
        { headers }
      );
      // Navigate back with preserved search parameters
      // Close the tab after successful submit
      setTimeout(() => {
        window.close();
      }, 500);

      await fetchJobDetails(); // Fetch updated data after submission
    } catch (error) {
      console.error("Error updating documentation data:", error);
      alert("Failed to update documentation data.");
    }
  };

  const updateChecklist = async (newChecklist) => {
    try {
      // Get user info from localStorage for audit trail
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/jobs/${data._id}`,
        {
          checklist: newChecklist,
        },
        { headers }
      );
    } catch (error) {
      console.error("Error updating checklist:", error);
      alert("Failed to update checklist.");
    }
  };

  const renderDocuments = (documents, type) => {
    if (!documents || documents.length === 0) {
      return <p>No {type} uploaded yet.</p>;
    }

    return (
      <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
        {documents.map((doc, index) => (
          <Box
            key={index}
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              flex: "1 1 30%",
              maxWidth: "30%",
              minWidth: "250px",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor: "#333",
                color: "#fff",
                padding: "5px",
                borderRadius: "5px 5px 0 0",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              {doc.document_name || `Document ${index + 1}`} (
              {doc.document_code})
            </Typography>
            <Box mt={2}>
              {doc.url.map((url, imgIndex) => (
                <div
                  key={imgIndex}
                  style={{
                    marginBottom: "10px",
                    paddingBottom: "5px",
                    borderBottom: "1px solid #ccc",
                  }}
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "blue" }}
                  >
                    {extractFileName(url)}
                  </a>
                </div>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

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
        <>
          <JobDetailsStaticData
            data={data}
            bl_no_ref={bl_no_ref}
            params={{ job_no, year }}
          />

          <div>
            <QueriesComponent
              queries={data.dsr_queries}
              currentModule="Documentation"
              onQueriesChange={handleQueriesChange}
              title="Documentation Queries"
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
                alignItems: "baseline",
                gap: 3,
              }}
            >
              {/* Terms of Invoice Heading */}
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
                              {parseFloat(data.freight).toLocaleString("en-IN")}
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
          </div>
          <div className="job-details-container">
            <JobDetailsRowHeading heading="CTH Documents" />
            {renderDocuments(data.cth_documents, "CTH Documents")}
          </div>
          <div className="job-details-container">
            <JobDetailsRowHeading heading="All Documents" />
            {renderAllDocuments(data.all_documents)}

            {/* Checklist Upload Section */}
            <div style={{ marginTop: "20px" }}>
              <JobDetailsRowHeading heading="Upload Checklist" />
              <FileUpload
                bucketPath="checklist"
                onFilesUploaded={(newFiles) => {
                  const existingFiles = data.checklist || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  setData((prevData) => ({
                    ...prevData,
                    checklist: updatedFiles,
                     documentation_completed_date_time: updatedFiles.length > 0
      ? new Date().toISOString()
      : "",  // or null if cleared

                  }));
                  updateChecklist(updatedFiles); // Update the backend immediately
                }}
                multiple={true}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#1976d2", // Material blue
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  textAlign: "center",
                  transition: "background-color 0.3s",
                }}
                label="Upload Files"
              />
              <ImagePreview
                images={data.checklist || []}
                onDeleteImage={(index) => {
                  const updatedFiles = [...data.checklist];
                  updatedFiles.splice(index, 1);
                  setData((prevData) => ({
                    ...prevData,
                    checklist: updatedFiles,
                  }));
                  updateChecklist(updatedFiles); // Update the backend immediately
                }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="job-details-container">
              <JobDetailsRowHeading heading="All Cleared Documentation" />
              <Row>
                <Col xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        disabled={isFieldDisabled}
                        checked={!!data.documentation_completed_date_time}
                        onChange={handleCheckboxChange}
                      />
                    }
                    label="Documentation Completed"
                  />
                  {data.documentation_completed_date_time && (
                    <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                      {new Date(
                        data.documentation_completed_date_time
                      ).toLocaleString("en-US", {
                        timeZone: "Asia/Kolkata",
                        hour12: true,
                      })}
                    </span>
                  )}
                </Col>
                {user?.role === "Admin" && (
                  <Col xs={12} md={6}>
                    <TextField
                      disabled={isFieldDisabled}
                      type="datetime-local"
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id="documentation_completed_date_time"
                      name="documentation_completed_date_time"
                      label="Set Date (Admin Only)"
                      value={data.documentation_completed_date_time || ""}
                      onChange={handleAdminDateChange}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      helperText={!hasChecklist ? "Checklist is required" : ""}
                    />
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
          </form>
        </>
      ) : (
        <p>Loading job details...</p>
      )}
    </div>
  );
};

export default DocumentationJob;

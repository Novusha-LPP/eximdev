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
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-documentation-job/${data._id}`,
        {
          documentation_completed_date_time:
            data.documentation_completed_date_time,
          documentationQueries: data.documentationQueries || [],
        }
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

          <div className="job-details-container">
            <JobDetailsRowHeading heading="Terms of Invoice" />
            <Row style={{ marginTop: "20px" }}>
              <Col xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: 4,
                  flexWrap: 'wrap',
                  '@media (max-width: 768px)': {
                    flexDirection: 'column',
                    gap: 2
                  }
                }}>
                  {/* Import Terms Display */}
                  <Box sx={{ minWidth: 200 }}>
                    <Typography sx={{ 
                      fontWeight: 600, 
                      fontSize: '16px', 
                      color: '#34495e', 
                      mb: 2 
                    }}>
                      Import Terms
                    </Typography>
                    <Box sx={{
                      padding: 2,
                      backgroundColor: '#e3f2fd',
                      borderRadius: 2,
                      border: '2px solid #1976d2',
                      textAlign: 'center'
                    }}>
                      <Typography sx={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold',
                        color: '#1976d2'
                      }}>
                        {data.import_terms || 'Not specified'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Financial Details Display */}
                  <Box sx={{ 
                    flex: 1, 
                    minWidth: 300,
                    padding: 2,
                    backgroundColor: '#f8f9fa',
                    borderRadius: 2,
                    border: '1px solid #e9ecef'
                  }}>
                    <Typography sx={{ 
                      fontWeight: 600, 
                      fontSize: '16px', 
                      color: '#34495e', 
                      mb: 2 
                    }}>
                      Financial Details
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* CIF/Primary Value */}
                      {data.cifValue && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: 1.5,
                          backgroundColor: 'white',
                          borderRadius: 1,
                          border: '1px solid #dee2e6'
                        }}>
                          <Typography sx={{ fontWeight: 500, color: '#495057' }}>
                            {data.import_terms || 'CIF'} Value:
                          </Typography>
                          <Typography sx={{ fontWeight: 'bold', color: '#28a745' }}>
                            ₹ {parseFloat(data.cifValue).toLocaleString('en-IN')}
                          </Typography>
                        </Box>
                      )}

                      {/* Freight */}
                      {data.freight && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: 1.5,
                          backgroundColor: 'white',
                          borderRadius: 1,
                          border: '1px solid #dee2e6'
                        }}>
                          <Typography sx={{ fontWeight: 500, color: '#495057' }}>
                            Freight:
                          </Typography>
                          <Typography sx={{ fontWeight: 'bold', color: '#17a2b8' }}>
                            ₹ {parseFloat(data.freight).toLocaleString('en-IN')}
                          </Typography>
                        </Box>
                      )}

                      {/* Insurance */}
                      {data.insurance && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: 1.5,
                          backgroundColor: 'white',
                          borderRadius: 1,
                          border: '1px solid #dee2e6'
                        }}>
                          <Typography sx={{ fontWeight: 500, color: '#495057' }}>
                            Insurance:
                          </Typography>
                          <Typography sx={{ fontWeight: 'bold', color: '#fd7e14' }}>
                            ₹ {parseFloat(data.insurance).toLocaleString('en-IN')}
                          </Typography>
                        </Box>
                      )}

                      {/* Helper text based on import terms */}
                      {data.import_terms && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#6c757d', 
                            fontStyle: 'italic',
                            mt: 1,
                            padding: 1,
                            backgroundColor: '#e9ecef',
                            borderRadius: 1
                          }}
                        >
                          {data.import_terms === 'CIF' && 'Cost, Insurance & Freight included'}
                          {data.import_terms === 'FOB' && 'Free on Board - Freight & Insurance separate'}
                          {data.import_terms === 'CF' && 'Cost & Freight - Insurance separate'}
                          {data.import_terms === 'CI' && 'Cost & Insurance - Freight separate'}
                        </Typography>
                      )}

                      {/* Show message if no financial data */}
                      {!data.cifValue && !data.freight && !data.insurance && (
                        <Box sx={{ 
                          padding: 2, 
                          textAlign: 'center',
                          color: '#6c757d',
                          fontStyle: 'italic'
                        }}>
                          No financial details available
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Col>
            </Row>
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

          {/* Documentation Queries Section */}
          <div className="job-details-container">
            <JobDetailsRowHeading heading="Documentation Queries" />
            {Array.isArray(data.documentationQueries) &&
              data.documentationQueries.map((item, id) => {
                const isResolved =
                  item.resolved === true ||
                  (!!item.reply && item.reply.trim() !== "");
                return (
                  <Row key={id} style={{ marginBottom: "20px" }}>
                    <Col xs={12} lg={5}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label={isResolved ? "Query (Resolved)" : "Query"}
                        value={item.query}
                        onChange={(e) => {
                          const updated = [...data.documentationQueries];
                          updated[id].query = e.target.value;
                          setData((prev) => ({
                            ...prev,
                            documentationQueries: updated,
                          }));
                        }}
                        disabled={isResolved}
                        InputProps={{
                          style: isResolved
                            ? {
                                border: "2px solid #4caf50",
                                background: "#eaffea",
                              }
                            : {},
                        }}
                      />
                    </Col>
                    <Col xs={12} lg={5}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label={isResolved ? "Reply (Resolved)" : "Reply"}
                        value={item.reply}
                        InputProps={{
                          readOnly: true,
                          style: isResolved
                            ? {
                                border: "2px solid #4caf50",
                                background: "#eaffea",
                              }
                            : {},
                        }}
                        onChange={(e) => {
                          const updated = [...data.documentationQueries];
                          updated[id].reply = e.target.value;
                          setData((prev) => ({
                            ...prev,
                            documentationQueries: updated,
                          }));
                        }}
                      />
                    </Col>
                    {isResolved && (
                      <Col
                        xs={12}
                        lg={2}
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        <span
                          style={{
                            color: "#388e3c",
                            fontWeight: "bold",
                            marginLeft: 8,
                          }}
                        >
                          Resolved
                        </span>
                      </Col>
                    )}
                  </Row>
                );
              })}
            <button
              type="button"
              onClick={() => {
                setData((prev) => ({
                  ...prev,
                  documentationQueries: Array.isArray(prev.documentationQueries)
                    ? [...prev.documentationQueries, { query: "", reply: "" }]
                    : [{ query: "", reply: "" }],
                }));
              }}
              className="btn"
            >
              Add Query
            </button>
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
                type="submit"              >
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

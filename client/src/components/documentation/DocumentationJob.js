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

const DocumentationJob = () => {
  const routeLocation = useLocation()
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [data, setData] = useState(null);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  
  const extractFileName = (url) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return url; // Fallback to original URL
    }
  };
  
  const isTrue = routeLocation.state?.currentTab || false;
  const isAdmin = user.role === "Admin"; // Check if user is an Admin
  const isDisabled = (!isAdmin && isTrue === 1);
  
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
          documentation_completed_date_time: data.documentation_completed_date_time,
        }
      );
      navigate("/documentation");
      await fetchJobDetails(); // Fetch updated data after submission
    } catch (error) {
      console.error("Error updating documentation data:", error);
      alert("Failed to update documentation data.");
    }
  };

  const updateChecklist = async (newChecklist) => {
    try {
        await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${data._id}`,
        {
          checklist: newChecklist,
        }
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
  
  return (
    <div>
      {data !== null ? (
        <>
          <JobDetailsStaticData
            data={data}
            bl_no_ref={bl_no_ref}
            params={{ job_no, year }}
          />

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
                disabled={!hasChecklist}
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
import React, { useState, useEffect, useRef, useContext } from "react";
import {
  TextField,
  Box,
  FormControlLabel,
  Typography,
  Button,
} from "@mui/material";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import { Checkbox } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { UserContext } from "../../contexts/UserContext";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import FileUpload from "../../components/gallery/FileUpload.js";
import { Delete, Edit, Add as AddIcon } from "@mui/icons-material";
import { IconButton, MenuItem, Select, InputLabel, FormControl } from "@mui/material";

const compactInputSx = {
  "& .MuiOutlinedInput-root": { height: "32px" },
  "& .MuiOutlinedInput-input": { padding: "6px 8px", fontSize: "0.8rem" },
  "& .MuiInputLabel-root": { fontSize: "0.8rem", top: "-4px" },
  "& .MuiInputLabel-shrink": { top: "0px" }
};

const OperationListJob = () => {
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [data, setData] = useState(null);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");

  // Add stored search parameters state
  const [storedSearchParams, setStoredSearchParams] = useState(null);

  const preventFormSubmitOnEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  // Store search parameters from location state
  useEffect(() => {
    if (location.state) {
      const {
        searchQuery,
        selectedImporter,
        selectedICD,
        selectedYearState,
        currentTab,
        currentPage
      } = location.state;
      setStoredSearchParams({
        searchQuery,
        selectedImporter,
        selectedICD,
        selectedYearState,
        currentTab,
        currentPage,
      });
    }
  }, [location.state]);
  // Handle back click function
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 0;
    navigate("/import-operations", {
      state: {
        fromJobDetails: true,
        tabIndex: tabIndex,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          selectedImporter: storedSearchParams.selectedImporter,
          selectedICD: storedSearchParams.selectedICD,
          selectedYearState: storedSearchParams.selectedYearState,
          currentPage: storedSearchParams.currentPage,
          selectedJobId: job_no,
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
          cth_documents: data.cth_documents,
          all_documents: data.all_documents
        }
      );

      // Navigate back with preserved search parameters
      const tabIndex = storedSearchParams?.currentTab ?? 0;
      // Close the tab after successful submit
      setTimeout(() => {
        window.close();
      }, 500);


      await fetchJobDetails(); // Fetch updated data after submission
    } catch (error) {
      console.error("Error updating documentation date:", error);
      alert("Failed to update documentation date.");
    }
  };

  const renderDocuments = (documents) => {
    return (
      <div className="table-responsive">
        <table className="table table-bordered table-hover" style={{ backgroundColor: "#fff", fontSize: "0.9rem" }}>
          <thead style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              <th style={{ width: "30%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Document Name</th>
              <th style={{ width: "15%", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Completed Date</th>
              <th style={{ width: "10%", fontWeight: "600", color: "#495057", textAlign: "center", padding: "4px 8px" }}>E-Sanchit</th>
              <th style={{ width: "1%", fontWeight: "600", color: "#495057", padding: "4px 8px", whiteSpace: "nowrap" }}>Upload</th>
              <th style={{ width: "auto", fontWeight: "600", color: "#495057", padding: "4px 8px" }}>Files</th>
            </tr>
          </thead>
          <tbody>
            {(documents || []).map((doc, index) => (
              <tr key={`cth-${index}`}>
                <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#212529" }}>{doc.document_name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>{doc.document_code}</div>
                    </div>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const updated = [...documents];
                        updated.splice(index, 1);
                        setData(prev => ({ ...prev, cth_documents: updated }));
                      }}
                      style={{ padding: "4px" }}
                    >
                      <Delete style={{ fontSize: "1rem" }} color="error" />
                    </IconButton>
                  </div>
                </td>
                <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                  <span style={{ fontSize: "0.85rem", color: doc.document_check_date ? "#28a745" : "#6c757d", fontWeight: doc.document_check_date ? "600" : "normal" }}>
                    {doc.document_check_date ? new Date(doc.document_check_date).toLocaleString("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }) : "-"}
                  </span>
                </td>
                <td style={{ verticalAlign: "middle", textAlign: "center", padding: "4px 8px" }}>
                  <Checkbox
                    size="small"
                    checked={doc.is_sent_to_esanchit || false}
                    style={{ padding: "4px" }}
                    onChange={(e) => {
                      const updated = [...documents];
                      updated[index].is_sent_to_esanchit = e.target.checked;
                      setData(prev => ({ ...prev, cth_documents: updated }));
                    }}
                  />
                </td>
                <td style={{ verticalAlign: "middle", padding: "4px 8px", whiteSpace: "nowrap" }}>
                  <FileUpload
                    label="Upload"
                    bucketPath={`cth-documents/${doc.document_name}`}
                    multiple={true}
                    containerStyles={{ marginTop: 0 }}
                    buttonSx={{ fontSize: "0.75rem", padding: "2px 10px", minWidth: "auto", textTransform: "none" }}
                    onFilesUploaded={(urls) => {
                      const updated = [...documents];
                      updated[index].url = [...(updated[index].url || []), ...urls];
                      // Also update check date if not set?
                      if (!updated[index].document_check_date) {
                        const dt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString();
                        updated[index].document_check_date = dt;
                      }
                      setData(prev => ({ ...prev, cth_documents: updated }));
                    }}
                  />
                </td>
                <td style={{ verticalAlign: "middle", padding: "4px 8px" }}>
                  <ImagePreview
                    images={doc.url || []}
                    isDsr={true}
                    readOnly={false}
                    onDeleteImage={(deleteIndex) => {
                      const updated = [...documents];
                      updated[index].url = updated[index].url.filter((_, i) => i !== deleteIndex);
                      setData(prev => ({ ...prev, cth_documents: updated }));
                    }}
                  />
                </td>
              </tr>
            ))}
            {(documents || []).length === 0 && (
              <tr>
                <td colSpan={5} className="text-center">No documents found.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Add New Document Section - Simplified Manual Entry */}
        <div style={{ background: "#f8f9fa", borderRadius: "8px", border: "1px dashed #ced4da", padding: "20px", marginTop: "20px" }}>
          <h6 style={{ fontSize: "0.9rem", fontWeight: "700", color: "#495057", marginBottom: "15px" }}>Add New Document</h6>
          <Row className="align-items-center">
            <Col xs={12} lg={4} className="mb-2">
              <TextField
                fullWidth
                size="small"
                label="Document Name"
                variant="outlined"
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                onKeyDown={preventFormSubmitOnEnter}
                sx={compactInputSx}
              />
            </Col>
            <Col xs={12} lg={4} className="mb-2">
              <TextField
                fullWidth
                size="small"
                label="Document Code"
                variant="outlined"
                value={newDocumentCode}
                onChange={(e) => setNewDocumentCode(e.target.value)}
                onKeyDown={preventFormSubmitOnEnter}
                sx={compactInputSx}
              />
            </Col>
            <Col xs={12} lg={2} className="mb-2">
              <Button variant="contained" color="primary" startIcon={<AddIcon />}
                disabled={!newDocumentName.trim() || !newDocumentCode.trim()}
                onClick={() => {
                  const newDoc = {
                    document_name: newDocumentName.trim(),
                    document_code: newDocumentCode.trim(),
                    url: [],
                    document_check_date: "",
                    is_sent_to_esanchit: false
                  };
                  setData(prev => ({ ...prev, cth_documents: [...(prev.cth_documents || []), newDoc] }));
                  setNewDocumentName("");
                  setNewDocumentCode("");
                }}>
                Add
              </Button>
            </Col>
          </Row>
        </div>
      </div>
    );
  };

  const renderAllDocuments = (documents) => {
    return (
      <Box mt={2}>
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0", padding: "20px", marginTop: "15px", marginBottom: "30px" }}>
          <Row>
            <Col xs={12} md={6}>
              <FileUpload
                label="Upload General Documents"
                bucketPath="all_documents"
                multiple={true}
                onFilesUploaded={(urls) => {
                  setData(prev => ({ ...prev, all_documents: [...(prev.all_documents || []), ...urls] }));
                }}
              />
            </Col>
            <Col xs={12} md={12}>
              <div className="mt-3">
                <ImagePreview
                  images={documents || []}
                  onDeleteImage={(idx) => {
                    const updated = [...(documents || [])];
                    updated.splice(idx, 1);
                    setData(prev => ({ ...prev, all_documents: updated }));
                  }}
                />
              </div>
            </Col>
          </Row>
        </div>
      </Box>
    );
  }; return (
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
            <JobDetailsRowHeading heading="CTH Documents" />
            {renderDocuments(data.cth_documents)}
          </div>
          <div className="job-details-container">
            <JobDetailsRowHeading heading="All Documents" />
            {renderAllDocuments(data.all_documents)}
          </div>
          {/* ********************** submission ********************** */}
          <div className="job-details-container">
            <Row>
              <Col xs={12} md={4}>
                <div className="mb-3">
                  <strong>Verified Checklist:&nbsp;</strong>
                  <ImagePreview
                    images={data.checklist || []}
                    readOnly
                  />
                </div>
              </Col>
              <Col xs={12} md={4}>
                <div className="mb-3">
                  <strong>Job Sticker:&nbsp;</strong>
                  <ImagePreview
                    images={data.job_sticker_upload || []}
                    readOnly
                  />
                </div>
              </Col>
              <Col xs={12} md={4}>
                <div className="mb-3">
                  <strong>DO Copies:&nbsp;</strong>
                  <ImagePreview images={data.do_copies || []} readOnly />
                </div>
              </Col>
            </Row>
          </div>


        </>
      ) : (
        <p>Loading job details...</p>
      )}
    </div>
  );
};

export default OperationListJob;

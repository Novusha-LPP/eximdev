import React, { useContext, useEffect, useRef, useState } from "react";
import { Checkbox, FormControlLabel, Button, Box } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { handleFileUpload } from "../../utils/awsFileUpload";
import Snackbar from "@mui/material/Snackbar";
import { TextField } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { TabContext } from "./ImportDO";
import { UserContext } from "../../contexts/UserContext";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSearchParams } from "react-router-dom";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import QueriesComponent from "../../utils/QueriesComponent";

function EditDoList() {
  // CSS styles for upload containers
  // Update the uploadContainerStyles constant to include these additional styles:
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
  
  .section-icon {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    font-size: 16px;
  }
  
  .section-header h6 {
    margin: 0;
    color: #2d3748;
    font-weight: 600;
    font-size: 16px;
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
  
  .upload-zone {
    border: 2px dashed #cbd5e0;
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: #f7fafc;
  }
  
  .upload-zone:hover {
    border-color: #667eea;
    background-color: #edf2f7;
  }
  
  .upload-icon {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    font-size: 20px;
  }
  
  .upload-text {
    color: #2d3748;
    font-weight: 600;
    margin-bottom: 4px;
    font-size: 16px;
  }
  
  .upload-subtext {
    color: #718096;
    font-size: 14px;
  }
  
  .input-hidden {
    display: none;
  }
  
  .file-list {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }
  
  .file-item {
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 8px;
    background-color: #f8f9fa;
  }
  
  .file-item:last-child {
    margin-bottom: 0;
  }
  
  .file-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .file-name {
    color: #2d3748;
    font-weight: 500;
    font-size: 14px;
  }
  
  .file-actions {
    display: flex;
    gap: 8px;
  }
  
  .view-btn, .delete-btn {
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .view-btn {
    background-color: #667eea;
    color: white;
  }
  
  .view-btn:hover {
    background-color: #5a6fd8;
    transform: translateY(-1px);
  }
  
  .delete-btn {
    background-color: #e53e3e;
    color: white;
  }
  
  .delete-btn:hover {
    background-color: #c53030;
    transform: translateY(-1px);
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
`;

  // Fix 1: Properly destructure all needed parameters
  const param = useParams();
  const { job_no, year } = param;

  const [fileSnackbar, setFileSnackbar] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState(false);
  const [jobDetails, setJobDetails] = React.useState({
    job_no: "",
    importer: "",
    awb_bl_no: "",
  });

  const bl_no_ref = useRef();

  const location = useLocation();
  const [params] = useSearchParams();
  const jobId = params.get("jobId");

  console.log(jobId, "jobId from params");
  const navigate = useNavigate();
  const { setCurrentTab } = useContext(TabContext);
  const { user } = useContext(UserContext);
  const [data, setData] = useState(null);
  // Add stored search parameters state
  const [storedSearchParams, setStoredSearchParams] = React.useState(null);

  console.log(data, "RESPONSE");
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
        currentTab: currentTab ?? 1, // Default to List tab (index 1)
        currentPage,
      };
      setStoredSearchParams(params);
    }
  }, [location.state]);

  // Handle back to job list navigation
  const handleBackToJobList = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 1; // Default to List tab (index 1)

    // Set the current tab in context
    setCurrentTab(tabIndex);

    // Navigate back to the Import DO with all stored search parameters
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

  // Second useEffect for KYC and bond status
  React.useEffect(() => {
    async function getData() {
      // Fix 6: Add parameter validation here too
      if (!jobId) {
        console.warn("Missing _id parameter for KYC data fetch");
        return;
      }

      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-kyc-and-bond-status/${jobId}`
        );
        const {
          shipping_line_kyc_completed,
          shipping_line_bond_completed,
          shipping_line_invoice_received,
          job_no,
          importer,
          awb_bl_no,
          kyc_documents,
          kyc_valid_upto,
          shipping_line_bond_valid_upto,
          shipping_line_bond_docs,
          shipping_line_bond_charges,
          shipping_line_insurance,
        } = res.data;

        // Set formik values based on the API response
        formik.setValues({
          ...formik.values,
          shipping_line_kyc_completed: shipping_line_kyc_completed === "Yes",
          shipping_line_bond_completed: shipping_line_bond_completed === "Yes",
          shipping_line_invoice_received:
            shipping_line_invoice_received === "Yes",
          kyc_documents: kyc_documents || [],
          kyc_valid_upto: kyc_valid_upto || "",
          shipping_line_bond_valid_upto: shipping_line_bond_valid_upto || "",
          shipping_line_bond_docs: shipping_line_bond_docs || [],
          shipping_line_bond_charges: shipping_line_bond_charges || "",
          shipping_line_insurance: shipping_line_insurance || [],
        });

        // Set job details for display
        setJobDetails({ job_no, importer, awb_bl_no });
      } catch (error) {
        console.error("Error fetching KYC data:", error);
      }
    }

    getData();
    // eslint-disable-next-line
  }, [jobId]);

  useEffect(() => {
    fetchJobDetails();
  }, [job_no, year]);

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

        // Log for debugging
        console.log("DO update - sending user info:", {
          userId: headers["user-id"],
          username: headers["username"],
          role: headers["user-role"],
        });

        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-do-list`,
          data,
          { headers }
        );

        setSnackbar(true);

        // Determine which tab to navigate to
        const tabIndex = storedSearchParams?.tabIndex ?? 1; // Default to List tab (index 1)

        // Set the current tab in context
        setCurrentTab(tabIndex);

        // Navigate back with all the stored search parameters
        // Close the tab after successful submit
        setTimeout(() => {
          window.close();
        }, 500);
      } catch (error) {
        console.error("Error updating job:", error);
      }
    },
  });

  // Fix 7: Add loading state and error handling before return
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

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

import ChargesGrid from "../ChargesGrid";

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
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      background-color: #ffffff;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .section-header {
      background-color: #f8fafc;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }

    .upload-content {
      padding: 20px;
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

  const { branch_code, trade_type, mode, job_no, year } = useParams();

  const [fileSnackbar, setFileSnackbar] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState(false);
  const [jobDetails, setJobDetails] = React.useState({
    job_no: "",
    importer: "",
    awb_bl_no: "",
  });

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
          axios.get(`${process.env.REACT_APP_API_STRING}/get-job/${branch_code}/${trade_type}/${mode}/${year}/${job_no}`),
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
          do_copies: jobRes.data.do_copies || [],
          security_deposit: jobRes.data.security_deposit || [],
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
          shipping_line_airline: mergedData.shipping_line_airline || "",
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
          security_deposit: mergedData.security_deposit || [],
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
      do_validity: data?.do_validity || "",
      do_copies: data?.do_copies || [],
      do_queries: updatedQueries,
    }));
  };

  const handleResolveQuery = (resolvedQuery, index) => {
    console.log("Query resolved:", resolvedQuery);
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
      shipping_line_airline: "",
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
      do_copies: [],
      security_deposit: [],
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
          security_deposit: values.security_deposit,
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

  const handleDoCopiesUpload = (urls) => {
    formik.setFieldValue("do_copies", [...formik.values.do_copies, ...urls]);
  };

  const handleRemoveDoCopy = (index) => {
    const updatedCopies = [...formik.values.do_copies];
    updatedCopies.splice(index, 1);
    formik.setFieldValue("do_copies", updatedCopies);
  };

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

        <ChargesGrid 
          parentId={jobId} 
          parentModule="Job" 
          initialTab="cost" 
          hideTabs={true} 
          shippingLineAirline={data?.shipping_line_airline} 
          jobNumber={job_no}
          jobYear={year}
          awbBlNo={data?.awb_bl_no}
          awbBlDate={data?.awb_bl_date}
        />

        {/* DO Copies Section */}
        <div className="upload-container">
          <div className="section-header">
            <h3 className="section-title">DO COPIES</h3>
          </div>
          <div className="upload-content">
            <FileUpload 
              label="UPLOAD DO COPIES"
              onFilesUploaded={handleDoCopiesUpload} 
            />
            <ImagePreview
              images={formik.values.do_copies}
              onDeleteImage={(index) => {
                handleRemoveDoCopy(index);
              }}
            />
          </div>
        </div>



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
import React, { useState, useEffect, useRef, useContext } from "react";
import {
  TextField,
  Box,
  FormControlLabel,
  Typography,
  Button,
} from "@mui/material";
import { useFormik } from "formik";
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
import Charges from "../Charges/Charges";
import QueriesComponent from "../../utils/QueriesComponent";

const ViewBillingJob = () => {
  const routeLocation = useLocation();
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [data, setData] = useState(null);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  console.log(job_no, "jobNo");
  // Add stored search parameters state for consistency with SubmissionJob.js
  const [storedSearchParams, setStoredSearchParams] = useState(null); // Store search parameters from location state
  useEffect(() => {
    if (routeLocation.state) {
      const { searchQuery, selectedImporter, selectedJobId, currentTab } =
        routeLocation.state;
      setStoredSearchParams({
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentTab,
      });
    }
  }, [routeLocation.state]);
  const handleBackClick = () => {
    navigate("/import-billing", {
      state: {
        fromJobDetails: true,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery || "",
          selectedImporter: storedSearchParams.selectedImporter || "",
          selectedJobId: storedSearchParams.selectedJobId || "",
          currentTab: storedSearchParams.currentTab || 1,
        }),
      },
    });
  };

  const isAdmin = user.role === "Admin";
  const isDisabled = !isAdmin;

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

  // Extract bill information
  const extractBillInfo = () => {
    if (!data?.bill_no) return { agencyBill: "", reimbursementBill: "" };

    const bills = data.bill_no.split(",");
    return {
      agencyBill: bills[0] || "",
      reimbursementBill: bills[1] || "",
    };
  };

  // Extract bill dates
  const extractBillDates = () => {
    if (!data?.bill_date) return { agencyDate: "", reimbursementDate: "" };

    const dates = data.bill_date.split(",");
    return {
      agencyDate: dates[0] || "",
      reimbursementDate: dates[1] || "",
    };
  };

  const { agencyBill, reimbursementBill } = extractBillInfo();
  const { agencyDate, reimbursementDate } = extractBillDates();

  // Formik setup
  const formik = useFormik({
    initialValues: {
      agency_bill_no: agencyBill || "",
      agency_bill_date: agencyDate || "",
      agency_bill_amount: data?.bill_amount?.split(",")?.[0] || "",
      reimbursement_bill_no: reimbursementBill || "",
      reimbursement_bill_date: reimbursementDate || "",
      reimbursement_bill_amount: data?.bill_amount?.split(",")?.[1] || "",
      upload_agency_bill_img: data?.upload_agency_bill_img || "",
      upload_reimbursement_bill_img: data?.upload_reimbursement_bill_img || "",
      billing_completed_date: data?.billing_completed_date || "",
      dsr_queries: data?.dsr_queries || [],
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        // Combine values for storage
        const combinedBillNo = `${values.agency_bill_no},${values.reimbursement_bill_no}`;
        const combinedBillDate = `${values.agency_bill_date},${values.reimbursement_bill_date}`;
        const combinedBillAmount = `${values.agency_bill_amount},${values.reimbursement_bill_amount}`;

        const updateData = {
          bill_no: combinedBillNo,
          bill_date: combinedBillDate,
          bill_amount: combinedBillAmount,
          upload_agency_bill_img: values.upload_agency_bill_img,
          upload_reimbursement_bill_img: values.upload_reimbursement_bill_img,
          billing_completed_date: values.billing_completed_date,
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

        // Use the same endpoint as the working version
        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/jobs/${data._id}`,
          updateData,
          { headers }
        );

        // Refresh data to confirm changes were saved
        fetchJobDetails();
        // Navigate back to billing list page with search state preservation
        // Close the tab after successful submit
        setTimeout(() => {
          window.close();
        }, 500);
      } catch (error) {
        console.error("Error updating billing details:", error);
        alert("Failed to update billing details.");
      }
    },
  });

  // Handle checkbox change for billing completion
  const handleCheckboxChange = (e) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      const currentDate = new Date();
      const isoDate = new Date(
        currentDate.getTime() - currentDate.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      formik.setFieldValue("billing_completed_date", isoDate);
    } else {
      formik.setFieldValue("billing_completed_date", "");
    }
  };

  // Extract filename from URL
  const extractFileName = (url) => {
    if (!url) return "No file uploaded";
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return url;
    }
  };

  // Handle file uploads
  const handleFilesUploaded = (files, fieldName) => {
    if (files && files.length > 0) {
      formik.setFieldValue(fieldName, files[0]);
      setFileSnackbar(true);
      setTimeout(() => setFileSnackbar(false), 3000);
    }
  };

  const handleQueriesChange = (updatedQueries) => {
    setData((prev) => ({
      ...prev,
      dsr_queries: updatedQueries,
    }));
    formik.setFieldValue("dsr_queries", updatedQueries); // keep formik in sync
  };

  const handleResolveQuery = (resolvedQuery, index) => {
    // Custom logic when a query is resolved
    console.log("Query resolved:", resolvedQuery);
    // You can add API calls, notifications, etc.
  };

  const isFieldDisabled =
    formik.values.agency_bill_date &&
    formik.values.agency_bill_no &&
    formik.values.reimbursement_bill_no &&
    formik.values.reimbursement_bill_date;
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
          justifyContent: "flex-start",
        }}
      >
        {documents.map((url, index) => (
          <Box
            key={index}
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              flex: "1 1 30%",
              maxWidth: "30%",
              minWidth: "250px",
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
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              onClick={handleBackClick}
              sx={{
                backgroundColor: "#1976d2",
                color: "white",
                "&:hover": {
                  backgroundColor: "#333",
                },
              }}
            >
              ← Back to Job List
            </Button>
          </Box>

          <form onSubmit={formik.handleSubmit}>
            <JobDetailsStaticData
              data={data}
              bl_no_ref={bl_no_ref}
              params={{ job_no, year }}
            />
            {data && data.dsr_queries && (
              <div>
                <QueriesComponent
                  queries={data.dsr_queries}
                  currentModule="Import Billing"
                  onQueriesChange={handleQueriesChange}
                  title="Accounts Queries"
                  showResolveButton={true}
                  readOnlyReply={false}
                  onResolveQuery={handleResolveQuery}
                />
              </div>
            )}
            <div className="job-details-container">
              <JobDetailsRowHeading heading="CTH Documents" />
              {renderDocuments(data.cth_documents, "CTH Documents")}
            </div>
            <div className="job-details-container">
              <JobDetailsRowHeading heading="All Documents" />
              {renderAllDocuments(data.all_documents)}
            </div>
            {/* Agency Bill Details */}
            <div className="job-details-container">
              <JobDetailsRowHeading heading="Billing Details" />

              <Box sx={{ mt: 3, mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                  Agency Bill Details
                </Typography>
                <Row>
                  <Col xs={12} md={4}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Bill Number:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      name="agency_bill_no"
                      value={formik.values.agency_bill_no}
                      onChange={formik.handleChange}
                    />
                  </Col>
                  <Col xs={12} md={4}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Bill Date:
                    </Typography>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      size="small"
                      name="agency_bill_date"
                      value={formik.values.agency_bill_date}
                      onChange={formik.handleChange}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Col>
                  <Col xs={12} md={4}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Bill Amount:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      name="agency_bill_amount"
                      value={formik.values.agency_bill_amount}
                      onChange={formik.handleChange}
                    />
                  </Col>
                  <Col xs={12} md={12} className="mt-3">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Agency Bill Document:
                    </Typography>

                    <FileUpload
                      label="Upload Agency Bill"
                      bucketPath="upload_agency_bill_img"
                      onFilesUploaded={(files) =>
                        handleFilesUploaded(files, "upload_agency_bill_img")
                      }
                    />

                    {formik.values.upload_agency_bill_img && (
                      <ImagePreview
                        images={[formik.values.upload_agency_bill_img]}
                        onDeleteImage={() => {
                          formik.setFieldValue("upload_agency_bill_img", "");
                        }}
                      />
                    )}
                  </Col>
                </Row>
              </Box>

              {/* Reimbursement Bill Details */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                  Reimbursement Bill Details
                </Typography>
                <Row>
                  <Col xs={12} md={4}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Bill Number:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      name="reimbursement_bill_no"
                      value={formik.values.reimbursement_bill_no}
                      onChange={formik.handleChange}
                    />
                  </Col>
                  <Col xs={12} md={4}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Bill Date:
                    </Typography>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      size="small"
                      name="reimbursement_bill_date"
                      value={formik.values.reimbursement_bill_date}
                      onChange={formik.handleChange}
                      placeholder="DD-MMM-YYYY (e.g., 23-Apr-2024)"
                    />
                  </Col>
                  <Col xs={12} md={4}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Bill Amount:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      name="reimbursement_bill_amount"
                      value={formik.values.reimbursement_bill_amount}
                      onChange={formik.handleChange}
                    />
                  </Col>
                  <Col xs={12} md={12} className="mt-3">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Reimbursement Bill Document:
                    </Typography>

                    <FileUpload
                      label="Upload Reimbursement Bill"
                      bucketPath="upload_reimbursement_bill_img"
                      onFilesUploaded={(files) =>
                        handleFilesUploaded(
                          files,
                          "upload_reimbursement_bill_img"
                        )
                      }
                    />

                    {formik.values.upload_reimbursement_bill_img && (
                      <ImagePreview
                        images={[formik.values.upload_reimbursement_bill_img]}
                        onDeleteImage={() => {
                          formik.setFieldValue(
                            "upload_reimbursement_bill_img",
                            ""
                          );
                        }}
                      />
                    )}
                  </Col>
                </Row>
              </Box>
            </div>
            {/* Charges Section (below Billing Details) */}
            <Charges job_no={job_no} year={year} />
            {/* Bill Completion Section */}
            <div className="job-details-container">
              <JobDetailsRowHeading heading="All Cleared Documentation" />
              <Row>
                <Col xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        disabled={!isFieldDisabled}
                        checked={!!formik.values.billing_completed_date}
                        onChange={handleCheckboxChange}
                      />
                    }
                    label="Import Billing Completed"
                  />
                  {formik.values.billing_completed_date && (
                    <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                      {new Date(
                        formik.values.billing_completed_date
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
                      disabled={!isFieldDisabled}
                      type="datetime-local"
                      fullWidth
                      size="small"
                      margin="normal"
                      variant="outlined"
                      id="billing_completed_date"
                      name="billing_completed_date"
                      label="Set Date (Admin Only)"
                      value={formik.values.billing_completed_date || ""}
                      onChange={formik.handleChange}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Col>
                )}
              </Row>
            </div>{" "}
            <button
              className="btn sticky-btn"
              style={{ float: "right", margin: "20px" }}
              type="submit"
            >
              Submit
            </button>
            {fileSnackbar && (
              <div className="snackbar show">File uploaded successfully!</div>
            )}
          </form>
        </>
      ) : (
        <p>Loading job details...</p>
      )}
    </div>
  );
};

export default ViewBillingJob;

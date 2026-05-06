import React, { useState, useEffect, useRef, useContext } from "react";
import {
  TextField,
  Box,
  FormControlLabel,
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
// import ImagePreview from "../gallery/ImagePreview";

import QueriesComponent from "../../utils/QueriesComponent";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ChargesGrid from "../ChargesGrid";

// Excel-like styles
const excelStyles = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: "12px",
    backgroundColor: "#ffffff",
    border: "2px solid #000000", // Strong black border for outer edge
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)", // Sharper shadow
    marginBottom: "20px",
  },
  th: {
    backgroundColor: "#061f45", // Dark Blue
    color: "#ffffff", // White text
    border: "1px solid #000000", // Black border
    padding: "12px 14px",
    textAlign: "left",
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: "13px",
    letterSpacing: "0.5px",
    verticalAlign: "middle",
  },
  td: {
    border: "1px solid #000000", // Black border
    padding: "10px 14px",
    verticalAlign: "middle",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    color: "#000000", // Pitch black text
    fontWeight: "500",
  },
  link: {
    color: "#0056b3", // Darker vibrant blue for links
    textDecoration: "none",
    fontWeight: "600",
    display: "inline-block",
    marginRight: "10px",
    marginBottom: "2px",
    transition: "all 0.2s ease"
  }
};

const ViewBillingJob = () => {
  const routeLocation = useLocation();
  const { branch_code, trade_type, mode, job_no, year } = useParams();
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

  useEffect(() => {
    fetchJobDetails();
  }, [job_no, year]);

  const fetchJobDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${branch_code}/${trade_type}/${mode}/${year}/${job_no}`
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
      thar_invoices: data?.thar_invoices || [],
      hasti_invoices: data?.hasti_invoices || [],
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
          thar_invoices: values.thar_invoices || [],
          hasti_invoices: values.hasti_invoices || [],
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

  // When fields are filled (isFieldDisabled === true) and billing_completed_date is empty,
  // set it to the current local datetime (same format used by handleCheckboxChange).
  // When fields become editable (isFieldDisabled === false), clear the billing_completed_date.
  useEffect(() => {
    const currentDate = new Date();
    const isoDate = new Date(
      currentDate.getTime() - currentDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    if (isFieldDisabled) {
      // fields are filled/disabled for editing; ensure billing_completed_date is set
      if (!formik.values.billing_completed_date) {
        formik.setFieldValue("billing_completed_date", isoDate);
      }
    } else {
      // fields are editable by user/team; clear the billing_completed_date
      if (formik.values.billing_completed_date) {
        formik.setFieldValue("billing_completed_date", "");
      }
    }
  }, [isFieldDisabled, formik.values.billing_completed_date]);

  // Unified Render Table Function
  // Unified Render Table Function
  const renderDocumentTable = (docs, type) => {
    if (!docs || docs.length === 0) {
      return <p style={{ padding: '10px', color: '#666', fontStyle: 'italic' }}>No documents available.</p>;
    }

    // Adapt data structure
    const rows = type === 'CTH' ? docs : docs.map(url => ({
      document_name: extractFileName(url), // Kept for consistency, though not used in 'ALL' column
      url: [url]
    }));

    // Function to render a single table given a subset of rows
    const renderTable = (tableRows, startIndex) => (
      <div style={{ overflowX: 'auto' }}>
        <table style={excelStyles.table}>
          <thead>
            <tr>
              {type === 'ALL' ? (
                <th style={{ ...excelStyles.th, width: '50px', textAlign: 'center' }}>Sr No</th>
              ) : (
                <th style={{ ...excelStyles.th, width: '40%' }}>Document Name</th>
              )}
              <th style={excelStyles.th}>Files</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, index) => (
              <tr key={index} style={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
                {type === 'ALL' ? (
                  <td style={{ ...excelStyles.td, textAlign: 'center', fontWeight: 700, color: 'black' }}>
                    {startIndex + index + 1}
                  </td>
                ) : (
                  <td style={{ ...excelStyles.td, color: 'black' }}>
                    <div style={{ fontWeight: 700 }}>
                      {row.document_name || '-'}
                    </div>
                    {row.document_code && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        {row.document_code}
                      </div>
                    )}
                  </td>
                )}
                <td style={excelStyles.td}>
                  {row.url && row.url.length > 0 ? (
                    row.url.map((fileUrl, i) => (
                      <a
                        key={i}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...excelStyles.link,
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        {extractFileName(fileUrl)}
                      </a>
                    ))
                  ) : (
                    <span style={{ color: '#999' }}>No files</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    // Split rows into two columns
    const midPoint = Math.ceil(rows.length / 2);
    const leftRows = rows.slice(0, midPoint);
    const rightRows = rows.slice(midPoint);

    return (
      <Row>
        <Col md={6} style={{ paddingRight: '10px' }}>
          {renderTable(leftRows, 0)}
        </Col>
        <Col md={6} style={{ paddingLeft: '10px' }}>
          {rightRows.length > 0 && renderTable(rightRows, midPoint)}
        </Col>
      </Row>
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
              params={{ mode, job_no, year }}
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
                  userName={user?.username}
                />
              </div>
            )}

            {/* Agency & Reimbursement Bill Details - Compact Table */}
            <div className="job-details-container">
              <JobDetailsRowHeading heading="Billing Details" />

              <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                <table style={excelStyles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...excelStyles.th, width: '15%' }}>Bill Type</th>
                      <th style={{ ...excelStyles.th, width: '20%' }}>Bill Number</th>
                      <th style={{ ...excelStyles.th, width: '20%' }}>Bill Date</th>
                      <th style={{ ...excelStyles.th, width: '15%' }}>Bill Amount</th>
                      <th style={{ ...excelStyles.th, width: '30%' }}>Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Agency Bill Row */}
                    <tr style={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
                      <td style={{ ...excelStyles.td, fontWeight: 700, color: '#1976d2' }}>
                        Agency Bill
                      </td>
                      <td style={excelStyles.td}>
                        <TextField
                          fullWidth
                          size="small"
                          variant="standard"
                          name="agency_bill_no"
                          value={formik.values.agency_bill_no}
                          onChange={formik.handleChange}
                          InputProps={{ disableUnderline: true }}
                          placeholder="Enter Bill No"
                        />
                      </td>
                      <td style={excelStyles.td}>
                        <TextField
                          fullWidth
                          type="datetime-local"
                          size="small"
                          variant="standard"
                          name="agency_bill_date"
                          value={formik.values.agency_bill_date}
                          onChange={formik.handleChange}
                          InputProps={{
                            disableUnderline: true,
                            style: { fontSize: '12px' }
                          }}
                        />
                      </td>
                      <td style={excelStyles.td}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          variant="standard"
                          name="agency_bill_amount"
                          value={formik.values.agency_bill_amount}
                          onChange={formik.handleChange}
                          InputProps={{ disableUnderline: true }}
                          placeholder="0.00"
                        />
                      </td>
                      <td style={{ ...excelStyles.td, padding: '4px 8px' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <div style={{ flex: 1 }}>
                            {formik.values.upload_agency_bill_img ? (
                              <Box display="flex" alignItems="center" justifyContent="space-between">
                                <a
                                  href={formik.values.upload_agency_bill_img}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '11px',
                                    color: '#1976d2',
                                    textDecoration: 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '150px',
                                    display: 'inline-block'
                                  }}
                                >
                                  {extractFileName(formik.values.upload_agency_bill_img)}
                                </a>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => formik.setFieldValue("upload_agency_bill_img", "")}
                                  sx={{ minWidth: '30px', padding: 0 }}
                                >
                                  ✕
                                </Button>
                              </Box>
                            ) : (
                              <FileUpload
                                label="UPLOAD"
                                bucketPath="upload_agency_bill_img"
                                onFilesUploaded={(files) =>
                                  handleFilesUploaded(files, "upload_agency_bill_img")
                                }
                                containerStyles={{ marginTop: "0px" }}
                                buttonSx={{ backgroundColor: "black", color: "white", "&:hover": { backgroundColor: "#333" }, width: "auto", minWidth: "100px" }}
                              />
                            )}
                          </div>
                        </Box>
                      </td>
                    </tr>

                    {/* Reimbursement Bill Row */}
                    <tr style={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
                      <td style={{ ...excelStyles.td, fontWeight: 700, color: '#e65100' }}>
                        Reimbursement Bill
                      </td>
                      <td style={excelStyles.td}>
                        <TextField
                          fullWidth
                          size="small"
                          variant="standard"
                          name="reimbursement_bill_no"
                          value={formik.values.reimbursement_bill_no}
                          onChange={formik.handleChange}
                          InputProps={{ disableUnderline: true }}
                          placeholder="Enter Bill No"
                        />
                      </td>
                      <td style={excelStyles.td}>
                        <TextField
                          fullWidth
                          type="datetime-local"
                          size="small"
                          variant="standard"
                          name="reimbursement_bill_date"
                          value={formik.values.reimbursement_bill_date}
                          onChange={formik.handleChange}
                          InputProps={{
                            disableUnderline: true,
                            style: { fontSize: '12px' }
                          }}
                        />
                      </td>
                      <td style={excelStyles.td}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          variant="standard"
                          name="reimbursement_bill_amount"
                          value={formik.values.reimbursement_bill_amount}
                          onChange={formik.handleChange}
                          InputProps={{ disableUnderline: true }}
                          placeholder="0.00"
                        />
                      </td>
                      <td style={{ ...excelStyles.td, padding: '4px 8px' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <div style={{ flex: 1 }}>
                            {formik.values.upload_reimbursement_bill_img ? (
                              <Box display="flex" alignItems="center" justifyContent="space-between">
                                <a
                                  href={formik.values.upload_reimbursement_bill_img}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '11px',
                                    color: '#1976d2',
                                    textDecoration: 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '150px',
                                    display: 'inline-block'
                                  }}
                                >
                                  {extractFileName(formik.values.upload_reimbursement_bill_img)}
                                </a>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => formik.setFieldValue("upload_reimbursement_bill_img", "")}
                                  sx={{ minWidth: '30px', padding: 0 }}
                                >
                                  ✕
                                </Button>
                              </Box>
                            ) : (
                              <FileUpload
                                label="UPLOAD"
                                bucketPath="upload_reimbursement_bill_img"
                                onFilesUploaded={(files) =>
                                  handleFilesUploaded(files, "upload_reimbursement_bill_img")
                                }
                                containerStyles={{ marginTop: "0px" }}
                                buttonSx={{ backgroundColor: "black", color: "white", "&:hover": { backgroundColor: "#333" }, width: "auto", minWidth: "100px" }}
                              />
                            )}
                          </div>
                        </Box>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charges Grid Section */}
            <div className="job-details-container">
              <JobDetailsRowHeading heading="Charges Details" />
              <ChargesGrid 
                parentId={data?._id} 
                parentModule="Job" 
                shippingLineAirline={data?.shipping_line_airline} 
                importerName={data?.importer}
                jobNumber={data?.job_no}
                jobDisplayNumber={data?.job_number}
                jobYear={data?.year}
                branch_code={data?.branch_code}
                invoiceNumber={data?.invoice_number}
                invoiceDate={data?.invoice_date}
                invoiceValue={data?.total_inv_value}
                cthNo={data?.cth_no}
                awbBlNo={data?.awb_bl_no}
                awbBlDate={data?.awb_bl_date}
                workMode={routeLocation.state?.workMode || 'Payment'}
              />
            </div>

            {/* CTH Documents Table */}
            <div className="job-details-container">
              <JobDetailsRowHeading heading="CTH Documents" />
              {renderDocumentTable(data.cth_documents, 'CTH')}
            </div>

            {/* All Documents Table */}
            <div className="job-details-container">
              <JobDetailsRowHeading heading="All Documents" />
              {renderDocumentTable(data.all_documents, 'ALL')}
            </div>


            {/* Conditional Invoices for ICD SANAND */}
            {data?.custom_house === "ICD SANAND" && (
              <div className="job-details-container">
                <JobDetailsRowHeading heading="ICD Sanand Invoices" />
                <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                  <table style={excelStyles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...excelStyles.th, width: '30%' }}>Invoice Type</th>
                        <th style={{ ...excelStyles.th, width: '70%' }}>Document</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Thar Invoices Row */}
                      <tr style={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
                        <td style={{ ...excelStyles.td, fontWeight: 700, color: '#000' }}>
                          Thar Invoices
                        </td>
                        <td style={{ ...excelStyles.td, padding: '4px 8px' }}>
                          <Box display="flex" flexDirection="column" gap={1}>
                            {(formik.values.thar_invoices || []).map((fileUrl, index) => (
                              <Box key={index} display="flex" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '11px',
                                    color: '#0056b3',
                                    textDecoration: 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '300px',
                                    display: 'inline-block'
                                  }}
                                >
                                  {extractFileName(fileUrl)}
                                </a>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    const updatedFiles = [...formik.values.thar_invoices];
                                    updatedFiles.splice(index, 1);
                                    formik.setFieldValue("thar_invoices", updatedFiles);
                                  }}
                                  sx={{ minWidth: '24px', padding: 0, height: '24px' }}
                                >
                                  ✕
                                </Button>
                              </Box>
                            ))}
                            <div style={{ marginTop: '4px' }}>
                              <FileUpload
                                label="UPLOAD"
                                bucketPath="thar_invoices"
                                onFilesUploaded={(newFiles) => {
                                  const existingFiles = formik.values.thar_invoices || [];
                                  const updatedFiles = [...existingFiles, ...newFiles];
                                  formik.setFieldValue("thar_invoices", updatedFiles);
                                }}
                                multiple={true}
                                containerStyles={{ marginTop: "0px" }}
                                buttonSx={{ backgroundColor: "black", color: "white", "&:hover": { backgroundColor: "#333" }, width: "auto", minWidth: "100px" }}
                              />
                            </div>
                          </Box>
                        </td>
                      </tr>

                      {/* Hasti Invoices Row */}
                      <tr style={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
                        <td style={{ ...excelStyles.td, fontWeight: 700, color: '#000' }}>
                          Hasti Invoices
                        </td>
                        <td style={{ ...excelStyles.td, padding: '4px 8px' }}>
                          <Box display="flex" flexDirection="column" gap={1}>
                            {(formik.values.hasti_invoices || []).map((fileUrl, index) => (
                              <Box key={index} display="flex" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '11px',
                                    color: '#0056b3',
                                    textDecoration: 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '300px',
                                    display: 'inline-block'
                                  }}
                                >
                                  {extractFileName(fileUrl)}
                                </a>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    const updatedFiles = [...formik.values.hasti_invoices];
                                    updatedFiles.splice(index, 1);
                                    formik.setFieldValue("hasti_invoices", updatedFiles);
                                  }}
                                  sx={{ minWidth: '24px', padding: 0, height: '24px' }}
                                >
                                  ✕
                                </Button>
                              </Box>
                            ))}
                            <div style={{ marginTop: '4px' }}>
                              <FileUpload
                                label="UPLOAD"
                                bucketPath="hasti_invoices"
                                onFilesUploaded={(newFiles) => {
                                  const existingFiles = formik.values.hasti_invoices || [];
                                  const updatedFiles = [...existingFiles, ...newFiles];
                                  formik.setFieldValue("hasti_invoices", updatedFiles);
                                }}
                                multiple={true}
                                containerStyles={{ marginTop: "0px" }}
                                buttonSx={{ backgroundColor: "black", color: "white", "&:hover": { backgroundColor: "#333" }, width: "auto", minWidth: "100px" }}
                              />
                            </div>
                          </Box>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
            <Button
              type="submit"
              variant="contained"
              sx={{
                position: "fixed",
                bottom: 40,
                right: 40,
                zIndex: 1000,
                backgroundColor: "#000",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#333",
                },
                padding: "12px 32px",
                fontSize: "16px",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                borderRadius: "8px"
              }}
            >
              Submit
            </Button>
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

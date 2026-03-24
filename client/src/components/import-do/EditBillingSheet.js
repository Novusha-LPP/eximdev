import React, { useContext } from "react";
import { useFormik } from "formik";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  TextField,
  MenuItem,
  IconButton,
  Snackbar,
  Checkbox,
  FormControlLabel,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Row, Col } from "react-bootstrap";
import FileUpload from "../../components/gallery/FileUpload.js";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { UserContext } from "../../contexts/UserContext";
import { TabContext } from "./ImportDO";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useSearchParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import Charges from "../Charges/Charges.js";
import QueriesComponent from "../../utils/QueriesComponent.js";

// Excel-like styles
const excelStyles = {
  table: {
    width: "70%", // Reduced width as requested
    marginLeft: "0",
    borderCollapse: "collapse",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: "12px",
    backgroundColor: "#ffffff",
    border: "2px solid #000000",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    marginBottom: "20px",
  },
  th: {
    backgroundColor: "#061f45",
    color: "#ffffff",
    border: "1px solid #000000",
    padding: "12px 14px",
    textAlign: "left",
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: "13px",
    letterSpacing: "0.5px",
    verticalAlign: "middle",
  },
  td: {
    border: "1px solid #000000",
    padding: "10px 14px",
    verticalAlign: "middle",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    color: "#000000",
    fontWeight: "500",
  },
  link: {
    color: "#0056b3",
    textDecoration: "none",
    fontWeight: "600",
    display: "inline-block",
    marginRight: "10px",
    marginBottom: "2px",
    transition: "all 0.2s ease"
  }
};

function EditBillingSheet() {
  const params = useParams();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [fileSnackbar, setFileSnackbar] = React.useState({
    open: false,
    message: "",
  });
  const [openAlert, setOpenAlert] = React.useState(false); // State for Alert Dialog
  const [openAdminConfirm, setOpenAdminConfirm] = React.useState(false); // State for Admin Confirm Dialog

  const { branch_code, trade_type, mode, job_no, year } = params;
  const { user } = useContext(UserContext); // Access user from context
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentTab } = useContext(TabContext);
  // This might be the job you're editing...
  const [param] = useSearchParams();

  const jobId = param.get("selectedJobId");
  // Add stored search parameters state
  const [storedSearchParams, setStoredSearchParams] = React.useState(null);

  // Store search parameters from location state
  React.useEffect(() => {
    if (location.state) {
      const {
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentTab,
        currentPage,
      } = location.state;

      const params = {
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentTab: currentTab ?? 4, // Default to Billing Sheet tab
        currentPage,
      };

      setStoredSearchParams(params);
    }
  }, [location.state]); // Handle back click function
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 4;

    navigate("/import-do", {});
  };

  const formik = useFormik({
    initialValues: {
      icd_cfs_invoice: "",
      icd_cfs_invoice_img: [],
      other_invoices_img: [],
      shipping_line_invoice_imgs: [],
      bill_document_sent_to_accounts: "", // Keeping this line and the comma
      dsr_queries: [],
      thar_invoices: [],
      hasti_invoices: [],
      concor_invoice_and_receipt_copy: [],
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        // Get user info from context or localStorage fallback
        const username =
          user?.username || localStorage.getItem("username") || "unknown";
        const userId =
          user?.selectedJobId || localStorage.getItem("userId") || "unknown";
        const userRole =
          user?.role || localStorage.getItem("userRole") || "unknown";

        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-do-billing/${jobId}`,
          { ...values, dsr_queries: values.dsr_queries || [] },

          {
            headers: {
              username: username,
              "user-id": userId,
              "user-role": userRole,
            },
          }
        );

        // Update the local data state after successful update
        setData((prev) => ({
          ...prev,
          ...values,
        }));
        setFileSnackbar({
          open: true,
          message: "Billing details updated successfully!",
        }); // Navigate back to the BillingSheet tab after submission
        const currentState = window.history.state || {};
        const scrollPosition = currentState.scrollPosition || 0;
        const tabIndex = storedSearchParams?.currentTab ?? 4;
        // Close the tab after successful submit
        setTimeout(() => {
          window.close();
        }, 500);

        setCurrentTab(tabIndex); // Update the active tab in context
      } catch (error) {
        console.error("Error updating billing details:", error);
        setFileSnackbar({
          open: true,
          message: "Failed to update billing details.",
        });
      }
    },
  });

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

  // Fetch data when the component is mounted
  React.useEffect(() => {
    async function getData() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-job-by-id/${jobId}`
        );
        const jobData = res.data.job || {};
        setData(jobData);

        // Update formik values with the fetched data
        formik.setValues({
          icd_cfs_invoice: jobData.icd_cfs_invoice || "",
          icd_cfs_invoice_img: jobData.icd_cfs_invoice_img || [],
          other_invoices_img: jobData.other_invoices_img || [],
          shipping_line_invoice_imgs: jobData.shipping_line_invoice_imgs || [],
          bill_document_sent_to_accounts:
            jobData.bill_document_sent_to_accounts || "",
          dsr_queries: jobData.dsr_queries || [],
          thar_invoices: jobData.thar_invoices || [],
          hasti_invoices: jobData.hasti_invoices || [],
          concor_invoice_and_receipt_copy: jobData.concor_invoice_and_receipt_copy || [],
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [jobId]);

  // Helper to render consistent rows
  const renderUploadRow = (label, fieldName, bucketPath, extraLeftContent = null) => {
    return (
      <tr key={fieldName} style={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
        <td style={{ ...excelStyles.td, fontWeight: 700, color: '#000', width: '30%', verticalAlign: 'top' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span>{label}</span>
            {extraLeftContent}
          </div>
        </td>
        <td style={{ ...excelStyles.td, padding: '8px', width: '70%', verticalAlign: 'middle' }}>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" width="100%">
            {/* Left: Files List */}
            <Box display="flex" flexDirection="column" gap={1} flexGrow={1} mr={2}>
              {(formik.values[fieldName] || []).length > 0 ? (
                (formik.values[fieldName] || []).map((url, index) => (
                  <Box
                    key={index}
                    display="flex"
                    alignItems="center"
                    sx={{
                      borderBottom: '1px solid #eee',
                      paddingBottom: '4px',
                      minHeight: '36px' // Match button height
                    }}
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '12px',
                        color: '#0056b3',
                        textDecoration: 'none',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '350px',
                        display: 'inline-block'
                      }}
                    >
                      {extractFileName(url)}
                    </a>
                  </Box>
                ))
              ) : (
                <span style={{ color: '#aaa', fontStyle: 'italic', fontSize: '12px', padding: '10px 0' }}>
                  No files uploaded
                </span>
              )}
            </Box>

            {/* Right: Actions Group */}
            <Box flexShrink={0} display="flex" flexDirection="row" gap={1} alignItems="flex-start">
              {/* Upload Button */}
              <Box>
                <FileUpload
                  label={<CloudUploadIcon fontSize="small" />}
                  bucketPath={bucketPath}
                  onFilesUploaded={(newFiles) => {
                    const existingFiles = formik.values[fieldName] || [];
                    const updatedFiles = [...existingFiles, ...newFiles];
                    formik.setFieldValue(fieldName, updatedFiles);
                  }}
                  multiple={true}
                  containerStyles={{ marginTop: 0 }}
                  buttonSx={{
                    minWidth: '36px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    padding: 0,
                    backgroundColor: 'black',
                    color: 'white',
                    '&:hover': { backgroundColor: '#333' },
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                />
              </Box>

              {/* Delete Buttons Column (Right side of Upload) */}
              <Box display="flex" flexDirection="column" gap={1}>
                {(formik.values[fieldName] || []).map((_, index) => (
                  <IconButton
                    key={`del-${index}`}
                    size="small"
                    onClick={() => {
                      const updatedFiles = [...formik.values[fieldName]];
                      updatedFiles.splice(index, 1);
                      formik.setFieldValue(fieldName, updatedFiles);
                    }}
                    sx={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      color: '#d32f2f',
                      '&:hover': { backgroundColor: '#ffebee' }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                ))}
              </Box>
            </Box>
          </Box>
        </td>
      </tr>
    );
  };

  if (loading) return <p>Loading data...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  return (
    <div style={{ margin: "20px" }}>
      {/* Back to Job List Button */}
      <Box sx={{ position: "fixed", top: 80, left: 80, zIndex: 999 }}>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{
            // fontWeight: 'bold',
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

      {data && <JobDetailsStaticData data={data} params={{ branch_code, trade_type, mode, job_no, year }} />}

      {data && data.dsr_queries && (
        <div>
          <QueriesComponent
            queries={data.dsr_queries}
            currentModule="Billing Sheet"
            onQueriesChange={handleQueriesChange}
            title="DO Queries"
            showResolveButton={true}
            readOnlyReply={false}
            onResolveQuery={handleResolveQuery}
            userName={user?.username}
          />
        </div>
      )}

      <Charges job_no={job_no} year={year} branch_code={branch_code} trade_type={trade_type} />

      <div className="job-details-container">
        <form id="billing-sheet-form" onSubmit={formik.handleSubmit}>
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={excelStyles.table}>
              <thead>
                <tr>
                  <th style={{ ...excelStyles.th, width: '30%' }}>Invoice Type</th>
                  <th style={{ ...excelStyles.th, width: '70%' }}>Document</th>
                </tr>
              </thead>
              <tbody>
                {/* ICD CFS Invoices */}
                {renderUploadRow(
                  "ICD CFS Invoices",
                  "icd_cfs_invoice_img",
                  "icd_cfs_invoice_img",
                  data?.custom_house === "ICD Sabarmati, Ahmedabad" ? (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="icd_cfs_invoice"
                      name="icd_cfs_invoice"
                      label="Is Applicable?"
                      value={formik.values.icd_cfs_invoice}
                      onChange={formik.handleChange}
                      sx={{ marginTop: '5px' }}
                    >
                      <MenuItem value="No">No</MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                    </TextField>
                  ) : null
                )}

                {/* Concor Invoice (Conditional) */}
                {data?.custom_house?.includes("ICD KHODIYAR") &&
                  renderUploadRow(
                    "Concor Invoice & Receipt Copy",
                    "concor_invoice_and_receipt_copy",
                    "concor_invoice_and_receipt_copy"
                  )}

                {/* Other Invoices */}
                {renderUploadRow(
                  "Other Invoices",
                  "other_invoices_img",
                  "other_invoices_img"
                )}

                {/* Shipping Line Invoices */}
                {renderUploadRow(
                  "Shipping Line Invoices",
                  "shipping_line_invoice_imgs",
                  "shipping_line_invoice_imgs"
                )}

                {/* Conditional Invoices for ICD SANAND */}
                {data?.custom_house === "ICD SANAND" && (
                  <>
                    {renderUploadRow(
                      "Thar Invoices",
                      "thar_invoices",
                      "thar_invoices"
                    )}
                    {renderUploadRow(
                      "Hasti Invoices",
                      "hasti_invoices",
                      "hasti_invoices"
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <Row>
            <Col xs={12} md={6}>
              <div>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!formik.values.bill_document_sent_to_accounts}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const setDateToNow = () => {
                          const currentDate = new Date();
                          const isoDate = new Date(
                            currentDate.getTime() -
                            currentDate.getTimezoneOffset() * 60000
                          )
                            .toISOString()
                            .slice(0, 16);
                          formik.setFieldValue(
                            "bill_document_sent_to_accounts",
                            isoDate
                          );
                        };

                        if (isChecked) {
                          // Validation for ICD SANAND
                          if (data?.custom_house === "ICD SANAND") {
                            const hasThar =
                              formik.values.thar_invoices &&
                              formik.values.thar_invoices.length > 0;
                            const hasHasti =
                              formik.values.hasti_invoices &&
                              formik.values.hasti_invoices.length > 0;

                            const isMSC =
                              data?.shipping_line_airline === "Maersk Line";

                            // If MSC, bypass Thar invoice condition
                            const isConditionMet = isMSC
                              ? hasHasti
                              : hasThar && hasHasti;

                            if (!isConditionMet) {
                              if (user?.role === "Admin") {
                                setOpenAdminConfirm(true);
                              } else {
                                setOpenAlert(true);
                              }
                              return;
                            }
                          }
                          setDateToNow();
                        } else {
                          formik.setFieldValue(
                            "bill_document_sent_to_accounts",
                            ""
                          );
                        }
                      }}
                    />
                  }
                  label="Bill Document Sent to Accounts Team"
                />
                {formik.values.bill_document_sent_to_accounts && (
                  <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
                    {new Date(
                      formik.values.bill_document_sent_to_accounts
                    ).toLocaleString("en-US", {
                      timeZone: "Asia/Kolkata",
                      hour12: true,
                    })}
                  </span>
                )}
              </div>
            </Col>

            {user?.role === "Admin" && (
              <Col xs={12} md={6}>
                <TextField
                  type="datetime-local"
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id="bill_document_sent_to_accounts"
                  name="bill_document_sent_to_accounts"
                  label="Set Date (Admin Only)"
                  value={formik.values.bill_document_sent_to_accounts}
                  onChange={formik.handleChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Col>
            )}
          </Row>
          <Box sx={{ height: "60px" }} />
        </form>
      </div>

      <Button
        type="submit"
        form="billing-sheet-form"
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

      <Snackbar
        open={fileSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setFileSnackbar({ open: false, message: "" })}
        message={fileSnackbar.message}
      />

      {/* Validation Alert Dialog */}
      <Dialog
        open={openAlert}
        onClose={() => setOpenAlert(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Missing Documents"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {data?.shipping_line_airline === "Maersk Line"
              ? "For ICD SANAND (Maersk Line), please upload at least one Hasti Invoice before sending to accounts."
              : "For ICD SANAND, please upload at least one Thar Invoice and one Hasti Invoice before sending to accounts."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAlert(false)} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Confirmation Dialog */}
      <Dialog
        open={openAdminConfirm}
        onClose={() => setOpenAdminConfirm(false)}
        aria-labelledby="admin-confirm-dialog-title"
        aria-describedby="admin-confirm-dialog-description"
      >
        <DialogTitle id="admin-confirm-dialog-title">
          {"Missing Documents (Admin Warning)"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="admin-confirm-dialog-description">
            {data?.shipping_line_airline === "Maersk Line"
              ? "For ICD SANAND (Maersk Line), Hasti Invoice is missing."
              : "For ICD SANAND, Thar Invoice and Hasti Invoice are missing."}{" "}
            As an Admin, you can proceed anyway.
            <br />
            <strong>Do you want to send the job to the billing team?</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdminConfirm(false)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              const currentDate = new Date();
              const isoDate = new Date(
                currentDate.getTime() -
                currentDate.getTimezoneOffset() * 60000
              )
                .toISOString()
                .slice(0, 16);
              formik.setFieldValue(
                "bill_document_sent_to_accounts",
                isoDate
              );
              setOpenAdminConfirm(false);
            }}
            color="primary"
            autoFocus
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default React.memo(EditBillingSheet);

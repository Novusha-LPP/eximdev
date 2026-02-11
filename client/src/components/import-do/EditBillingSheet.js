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
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Row, Col } from "react-bootstrap";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import { UserContext } from "../../contexts/UserContext";
import { TabContext } from "./ImportDO";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useSearchParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Charges from "../Charges/Charges.js";
import QueriesComponent from "../../utils/QueriesComponent.js";

function EditBillingSheet() {
  const params = useParams();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [fileSnackbar, setFileSnackbar] = React.useState({
    open: false,
    message: "",
  });

  const { job_no, year } = params;
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

      {data && <JobDetailsStaticData data={data} params={{ job_no, year }} />}

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

      <Charges job_no={job_no} year={year} />

      <div className="job-details-container">
        <form id="billing-sheet-form" onSubmit={formik.handleSubmit}>
          <Row>
            <Col xs={12} md={6}>
              {data?.custom_house === "ICD Sabarmati, Ahmedabad" && (
                <TextField
                  select
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id="icd_cfs_invoice"
                  name="icd_cfs_invoice"
                  label="ICD CFS Invoice"
                  value={formik.values.icd_cfs_invoice}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="No">No</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                </TextField>
              )}
            </Col>
          </Row>

          <Row>
            <Col xs={12} md={4}>
              <FileUpload
                label="ICD CFS Invoices"
                bucketPath="icd_cfs_invoice_img"
                onFilesUploaded={(newFiles) => {
                  const existingFiles = formik.values.icd_cfs_invoice_img || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  formik.setFieldValue("icd_cfs_invoice_img", updatedFiles);
                }}
                multiple={true}
                containerStyles={{ marginTop: "0px" }}
                buttonSx={{ width: "50%", minHeight: "40px" }}
              />
              <ImagePreview
                images={formik.values.icd_cfs_invoice_img || []}
                onDeleteImage={(index) => {
                  const updatedFiles = [...formik.values.icd_cfs_invoice_img];
                  updatedFiles.splice(index, 1);
                  formik.setFieldValue("icd_cfs_invoice_img", updatedFiles);
                }}
              />

              <div className="mt-3">
                {data?.custom_house?.includes("ICD KHODIYAR") && (
                  <>
                    <FileUpload
                      label="Concor Invoice & Receipt Copy"
                      bucketPath="concor_invoice_and_receipt_copy"
                      onFilesUploaded={(newFiles) => {
                        const existingFiles =
                          formik.values.concor_invoice_and_receipt_copy || [];
                        const updatedFiles = [...existingFiles, ...newFiles];
                        formik.setFieldValue(
                          "concor_invoice_and_receipt_copy",
                          updatedFiles
                        );
                      }}
                      multiple={true}
                      containerStyles={{ marginTop: "0px" }}
                      buttonSx={{ width: "50%", minHeight: "40px" }}
                    />
                    <ImagePreview
                      images={
                        formik.values.concor_invoice_and_receipt_copy || []
                      }
                      onDeleteImage={(index) => {
                        const updatedFiles = [
                          ...formik.values.concor_invoice_and_receipt_copy,
                        ];
                        updatedFiles.splice(index, 1);
                        formik.setFieldValue(
                          "concor_invoice_and_receipt_copy",
                          updatedFiles
                        );
                      }}
                    />
                  </>
                )}
              </div>
            </Col>

            <Col xs={12} md={4}>
              <FileUpload
                label="Other Invoices"
                bucketPath="other_invoices_img"
                onFilesUploaded={(newFiles) => {
                  const existingFiles = formik.values.other_invoices_img || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  formik.setFieldValue("other_invoices_img", updatedFiles);
                }}
                multiple={true}
                containerStyles={{ marginTop: "0px" }}
                buttonSx={{ width: "50%", minHeight: "40px" }}
              />
              <ImagePreview
                images={formik.values.other_invoices_img || []}
                onDeleteImage={(index) => {
                  const updatedFiles = [...formik.values.other_invoices_img];
                  updatedFiles.splice(index, 1);
                  formik.setFieldValue("other_invoices_img", updatedFiles);
                }}
              />
            </Col>

            <Col xs={12} md={4}>
              <FileUpload
                label="Shipping Line Invoices"
                bucketPath="shipping_line_invoice_imgs"
                onFilesUploaded={(newFiles) => {
                  const existingFiles =
                    formik.values.shipping_line_invoice_imgs || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  formik.setFieldValue(
                    "shipping_line_invoice_imgs",
                    updatedFiles
                  );
                }}
                multiple={true}
                containerStyles={{ marginTop: "0px" }}
                buttonSx={{ width: "50%", minHeight: "40px" }}
              />
              <ImagePreview
                images={formik.values.shipping_line_invoice_imgs || []}
                onDeleteImage={(index) => {
                  const updatedFiles = [
                    ...formik.values.shipping_line_invoice_imgs,
                  ];
                  updatedFiles.splice(index, 1);
                  formik.setFieldValue(
                    "shipping_line_invoice_imgs",
                    updatedFiles
                  );
                }}
              />
            </Col>
          </Row>

          {/* Conditional Invoices for ICD SANAND */}
          {data?.custom_house === "ICD SANAND" && (
            <Row>
              <Col xs={12} md={4}>
                <FileUpload
                  label="Thar Invoices"
                  bucketPath="thar_invoices"
                  onFilesUploaded={(newFiles) => {
                    const existingFiles = formik.values.thar_invoices || [];
                    const updatedFiles = [...existingFiles, ...newFiles];
                    formik.setFieldValue("thar_invoices", updatedFiles);
                  }}
                  multiple={true}
                  containerStyles={{ marginTop: "0px" }}
                  buttonSx={{ width: "50%", minHeight: "40px" }}
                />
                <ImagePreview
                  images={formik.values.thar_invoices || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...formik.values.thar_invoices];
                    updatedFiles.splice(index, 1);
                    formik.setFieldValue("thar_invoices", updatedFiles);
                  }}
                />
              </Col>
              <Col xs={12} md={4}>
                <FileUpload
                  label="Hasti Invoices"
                  bucketPath="hasti_invoices"
                  onFilesUploaded={(newFiles) => {
                    const existingFiles = formik.values.hasti_invoices || [];
                    const updatedFiles = [...existingFiles, ...newFiles];
                    formik.setFieldValue("hasti_invoices", updatedFiles);
                  }}
                  multiple={true}
                  containerStyles={{ marginTop: "0px" }}
                  buttonSx={{ width: "50%", minHeight: "40px" }}
                />
                <ImagePreview
                  images={formik.values.hasti_invoices || []}
                  onDeleteImage={(index) => {
                    const updatedFiles = [...formik.values.hasti_invoices];
                    updatedFiles.splice(index, 1);
                    formik.setFieldValue("hasti_invoices", updatedFiles);
                  }}
                />
              </Col>
            </Row>
          )}
          <Row>
            <Col xs={12} md={6}>
              <div>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!formik.values.bill_document_sent_to_accounts}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (isChecked) {
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

      <button
        className="btn sticky-btn"
        type="submit"
        form="billing-sheet-form"
        aria-label="submit-btn"
      >
        Submit
      </button>

      <Snackbar
        open={fileSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setFileSnackbar({ open: false, message: "" })}
        message={fileSnackbar.message}
      />
    </div>
  );
}

export default React.memo(EditBillingSheet);

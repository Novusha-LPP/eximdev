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
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Row, Col } from "react-bootstrap";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import { UserContext } from "../../contexts/UserContext";
import { TabContext } from "./ImportDO";

function EditBillingSheet() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [fileSnackbar, setFileSnackbar] = React.useState({
    open: false,
    message: "",
  });
  const { _id } = useParams();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  const { setCurrentTab } = useContext(TabContext);
  // This might be the job you're editing...
  const { selectedJobId } = location.state || {};

  const formik = useFormik({
    initialValues: {
      icd_cfs_invoice: "",
      icd_cfs_invoice_img: [],
      other_invoices_img: [],
      shipping_line_invoice_imgs: [],
      bill_document_sent_to_accounts: "",
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-do-billing/${data._id}`,
          values
        );

        // Update the local data state after successful update
        setData((prev) => ({
          ...prev,
          ...values,
        }));

        setFileSnackbar({
          open: true,
          message: "Billing details updated successfully!",
        });
        // Navigate back to the BillingSheet tab after submission
        const currentState = window.history.state || {};
        const scrollPosition = currentState.scrollPosition || 0;

        navigate("/import-do", {
          state: {
            tabIndex: 3, // BillingSheet tab index
            scrollPosition, // Preserve scroll position
            selectedJobId,
            searchQuery: location.state?.searchQuery || "", // Preserve search query
          },
        });

        setCurrentTab(3); // Update the active tab in context
      } catch (error) {
        console.error("Error updating billing details:", error);
        setFileSnackbar({
          open: true,
          message: "Failed to update billing details.",
        });
      }
    },
  });

  // Fetch data when the component is mounted
  React.useEffect(() => {
    async function getData() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-job-by-id/${_id}`
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
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [_id]);

  if (loading) return <p>Loading data...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ margin: "20px" }}>
      {data && (
        <div className="job-details-container">
          <Row>
            <Col>
              <h4>
                Job Number: {data.job_no} | Custom House: {data.custom_house}
              </h4>
            </Col>
          </Row>
          <Row>
            <Col xs={12} lg={6}>
              <strong>Importer:</strong> {data.importer}
            </Col>
          </Row>
          <Row>
            <Col xs={12} lg={6}>
              <strong>Importer Address:</strong> {data.importer_address}
              <IconButton
                size="small"
                onClick={() =>
                  navigator.clipboard.writeText(data.importer_address)
                }
              >
                <abbr title="Copy Importer Address">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </Col>
          </Row>
        </div>
      )}

      <div className="job-details-container">
        <form onSubmit={formik.handleSubmit}>
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
                label="Upload ICD CFS Invoices"
                bucketPath="icd_cfs_invoice_img"
                onFilesUploaded={(newFiles) => {
                  const existingFiles = formik.values.icd_cfs_invoice_img || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  formik.setFieldValue("icd_cfs_invoice_img", updatedFiles);
                }}
                multiple={true}
              />
              <ImagePreview
                images={formik.values.icd_cfs_invoice_img || []}
                onDeleteImage={(index) => {
                  const updatedFiles = [...formik.values.icd_cfs_invoice_img];
                  updatedFiles.splice(index, 1);
                  formik.setFieldValue("icd_cfs_invoice_img", updatedFiles);
                }}
              />
            </Col>

            <Col xs={12} md={4}>
              <FileUpload
                label="Upload Other Invoices"
                bucketPath="other_invoices_img"
                onFilesUploaded={(newFiles) => {
                  const existingFiles = formik.values.other_invoices_img || [];
                  const updatedFiles = [...existingFiles, ...newFiles];
                  formik.setFieldValue("other_invoices_img", updatedFiles);
                }}
                multiple={true}
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
                label="Upload Shipping Line Invoices"
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

          <button
            className="btn"
            type="submit"
            style={{ float: "right", marginTop: "20px" }}
          >
            Submit
          </button>
        </form>
      </div>

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

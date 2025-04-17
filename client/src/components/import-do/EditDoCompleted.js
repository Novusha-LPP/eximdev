import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import { useFormik } from "formik";
import axios from "axios";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import { TabContext } from "./ImportDO";
import {
  Checkbox,
  FormControlLabel,
  TextField,
  IconButton,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";

// Import your user context or authentication hook here
import { UserContext } from "../../contexts/UserContext";

function EditDoCompleted() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state
  const [kycData, setKycData] = useState("");
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const { _id } = useParams();

  // Modal and other states
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [currentField, setCurrentField] = useState(null);
  const [openImageDeleteModal, setOpenImageDeleteModal] = useState(false);
  const container_number_ref = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentTab } = useContext(TabContext);
  const { user } = useContext(UserContext); // Access user from context

  // This might be the job you're editing...
  const { selectedJobId } = location.state || {};

  // Helper function to get local datetime string in 'YYYY-MM-DDTHH:MM' format
  const getLocalDatetimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `0${now.getMonth() + 1}`.slice(-2);
    const day = `0${now.getDate()}`.slice(-2);
    const hours = `0${now.getHours()}`.slice(-2);
    const minutes = `0${now.getMinutes()}`.slice(-2);
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to convert date to 'YYYY-MM-DD' format
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  };

  // Fetch data on component mount
  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-job-by-id/${_id}`
        );
        console.log("API Response:", res.data); // Debugging log

        // Ensure correct access to the job object
        const jobData = res.data.job;

        // Safely handle do_completed field
        let do_completed = "";
        if (
          typeof jobData.do_completed === "string" &&
          jobData.do_completed.trim() !== ""
        ) {
          const parsedDate = new Date(jobData.do_completed);
          if (!isNaN(parsedDate.getTime())) {
            // Convert to local datetime string for datetime-local input
            const year = parsedDate.getFullYear();
            const month = `0${parsedDate.getMonth() + 1}`.slice(-2);
            const day = `0${parsedDate.getDate()}`.slice(-2);
            const hours = `0${parsedDate.getHours()}`.slice(-2);
            const minutes = `0${parsedDate.getMinutes()}`.slice(-2);
            do_completed = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }

        // Update data and set appropriate flags for boolean values
        setData({
          ...jobData,
          shipping_line_invoice: jobData.shipping_line_invoice === "Yes",
          payment_made: jobData.payment_made === "Yes",
          do_processed: jobData.do_processed === "Yes",
          other_invoices: jobData.other_invoices === "Yes",
          security_deposit: jobData.security_deposit === "Yes",
          do_completed, // Set as local datetime string or ""
        });

        setLoading(false); // Data loaded
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false); // Stop loading even if error occurs
      }
    }

    getData();
  }, [_id]);

  const formik = useFormik({
    initialValues: {
      security_deposit: false,
      security_amount: "",
      utr: [],
      other_invoices: false,
      payment_made: false,
      do_processed: false,
      do_documents: [],
      do_validity: "",
      do_copies: [],
      shipping_line_invoice: false,
      shipping_line_invoice_date: "",
      shipping_line_invoice_imgs: [],
      do_queries: [{ query: "", reply: "" }],
      do_completed: "", // Initialize as empty string
      do_Revalidation_Completed: false,
      container_nos: [], // Ensure container_nos is initialized
    },

    onSubmit: async (values, { resetForm }) => {
      // Convert booleans back to "Yes" or "No"
      const dataToSubmit = {
        ...values,
        _id,
        do_Revalidation_Completed: values.do_Revalidation_Completed,
        shipping_line_invoice: values.shipping_line_invoice ? "Yes" : "No",
        payment_made: values.payment_made ? "Yes" : "No",
        do_processed: values.do_processed ? "Yes" : "No",
        other_invoices: values.other_invoices ? "Yes" : "No",
        security_deposit: values.security_deposit ? "Yes" : "No",
        // Handle do_completed
        do_completed:
          typeof values.do_completed === "string" &&
          values.do_completed.trim() !== ""
            ? new Date(values.do_completed).toISOString()
            : "", // Set to ISO string or ""
      };

      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/update-do-planning`,
          dataToSubmit
        );
        resetForm(); // Reset the form
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

        setCurrentTab(2); // Update the active tab in context
      } catch (error) {
        console.error("Error submitting form:", error);
      }
    },
  });

  // Derived state to determine if DO Completed can be enabled
  const isDoCompletedEnabled =
    formik.values.do_validity !== "" &&
    formik.values.do_copies &&
    formik.values.do_copies.length > 0;

  // Effect to clear do_completed if DO Validity or DO Copies are cleared
  useEffect(() => {
    if (!isDoCompletedEnabled && formik.values.do_completed !== "") {
      formik.setFieldValue("do_completed", "");
      console.log("Cleared do_completed because prerequisites are not met.");
    }
  }, [isDoCompletedEnabled, formik.values.do_completed, formik]);

  // Fetch KYC documents once data is loaded
  useEffect(() => {
    if (data) {
      const updatedData = {
        ...data,
        shipping_line_invoice:
          data.shipping_line_invoice === "Yes" ||
          data.shipping_line_invoice === true,
        shipping_line_invoice_date: formatDate(data.shipping_line_invoice_date),
        payment_made: data.payment_made === "Yes" || data.payment_made === true, // Handle similar cases for payment_made
        do_processed: data.do_processed === "Yes" || data.do_processed === true, // Handle similar cases for do_processed
        other_invoices:
          data.other_invoices === "Yes" || data.other_invoices === true, // Handle similar cases for other_invoices
        security_deposit:
          data.security_deposit === "Yes" || data.security_deposit === true, // Handle similar cases for security_deposit
        // do_completed is already handled in getData()
        do_Revalidation_Completed: data.do_Revalidation_Completed,
        do_queries: data.do_queries || [{ query: "", reply: "" }],
        container_nos: data.container_nos || [],
      };

      formik.setValues(updatedData);
      console.log(
        "Update shipping_line_invoice_date:",
        updatedData.shipping_line_invoice_date
      ); // Check if value is set

      async function getKycDocs() {
        const importer = data.importer;
        const shipping_line_airline = data.shipping_line_airline;
        try {
          const res = await axios.post(
            `${process.env.REACT_APP_API_STRING}/get-kyc-documents`,
            { importer, shipping_line_airline }
          );
          setKycData(res.data);
        } catch (error) {
          console.error("Error fetching KYC documents:", error);
        }
      }

      getKycDocs();
    }
  }, [data]); // **Removed 'isDoCompletedEnabled' and 'formik' from dependencies**

  //
  const handleCopy = useCallback((event, text) => {
    // Optimized handleCopy function using useCallback to avoid re-creation on each render
    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  //
  const handleAddField = () => {
    formik.setValues({
      ...formik.values,
      do_queries: [
        ...formik.values.do_queries,
        {
          query: "",
          reply: "",
        },
      ],
    });
  };

  // Handle checkbox change for do_completed
  const handleCheckboxChange = (event) => {
    if (event.target.checked) {
      // Set to current local date and time in 'YYYY-MM-DDTHH:MM' format
      const localDatetime = getLocalDatetimeString();
      formik.setFieldValue("do_completed", localDatetime);
      console.log("DO Completed set to:", localDatetime);
    } else {
      // Set to empty string
      formik.setFieldValue("do_completed", "");
      console.log("DO Completed cleared.");
    }
  };

  // Handle admin date change
  const handleAdminDateChange = (event) => {
    formik.setFieldValue("do_completed", event.target.value);
    console.log("DO Completed set by Admin to:", event.target.value);
  };

  // Render container details only if data is available
  const renderContainerDetails = () => {
    if (!data || !data.container_nos || data.container_nos.length === 0) {
      return <p>No containers available.</p>;
    }

    return data.container_nos.map((container, index) => (
      <div key={index} style={{ padding: "30px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h6 style={{ marginBottom: 0 }}>
            <strong>
              {index + 1}. Container Number:&nbsp;
              <span ref={(el) => (container_number_ref.current[index] = el)}>
                <a
                  href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "blue", textDecoration: "none" }}
                >
                  {container.container_number || "N/A"}{" "}
                </a>
                | "{container.size}"
              </span>
            </strong>
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, container.container_number)}
            >
              <abbr title="Copy Container Number">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
          </h6>
        </div>

        {/* Render DO Revalidation Details */}
        {container.do_revalidation?.map((item, id) => (
          <Row key={id}>
            <Col xs={12} lg={4}>
              <div className="job-detail-input-container">
                <strong>DO Revalidation Upto:&nbsp;</strong>
                {item.do_revalidation_upto || ""}
              </div>
            </Col>
            <Col xs={12} lg={4}>
              <div className="job-detail-input-container">
                <strong>Remarks:&nbsp;</strong>
                {item.remarks || ""}
              </div>
            </Col>
            <Col xs={12} lg={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      formik.values.container_nos?.[index]?.do_revalidation?.[
                        id
                      ]?.do_Revalidation_Completed || false
                    }
                    onChange={(e) =>
                      formik.setFieldValue(
                        `container_nos[${index}].do_revalidation[${id}].do_Revalidation_Completed`,
                        e.target.checked
                      )
                    }
                    name={`container_nos[${index}].do_revalidation[${id}].do_Revalidation_Completed`}
                    color="primary"
                  />
                }
                label="DO Revalidation Completed"
              />
            </Col>
          </Row>
        ))}
      </div>
    ));
  };

  if (loading) return <p>Loading...</p>; // Show loading state

  if (!data) return <p>Failed to load job details.</p>; // Handle missing data
  console.log("shipping_line_invoice:", formik.values.shipping_line_invoice);
  console.log("do_validity:", formik.values.do_validity);
  console.log("do_copies:", formik.values.do_copies);

  return (
    <>
      <div style={{ margin: "20px 0" }}>
        {data && (
          <div>
            <div className="job-details-container">
              <Row>
                <h4>
                  Job Number:&nbsp;{data.job_no}&nbsp;|&nbsp;
                  {data && `Custom House: ${data.custom_house}`}
                </h4>
              </Row>

              <Row className="job-detail-row">
                <Col xs={12} lg={5}>
                  <strong>Importer:&nbsp;</strong>
                  <span className="non-editable-text">{data.importer}</span>
                </Col>
              </Row>
              <Row className="job-detail-row">
                <Col xs={12} lg={5}>
                  <strong>Importer Address:&nbsp;</strong>
                  <span className="non-editable-text">
                    {data.importer_address}
                  </span>
                  <IconButton
                    size="small"
                    onClick={(event) =>
                      handleCopy(event, data.importer_address)
                    }
                  >
                    <abbr title="Copy Importer Address">
                      <ContentCopyIcon fontSize="inherit" />
                    </abbr>
                  </IconButton>
                </Col>
              </Row>
            </div>
            <form onSubmit={formik.handleSubmit}>
              <div className="job-details-container">
                <strong>KYC Documents:&nbsp;</strong>
                <br />
                {kycData.kyc_documents && (
                  <ImagePreview
                    images={kycData.kyc_documents} // Pass the array of KYC document URLs
                    readOnly // Makes it view-only
                  />
                )}

                <strong>KYC Valid Upto:&nbsp;</strong>
                {kycData.kyc_valid_upto}
                <br />
                <strong>BL Status:&nbsp;</strong>
                {data.obl_telex_bl || "N/A"}
                <br />
              </div>

              <div className="job-details-container">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.shipping_line_invoice}
                      onChange={(e) =>
                        formik.setFieldValue(
                          "shipping_line_invoice",
                          e.target.checked
                        )
                      }
                      name="shipping_line_invoice"
                      color="primary"
                      disabled= {true}
                    />
                  }
                  label="Shipping line invoice"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.payment_made}
                      onChange={(e) =>
                        formik.setFieldValue("payment_made", e.target.checked)
                      }
                      name="payment_made"
                                          color="primary"
                                          disabled= {true}
                    />
                  }
                  label="Payment Made"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.do_processed}
                      onChange={(e) =>
                        formik.setFieldValue("do_processed", e.target.checked)
                      }
                      name="do_processed"
                                          color="primary"
                                          disabled= {true}
                    />
                  }
                  label="DO processed"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.other_invoices}
                      onChange={(e) =>
                        formik.setFieldValue("other_invoices", e.target.checked)
                      }
                      name="other_invoices"
                                          color="primary"
                                          disabled= {true}
                                          
                    />
                  }
                  label="Other invoices"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formik.values.security_deposit}
                      onChange={(e) =>
                        formik.setFieldValue(
                          "security_deposit",
                          e.target.checked
                        )
                      }
                      name="security_deposit"
                                          color="primary"
                                          disabled= {true}
                    />
                  }
                  label="Security Deposit"
                />
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  type="date"
                  id="shipping_line_invoice_date"
                  name="shipping_line_invoice_date"
                  label="Shipping line invoice date"
                  value={formik.values.shipping_line_invoice_date}
                  onChange={formik.handleChange}
                                  InputLabelProps={{ shrink: true }}
                                  disabled= {true}
                />
                <Row>
                  <Col>
                    <FileUpload
                      label="Upload Shipping Line Invoices"
                      bucketPath="shipping_line_invoice_imgs"
                      onFilesUploaded={(newFiles) => {
                        console.log(
                          "Uploading new Shipping Line Invoices:",
                          newFiles
                        );
                        const existingFiles =
                          formik.values.shipping_line_invoice_imgs || [];
                        const updatedFiles = [...existingFiles, ...newFiles];
                        formik.setFieldValue(
                          "shipping_line_invoice_imgs",
                          updatedFiles
                        );
                        setFileSnackbar(true); // Show success snackbar
                      }}
                                          multiple={true}
                                          readOnly= {true}
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
                        setFileSnackbar(true); // Show success snackbar
                      }}
                    />
                  </Col>

                  <Col>
                    <FileUpload
                      label="DO Documents"
                      bucketPath="do_documents"
                      onFilesUploaded={(newFiles) => {
                        console.log("Uploading new DO Documents:", newFiles);
                        const existingFiles = formik.values.do_documents || [];
                        const updatedFiles = [...existingFiles, ...newFiles];
                        formik.setFieldValue("do_documents", updatedFiles);
                          setFileSnackbar(true); // Show success snackbar
                                          }}
                                          readOnly= {true}
                      multiple={true}
                    />

                    <ImagePreview
                      images={formik.values.do_documents || []}
                      onDeleteImage={(index) => {
                        const updatedFiles = [...formik.values.do_documents];
                        updatedFiles.splice(index, 1);
                        formik.setFieldValue("do_documents", updatedFiles);
                        setFileSnackbar(true); // Show success snackbar
                      }}
                    />
                  </Col>

                  <Col></Col>
                </Row>
                <br />
                {formik.values.security_deposit === true && (
                  <TextField
                    fullWidth
                    size="small"
                    margin="normal"
                    variant="outlined"
                    id="security_amount"
                    name="security_amount"
                    label="Security amount"
                    value={formik.values.security_amount}
                                      onChange={formik.handleChange}
                                      readOnly= {true}
                  />
                )}
                <strong>UTR:&nbsp;</strong>
                {formik.values.utr?.map((file, index) => {
                  return (
                    <div key={index}>
                      <a href={file}>{file}</a>
                      <br />
                    </div>
                  );
                })}
                <br />
                <br />
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  margin="normal"
                  variant="outlined"
                  id="do_validity"
                  name="do_validity"
                  label="DO Validity"
                  value={formik.values.do_validity}
                  onChange={formik.handleChange}
                  InputLabelProps={{ shrink: true }}
                  readOnly= {true}
                />
                <Row>
                  <Col>
                    <FileUpload
                      label="Upload DO Copies"
                      bucketPath="do_copies"
                      onFilesUploaded={(newFiles) => {
                        console.log("Uploading new DO Copies:", newFiles);
                        const existingFiles = formik.values.do_copies || [];
                        const updatedFiles = [...existingFiles, ...newFiles];
                        formik.setFieldValue("do_copies", updatedFiles);
                        setFileSnackbar(true); // Show success snackbar
                      }}
                                          multiple={true}
                                          readOnly= {true}
                    />

                    <ImagePreview
                      images={formik.values.do_copies || []}
                      onDeleteImage={(index) => {
                        const updatedFiles = [...formik.values.do_copies];
                        updatedFiles.splice(index, 1);
                        formik.setFieldValue("do_copies", updatedFiles);
                        setFileSnackbar(true); // Show success snackbar
                      }}
                    />
                  </Col>
                </Row>
              </div>

              <div className="job-details-container">
                <h5>DO Queries</h5>
                {formik.values.do_queries.map((item, id) => {
                  return (
                    <div key={id}>
                      <TextField
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        id={`do_queries[${id}].query`}
                        name={`do_queries[${id}].query`}
                              label="Query"
                              disabled={true}
                        value={item.query}
                              onChange={formik.handleChange}
                      />
                      {item.reply}
                    </div>
                  );
                })}
                
                <br />
              </div>

              {/* DO Completed Section with Date Display and Admin Input */}
              <div className="job-details-container">
                <Row>
                  <Col xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formik.values.do_completed !== ""}
                          onChange={handleCheckboxChange}
                          disabled= {true} // Disable based on derived state
                          name="do_completed"
                          color="primary"
                        />
                      }
                      label="DO Completed"
                    />
                    {formik.values.do_completed && (
                      <span
                        style={{
                          marginLeft: "10px",
                          fontWeight: "bold",
                        }}
                      >
                        {new Date(formik.values.do_completed).toLocaleString(
                          "en-US",
                          {
                            timeZone: "Asia/Kolkata",
                            hour12: true,
                          }
                        )}
                      </span>
                    )}
                  </Col>
                  {user?.role === "Admin" && (
                    <Col xs={12} md={6}>
                      <TextField
                        type="datetime-local"
                        fullWidth
                        size="small"
                        margin="normal"
                        variant="outlined"
                        id="do_completed"
                        name="do_completed"
                        label="Set Date (Admin Only)"
                        value={formik.values.do_completed || ""}
                        onChange={handleAdminDateChange}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        disabled= {true} // Disable based on derived state
                      />
                    </Col>
                  )}
                </Row>
            
              </div>

              <br />
              <div className="job-details-container">
                <JobDetailsRowHeading heading="Container Details" />

                {renderContainerDetails()}
              </div>
              {/* <button
                className="btn"
                type="submit"
                style={{ float: "right", margin: "10px" }}
                aria-label="submit-btn"
              >
                Submit
              </button> */}
            </form>

            <Snackbar
              open={fileSnackbar}
              autoHideDuration={3000}
              onClose={() => setFileSnackbar(false)}
              message={"File uploaded successfully!"}
              sx={{ left: "auto !important", right: "24px !important" }}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default React.memo(EditDoCompleted);

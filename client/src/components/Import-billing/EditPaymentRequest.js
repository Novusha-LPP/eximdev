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
import { TabContext } from "./ImportBillingTab.js";
import {
  Checkbox,
  FormControlLabel,
  TextField,
  IconButton,
  Button,
  Box,
  FormGroup,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";

// Import your user context or authentication hook here
import { UserContext } from "../../contexts/UserContext";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import QueriesComponent from "../../utils/QueriesComponent.js";
import ImportDoChargesTable from "../import-do/ImportDoChargesTable";

import ContainerTrackButton from '../ContainerTrackButton';

function EditPaymentRequest() {
  const [someReceiptsUploaded, setsomeReceiptsUploaded] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kycData, setKycData] = useState("");
  const [fileSnackbar, setFileSnackbar] = useState(false);

  const params = useParams();
  const { mode, job_no, year } = params;
  const container_number_ref = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentTab } = useContext(TabContext);
  const { user } = useContext(UserContext);
  const [storedSearchParams, setStoredSearchParams] = useState(null);
  const [param] = useSearchParams();

  const jobId = param.get("selectedJobId");

  // Helper function to get current ISO string
  const getCurrentISOString = () => {
    return new Date().toISOString();
  };

  // Helper function to get local datetime string
  const getLocalDatetimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `0${now.getMonth() + 1}`.slice(-2);
    const day = `0${now.getDate()}`.slice(-2);
    const hours = `0${now.getHours()}`.slice(-2);
    const minutes = `0${now.getMinutes()}`.slice(-2);
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Store search parameters from location state
  useEffect(() => {
    if (location.state) {
      const { searchQuery, selectedImporter, jobId, currentTab, currentPage } =
        location.state;

      const params = {
        searchQuery,
        selectedImporter,
        jobId,
        currentTab: currentTab ?? 2,
        currentPage,
      };

      setStoredSearchParams(params);
    }
  }, [location.state]);

  // Handle back click function
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 2;

    navigate("/import-billing", {
      state: {
        fromJobDetails: true,
        tabIndex: tabIndex,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          selectedImporter: storedSearchParams.selectedImporter,
          jobId: storedSearchParams.jobId,
          currentPage: storedSearchParams.currentPage,
        }),
      },
    });
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
          `${process.env.REACT_APP_API_STRING}/get-job-by-id/${jobId}`
        );

        const jobData = res.data.job;

        let do_completed = "";
        if (
          typeof jobData.do_completed === "string" &&
          jobData.do_completed.trim() !== ""
        ) {
          const parsedDate = new Date(jobData.do_completed);
          if (!isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear();
            const month = `0${parsedDate.getMonth() + 1}`.slice(-2);
            const day = `0${parsedDate.getDate()}`.slice(-2);
            const hours = `0${parsedDate.getHours()}`.slice(-2);
            const minutes = `0${parsedDate.getMinutes()}`.slice(-2);
            do_completed = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }

        // Process new fields
        const doShippingLineInvoice = jobData.do_shipping_line_invoice || {
          document_name: "Shipping Line Invoice",
          url: [],
          is_draft: false,
          is_final: false,
          document_check_date: "",
          payment_mode: [],
          document_amount_details: "",
          payment_request_date: "",
          payment_made_date: "",
          is_tds: false,
          is_non_tds: false,
        };

        const insuranceCopy = jobData.insurance_copy || {
          document_name: "Insurance",
          url: [],
          document_check_date: "",
          document_amount_details: "",
        };

        const otherDoDocuments = jobData.other_do_documents || [
          {
            document_name: "",
            url: [],
            document_check_date: "",
            document_amount_details: "",
            currency: "INR",
            charge_basis: "",
            charge_rate: "",
            exchange_rate: "1",
            amount_inr: "",
            receivable: "",
            cost_rate: "",
            cost_amount: "",
            cost_amount_inr: "",
            payable: "",
          }
        ];

        setData({
          ...jobData,
          shipping_line_invoice: jobData.shipping_line_invoice === "Yes",
          payment_made: jobData.payment_made === "Yes",
          do_processed: jobData.do_processed === "Yes",
          other_invoices: jobData.other_invoices === "Yes",
          security_deposit: jobData.security_deposit === "Yes",
          do_completed,
          do_shipping_line_invoice: doShippingLineInvoice,
          insurance_copy: insuranceCopy,
          other_do_documents: otherDoDocuments,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    }

    getData();
  }, [jobId]);

  const formik = useFormik({
    initialValues: {
      security_deposit: data?.security_deposit === "Yes" || data?.security_deposit === true,
      security_amount: data?.security_amount || "",
      other_invoices: data?.other_invoices === "Yes" || data?.other_invoices === true,
      payment_made: data?.payment_made === "Yes" || data?.payment_made === true,
      do_processed: data?.do_processed === "Yes" || data?.do_processed === true,
      do_documents: data?.do_documents || [],
      do_validity: data?.do_validity || "",
      do_copies: data?.do_copies || [],
      shipping_line_invoice: data?.shipping_line_invoice === "Yes" || data?.shipping_line_invoice === true,
      shipping_line_invoice_date: data?.shipping_line_invoice_date || "",
      shipping_line_invoice_imgs: data?.shipping_line_invoice_imgs || [],
      do_queries: data?.do_queries || [{ query: "", reply: "" }],
      do_completed: data?.do_completed || "",
      do_Revalidation_Completed: data?.do_Revalidation_Completed || false,
      container_nos: data?.container_nos || [],
      dsr_queries: data?.dsr_queries || [],
      shipping_line_airline: data?.shipping_line_airline || "", // Pass this to formik so child components can access it


      do_shipping_line_invoice: Array.isArray(data?.do_shipping_line_invoice) && data?.do_shipping_line_invoice.length > 0
        ? data.do_shipping_line_invoice
        : [
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
            payment_recipt: [],
            currency: "INR",
            charge_basis: "",
            charge_rate: "",
            exchange_rate: "1",
            amount_inr: "",
            receivable: "",
            cost_rate: "",
            cost_amount: "",
            cost_amount_inr: "",
            payable: "",
          },
        ],

      insurance_copy: Array.isArray(data?.insurance_copy) && data?.insurance_copy.length > 0
        ? data.insurance_copy
        : [
          {
            document_name: "Insurance",
            url: [],
            document_check_date: "",
            document_amount_details: "",
            currency: "INR",
            charge_basis: "",
            charge_rate: "",
            exchange_rate: "1",
            amount_inr: "",
            receivable: "",
            cost_rate: "",
            cost_amount: "",
            cost_amount_inr: "",
            payable: "",
          },
        ],

      other_do_documents: Array.isArray(data?.other_do_documents) && data?.other_do_documents.length > 0
        ? data.other_do_documents
        : [
          {
            document_name: "",
            url: [],
            document_check_date: "",
            document_amount_details: "",
            currency: "INR",
            charge_basis: "",
            charge_rate: "",
            exchange_rate: "1",
            amount_inr: "",
            receivable: "",
            cost_rate: "",
            cost_amount: "",
            cost_amount_inr: "",
            payable: "",
          }
        ],

      security_deposit: Array.isArray(data?.security_deposit) && data?.security_deposit.length > 0
        ? data.security_deposit
        : [
          {
            document_name: "Security Deposit",
            url: [],
            document_check_date: "",
            document_amount_details: "",
            utr: "",
            Validity_upto: "",
            currency: "INR",
            charge_basis: "",
            charge_rate: "",
            exchange_rate: "1",
            amount_inr: "",
            receivable: "",
            cost_rate: "",
            cost_amount: "",
            cost_amount_inr: "",
            payable: "",
          },
        ],
    },
    enableReinitialize: true,

    onSubmit: async (values, { resetForm }) => {
      const dataToSubmit = {
        ...values,
        jobId,
        do_Revalidation_Completed: values.do_Revalidation_Completed,
        shipping_line_invoice: values.shipping_line_invoice ? "Yes" : "No",
        payment_made: values.payment_made ? "Yes" : "No",
        do_processed: values.do_processed ? "Yes" : "No",
        other_invoices: values.other_invoices ? "Yes" : "No",
        security_deposit: values.security_deposit ? "Yes" : "No",
        _id: data._id, // Include _id to ensure the backend can identify the document
        do_completed:
          typeof values.do_completed === "string" &&
            values.do_completed.trim() !== ""
            ? new Date(values.do_completed).toISOString()
            : "",
        do_shipping_line_invoice: values.do_shipping_line_invoice.map(
          (doc) => ({
            ...doc,
            payment_mode: Array.isArray(doc.payment_mode)
              ? doc.payment_mode.join(",")
              : doc.payment_mode || "", // Ensure it falls back to empty string if undefined/null
          })
        ),
        insurance_copy: values.insurance_copy,
        other_do_documents: values.other_do_documents,
        security_deposit: values.security_deposit,

      };

      try {
        const username =
          user?.username || localStorage.getItem("username") || "unknown";
        const userId =
          user?.jobId || localStorage.getItem("userId") || "unknown";
        const userRole =
          user?.role || localStorage.getItem("userRole") || "unknown";

        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-do-planning`,
          dataToSubmit,
          {
            headers: {
              username: username,
              "user-id": userId,
              "user-role": userRole,
            },
          }
        );

        resetForm();
        const currentState = window.history.state || {};
        const scrollPosition = currentState.scrollPosition || 0;
        const tabIndex = storedSearchParams?.currentTab ?? 2;

        // Close the tab after successful submit
        setTimeout(() => {
          window.close();
        }, 500);

        setCurrentTab(tabIndex);
      } catch (error) {
        console.error("Error submitting form:", error);
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

  useEffect(() => {
    if (formik.values.do_shipping_line_invoice) {
      const someUpload = formik.values.do_shipping_line_invoice.some(
        (doc) => doc.payment_recipt && doc.payment_recipt.length > 0
      );
      setsomeReceiptsUploaded(someUpload);
    }
  }, [formik.values.do_shipping_line_invoice]);

  // Fetch KYC documents once data is loaded
  // Fetch KYC documents once data is loaded
  useEffect(() => {
    if (data) {
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
  }, [data]);

  // Render editable charges section
  const renderChargesSection = () => (
    <ImportDoChargesTable
      formik={formik}
      user={user}
      setFileSnackbar={setFileSnackbar}
      allowPaymentMade={true}
      allowPaymentReceipt={true}
    />
  );

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
    } else {
      // Set to empty string
      formik.setFieldValue("do_completed", "");
    }
  };

  // Handle admin date change
  const handleAdminDateChange = (event) => {
    formik.setFieldValue("do_completed", event.target.value);
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
                <ContainerTrackButton 
                  customHouse={data?.custom_house} 
                  containerNo={container.container_number} 
                />
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

  // Fix 7: Add loading state and error handling before return
  if (!job_no || !year) {
    return (
      <div>
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
        <div>Error: Missing job_no or year parameters in URL</div>
      </div>
    );
  }

  return (
    <>
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

      {data && <JobDetailsStaticData data={data} params={{ mode, job_no, year }} />}
      {data && data.dsr_queries && (
        <div>
          <QueriesComponent
            queries={data.dsr_queries}
            currentModule="Payment Request"
            onQueriesChange={handleQueriesChange}
            title="Accounts Queries"
            showResolveButton={true}
            readOnlyReply={false}
            onResolveQuery={handleResolveQuery}
            userName={user?.username}
          />
        </div>
      )}

      <div style={{ margin: "20px 0" }}>
        {data && (
          <div>
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

              {/* DO Completed Section with Date Display and Admin Input */}
              <div className="job-details-container">
                <Row>
                  <Col xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formik.values.do_completed !== ""}
                          onChange={handleCheckboxChange}
                          disabled={true} // Disable based on derived state
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
                        disabled={true} // Disable based on derived state
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

              {renderChargesSection()}
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

              {/* Add validation message */}
              {!someReceiptsUploaded && (
                <div
                  style={{
                    color: "#f44336",
                    fontSize: "0.875rem",
                    float: "right",
                    clear: "both",
                    margin: "5px 10px",
                    textAlign: "right",
                  }}
                ></div>
              )}
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

export default React.memo(EditPaymentRequest);

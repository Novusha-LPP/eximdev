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
  Button,
  Box,
  FormControl,
  MenuItem,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
// Import your user context or authentication hook here
import { UserContext } from "../../contexts/UserContext";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import QueriesComponent from "../../utils/QueriesComponent.js";

import ChargesGrid from "../ChargesGrid";


import ContainerTrackButton from '../ContainerTrackButton';

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

function EditDoCompleted() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kycData, setKycData] = useState("");
  const [fileSnackbar, setFileSnackbar] = useState(false);

  const params = useParams();
  const { branch_code, trade_type, mode, job_no, year } = params;

  // Modal and other states
  const [currentField, setCurrentField] = useState(null);
  const [openImageDeleteModal, setOpenImageDeleteModal] = useState(false);
  const container_number_ref = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedJobId } = location.state || {};
  const { setCurrentTab } = useContext(TabContext);
  const { user } = useContext(UserContext);

  const [storedSearchParams, setStoredSearchParams] = useState(null);
  const [param] = useSearchParams();

  const jobId = param.get("jobId");
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
        currentTab: currentTab ?? 3,
        currentPage,
      };

      setStoredSearchParams(params);
    }
  }, [location.state]);

  // Handle back click function
  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 3;

    navigate("/import-do", {
      state: {
        fromJobDetails: true,
        tabIndex: tabIndex,
        ...(storedSearchParams && {
          searchQuery: storedSearchParams.searchQuery,
          selectedImporter: storedSearchParams.selectedImporter,
          selectedJobId: storedSearchParams.selectedJobId,
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
          dsr_queries: jobData.dsr_queries || [],
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    }

    getData();
  }, [selectedJobId]);

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
      do_completed: "",
      do_Revalidation_Completed: false,
      container_nos: [],

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

      insurance_copy: [
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



      security_deposit: [
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
      dsr_queries: [],
      icd_cfs_invoice: "",
      icd_cfs_invoice_img: [],
      other_invoices_img: [],
      shipping_line_invoice_imgs: [],
      thar_invoices: [],
      hasti_invoices: [],
      concor_invoice_and_receipt_copy: [],
    },

    onSubmit: async (values, { resetForm }) => {
      const dataToSubmit = {
        ...values,
        selectedJobId,
        do_Revalidation_Completed: values.do_Revalidation_Completed,
        shipping_line_invoice: values.shipping_line_invoice ? "Yes" : "No",
        payment_made: values.payment_made ? "Yes" : "No",
        do_processed: values.do_processed ? "Yes" : "No",
        other_invoices: values.other_invoices ? "Yes" : "No",
        security_deposit: values.security_deposit ? "Yes" : "No",
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
              : doc.payment_mode,
          })
        ),
        insurance_copy: values.insurance_copy,

        security_deposit: values.security_deposit,
        dsr_queries: values.dsr_queries,
      };

      try {
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };
        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/update-do-planning`,
          dataToSubmit,
          {
            headers: headers,
          }
        );

        resetForm();
        const currentState = window.history.state || {};
        const scrollPosition = currentState.scrollPosition || 0;
        const tabIndex = storedSearchParams?.currentTab ?? 3;

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
    formik.setFieldValue("dsr_queries", updatedQueries);
  };

  const handleResolveQuery = (resolvedQuery, index) => {
    // Custom logic when a query is resolved
    console.log("Query resolved:", resolvedQuery);
    // You can add API calls, notifications, etc.
  };


  // Fetch KYC documents once data is loaded
  useEffect(() => {
    if (data) {
      const doShippingLineInvoice =
        Array.isArray(data.do_shipping_line_invoice) &&
          data.do_shipping_line_invoice.length > 0
          ? data.do_shipping_line_invoice
          : [
            {
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
            },
          ];

      const securityDeposit =
        Array.isArray(data.security_deposit) && data.security_deposit.length > 0
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
          ];


      const insuranceCopy =
        Array.isArray(data.insurance_copy) && data.insurance_copy.length > 0
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
          ];



      const updatedData = {
        ...data,
        shipping_line_invoice:
          data.shipping_line_invoice === "Yes" ||
          data.shipping_line_invoice === true,
        shipping_line_invoice_date: formatDate(data.shipping_line_invoice_date),
        payment_made: data.payment_made === "Yes" || data.payment_made === true,
        do_processed: data.do_processed === "Yes" || data.do_processed === true,
        other_invoices:
          data.other_invoices === "Yes" || data.other_invoices === true,
        security_deposit:
          data.security_deposit === "Yes" || data.security_deposit === true,
        do_Revalidation_Completed: data.do_Revalidation_Completed,
        do_validity: data?.do_validity || "",
        do_copies: data?.do_copies || [],
        do_queries: data?.do_queries || [{ query: "", reply: "" }],
        container_nos: data.container_nos || [],
        do_shipping_line_invoice: doShippingLineInvoice,
        insurance_copy: insuranceCopy,
        security_deposit: securityDeposit,
        icd_cfs_invoice: data.icd_cfs_invoice || "",
        icd_cfs_invoice_img: data.icd_cfs_invoice_img || [],
        other_invoices_img: data.other_invoices_img || [],
        shipping_line_invoice_imgs: data.shipping_line_invoice_imgs || [],
        thar_invoices: data.thar_invoices || [],
        hasti_invoices: data.hasti_invoices || [],
        concor_invoice_and_receipt_copy: data.concor_invoice_and_receipt_copy || [],
      };

      formik.setValues(updatedData);

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

  // Render editable charges section (all fields enabled, draft/final, add/remove, etc.)



  const handleDoCopiesUpload = (urls) => {
    formik.setFieldValue("do_copies", [...(formik.values.do_copies || []), ...urls]);
  };

  const handleRemoveDoCopy = (index) => {
    const updatedCopies = [...formik.values.do_copies];
    updatedCopies.splice(index, 1);
    formik.setFieldValue("do_copies", updatedCopies);
  };

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
        <div>Error: Missing job_no or year parameters in URL</div>
      </div>
    );
  }

  return (
    <>
      {/* Back to Job List Button */}
      <Box sx={{ position: "fixed", top: 80, left: 80, zIndex: 999 }}>
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

      {data && <JobDetailsStaticData data={data} params={{ branch_code, trade_type, mode, job_no, year }} />}

      {data && (
        <div>
          <QueriesComponent
            queries={formik.values.dsr_queries}
            currentModule="Do Completed"
            onQueriesChange={handleQueriesChange}
            title="DO Queries"
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
            <form id="do-completed-form" onSubmit={formik.handleSubmit}>
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
              
              <div style={{ overflowX: 'auto', margin: '20px 0' }}>
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


              <Box sx={{ height: "60px" }} />
            </form>
          </div>
        )}
      </div>

      <Button
        type="submit"
        form="do-completed-form"
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
        open={fileSnackbar}
        autoHideDuration={3000}
        onClose={() => setFileSnackbar(false)}
        message={"File uploaded successfully!"}
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </>
  );
}

export default React.memo(EditDoCompleted);

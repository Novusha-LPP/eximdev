import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import { useFormik } from "formik";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import FileUpload from "../../components/gallery/FileUpload.js";
import ImagePreview from "../../components/gallery/ImagePreview.js";
import { TabContext } from "./ImportDO";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Checkbox,
  FormControlLabel,
  TextField,
  IconButton,
  Button,
  Box,
  FormControl,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { UserContext } from "../../contexts/UserContext";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useSearchParams } from "react-router-dom";
import QueriesComponent from "../../utils/QueriesComponent.js";
import ImportDoChargesTable from "./ImportDoChargesTable";
import ChargesGrid from "../ChargesGrid";


import ContainerTrackButton from '../ContainerTrackButton';


const doListOptions = [
  { value: "", label: "Select DO List" },
  {
    value: "ICD Khodiyar / ICD AHMEDABAD",
    label: "ICD Khodiyar / ICD AHMEDABAD",
  },
  { value: "ICD SANAND", label: "ICD SANAND" },
  {
    value: "CONTAINER CARE SERVICES / OCEAN EMPTY CONTAINER PARK",
    label: "CONTAINER CARE SERVICES / OCEAN EMPTY CONTAINER PARK",
  },
  { value: "ABHI CONTAINER SERVICES", label: "ABHI CONTAINER SERVICES" },
  {
    value: "Golden Horn Container Services (Nr. ICD Khodiyar)",
    label: "Golden Horn Container Services (Nr. ICD Khodiyar)",
  },
  {
    value: "Golden Horn Container Services (Nr. ICD SANAND)",
    label: "Golden Horn Container Services (Nr. ICD SANAND)",
  },
  {
    value: "JAY BHAVANI CONTAINERS YARD",
    label: "JAY BHAVANI CONTAINERS YARD",
  },
  { value: "BALAJI QUEST YARD", label: "BALAJI QUEST YARD" },
  {
    value: "SATURN GLOBAL TERMINAL PVT LTD",
    label: "SATURN GLOBAL TERMINAL PVT LTD",
  },
  { value: "CHEKLA CONTAINER YARD", label: "CHEKLA CONTAINER YARD" },
  { value: "ICD SACHANA", label: "ICD SACHANA" },
  { value: "SHREE SHIV SHAKTI EMPTY PARK LLP", label: "SHREE SHIV SHAKTI EMPTY PARK LLP" },
];

function EditDoPlanning() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const { branch_code, trade_type, mode, job_no, year } = params;
  const [loading, setLoading] = useState(true); // Loading state
  const [kycData, setKycData] = useState("");
  const [fileSnackbar, setFileSnackbar] = useState(false);

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

  const jobId = searchParams.get("jobId");
  // Add stored search parameters state
  const [storedSearchParams, setStoredSearchParams] = useState(null);
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

  const getCurrentISOString = () => {
    return new Date().toISOString();
  };

  // Store search parameters from location state

  const handleBackClick = () => {
    const tabIndex = storedSearchParams?.currentTab ?? 2;
    navigate("/import-do", {
      state: {
        fromJobDetails: true,
        tabIndex: tabIndex, // Use stored tab index
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

        const otherDoDocuments = jobData.other_do_documents || {
          document_name: "",
          url: [],
          document_check_date: "",
          document_amount_details: "",
        };

        // Update data with new fields
        setData({
          ...jobData,
          // ... existing fields ...
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
      security_deposit: false,
      security_amount: "",
      utr: [],
      other_invoices: false,
      payment_made: false,
      do_processed: false,
      do_documents: [],
      do_validity: "",
      do_copies: [],
      do_list: " ",
      shipping_line_invoice: false,
      shipping_line_invoice_date: "",
      shipping_line_invoice_imgs: [],
      do_queries: [{ query: "", reply: "" }],
      do_completed: "", // Initialize as empty string
      do_Revalidation_Completed: false,
      container_nos: [], // Ensure container_nos is initialized
      is_do_doc_recieved: false,
      do_doc_recieved_date: "",
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

      other_do_documents: [],

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
    },

    onSubmit: async (values, { resetForm }) => {
      // Convert booleans back to "Yes" or "No"
      const dataToSubmit = {
        ...values,
        jobId,
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
        // Convert payment_mode array to string for backend
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
        do_list: values.do_list,
        is_do_doc_recieved: values.is_do_doc_recieved,
        do_doc_recieved_date: values.do_doc_recieved_date,
      };

      try {
        // Get user info from context or localStorage fallback
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

        resetForm(); // Reset the form
        const currentState = window.history.state || {};
        const scrollPosition = currentState.scrollPosition || 0;
        const tabIndex = storedSearchParams?.currentTab ?? 2;

        // Close the tab after successful submit
        setTimeout(() => {
          window.close();
        }, 500);

        setCurrentTab(tabIndex); // Update the active tab in context
      } catch (error) {
        console.error("Error submitting form:", error);
      }
    },
  });

  // Derived state to determine if DO Completed can be enabled
  const isDoCompletedEnabled =
    formik.values.do_copies[0] &&
    formik.values.do_validity &&
    formik.values.do_list



  // Effect to clear do_completed if DO Validity or DO Copies are cleared
  useEffect(() => {
    if (!isDoCompletedEnabled && formik.values.do_completed !== "") {
      formik.setFieldValue("do_completed", "");
    }
  }, [isDoCompletedEnabled, formik.values.do_completed, formik]);

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

      const otherDoDocuments = Array.isArray(data.other_do_documents)
        ? data.other_do_documents
        : [];
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
        dsr_queries: data.dsr_queries || [],
        container_nos: data.container_nos || [],
        do_shipping_line_invoice: doShippingLineInvoice,
        insurance_copy: insuranceCopy,
        other_do_documents: otherDoDocuments,
        security_deposit: securityDeposit,
        do_list: data.do_list || "",
        is_do_doc_recieved: data.is_do_doc_recieved || false, // Add this field
        do_doc_recieved_date: data.do_doc_recieved_date || "",
        _id: data._id, // Explicitly include _id
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
  }, [data]); // **Removed 'isDoCompletedEnabled' and 'formik' from dependencies**

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

  const renderChargesSection = () => (
    <ImportDoChargesTable
      formik={formik}
      user={user}
      setFileSnackbar={setFileSnackbar}
    />
  );

  if (loading) return <p>Loading...</p>; // Show loading state

  if (!data) return <p>Failed to load job details.</p>; // Handle missing data



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
      {/* Back Button */}
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

      {data && <JobDetailsStaticData data={data} params={{ branch_code, trade_type, mode, job_no, year }} />}

      <div>
        <QueriesComponent
          queries={data.dsr_queries}
          currentModule="Do Planning"
          onQueriesChange={handleQueriesChange}
          title="Do Queries"
          showResolveButton={true}
          readOnlyReply={false}
          onResolveQuery={handleResolveQuery}
          userName={user?.username}
        />
      </div>
      <div style={{ margin: "20px 0" }}>
        {data && (
          <div>
            <form id="do-planning-form" onSubmit={formik.handleSubmit}>
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
              <ChargesGrid parentId={jobId} parentModule="Job" initialTab="cost" hideTabs={true} />
              {renderChargesSection()}


              <div className="job-details-container">
                <h5
                  style={{
                    marginBottom: "12px",
                    fontWeight: 600,
                    color: "#1a237e",
                  }}
                >
                  EmptyOff LOC
                </h5>

                <Row className="align-items-center">
                  {/* DO List dropdown */}
                  <Col xs={12} md={8}>
                    <select
                      value={formik.values.do_list || ""}
                      onChange={(e) =>
                        formik.setFieldValue("do_list", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "8.5px 12px",
                        fontSize: "14px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: "white",
                      }}
                    >
                      {doListOptions.map((option, index) => (
                        <option key={index} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Col>

                  {/* DO Validity Date */}
                  <Col xs={12} md={4}>
                    <TextField
                      type="date"
                      fullWidth
                      size="small"
                      variant="outlined"
                      id="do_validity"
                      name="do_validity"
                      label="DO Validity"
                      value={formik.values.do_validity}
                      onChange={formik.handleChange}
                      InputLabelProps={{ shrink: true }}
                      sx={{ m: 0 }}
                    />
                  </Col>
                </Row>

                {/* Display selected DO List value if any */}
                {formik.values.do_list && formik.values.do_list.trim() !== "" && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#388e3c",
                      padding: "4px 12px",
                      backgroundColor: "#e8f5e9",
                      borderRadius: "4px",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <strong>Selected DO List:</strong> {formik.values.do_list}
                  </div>
                )}

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
                          disabled={!isDoCompletedEnabled} // Disable based on derived state
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
                        disabled={!isDoCompletedEnabled} // Disable based on derived state
                      />
                    </Col>
                  )}
                </Row>
                {!isDoCompletedEnabled && (
                  <Row>
                    <Col xs={12}>
                      <span style={{ color: "red", fontSize: "0.9em" }}>
                        Please set DO Validity, Do List and upload at least one DO Copy
                        to enable DO Completed.
                      </span>
                    </Col>
                  </Row>
                )}
              </div>

              <br />
              <div className="job-details-container">
                <JobDetailsRowHeading heading="Container Details" />

                {renderContainerDetails()}
              </div>
              <Box sx={{ height: "60px" }} />
            </form>
          </div>
        )}
      </div>

      <Button
        type="submit"
        form="do-planning-form"
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

export default React.memo(EditDoPlanning);

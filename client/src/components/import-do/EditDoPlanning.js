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
  FormGroup,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  InputLabel,
  Autocomplete,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { UserContext } from "../../contexts/UserContext";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useSearchParams } from "react-router-dom";
import QueriesComponent from "../../utils/QueriesComponent.js";

const chargeHeadOptions = [
  "EDI CHARGES",
  "ODEX INDIA SOLUTIONS PVT LTD",
  "HASTI PETRO CHEMICALS & SHIPPING LTD",
  "CONTAINER CORPN OF INDIA LTD",
  "SR CONTAINER CARRIERS",
  "BOND PAPER EXP.",
  "THAR LOGISTICS",
  "CUSTOMS DUTY"
];

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
  const param = useParams();
  const [params] = useSearchParams();

  const [data, setData] = useState(null);
  const { job_no, year } = param;
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [showWireTransferOptions, setShowWireTransferOptions] = useState({});
  const [loading, setLoading] = useState(true); // Loading state
  const [kycData, setKycData] = useState("");
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [isTableEditable, setIsTableEditable] = useState(false);

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

  const jobId = params.get("jobId");
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
        // setTimeout(() => {
        //   window.close();
        // }, 500);

        setCurrentTab(tabIndex); // Update the active tab in context
      } catch (error) {
        console.error("Error submitting form:", error);
      }
    },
  });

  // Handle payment mode change
  const handlePaymentModeChange = (docIndex, mode) => (e) => {
    formik.setFieldValue(
      `do_shipping_line_invoice[${docIndex}].payment_mode`,
      mode
    );
    if (mode !== "Wire Transfer") {
      formik.setFieldValue(
        `do_shipping_line_invoice[${docIndex}].wire_transfer_method`,
        ""
      );
    }
    setShowWireTransferOptions((prev) => ({
      ...prev,
      [docIndex]: mode === "Wire Transfer",
    }));
  };



  // Document check status handler
  const handleDocumentCheckChange = (docIndex, docType) => (e) => {
    const isChecked = e.target.checked;
    const currentTime = isChecked ? getCurrentISOString() : "";

    formik.setFieldValue(
      `${docType}[${docIndex}].document_check_status`,
      isChecked
    );
    formik.setFieldValue(
      `${docType}[${docIndex}].document_check_date`,
      currentTime
    );
  };

  // Draft/Final radio button handler
  const handleDraftFinalChange = (docIndex, type) => (e) => {
    if (type === "draft") {
      formik.setFieldValue(
        `do_shipping_line_invoice[${docIndex}].is_draft`,
        true
      );
      formik.setFieldValue(
        `do_shipping_line_invoice[${docIndex}].is_final`,
        false
      );
    } else {
      formik.setFieldValue(
        `do_shipping_line_invoice[${docIndex}].is_draft`,
        false
      );
      formik.setFieldValue(
        `do_shipping_line_invoice[${docIndex}].is_final`,
        true
      );
    }
  };

  // Handle wire transfer method change
  const handleWireTransferMethodChange = (docIndex, method) => (e) => {
    const currentMethods = [
      ...formik.values.do_shipping_line_invoice[docIndex].payment_mode,
    ];
    const index = currentMethods.indexOf(method);

    if (index === -1) {
      currentMethods.push(method);
    } else {
      currentMethods.splice(index, 1);
    }

    formik.setFieldValue(
      `do_shipping_line_invoice[${docIndex}].payment_mode`,
      currentMethods
    );
  };

  const handleAddDocument = () => {
    if (!selectedDocumentType) return;

    const newDocument = {
      document_name:
        selectedDocumentType === "other" || selectedDocumentType === "new_charge" ? "" : selectedDocumentType,
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
    };

    // Add additional fields based on document type
    if (selectedDocumentType === "Shipping Line Invoice") {
      newDocument.is_draft = false;
      newDocument.is_final = false;
      newDocument.payment_mode = "";
      newDocument.wire_transfer_method = "";
      newDocument.payment_request_date = "";
      newDocument.payment_made_date = "";
      newDocument.is_tds = false;
      newDocument.is_non_tds = false;
    } else if (selectedDocumentType === "Security Deposit") {
      newDocument.utr = "";
      newDocument.Validity_upto = "";
    }

    // Determine which array to add to
    if (selectedDocumentType === "Shipping Line Invoice") {
      const currentDocs = [...formik.values.do_shipping_line_invoice];
      currentDocs.push(newDocument);
      formik.setFieldValue("do_shipping_line_invoice", currentDocs);
    } else if (selectedDocumentType === "Insurance") {
      const currentDocs = [...formik.values.insurance_copy];
      currentDocs.push(newDocument);
      formik.setFieldValue("insurance_copy", currentDocs);
    } else if (selectedDocumentType === "Security Deposit") {
      const currentDocs = [...formik.values.security_deposit];
      currentDocs.push(newDocument);
      formik.setFieldValue("security_deposit", currentDocs);
    } else {
      const currentDocs = [...formik.values.other_do_documents];
      currentDocs.push(newDocument);
      formik.setFieldValue("other_do_documents", currentDocs);
    }

    setSelectedDocumentType("");
    setIsTableEditable(true);
  };

  // Add function to handle document removal
  const handleRemoveDocument = (docType, index) => {
    if (docType === "do_shipping_line_invoice") {
      const currentDocs = [...formik.values.do_shipping_line_invoice];
      currentDocs.splice(index, 1);
      formik.setFieldValue("do_shipping_line_invoice", currentDocs);
    } else if (docType === "insurance_copy") {
      const currentDocs = [...formik.values.insurance_copy];
      currentDocs.splice(index, 1);
      formik.setFieldValue("insurance_copy", currentDocs);
    } else if (docType === "security_deposit") {
      const currentDocs = [...formik.values.security_deposit];
      currentDocs.splice(index, 1);
      formik.setFieldValue("security_deposit", currentDocs);
    } else if (docType === "other_do_documents") {
      const currentDocs = [...formik.values.other_do_documents];
      currentDocs.splice(index, 1);
      formik.setFieldValue("other_do_documents", currentDocs);
    }
  };
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

      // Initialize wire transfer options state
      const wireTransferState = {};
      doShippingLineInvoice.forEach((doc, index) => {
        wireTransferState[index] = doc.payment_mode === "Wire Transfer";
      });
      setShowWireTransferOptions(wireTransferState);

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



  // Render Charges Row Helper
  const renderChargesRow = (doc, index, docType, isRemovable) => {
    const isShippingInvoice = docType === "do_shipping_line_invoice";
    const isSecurityDeposit = docType === "security_deposit";
    const bucketPath = docType; // Simplified mapping as they matched mostly except check

    return (
      <tr key={`${docType}-${index}`} style={{ verticalAlign: "top" }}>
        {/* Charge Head / Document Name */}
        <td>
          {docType === "other_do_documents" ? (
            <Autocomplete
              freeSolo
              options={chargeHeadOptions}
              value={doc.document_name || ""}
              disabled={!isTableEditable}
              onInputChange={(event, newValue) => {
                formik.setFieldValue(`${docType}[${index}].document_name`, newValue);
              }}
              onChange={(event, newValue) => {
                formik.setFieldValue(`${docType}[${index}].document_name`, newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  size="small"
                  variant="standard"
                  placeholder="Document Name"
                />
              )}
            />
          ) : (
            <span style={{ fontWeight: 600 }}>{doc.document_name}</span>
          )}
          {isRemovable && user?.role === "Admin" && isTableEditable && (
            <div style={{ marginTop: 5 }}>
              <Button
                color="error"
                size="small"
                onClick={() => handleRemoveDocument(docType, index)}
              >
                Remove
              </Button>
            </div>
          )}
        </td>

        {/* Document Status / Uploads */}
        <td style={{ minWidth: "200px" }}>
          <div style={{ marginBottom: 5 }}>
            <FileUpload
              label="Upload"
              bucketPath={bucketPath}
              onFilesUploaded={(newFiles) => {
                const existingFiles = doc.url || [];
                const updatedFiles = [...existingFiles, ...newFiles];
                formik.setFieldValue(`${docType}[${index}].url`, updatedFiles);
                setFileSnackbar(true);
              }}
              multiple={true}
              disabled={!isTableEditable} // Optional: allow upload even if locked? User said "enable edit in table", implies all edits.
            />
            <div style={{ marginTop: 5 }}>
              <ImagePreview
                images={doc.url || []}
                onDeleteImage={isTableEditable ? (imgIndex) => {
                  const updatedFiles = [...doc.url];
                  updatedFiles.splice(imgIndex, 1);
                  formik.setFieldValue(`${docType}[${index}].url`, updatedFiles);
                  setFileSnackbar(true);
                } : undefined}
              />
            </div>
          </div>
          {isShippingInvoice && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <label>
                <input
                  type="radio"
                  checked={doc.is_draft}
                  onChange={handleDraftFinalChange(index, "draft")}
                  disabled={!isTableEditable}
                /> Draft
              </label>
              <label>
                <input
                  type="radio"
                  checked={doc.is_final}
                  onChange={handleDraftFinalChange(index, "final")}
                  disabled={!isTableEditable}
                /> Final
              </label>
            </div>
          )}
        </td>

        {/* Currency */}
        <td style={{ minWidth: "70px" }}>
          <Select
            value={doc.currency || "INR"}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].currency`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            disableUnderline={!isTableEditable}
          >
            <MenuItem value="INR">INR</MenuItem>
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="EUR">EUR</MenuItem>
          </Select>
        </td>

        {/* REVENUE SECTON */}
        {/* Basis */}
        <td style={{ minWidth: "150px" }}>
          <Select
            value={doc.charge_basis || ""}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].charge_basis`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            displayEmpty
          >
            <MenuItem value="" disabled>Select Basis</MenuItem>
            <MenuItem value="Per Package">Per Package</MenuItem>
            <MenuItem value="By Gross Wt">By Gross Wt</MenuItem>
            <MenuItem value="By Chg Wt">By Chg Wt</MenuItem>
            <MenuItem value="By Volume">By Volume</MenuItem>
            <MenuItem value="Per Container">Per Container</MenuItem>
            <MenuItem value="Per TEU">Per TEU</MenuItem>
            <MenuItem value="Per FEU">Per FEU</MenuItem>
            <MenuItem value="% of Other Charges">% of Other Charges</MenuItem>
            <MenuItem value="% of Assessable Value">% of Assessable Value</MenuItem>
            <MenuItem value="% of AV+Duty">% of AV+Duty</MenuItem>
            <MenuItem value="% of CIF Value">% of CIF Value</MenuItem>
            <MenuItem value="Per Vehicle">Per Vehicle</MenuItem>
            <MenuItem value="% of Invoice Value">% of Invoice Value</MenuItem>
            <MenuItem value="Per License">Per License</MenuItem>
            <MenuItem value="Per B/E - Per Shp">Per B/E - Per Shp</MenuItem>
            <MenuItem value="% of Product Value">% of Product Value</MenuItem>
            <MenuItem value="Per Labour">Per Labour</MenuItem>
            <MenuItem value="Per Product">Per Product</MenuItem>
            <MenuItem value="By Net Wt">By Net Wt</MenuItem>
            <MenuItem value="Per Invoice">Per Invoice</MenuItem>
          </Select>
        </td>

        {/* Rate (Rev) */}
        <td style={{ minWidth: "80px" }}>
          <TextField
            type="number"
            value={doc.charge_rate || ""}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].charge_rate`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            placeholder="Rate"
          />
        </td>

        {/* Amount (Rev) */}
        <td style={{ minWidth: "90px" }}>
          <TextField
            type="number"
            value={doc.document_amount_details}
            onChange={(e) =>
              formik.setFieldValue(
                `${docType}[${index}].document_amount_details`,
                e.target.value.replace(/[^0-9.]/g, "")
              )
            }
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            placeholder="Amount"
          />
        </td>

        {/* Ex. Rate */}
        <td style={{ minWidth: "50px" }}>
          <TextField
            type="number"
            value={doc.exchange_rate || 1}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].exchange_rate`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
          />
        </td>

        {/* Amount INR (Rev) */}
        <td style={{ minWidth: "90px" }}>
          <TextField
            type="number"
            value={doc.amount_inr || (doc.document_amount_details ? (doc.document_amount_details * (doc.exchange_rate || 1)).toFixed(2) : "")}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].amount_inr`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            placeholder="INR"
          />
        </td>

        {/* Receivable */}
        <td style={{ minWidth: "120px" }}>
          <TextField
            value={doc.receivable || ""}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].receivable`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            placeholder="Receivable"
          />
        </td>


        {/* COST SECTION */}
        {/* Rate (Cost) */}
        <td style={{ minWidth: "80px", borderLeft: "2px solid #ddd" }}>
          <TextField
            type="number"
            value={doc.cost_rate || ""}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].cost_rate`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            placeholder="Rate"
          />
        </td>

        {/* Amount (Cost) */}
        <td style={{ minWidth: "90px" }}>
          <TextField
            type="number"
            value={doc.cost_amount || ""}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].cost_amount`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            placeholder="Amount"
          />
        </td>

        {/* Amount INR (Cost) */}
        <td style={{ minWidth: "90px" }}>
          <TextField
            type="number"
            value={doc.cost_amount_inr || ""}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].cost_amount_inr`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            placeholder="INR"
          />
        </td>

        {/* Payable */}
        <td style={{ minWidth: "120px" }}>
          <TextField
            value={doc.payable || ""}
            onChange={(e) => formik.setFieldValue(`${docType}[${index}].payable`, e.target.value)}
            disabled={!isTableEditable}
            variant="standard"
            fullWidth
            size="small"
            placeholder="Payable"
          />
        </td>


        {/* Payment Mode / Details / Ops */}
        <td style={{ minWidth: "250px", borderLeft: "2px solid #ddd" }}>
          {isShippingInvoice && (
            <div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label><input type="radio" checked={doc.payment_mode === "Odex"} onChange={handlePaymentModeChange(index, "Odex")} disabled={!isTableEditable} /> Odex</label>
                <label><input type="radio" checked={doc.payment_mode === "Wire Transfer"} onChange={handlePaymentModeChange(index, "Wire Transfer")} disabled={!isTableEditable} /> Wire</label>
              </div>
              {doc.payment_mode === "Wire Transfer" && (
                <div style={{ marginLeft: 10, fontSize: '0.85em', marginTop: 5 }}>
                  {["RTGS", "NEFT", "IMPS"].map(m => (
                    <label key={m} style={{ marginRight: 8 }}>
                      <input type="radio" checked={doc.wire_transfer_method === m} onChange={() => formik.setFieldValue(`do_shipping_line_invoice[${index}].wire_transfer_method`, m)} disabled={!isTableEditable} /> {m}
                    </label>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 5, borderTop: '1px solid #eee', paddingTop: 5 }}>
                <label style={{ marginRight: 10 }}><input type="radio" checked={doc.is_tds} onChange={() => { formik.setFieldValue(`${docType}[${index}].is_tds`, true); formik.setFieldValue(`${docType}[${index}].is_non_tds`, false); }} disabled={!isTableEditable} /> TDS</label>
                <label><input type="radio" checked={doc.is_non_tds} onChange={() => { formik.setFieldValue(`${docType}[${index}].is_tds`, false); formik.setFieldValue(`${docType}[${index}].is_non_tds`, true); }} disabled={!isTableEditable} /> Non-TDS</label>
              </div>
            </div>
          )}
          {isSecurityDeposit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <TextField label="UTR" size="small" variant="standard" value={doc.utr} onChange={(e) => formik.setFieldValue(`${docType}[${index}].utr`, e.target.value.replace(/[^0-9]/g, ""))} disabled={!isTableEditable} />
              <TextField label="Validity" type="date" size="small" variant="standard" value={doc.Validity_upto} onChange={(e) => formik.setFieldValue(`${docType}[${index}].Validity_upto`, e.target.value)} InputLabelProps={{ shrink: true }} disabled={!isTableEditable} />
            </div>
          )}
        </td>

        {/* Payment Status */}
        <td style={{ minWidth: "150px" }}>
          {isShippingInvoice && (
            <div>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!doc.payment_request_date}
                    onChange={(e) => {
                      const val = e.target.checked ? new Date().toISOString() : "";
                      formik.setFieldValue(`${docType}[${index}].payment_request_date`, val);
                      formik.setFieldValue(`${docType}[${index}].is_payment_requested`, e.target.checked);
                    }}
                    disabled={!isTableEditable}
                    size="small"
                  />
                }
                label={<span style={{ fontSize: '0.8em' }}>Req: {doc.payment_request_date ? new Date(doc.payment_request_date).toLocaleDateString() : ""}</span>}
              />
              <FormControlLabel
                control={<Checkbox checked={!!doc.payment_made_date} disabled size="small" />}
                label={<span style={{ fontSize: '0.8em' }}>Made: {doc.payment_made_date ? new Date(doc.payment_made_date).toLocaleDateString() : ""}</span>}
              />
            </div>
          )}
        </td>

        {/* Document Checked */}
        <td style={{ minWidth: "120px" }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={doc.document_check_status || false}
                onChange={handleDocumentCheckChange(index, docType)}
                disabled={true}
                size="small"
              />
            }
            label={<span style={{ fontSize: '0.8em' }}>Checked</span>}
          />
          {doc.document_check_date && <div style={{ fontSize: '0.75em', marginTop: -5 }}>{new Date(doc.document_check_date).toLocaleDateString()}</div>}
        </td>
      </tr>
    );
  };

  // Render Section
  const renderChargesSection = () => (
    <div className="job-details-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <JobDetailsRowHeading heading="Charges" />
        <FormControlLabel
          control={<Checkbox checked={isTableEditable} onChange={(e) => setIsTableEditable(e.target.checked)} color="primary" />}
          label="Enable Edit"
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table table-bordered table-hover" style={{ fontSize: "14px", backgroundColor: "#fff" }}>
          <thead style={{ backgroundColor: "#f5f5f5" }}>
            <tr>
              <th rowSpan={2} width="15%" style={{ verticalAlign: 'middle' }}>Charge Head</th>
              <th rowSpan={2} width="15%" style={{ verticalAlign: 'middle' }}>Document / Status</th>
              <th rowSpan={2} width="5%" style={{ verticalAlign: 'middle' }}>Curr</th>
              <th colSpan={6} style={{ textAlign: "center", borderBottom: '2px solid #ddd' }}>Revenue</th>
              <th colSpan={4} style={{ textAlign: "center", borderBottom: '2px solid #ddd', borderLeft: "2px solid #ddd" }}>Cost</th>
              <th colSpan={3} style={{ textAlign: "center", borderBottom: '2px solid #ddd', borderLeft: "2px solid #ddd" }}>Operations</th>
            </tr>
            <tr>
              {/* Revenue */}
              <th width="8%">Basis</th>
              <th width="8%">Rate</th>
              <th width="8%">Amount</th>
              <th width="5%">Ex.Rate</th>
              <th width="8%">Amt (INR)</th>
              <th width="10%">Receivable</th>

              {/* Cost - with left border */}
              <th width="8%" style={{ borderLeft: "2px solid #ddd" }}>Rate</th>
              <th width="8%">Amount</th>
              <th width="8%">Amt (INR)</th>
              <th width="10%">Payable</th>

              {/* Operations - with left border */}
              <th width="15%" style={{ borderLeft: "2px solid #ddd" }}>Payment/Details</th>
              <th width="10%">Status</th>
              <th width="8%">Checked</th>
            </tr>
          </thead>
          <tbody>
            {formik.values.do_shipping_line_invoice.map((doc, index) => renderChargesRow(doc, index, "do_shipping_line_invoice", index > 0))}
            {formik.values.insurance_copy.map((doc, index) => renderChargesRow(doc, index, "insurance_copy", index > 0))}
            {formik.values.security_deposit.map((doc, index) => renderChargesRow(doc, index, "security_deposit", index > 0))}
            {formik.values.other_do_documents.map((doc, index) => renderChargesRow(doc, index, "other_do_documents", true))}
          </tbody>
        </table>
      </div>

      {/* DO Copies Row - Restored */}
      <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h6 style={{ marginBottom: "8px", fontWeight: 600, color: "#1a237e" }}>DO Copies</h6>
        <FileUpload
          label="Upload DO Copies"
          bucketPath="do_copies"
          onFilesUploaded={(newFiles) => {
            const existingFiles = formik.values.do_copies || [];
            const updatedFiles = [...existingFiles, ...newFiles];
            formik.setFieldValue("do_copies", updatedFiles);
            setFileSnackbar(true);
          }}
          multiple={true}
          disabled={!isTableEditable}
        />
        <div style={{ marginTop: "10px" }}>
          <ImagePreview
            images={formik.values.do_copies || []}
            onDeleteImage={isTableEditable ? (index) => {
              const updatedFiles = [...formik.values.do_copies];
              updatedFiles.splice(index, 1);
              formik.setFieldValue("do_copies", updatedFiles);
              setFileSnackbar(true);
            } : undefined}
          />
        </div>
      </div>

      {/* Dropdown and Add Document Button */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          border: "2px dashed #ccc",
          borderRadius: "5px",
        }}
      >
        <Row className="g-3" style={{ alignItems: "center" }}>
          {/* DO Validity Date */}
          <Col xs={12} md={4}>
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
              sx={{ m: 0 }}
            />
          </Col>

          {/* Document Type Select */}
          <Col xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Document Type</InputLabel>
              <Select
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                label="Select Document Type"
              >
                <MenuItem value="Shipping Line Invoice">
                  Shipping Line Invoice
                </MenuItem>
                <MenuItem value="Insurance">Insurance Copy</MenuItem>
                <MenuItem value="Security Deposit">Security Deposit</MenuItem>
                <MenuItem value="other">Other Document</MenuItem>
                <MenuItem value="new_charge">New Charge Head</MenuItem>
              </Select>
            </FormControl>
          </Col>

          {/* Add Document Button */}
          <Col xs={12} md={4}>
            <Button
              variant="contained"
              onClick={handleAddDocument}
              disabled={!selectedDocumentType}
              fullWidth
              style={{ height: "40px" }}
            >
              Add Document
            </Button>
          </Col>
        </Row>
      </div>
    </div >
  );



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

      {data && <JobDetailsStaticData data={data} params={{ job_no, year }} />}

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

                {/* DO List dropdown - removed the checkbox */}
                <div style={{ marginBottom: "16px" }}>
                  <select
                    value={formik.values.do_list || ""}
                    onChange={(e) =>
                      formik.setFieldValue("do_list", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
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
                </div>

                {/* Display selected DO List value if any */}
                {formik.values.do_list && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#388e3c",
                      padding: "4px 12px",
                      backgroundColor: "#e8f5e9",
                      borderRadius: "4px",
                      display: "inline-block",
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
                        Please set DO Validity and upload at least one DO Copy
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
              <button
                className="btn sticky-btn"
                type="submit"
                style={{ float: "right", margin: "10px" }}
                aria-label="submit-btn"
              >
                Submit
              </button>
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

export default React.memo(EditDoPlanning);

import { useState, useEffect } from "react";
import { useFormik } from "formik";
import axios from "axios";
import {
  customHouseOptions,
  importerOptions,
  shippingLineOptions,
  cth_Dropdown,
} from "../components/MasterLists/MasterLists";
import { set } from "date-fns";
import { sanitizeContainerPayload } from "../utils/modeLogic";

const useImportJobForm = () => {
  // Get the current date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Months are zero-based

  // Extract the last two digits of the current year
  const currentTwoDigits = String(currentYear).slice(-2); // e.g., "24" for 2024

  // Calculate the next year's last two digits
  const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0"); // e.g., "25" for 2025
  const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0"); // e.g., "23" for 2023

  // Determine the financial year range
  let defaultYearPair;
  if (currentMonth >= 4) {
    // From April of the current year to March of the next year
    defaultYearPair = `${currentTwoDigits}-${nextTwoDigits}`;
  } else {
    // From January to March, previous financial year
    defaultYearPair = `${prevTwoDigits}-${currentTwoDigits}`;
  }

  // Initialize the state with the determined year pair
  const [year, setYear] = useState(defaultYearPair);
  const [job_date, setJob_date] = useState("")

  // Existing states:
  // const [job_no, setJobNo] = useState("");
  const [custom_house, setCustomHouse] = useState("");
  const [importer, setImporter] = useState("");
  const [importerURL, setImporterURL] = useState("");
  const [shipping_line_airline, setShippingLineAirline] = useState("");
  const [branchSrNo, setBranchSrNo] = useState("");
  const [adCode, setAdCode] = useState("");
  const [supplier_exporter, setSupplierExporter] = useState("");
  const [awb_bl_no, setAwbBlNo] = useState("");
  const [awb_bl_date, setAwbBlDate] = useState("");
  const [hawb_hbl_date, setHawb_hbl_date] = useState("");
  const [hawb_hbl_no, setHawb_hbl_no] = useState("");
  const [vessel_berthing, setVesselberthing] = useState("");
  const [type_of_b_e, setTypeOfBE] = useState("");
  const [loading_port, setLoadingPort] = useState("");
  const [gross_weight, setGrossWeight] = useState("");
  const [job_net_weight, setJob_net_weight] = useState("");
  const [cth_no, setCthNo] = useState("");
  const [origin_country, setOriginCountry] = useState("");
  const [port_of_reporting, setPortOfReporting] = useState("");
  const [total_inv_value, setTotalInvValue] = useState("");
  const [inv_currency, setInvCurrency] = useState("");
  const [invoice_number, setInvoiceNumber] = useState("");
  const [invoice_date, setInvoiceDate] = useState("");
  const [po_no, setPoNo] = useState("");
  const [po_date, setPoDate] = useState("");
  const [import_terms, setImportTerms] = useState("CIF");
  const [freight, setFreight] = useState("");
  const [insurance, setInsurance] = useState("");
  const [term_value, setTermValue] = useState("");
  const [description, setDescription] = useState("");
  const [consignment_type, setConsignmentType] = useState("");
  const [isDraftDoc, setIsDraftDoc] = useState(false);
  const [branch_id, setBranchId] = useState("");
  const [trade_type, setTradeType] = useState("IMP");
  const [mode, setMode] = useState("SEA");
  const [branches, setBranches] = useState([]);
  const [invoice_details, setInvoiceDetails] = useState([
    {
      invoice_number: "",
      invoice_date: "",
      po_no: "",
      po_date: "",
      product_value: "",
      total_inv_value: "",
      inv_currency: "",
      toi: "CIF",
      freight: "",
      insurance: "",
      other_charges: "",
    },
  ]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/get-branches`);
        setBranches(response.data);
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };
    fetchBranches();
  }, []);

  const [container_nos, setContainerNos] = useState([
    {
      container_number: "",
      size: "",
      seal_no: "",
      container_gross_weight: "",
      net_weight_as_per_PL_document: "",
    },
  ]);

  const [fta_Benefit_date_time, setFtaBenefitDateTime] = useState("");
  const [exBondValue, setExBondValue] = useState("");
  const [jobDetails, setJobDetails] = useState([]);

  // The back end expects "cth_documents". In your front end, you called it "cthDocuments".
  // Keep your internal state as is, but rename it in the final payload.
  const [cthDocuments, setCthDocuments] = useState([
    {
      document_name: "Commercial Invoice",
      document_code: "380000",
      url: [],
      isDefault: true,
    },
    {
      document_name: "Packing List",
      document_code: "271000",
      url: [],
      isDefault: true,
    },
    {
      document_name: "Bill of Lading",
      document_code: "704000",
      url: [],
      isDefault: true,
    },
  ]);

  const [scheme, setScheme] = useState("");
  const [in_bond_be_no, setBeNo] = useState("");
  const [in_bond_be_date, setBeDate] = useState("");
  const [in_bond_ooc_copies, setOocCopies] = useState([]);
  const [clearanceValue, setClearanceValue] = useState("");

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // For editing a single doc
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({});

  // For new doc from dropdown or user
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [HSS, setHSS] = useState("");
  const [sallerName, setSallerName] = useState("");
  const [bankName, setBankName] = useState("")
  const [ie_code_no, setIeCodeNo] = useState("");
  const [hss_address, setHssAddress] = useState("");
  const [hss_address_details, setHssAddressDetails] = useState("");
  const [hss_branch_id, setHssBranchId] = useState("");
  const [hss_city, setHssCity] = useState("");
  const [hss_ie_code_no, setHssIeCodeNo] = useState("");
  const [hss_postal_code, setHssPostalCode] = useState("");
  const [hss_country, setHssCountry] = useState("");
  const [hss_ad_code, setHssAdCode] = useState("");
  const [other_charges_details, setOtherChargesDetails] = useState({
    is_single_for_all: true,
    miscellaneous: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    agency: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    discount: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    loading: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    freight: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    insurance: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    addl_charge: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    revenue_deposit: { rate: 0, on: "Assessable" },
    landing_charge: { rate: 1 }
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [editJobId, setEditJobId] = useState(null);
  const [jobNumber, setJobNumber] = useState("");

  useEffect(() => {
    if (importer) {
      const formattedImporter = importer
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w]+/g, "")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      setImporterURL(formattedImporter);
    }
  }, [importer]);

  // Fetch job numbers dynamically
  // Fetch job details dynamically
  useEffect(() => {
    async function fetchJobDetails() {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_STRING}/jobs/add-job-all-In-bond`
        );
        setJobDetails(response.data); // Set the job details from the response
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }
    fetchJobDetails();
  }, []);
  //
  const [description_details, setDescriptionDetails] = useState([
    {
      description: "",
      cth_no: "",
      clearance_under: "",
      sr_no_invoice: "",
      sr_no_lic: "",
      quantity: "",
      unit: "",
      unit_price: "",
      amount: "",
      foc_item: "No",
    },
  ]);

  const updateInvoiceRow = (rowIndex, field, value) => {
    const updatedRows = [...invoice_details];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };

    // Auto-calculate total_inv_value from contributing fields
    const calcFields = ["product_value", "freight", "insurance", "other_charges"];
    if (calcFields.includes(field)) {
      const row = updatedRows[rowIndex];
      const pv = parseFloat(field === "product_value" ? value : (row.product_value || 0)) || 0;
      const fr = parseFloat(field === "freight" ? value : (row.freight || 0)) || 0;
      const ins = parseFloat(field === "insurance" ? value : (row.insurance || 0)) || 0;
      const oth = parseFloat(field === "other_charges" ? value : (row.other_charges || 0)) || 0;
      updatedRows[rowIndex].total_inv_value = (pv + fr + ins + oth).toFixed(2);
    }

    setInvoiceDetails(updatedRows);

    // Sync first row with single fields for backward compatibility
    if (rowIndex === 0) {
      if (field === "invoice_number") setInvoiceNumber(value);
      if (field === "invoice_date") setInvoiceDate(value);
      if (field === "po_no") setPoNo(value);
      if (field === "po_date") setPoDate(value);
      if (field === "inv_currency") setInvCurrency(value);
      if (field === "toi") setImportTerms(value);
      if (field === "freight") setFreight(value);
      if (field === "insurance") setInsurance(value);
      // Sync calculated total
      const fv = parseFloat(updatedRows[0].total_inv_value) || 0;
      if (fv > 0) {
        setTotalInvValue(String(fv));
        setTermValue(String(fv));
      } else if (field === "total_inv_value") {
        setTotalInvValue(value);
        setTermValue(value);
      }
    }
  };

  const addInvoiceRow = () => {
    setInvoiceDetails([
      ...invoice_details,
      {
        invoice_number: "",
        invoice_date: "",
        po_no: "",
        po_date: "",
        product_value: "",
        total_inv_value: "",
        inv_currency: invoice_details[0]?.inv_currency || "",
        toi: "CIF",
        freight: "",
        insurance: "",
        other_charges: "",
      },
    ]);
  };

  const removeInvoiceRow = (rowIndex) => {
    if (invoice_details.length <= 1) return;
    const updatedRows = invoice_details.filter((_, index) => index !== rowIndex);
    setInvoiceDetails(updatedRows);
  };

  const updateDescriptionRow = (rowIndex, field, value) => {
    const updatedRows = [...description_details];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };

    // Auto-calculate amount if quantity or unit_price changes
    if (field === "quantity" || field === "unit_price") {
      const qty = parseFloat(field === "quantity" ? value : (updatedRows[rowIndex].quantity || 0)) || 0;
      const price = parseFloat(field === "unit_price" ? value : (updatedRows[rowIndex].unit_price || 0)) || 0;
      updatedRows[rowIndex].amount = (qty * price).toFixed(2);
    }

    setDescriptionDetails(updatedRows);

    if (rowIndex === 0) {
      if (field === "description") setDescription(value);
      if (field === "cth_no") setCthNo(value);
      if (field === "clearance_under") {
        setClearanceValue(value);
        setScheme(value);
      }
    }
  };

  useEffect(() => {
    if (scheme) {
      setDescriptionDetails((prev) =>
        prev.map((row) => ({
          ...row,
          clearance_under: row.clearance_under || scheme,
        }))
      );
    }
  }, [scheme]);

  const addDescriptionRow = () => {
    const defaultSrNo = invoice_details.length > 0 ? String(invoice_details.length) : "";
    setDescriptionDetails([
      ...description_details,
      {
        description: "",
        cth_no: "",
        clearance_under: scheme || clearanceValue || "",
        sr_no_invoice: defaultSrNo,
        sr_no_lic: "",
        quantity: "",
        unit: "",
        unit_price: "",
        amount: "",
        foc_item: "No",
      },
    ]);
  };

  const removeDescriptionRow = (rowIndex) => {
    if (description_details.length <= 1) return;
    const updatedRows = description_details.filter((_, index) => index !== rowIndex);
    setDescriptionDetails(updatedRows);
  };

  // Reset form function
  const resetForm = () => {
    // setYear(defaultYearPair);
    setCustomHouse("");
    setImporter("");
    setShippingLineAirline("");
    setBranchSrNo("");
    setAdCode("");
    setSupplierExporter("");
    setAwbBlNo("");
    setHawb_hbl_no("");
    setHawb_hbl_date("");
    setAwbBlDate("");
    setVesselberthing("");
    setTypeOfBE("");
    setLoadingPort("");
    setGrossWeight("");
    setJob_net_weight("");
    setCthNo("");
    setOriginCountry("");
    setPortOfReporting("");
    setTotalInvValue("");
    setInvCurrency("");
    setInvoiceNumber("");
    setInvoiceDate("");
    setPoNo("");
    setPoDate("");
    setDescription("");
    setDescriptionDetails([
      {
        description: "",
        cth_no: "",
        clearance_under: "",
        sr_no_invoice: "",
        sr_no_lic: "",
        quantity: "",
        unit: "",
        unit_price: "",
        amount: "",
        foc_item: "No",
      },
    ]);
    setInvoiceDetails([
      {
        invoice_number: "",
        invoice_date: "",
        po_no: "",
        po_date: "",
        product_value: "",
        total_inv_value: "",
        inv_currency: "",
        toi: "CIF",
        freight: "",
        insurance: "",
        other_charges: "",
      },
    ]);
    setConsignmentType("");
    setIsDraftDoc(false);
    setContainerNos([
      {
        container_number: "",
        size: "",
        seal_no: "",
        container_gross_weight: "",
        net_weight_as_per_PL_document: "",
      },
    ]);
    setFtaBenefitDateTime("");
    setExBondValue("");
    setCthDocuments([
      {
        document_name: "Commercial Invoice",
        document_code: "380000",
        url: [],
        isDefault: true,
      },
      {
        document_name: "Packing List",
        document_code: "271000",
        url: [],
        isDefault: true,
      },
      {
        document_name: "Bill of Lading",
        document_code: "704000",
        url: [],
        isDefault: true,
      },
    ]);
    setScheme("");
    setBeNo("");
    setBeDate("");
    setOocCopies([]);
    setClearanceValue("");
    setSelectedDocument("");
    setNewDocumentName("");
    setNewDocumentCode("");
    setHSS("")
    setSallerName("")
    setBankName("")
    setIeCodeNo("");
    setHssAddress("");
    setHssAddressDetails("");
    setHssBranchId("");
    setHssCity("");
    setHssIeCodeNo("");
    setHssPostalCode("");
    setHssCountry("");
    setHssAdCode("");
    setOtherChargesDetails({
      is_single_for_all: true,
      miscellaneous: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      agency: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      discount: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      loading: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      freight: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      insurance: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      addl_charge: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      revenue_deposit: { rate: 0, on: "Assessable" },
      landing_charge: { rate: 1 }
    });
    setBranchId("");
    setTradeType("IMP");
    setMode("SEA");

    // Reset any other states if necessary
    setIsEditMode(false);
    setEditJobId(null);
    setJobNumber("");
  };

  const populateJobData = (job) => {
    if (!job) return;
    
    setIsEditMode(true);
    setEditJobId(job._id);
    setJobNumber(job.job_number || job.job_no || "");
    
    if (job.year) setYear(job.year);
    if (job.custom_house) setCustomHouse(job.custom_house);
    if (job.importer) setImporter(job.importer);
    if (job.shipping_line_airline) setShippingLineAirline(job.shipping_line_airline);
    if (job.branchSrNo) setBranchSrNo(job.branchSrNo);
    if (job.adCode) setAdCode(job.adCode);
    if (job.supplier_exporter) setSupplierExporter(job.supplier_exporter);
    if (job.awb_bl_no) setAwbBlNo(job.awb_bl_no);
    if (job.hawb_hbl_no) setHawb_hbl_no(job.hawb_hbl_no);
    if (job.hawb_hbl_date) setHawb_hbl_date(job.hawb_hbl_date);
    if (job.awb_bl_date) setAwbBlDate(job.awb_bl_date);
    if (job.vessel_berthing) setVesselberthing(job.vessel_berthing);
    if (job.type_of_b_e) setTypeOfBE(job.type_of_b_e);
    if (job.loading_port) setLoadingPort(job.loading_port);
    if (job.gross_weight) setGrossWeight(job.gross_weight);
    if (job.job_net_weight) setJob_net_weight(job.job_net_weight);
    if (job.cth_no) setCthNo(job.cth_no);
    if (job.origin_country) setOriginCountry(job.origin_country);
    if (job.port_of_reporting) setPortOfReporting(job.port_of_reporting);
    if (job.total_inv_value) setTotalInvValue(job.total_inv_value);
    if (job.inv_currency) setInvCurrency(job.inv_currency);
    if (job.invoice_number) setInvoiceNumber(job.invoice_number);
    if (job.invoice_date) setInvoiceDate(job.invoice_date);
    if (job.po_no) setPoNo(job.po_no);
    if (job.po_date) setPoDate(job.po_date);
    if (job.total_inv_value || job.cifValue) setTermValue(job.total_inv_value || job.cifValue || "");
    if (job.consignment_type) setConsignmentType(job.consignment_type);
    if (job.description) setDescription(job.description);
    if (!job.description && job.description_details && job.description_details.length > 0) {
        setDescription(job.description_details[0].description);
    }
    
    if (job.invoice_details && job.invoice_details.length > 0) {
      setInvoiceDetails(job.invoice_details.map(inv => ({
        ...inv,
        po_no: inv.po_no || "",
        po_date: inv.po_date || ""
      })));
    } else if (job.invoice_number || job.total_inv_value) {
      setInvoiceDetails([{
        invoice_number: job.invoice_number || "",
        invoice_date: job.invoice_date || "",
        po_no: job.po_no || "",
        po_date: job.po_date || "",
        product_value: job.product_value || job.total_inv_value || "",
        total_inv_value: job.total_inv_value || "",
        inv_currency: job.inv_currency || "",
        toi: job.import_terms || "CIF",
        freight: job.freight || "",
        insurance: job.insurance || "",
        other_charges: job.other_charges || ""
      }]);
    }
    
    if (job.description_details && job.description_details.length > 0) {
      setDescriptionDetails(job.description_details);
    } else if (job.description || job.cth_no) {
      setDescriptionDetails([{
        description: job.description || (job.description_details && job.description_details[0]?.description) || "",
        cth_no: job.cth_no || (job.description_details && job.description_details[0]?.cth_no) || "",
        clearance_under: job.scheme || job.clearanceValue || "Full Duty",
        sr_no_invoice: "1",
        sr_no_lic: job.sr_no_lic || "",
        quantity: job.gross_weight || "",
        unit: job.unit || "",
        unit_price: job.unit_price || "",
        amount: job.total_inv_value || "",
        foc_item: job.foc_item || "No"
      }]);
    }

    if (job.ie_code_no) setIeCodeNo(job.ie_code_no);

    if (job.container_nos && job.container_nos.length > 0) {
      setContainerNos(job.container_nos);
    }

    if (job.cth_documents && job.cth_documents.length > 0) {
      setCthDocuments(job.cth_documents);
    }

    if (job.scheme) setScheme(job.scheme);
    if (job.in_bond_be_no) setBeNo(job.in_bond_be_no);
    if (job.in_bond_be_date) setBeDate(job.in_bond_be_date);
    if (job.in_bond_ooc_copies) setOocCopies(job.in_bond_ooc_copies);
    if (job.clearanceValue) setClearanceValue(job.clearanceValue);
    if (job.saller_name) setSallerName(job.saller_name);
    if (job.hss) setHSS(job.hss);
    if (job.bank_name) setBankName(job.bank_name);
    if (job.hss_address) setHssAddress(job.hss_address);
    if (job.hss_address_details) setHssAddressDetails(job.hss_address_details);
    if (job.hss_branch_id) setHssBranchId(job.hss_branch_id);
    if (job.hss_city) setHssCity(job.hss_city);
    if (job.hss_ie_code_no) setHssIeCodeNo(job.hss_ie_code_no);
    if (job.hss_postal_code) setHssPostalCode(job.hss_postal_code);
    if (job.hss_country) setHssCountry(job.hss_country);
    if (job.hss_ad_code) setHssAdCode(job.hss_ad_code);
    if (job.branch_id) setBranchId(job.branch_id);
    if (job.trade_type) setTradeType(job.trade_type);
    if (job.mode) setMode(job.mode);
    if (job.other_charges_details) {
      setOtherChargesDetails(job.other_charges_details);
    }
  };

  const checkDuplicate = async (blNumber) => {
    if (!blNumber) return { exists: false };
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/jobs/check-duplicate`, { 
        blNumber,
      });
      return response.data;
    } catch (error) {
      console.error("Error checking duplication:", error);
      return { exists: false, error: true };
    }
  };
  //
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const formik = useFormik({
    initialValues: {
      all_documents: [],
    },
    onSubmit: async (values) => {
      try {
        if (!branch_id) {
          setSnackbar({
            open: true,
            message: "Please select a branch before creating the job.",
            severity: "error"
          });
          return;
        }

        const payload = {
          ...values,
          year, // <-- MANDATORY for backend
          job_date,
          custom_house,
          importer,
          importerURL,
          ie_code_no,
          shipping_line_airline,
          branchSrNo,
          adCode,
          supplier_exporter,
          awb_bl_no,
          hawb_hbl_no,
          hawb_hbl_date,
          awb_bl_date,
          vessel_berthing,
          type_of_b_e,
          loading_port,
          gross_weight,
          job_net_weight,
          cth_no,
          origin_country,
          port_of_reporting,
          total_inv_value,
          inv_currency,
          invoice_number,
          invoice_date,
          po_no,
          po_date,
          invoice_details,
          other_charges_details,
          import_terms,
          freight,
          insurance,
          cifValue: term_value,
          description,
          description_details,
          consignment_type,
          isDraftDoc,
          branch_id,
          trade_type,
          mode,
          container_nos: container_nos.map((c) => {
            const sanitized = sanitizeContainerPayload(c, mode);
            return {
              ...sanitized,
              // Copy seal_no into seal_number array so ViewJob can display it
              seal_number: sanitized.seal_no ? [sanitized.seal_no] : [],
            };
          }),
          cth_documents: cthDocuments, // Renamed to match backend expectations
          scheme,
          in_bond_be_no,
          in_bond_be_date,
          in_bond_ooc_copies,
          exBondValue,
          fta_Benefit_date_time,
          remarks: "",
          status: "Pending",
          clearanceValue,
          saller_name: sallerName,
           hss: HSS,
           bank_name: bankName,
           hss_address,
           hss_address_details,
           hss_branch_id,
           hss_city,
           hss_ie_code_no: hss_ie_code_no,
           hss_postal_code,
           hss_country,
           hss_ad_code,
           detailed_status: "ETA Date Pending",
        };

        // Get user info from localStorage for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          'Content-Type': 'application/json',
          'user-id': user.username || 'unknown',
          'username': user.username || 'unknown',
          'user-role': user.role || 'unknown'
        };

        // Make the API call and store response
        const url = isEditMode 
          ? `${process.env.REACT_APP_API_STRING}/jobs/${editJobId}`
          : `${process.env.REACT_APP_API_STRING}/jobs/add-job-imp-man`;

        const response = await axios({
          method: isEditMode ? 'PATCH' : 'POST',
          url,
          data: payload,
          headers
        });

        // Show success alert
        setSnackbar({
          open: true,
          message: `Job successfully ${isEditMode ? 'updated' : 'created'}! Job No: ${response.data.job?.job_number || response.data.job?.job_no}`,
          severity: "success"
        });

        // Reset the form after successful submission
        resetForm();
        formik.resetForm();
      } catch (error) {
        console.log("❌ Error creating job:", error);

        let errorMessage = "Failed to create job. Please try again.";

        if (error.response) {
          // Extract error message from API response
          errorMessage = error.response.data?.message || `Error: ${error.response.status}`;
        } else if (error.message) {
          errorMessage = error.message;
        }

        setSnackbar({
          open: true,
          message: errorMessage,
          severity: "error"
        });
      }
    },
  });

  // Example utility functions
  const resetOtherDetails = () => {
    setBeNo("");
    setBeDate("");
    setOocCopies([]);
    setScheme("");
    setExBondValue("");
  };

  const canChangeClearance = () => {
    return (
      !exBondValue &&
      !in_bond_be_no &&
      !in_bond_be_date &&
      in_bond_ooc_copies.length === 0
    );
  };

  // Container handlers
  const handleAddContainer = () => {
    const newContainer = sanitizeContainerPayload({
      container_number: "",
      size: "",
      seal_no: "",
      container_gross_weight: "",
      net_weight_as_per_PL_document: "",
    }, mode);
    setContainerNos([
      ...container_nos,
      newContainer
    ]);
  };

  const handleRemoveContainer = (index) => {
    const updatedContainers = container_nos.filter((_, i) => i !== index);
    setContainerNos(updatedContainers);
  };

  const handleContainerChange = (index, field, value) => {
    const updatedContainers = [...container_nos];
    updatedContainers[index][field] = value;
    setContainerNos(updatedContainers);
  };

  // CTH Document handlers
  const confirmDeleteDocument = (index) => {
    setDeleteIndex(index);
    setConfirmDialogOpen(true);
  };

  const handleDeleteDocument = () => {
    if (deleteIndex !== null) {
      setCthDocuments((prevDocs) => {
        const updatedDocs = prevDocs.filter((_, i) => i !== deleteIndex);
        return updatedDocs;
      });
      setDeleteIndex(null);
      setConfirmDialogOpen(false);
    }
  };

  const handleOpenEditDialog = (index) => {
    const documentToEdit = cthDocuments[index];
    setEditValues(documentToEdit);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditValues({});
  };

  const handleSaveEdit = () => {
    const updatedDocuments = [...cthDocuments];
    const idx = updatedDocuments.findIndex(
      (doc) => doc.document_code === editValues.document_code
    );
    if (idx !== -1) {
      updatedDocuments[idx] = editValues;
      setCthDocuments(updatedDocuments);
    }
    setEditDialogOpen(false);
  };

  const handleAddDocument = () => {
    if (selectedDocument === "other") {
      // Adding a custom document
      if (newDocumentName && newDocumentCode) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          {
            document_name: newDocumentName,
            document_code: newDocumentCode,
            url: [],
          },
        ]);
        setNewDocumentName("");
        setNewDocumentCode("");
      } else {
        setSnackbar({ open: true, message: "Please enter valid document details.", severity: "warning" });
      }
    } else if (selectedDocument) {
      // Adding a document from the dropdown
      const selectedDoc = cth_Dropdown.find(
        (doc) => doc.document_code === selectedDocument
      );
      if (selectedDoc) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          { ...selectedDoc, url: [] },
        ]);
        setSelectedDocument("");
      } else {
        setSnackbar({ open: true, message: "Invalid document selected.", severity: "warning" });
      }
    } else {
      setSnackbar({ open: true, message: "Please select or enter document details.", severity: "warning" });
    }
  };

  return {
    formik,
    // Export states so the component can use them
    year,
    setYear,
    custom_house,
    setCustomHouse,
    importer,
    importerURL,
    setImporter,
    shipping_line_airline,
    setShippingLineAirline,
    branchSrNo,
    setBranchSrNo,
    adCode,
    setAdCode,
    supplier_exporter,
    setSupplierExporter,
    awb_bl_no,
    hawb_hbl_no,
    setHawb_hbl_no,
    hawb_hbl_date,
    setHawb_hbl_date,
    setAwbBlNo,
    awb_bl_date,
    vessel_berthing,
    setAwbBlDate,
    setVesselberthing,
    type_of_b_e,
    setTypeOfBE,
    loading_port,
    setLoadingPort,
    gross_weight,
    setGrossWeight,
    job_net_weight,
    setJob_net_weight,
    cth_no,
    setCthNo,
    origin_country,
    setOriginCountry,
    port_of_reporting,
    setPortOfReporting,
    total_inv_value,
    setTotalInvValue,
    inv_currency,
    setInvCurrency,
    invoice_number,
    setInvoiceNumber,
    invoice_date,
    setInvoiceDate,
    description,
    setDescription,
    consignment_type,
    setConsignmentType,
    isDraftDoc,
    setIsDraftDoc,
    container_nos,
    handleAddContainer,
    handleRemoveContainer,
    handleContainerChange,
    cthDocuments,
    setCthDocuments,
    scheme,
    setScheme,
    in_bond_be_no,
    setBeNo,
    in_bond_be_date,
    setBeDate,
    in_bond_ooc_copies,
    setOocCopies,
    exBondValue,
    setExBondValue,
    fta_Benefit_date_time,
    setFtaBenefitDateTime,
    selectedDocument,
    setSelectedDocument,
    newDocumentName,
    setNewDocumentName,
    newDocumentCode,
    setNewDocumentCode,
    confirmDialogOpen,
    setConfirmDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editValues,
    setEditValues,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleSaveEdit,
    confirmDeleteDocument,
    handleDeleteDocument,
    handleAddDocument,
    clearanceValue,
    setClearanceValue,
    resetOtherDetails,
    canChangeClearance,
    jobDetails,
    setJobDetails,
    HSS,
    setHSS,
    sallerName,
    setSallerName,
     bankName,
     setBankName,
     hss_address,
     setHssAddress,
     hss_address_details,
     setHssAddressDetails,
     hss_branch_id,
     setHssBranchId,
     hss_city,
     setHssCity,
     hss_ie_code_no,
     setHssIeCodeNo,
     hss_postal_code,
     setHssPostalCode,
     hss_country,
     setHssCountry,
     hss_ad_code,
     setHssAdCode,
     ie_code_no,
    setIeCodeNo,
    branch_id,
    setBranchId,
    trade_type,
    setTradeType,
    mode,
    setMode,
    branches,
    description_details,
    addDescriptionRow,
    updateDescriptionRow,
    removeDescriptionRow,
    other_charges_details,
    setOtherChargesDetails,
    invoice_details,
    addInvoiceRow,
    updateInvoiceRow,
    removeInvoiceRow,
    import_terms,
    setImportTerms,
    freight,
    setFreight,
    insurance,
    setInsurance,
    term_value,
    setTermValue,
    snackbar,
    setSnackbar,
    isEditMode,
    setIsEditMode,
    jobNumber,
    populateJobData,
    checkDuplicate
  };
};

export default useImportJobForm;

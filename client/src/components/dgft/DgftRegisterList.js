import React, { useEffect, useState, useCallback, useRef, useMemo, useContext } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./dgft.scss";

// ===================== Constants =====================

const SCHEME_OPTIONS = [
  "AEO",
  "EMI",
  "IEC",
  "IEC MODIFICATION",
  "EPM",
  "EMC",
  "AA",
  "AA REVALIDATION",
  "AA EO EXTENSION",
  "AA EODC",
  "AA SURRENDER",
  "EPCG",
  "EPCG AMENDMENT",
  "EPCG BLOCK EXTENSION",
  "EPCG OVERALL EXTENSION",
  "EPCG EODC",
  "EPCG SURRENDER",
];

const JOB_STATUS_OPTIONS = [
  "OPEN",
  "IN PROCESS",
  "PAYMENT REQUESTED",
  "PAYMENT APPROVED",
  "DEFICIENT",
  "APPROVED",
  "REJECTED",
  "BILLING",
  "CLOSED",
];

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

const INITIAL_FORM = {
  sr_no: "",
  job_status: "",
  job_no: "",
  date: "",
  party_name: "",
  iec_no: "",
  scheme: "",
  file_no: "",
  port_of_registration: "",
  licence_cif_value: "",
  docs_received_date: "",
  online_submission_date: "",
  documents_send_to_accounts_date: "",
  payment_details: "",
  transaction_id: "",
  transaction_amount: "",
  transaction_date: "",
  qty_export: "",
  unit_export: "",
  export_value_fob_usd: "",
  export_value_rs: "",
  hs_code_export: "",
  item_description_export: "",
  qty_import: "",
  unit_import: "",
  import_value_fob_usd: "",
  import_value_rs: "",
  hs_code_import: "",
  item_description_import: "",
  import_validity: "",
  export_validity: "",
  application_prepared_on: "",
  submitted_at_dgft_on: "",
  eft_amount: "",
  bid_no: "",
  bid_date: "",
  file_no_key_no: "",
  file_date: "",
  dh: "",
  ft_do: "",
  adg: "",
  d_dg: "",
  licence_no: "",
  licence_date: "",
  matter_closed_date: "",
  matter_closed_inv_no: "",
  matter_closed_inv_date: "",
  docs_handed_over_to_ac: "",
  remarks: "",
  accounts_inv_no: "",
  accounts_inv_date: "",
};

// Fields that must be valid dates
const DATE_FIELDS = new Set([
  "date",
  "docs_received_date",
  "online_submission_date",
  "documents_send_to_accounts_date",
  "transaction_date",
  "import_validity",
  "export_validity",
  "application_prepared_on",
  "submitted_at_dgft_on",
  "bid_date",
  "file_date",
  "licence_date",
  "matter_closed_date",
  "matter_closed_inv_date",
  "accounts_inv_date",
]);

// All fields with label and optional type (sr_no is auto-generated, job_no auto-generated)
const FIELDS = [
  { key: "job_no", label: "JOB No.", readOnly: true },
  { key: "job_status", label: "Job Status", select: true, options: JOB_STATUS_OPTIONS },
  { key: "date", label: "Date", type: "date" },
  { key: "party_name", label: "Firm Name" },
  { key: "licence_no", label: "Authorization No." },
  { key: "licence_date", label: "Auth Date", type: "date" },
  { key: "scheme", label: "Scheme", select: true, options: SCHEME_OPTIONS },
  { key: "file_no", label: "File Number" },
  { key: "file_date", label: "File Date", type: "date" },
  { key: "port_of_registration", label: "Port of Registration" },
  { key: "iec_no", label: "IEC No." },
  {
    key: "category",
    label: "Legacy Category",
    select: true,
    options: SCHEME_OPTIONS,
    allowCustom: true,
  },
  { key: "licence_cif_value", label: "Licence / CIF Value" },
  { key: "docs_received_date", label: "Docs Recvd Date", type: "date" },
  { key: "application_prepared_on", label: "App. Prepared On", type: "date" },
  { key: "submitted_at_dgft_on", label: "Submitted at DGFT", type: "date" },
  { key: "eft_amount", label: "EFT Amount" },
  { key: "bid_no", label: "BID No" },
  { key: "bid_date", label: "BID Date", type: "date" },
  { key: "file_no_key_no", label: "File / Key No" },
  { key: "file_date", label: "File Date", type: "date" },
  { key: "dh", label: "D/H" },
  { key: "ft_do", label: "F/T Do" },
  { key: "adg", label: "ADG" },
  { key: "d_dg", label: "D.DG" },
  { key: "licence_no", label: "Licence No" },
  { key: "licence_date", label: "Licence Date", type: "date" },
  { key: "matter_closed_date", label: "Closed Date", type: "date" },
  { key: "matter_closed_inv_no", label: "INV No." },
  { key: "matter_closed_inv_date", label: "INV Date", type: "date" },
  { key: "docs_handed_over_to_ac", label: "Docs to A/c Dept." },
  { key: "remarks", label: "Remarks" },
  { key: "accounts_inv_no", label: "Acc INV No." },
  { key: "accounts_inv_date", label: "Acc INV Date", type: "date" },
];

// Flat column definitions for the table (no grouping)
const COLUMNS = [
  { key: "job_no", label: "JOB NUMBER", width: 110 },
  { key: "date", label: "DATE", width: 95 },
  { key: "party_name", label: "FIRM NAME", width: 220 },
  { key: "licence_no", label: "AUTHORIZATION NO.", width: 155 },
  { key: "licence_date", label: "AUTH DATE", width: 100 },
  { key: "scheme", label: "SCHEME", width: 170 },
  { key: "file_no", label: "FILE NUMBER", width: 120 },
  { key: "file_date", label: "FILE DATE", width: 100 },
  { key: "job_status", label: "JOB STATUS", width: 130 },
  { key: "_actions", label: "ACTIONS", width: 210 },
];

// Sort icon
function SortIcon({ dir }) {
  return (
    <span className="ar-sort-icon">
      {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
    </span>
  );
}

// ===================== Toast Component =====================

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast.open) {
      const t = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(t);
    }
  }, [toast.open, onClose]);

  if (!toast.open) return null;

  return (
    <div className={`dgft-toast ${toast.severity}`}>
      {toast.message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// ===================== Date Helpers =====================
const toNativeDate = (val) => {
  if (!val || typeof val !== "string") return val || "";
  const trimmed = val.trim();
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) return trimmed; // YYYY-MM-DD
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return trimmed;
};

const formatDateToDdMmYyyy = (val) => {
  if (!val) return "";
  const raw = String(val).trim();
  if (!raw) return "";

  // Match YYYY-MM-DD
  const matchYmd = raw.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (matchYmd) {
    return `${matchYmd[3]}-${matchYmd[2]}-${matchYmd[1]}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const matchDmy = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (matchDmy) {
    const dd = matchDmy[1].padStart(2, "0");
    const mm = matchDmy[2].padStart(2, "0");
    const yyyy = matchDmy[3].length === 2 ? "20" + matchDmy[3] : matchDmy[3];
    return `${dd}-${mm}-${yyyy}`;
  }

  return raw;
};

// ===================== Main Component =====================

function DgftRegisterList({ onCountChange }) {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "";
  const initialCategory = searchParams.get("scheme") || "";
  const initialSearch = searchParams.get("search") || "";

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  useEffect(() => {
    const s = searchParams.get("status") || "";
    if (s !== statusFilter) setStatusFilter(s);
    const sc = searchParams.get("scheme") || "";
    if (sc !== categoryFilter) setCategoryFilter(sc);
    const q = searchParams.get("search") || "";
    if (q !== search) setSearch(q);
  }, [searchParams]);

  const updateStatusFilter = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(0);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (newStatus) p.set("status", newStatus);
      else p.delete("status");
      return p;
    }, { replace: true });
  };

  const updateCategoryFilter = (newCat) => {
    setCategoryFilter(newCat);
    setPage(0);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (newCat) p.set("scheme", newCat);
      else p.delete("scheme");
      return p;
    }, { replace: true });
  };

  const updateSearch = (newSearch) => {
    setSearch(newSearch);
    setPage(0);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (newSearch) p.set("search", newSearch);
      else p.delete("search");
      return p;
    }, { replace: true });
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [availableCategories, setAvailableCategories] = useState(SCHEME_OPTIONS);
  const [categoryInput, setCategoryInput] = useState("");
  const fileInput = useRef(null);
  const [sort, setSort] = useState({ key: null, dir: null });

  // Payment approval state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusTab, setPaymentStatusTab] = useState("ALL"); // ALL, PENDING, APPROVED, REJECTED
  const [selectedDetailRecord, setSelectedDetailRecord] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // Direct row payment approval & rejection modals
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedApproveRow, setSelectedApproveRow] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectRow, setSelectedRejectRow] = useState(null);
  const [rejectModalReason, setRejectModalReason] = useState("");
  
  const containerRef = useRef(null);

  const handleSort = (key) =>
    setSort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc",
    }));

  // Fetch data
  const getData = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-dgft-registers`
      );
      setRows(
        res.data.sort((a, b) => {
          const s1 = String(a.job_no || "");
          const s2 = String(b.job_no || "");
          return s1.localeCompare(s2, undefined, { numeric: true });
        })
      );
      if (onCountChange) onCountChange(res.data.length);
    } catch (err) {
      console.error(err);
    }
  }, [onCountChange]);

  // Fetch payment requests
  const fetchPaymentRequests = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-dgft-payment-requests`
      );
      setPaymentRequests(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleOpenPaymentDialog = () => {
    fetchPaymentRequests();
    setPaymentSearch("");
    setPaymentStatusTab("PENDING");
    setPaymentDialogOpen(true);
  };

  const handleOpenDetailView = (record) => {
    setSelectedDetailRecord(record);
    setDetailDialogOpen(true);
  };

  const handleApprovePayment = async (id) => {
    if (!window.confirm("Approve this payment request?")) return;
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_STRING}/dgft-approve-payment/${id}`
      );
      showToast("Payment approved", "success");
      fetchPaymentRequests();
      getData();
      if (selectedDetailRecord && selectedDetailRecord._id === id) {
        setSelectedDetailRecord(res.data?.data || { ...selectedDetailRecord, payment_status: "Payment Approved" });
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to approve", "error");
    }
  };

  const handleOpenRejectDialog = (id) => {
    setRejectTargetId(id);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectPayment = async () => {
    if (!rejectTargetId) return;
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_STRING}/dgft-reject-payment/${rejectTargetId}`,
        { reason: rejectReason }
      );
      showToast("Payment rejected", "success");
      setRejectDialogOpen(false);
      if (selectedDetailRecord && selectedDetailRecord._id === rejectTargetId) {
        setSelectedDetailRecord(res.data?.data || { ...selectedDetailRecord, payment_status: "Payment Rejected", payment_rejection_reason: rejectReason });
      }
      setRejectTargetId(null);
      setRejectReason("");
      fetchPaymentRequests();
      getData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to reject", "error");
    }
  };

  const getCategories = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-dgft-categories`
      );
      // Merge unique categories from DB with standard options
      const unique = Array.from(new Set([...SCHEME_OPTIONS, ...res.data]));
      setAvailableCategories(unique);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    getData();
    getCategories();
    fetchPaymentRequests();
  }, [getData, getCategories, fetchPaymentRequests]);

  // Validation
  const validate = () => {
    const errs = {};
    DATE_FIELDS.forEach((key) => {
      const val = formData[key];
      if (val && val.trim() !== "") {
        if (isNaN(Date.parse(val))) {
          errs[key] = "Invalid date";
        }
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getNextJobNo = () => {
    if (rows.length === 0) return "DGFT/1";
    let maxNum = 0;
    rows.forEach((r) => {
      const match = (r.job_no || "").match(/\/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `DGFT/${maxNum + 1}`;
  };

  const handleOpenAdd = () => {
    setFormData({ ...INITIAL_FORM, job_no: getNextJobNo() });
    setEditingId(null);
    setErrors({});
    setCategoryInput("");
    setDialogOpen(true);
  };

  const handleAddCustomCategory = () => {
    if (categoryInput.trim() && !availableCategories.includes(categoryInput.trim())) {
      setAvailableCategories([...availableCategories, categoryInput.trim()]);
      showToast("Category added to list", "success");
      setCategoryInput("");
    }
  };

  const handleOpenEdit = (row) => {
    setEditingId(row._id);
    const data = {};
    FIELDS.forEach((f) => {
      let val = row[f.key] || "";
      if (DATE_FIELDS.has(f.key) && val) {
        val = toNativeDate(val);
      }
      data[f.key] = val;
    });
    setFormData(data);
    setErrors({});
    setCategoryInput("");
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_STRING}/delete-dgft-register/${id}`
      );
      showToast("Record deleted", "success");
      getData();
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will permanently delete ALL records in this tab.")) return;
    if (!window.confirm("Final confirmation: This action cannot be undone. Delete all?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-all-dgft-registers`);
      showToast("All records deleted", "success");
      getData();
    } catch (err) { console.error(err); showToast("Bulk delete failed", "error"); }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (editingId) {
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/update-dgft-register/${editingId}`,
          formData
        );
        showToast("Record updated", "success");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/add-dgft-register`,
          formData
        );
        showToast("Record added", "success");
      }
      setDialogOpen(false);
      getData();
    } catch (err) {
      console.error(err);
      showToast("Operation failed", "error");
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/upload-dgft-register-excel`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      showToast(res.data.message, "success");
      getData();
    } catch (err) {
      console.error(err);
      showToast("Excel upload failed", "error");
    }
    e.target.value = "";
  };

  const handleDownloadExcel = () => {
    try {
      const dataToExport = (filtered && filtered.length > 0 ? filtered : rows).map((r, idx) => ({
        "Sr No": idx + 1,
        "Job Number": String(r.job_no || "").includes("/") ? r.job_no : `DGFT/${r.job_no || ""}`,
        "Job Status": r.job_status || "",
        "Date": r.date || "",
        "Firm Name": r.party_name || "",
        "IEC No": r.iec_no || "",
        "Authorization No": r.licence_no || "",
        "Auth Date": r.licence_date || "",
        "Scheme": r.scheme || r.category || "",
        "File Number": r.file_no || r.file_no_key_no || "",
        "File Date": r.file_date || "",
        "Port of Registration": r.port_of_registration || "",
        "EFT Amount": r.eft_amount || "",
        "Payment Status": r.payment_status || "",
        "Payment Requested By": r.payment_requested_by || "",
        "Payment Requested At": r.payment_requested_at ? new Date(r.payment_requested_at).toLocaleDateString("en-IN") : "",
        "Payment Approved By": r.payment_approved_by || "",
        "Payment Approved At": r.payment_approved_at ? new Date(r.payment_approved_at).toLocaleDateString("en-IN") : "",
        "Payment Document Link": r.payment_document || "",
        "Transaction ID": r.transaction_id || "",
        "Transaction Amount": r.transaction_amount || "",
        "Transaction Date": r.transaction_date || "",
        "Accounts Inv No": r.accounts_inv_no || "",
        "Accounts Inv Date": r.accounts_inv_date || "",
        "Docs Recvd Date": r.docs_received_date || "",
        "Submitted at DGFT": r.submitted_at_dgft_on || r.online_submission_date || "",
        "Docs to A/c Dept": r.documents_send_to_accounts_date || r.docs_handed_over_to_ac || "",
        "Remarks": r.remarks || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DGFT Register");
      const filename = `DGFT_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);
      showToast(`Exported ${dataToExport.length} records to ${filename}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to export Excel file", "error");
    }
  };

  const handleDownloadDocument = async (e, url, fileName) => {
    e.stopPropagation();
    if (!url) return;
    try {
      showToast("Starting download...", "info");
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "Payment_Document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast("Download completed", "success");
    } catch (error) {
      console.error("Download error:", error);
      window.open(url, "_blank");
    }
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-dgft-register/${id}`,
        { job_status: newStatus }
      );
      setRows((prev) =>
        prev.map((r) => (r._id === id ? { ...r, job_status: newStatus } : r))
      );
      showToast("Status updated", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update status", "error");
    }
  };

  const handleInvoiceNoChange = async (id, newInvoiceNo) => {
    try {
      const currentRow = rows.find((r) => r._id === id);
      const existingVal = currentRow?.accounts_inv_no || currentRow?.matter_closed_inv_no || "";
      if (existingVal === newInvoiceNo.trim()) return;

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-dgft-register/${id}`,
        { accounts_inv_no: newInvoiceNo.trim() }
      );
      setRows((prev) =>
        prev.map((r) => (r._id === id ? { ...r, accounts_inv_no: newInvoiceNo.trim() } : r))
      );
      showToast("Billing Invoice No. updated", "success");
    } catch (err) {
      console.error("Failed to update billing invoice no:", err);
      showToast(err.response?.data?.message || "Failed to update invoice no", "error");
    }
  };

  const handleOpenApproveModal = (row) => {
    setSelectedApproveRow(row);
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedApproveRow) return;
    try {
      await axios.put(`${process.env.REACT_APP_API_STRING}/dgft-approve-payment/${selectedApproveRow._id}`, {
        approved_by: user?.username || user?.first_name || "Admin",
      });
      const raw = selectedApproveRow.job_no || "";
      const displayJobNo = String(raw).includes("/") ? raw : `DGFT/${raw}`;
      showToast(`Payment approved for ${displayJobNo}. Moved to PAYMENT APPROVED.`, "success");
      setApproveModalOpen(false);
      setSelectedApproveRow(null);
      getData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to approve payment", "error");
    }
  };

  const handleOpenRejectModal = (row) => {
    setSelectedRejectRow(row);
    setRejectModalReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRejectRow) return;
    try {
      await axios.put(`${process.env.REACT_APP_API_STRING}/dgft-reject-payment/${selectedRejectRow._id}`, {
        reason: rejectModalReason,
        rejected_by: user?.username || user?.first_name || "Admin",
      });
      const raw = selectedRejectRow.job_no || "";
      const displayJobNo = String(raw).includes("/") ? raw : `DGFT/${raw}`;
      showToast(`Payment rejected for ${displayJobNo}. Moved to DEFICIENT.`, "success");
      setRejectModalOpen(false);
      setSelectedRejectRow(null);
      getData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to reject payment", "error");
    }
  };

  const showToast = (message, severity) => {
    setToast({ open: true, message, severity });
  };

  // Filter rows by search + category + status
  const { filtered, grouped } = useMemo(() => {
    let result = rows.filter((row) => {
      // Category filter
      const rowScheme = row.scheme || row.category || "";
      if (categoryFilter && !rowScheme.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      // Status filter
      if (statusFilter) {
        const filterNormalized = statusFilter.trim().toUpperCase();
        const rowJobStatus = (row.job_status || "").trim().toUpperCase();

        if (filterNormalized === "PAYMENT REQUESTED") {
          const isPR = rowJobStatus === "PAYMENT REQUESTED";
          if (!isPR) return false;
        } else if (filterNormalized === "APPROVED PAYMENTS" || filterNormalized === "PAYMENT APPROVED") {
          const isPaymentApproved = rowJobStatus === "PAYMENT APPROVED" || rowJobStatus === "APPROVED PAYMENTS" || rowJobStatus === "APPROVED PAYMENT";
          if (!isPaymentApproved) return false;
        } else if (filterNormalized === "IN PROCESS") {
          if (rowJobStatus !== "IN PROCESS") return false;
        } else if (rowJobStatus !== filterNormalized) {
          return false;
        }
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(row.job_no || "").toLowerCase().includes(q) &&
          !(row.party_name || "").toLowerCase().includes(q) &&
          !(row.category || "").toLowerCase().includes(q) &&
          !(row.scheme || "").toLowerCase().includes(q) &&
          !(row.licence_no || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    if (sort.key) {
      result = [...result].sort((a, b) => {
        const va = String(a[sort.key] || "").toLowerCase();
        const vb = String(b[sort.key] || "").toLowerCase();
        return sort.dir === "asc"
          ? va.localeCompare(vb, undefined, { numeric: true })
          : vb.localeCompare(va, undefined, { numeric: true });
      });
    }

    return { filtered: result, grouped: null };
  }, [rows, search, categoryFilter, statusFilter, sort]);

  // Compute count of records in each stage
  const statusCounts = useMemo(() => {
    const counts = { "": 0, "Approved payments": 0 };
    JOB_STATUS_OPTIONS.forEach((st) => {
      counts[st] = 0;
    });

    rows.forEach((row) => {
      if (categoryFilter && String(row.category || row.scheme || "").trim().toLowerCase() !== String(categoryFilter).trim().toLowerCase()) return;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(row.job_no     || "").toLowerCase().includes(q) &&
          !(row.party_name || "").toLowerCase().includes(q) &&
          !(row.category   || "").toLowerCase().includes(q) &&
          !(row.scheme     || "").toLowerCase().includes(q) &&
          !(row.licence_no || "").toLowerCase().includes(q)
        ) return;
      }
      counts[""] += 1;

      const st = (row.job_status || "").trim().toUpperCase();

      if (st === "PAYMENT APPROVED" || st === "APPROVED PAYMENTS" || st === "APPROVED PAYMENT") {
        counts["Approved payments"] += 1;
        counts["PAYMENT APPROVED"] = (counts["PAYMENT APPROVED"] || 0) + 1;
      } else if (st && counts[st] !== undefined) {
        counts[st] += 1;
      }
    });

    return counts;
  }, [rows, search, categoryFilter]);

  // Count of pending payment requests
  const pendingPaymentCount = useMemo(() => {
    return paymentRequests.filter(r => r.payment_status === "Payment Requested").length;
  }, [paymentRequests]);

  // For pagination with grouping
  const renderRows = useMemo(() => {
    if (grouped) {
      // Flatten grouped data for display (with group headers)
      const flattened = [];
      Object.entries(grouped).forEach(([groupName, groupRows]) => {
        groupRows.forEach((row, idx) => {
          flattened.push({ ...row, _groupName: idx === 0 ? groupName : null });
        });
      });
      return flattened;
    }
    return filtered;
  }, [grouped, filtered]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, categoryFilter, statusFilter, sort]);

  // Pagination
  const totalPages = Math.ceil(renderRows.length / rowsPerPage) || 1;
  const paginatedRows = renderRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Use flat columns with dynamic width for actions column and BILLING INVOICE NO column
  const flatCols = useMemo(() => {
    let cols = [...COLUMNS];
    if (statusFilter === "BILLING") {
      const jobStatusIdx = cols.findIndex((c) => c.key === "job_status");
      const invCol = { key: "accounts_inv_no", label: "BILLING INVOICE NO", width: 170 };
      if (jobStatusIdx !== -1) {
        cols.splice(jobStatusIdx, 0, invCol);
      } else {
        cols.push(invCol);
      }
    }
    return cols.map((col) => {
      if (col.key === "_actions") {
        return { ...col, width: statusFilter === "PAYMENT REQUESTED" ? 210 : 100 };
      }
      return col;
    });
  }, [statusFilter]);

  return (
    <div>
      {/* ── Stage Metric Cards ── */}
      <div className="ar-stage-cards">
        <div
          className={`ar-stage-card ${statusFilter === "" ? "active" : ""}`}
          onClick={() => updateStatusFilter("")}
        >
          <div className="ar-stage-name">All Statuses</div>
          <div className="ar-stage-count">{statusCounts[""] || 0}</div>
        </div>

        {/* OPEN */}
        <div
          className={`ar-stage-card ${statusFilter === "OPEN" ? "active" : ""}`}
          onClick={() => updateStatusFilter(statusFilter === "OPEN" ? "" : "OPEN")}
        >
          <div className="ar-stage-name">OPEN</div>
          <div className="ar-stage-count">{statusCounts["OPEN"] || 0}</div>
        </div>

        {/* IN PROCESS */}
        <div
          className={`ar-stage-card ${statusFilter === "IN PROCESS" ? "active" : ""}`}
          onClick={() => updateStatusFilter(statusFilter === "IN PROCESS" ? "" : "IN PROCESS")}
        >
          <div className="ar-stage-name">IN PROCESS</div>
          <div className="ar-stage-count">{statusCounts["IN PROCESS"] || 0}</div>
        </div>

        {/* PAYMENT REQUESTED */}
        <div
          className={`ar-stage-card ${statusFilter === "PAYMENT REQUESTED" ? "active" : ""}`}
          onClick={() => updateStatusFilter(statusFilter === "PAYMENT REQUESTED" ? "" : "PAYMENT REQUESTED")}
        >
          <div className="ar-stage-name">PAYMENT REQUESTED</div>
          <div className="ar-stage-count">{statusCounts["PAYMENT REQUESTED"] || 0}</div>
        </div>

        {/* APPROVED PAYMENTS */}
        <div
          className={`ar-stage-card ${statusFilter === "Approved payments" ? "active" : ""}`}
          onClick={() => updateStatusFilter(statusFilter === "Approved payments" ? "" : "Approved payments")}
        >
          <div className="ar-stage-name">Approved payments</div>
          <div className="ar-stage-count" style={{ color: "#16a34a" }}>{statusCounts["Approved payments"] || 0}</div>
        </div>

        {/* DEFICIENT */}
        <div
          className={`ar-stage-card ${statusFilter === "DEFICIENT" ? "active" : ""}`}
          onClick={() => updateStatusFilter(statusFilter === "DEFICIENT" ? "" : "DEFICIENT")}
        >
          <div className="ar-stage-name">DEFICIENT</div>
          <div className="ar-stage-count">{statusCounts["DEFICIENT"] || 0}</div>
        </div>

        {/* APPROVED */}
        <div
          className={`ar-stage-card ${statusFilter === "APPROVED" ? "active" : ""}`}
          onClick={() => updateStatusFilter(statusFilter === "APPROVED" ? "" : "APPROVED")}
        >
          <div className="ar-stage-name">APPROVED</div>
          <div className="ar-stage-count">{statusCounts["APPROVED"] || 0}</div>
        </div>

        {/* REJECTED */}
        <div
          className={`ar-stage-card ${statusFilter === "REJECTED" ? "active" : ""}`}
          onClick={() => updateStatusFilter(statusFilter === "REJECTED" ? "" : "REJECTED")}
        >
          <div className="ar-stage-name">REJECTED</div>
          <div className="ar-stage-count">{statusCounts["REJECTED"] || 0}</div>
        </div>

        {/* BILLING */}
        <div
          className={`ar-stage-card ${statusFilter === "BILLING" ? "active" : ""}`}
          onClick={() => updateStatusFilter(statusFilter === "BILLING" ? "" : "BILLING")}
        >
          <div className="ar-stage-name">BILLING</div>
          <div className="ar-stage-count">{statusCounts["BILLING"] || 0}</div>
        </div>

        {/* CLOSED */}
        <div
          className={`ar-stage-card ${statusFilter === "CLOSED" ? "active" : ""}`}
          onClick={() => updateStatusFilter(statusFilter === "CLOSED" ? "" : "CLOSED")}
        >
          <div className="ar-stage-name">CLOSED</div>
          <div className="ar-stage-count">{statusCounts["CLOSED"] || 0}</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="ar-toolbar">
        <div className="ar-toolbar-left">
          <div className="ar-search-wrap">
            <input
              type="text"
              placeholder="Search Job No, Party..."
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
            />
          </div>
          <select
            className="ar-filter-select"
            value={categoryFilter}
            onChange={(e) => updateCategoryFilter(e.target.value)}
          >
            <option value="">All Schemes</option>
            {availableCategories.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <select
            className="ar-filter-select"
            value={statusFilter}
            onChange={(e) => updateStatusFilter(e.target.value)}
          >
            <option value="">All Statuses ({statusCounts[""] || 0})</option>
            <option value="OPEN">OPEN ({statusCounts["OPEN"] || 0})</option>
            <option value="IN PROCESS">IN PROCESS ({statusCounts["IN PROCESS"] || 0})</option>
            <option value="PAYMENT REQUESTED">PAYMENT REQUESTED ({statusCounts["PAYMENT REQUESTED"] || 0})</option>
            <option value="Approved payments">Approved payments ({statusCounts["Approved payments"] || 0})</option>
            <option value="DEFICIENT">DEFICIENT ({statusCounts["DEFICIENT"] || 0})</option>
            <option value="APPROVED">APPROVED ({statusCounts["APPROVED"] || 0})</option>
            <option value="REJECTED">REJECTED ({statusCounts["REJECTED"] || 0})</option>
            <option value="BILLING">BILLING ({statusCounts["BILLING"] || 0})</option>
            <option value="CLOSED">CLOSED ({statusCounts["CLOSED"] || 0})</option>
          </select>
        </div>
        <div className="ar-toolbar-right">
          <button className="ar-btn ar-btn-primary" onClick={handleOpenAdd}>
            + Add New
          </button>
          <button
            type="button"
            className="ar-btn ar-btn-upload"
            onClick={handleDownloadExcel}
            title="Download/Export Excel report of DGFT Register"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <span>⬇</span> Export Excel
          </button>
          <label className="ar-btn ar-btn-upload">
            ↑ Upload Excel
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              style={{ display: "none" }}
            />
          </label>
          <button className="ar-btn ar-btn-danger" onClick={handleDeleteAll}>
            🗑 Delete All
          </button>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="ar-table-outer">
        <div 
          ref={containerRef}
          className="ar-table-scroll"
          onMouseDown={(e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "BUTTON") return;
            const el = containerRef.current;
            el.dataset.isDown = "true";
            el.dataset.startX = e.pageX - el.offsetLeft;
            el.dataset.scrollLeft = el.scrollLeft;
            el.dataset.dragged = "false";
          }}
          onMouseLeave={() => {
            const el = containerRef.current;
            el.dataset.isDown = "false";
          }}
          onMouseUp={() => {
            const el = containerRef.current;
            el.dataset.isDown = "false";
          }}
          onMouseMove={(e) => {
            const el = containerRef.current;
            if (el.dataset.isDown !== "true") return;
            const x = e.pageX - el.offsetLeft;
            const walk = (x - Number(el.dataset.startX)) * 2;
            if (Math.abs(walk) > 5) {
              el.dataset.dragged = "true";
              e.preventDefault();
              el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
            }
          }}
        >
          <table className="ar-table">
            <thead>
              <tr>
                {flatCols.map((col) => {
                  const sorted = sort.key === col.key;
                  if (col.key === "_actions") {
                    return (
                      <th
                        key="_actions"
                        className="ar-th-sticky ar-th-actions"
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                      >
                        ACTIONS
                      </th>
                    );
                  }
                  return (
                    <th
                      key={col.key}
                      className={sorted ? "ar-th-sorted" : undefined}
                      style={{ width: col.width, minWidth: col.width }}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label} <SortIcon dir={sorted ? sort.dir : null} />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr className="dgft-empty-row">
                  <td colSpan={flatCols.length}>
                    <div className="ar-empty-state">No records found</div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const showRowApproveReject = statusFilter === "PAYMENT REQUESTED" && (row.payment_status === "Payment Requested" || (row.job_status || "").toUpperCase() === "PAYMENT REQUESTED");
                  if (row._groupName) {
                    return (
                      <React.Fragment key={`group-${row._groupName}`}>
                        <tr className="dgft-group-header">
                          <td colSpan={flatCols.length} style={{ fontWeight: "bold", background: "#f0f4f8", padding: "8px", borderBottom: "2px solid #d1d5db" }}>
                            {row._groupName}
                          </td>
                        </tr>
                        <tr key={row._id} className="ar-data-row">
                          {flatCols.map((col) => {
                            if (col.key === "_actions") {
                              return (
                                <td
                                  key="_actions"
                                  className="ar-td-sticky ar-td-actions"
                                  style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="ar-actions-cell" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                    {showRowApproveReject && (
                                      <>
                                        <button
                                          className="ar-btn ar-btn-sm"
                                          style={{ background: "#16a34a", color: "#fff", border: "none", padding: "3px 7px", fontSize: "11px", fontWeight: "600", borderRadius: "3px", whiteSpace: "nowrap", cursor: "pointer" }}
                                          onClick={(e) => { e.stopPropagation(); handleOpenApproveModal(row); }}
                                          title="Approve Payment"
                                        >
                                          ✓ Approve
                                        </button>
                                        <button
                                          className="ar-btn ar-btn-sm"
                                          style={{ background: "#dc2626", color: "#fff", border: "none", padding: "3px 7px", fontSize: "11px", fontWeight: "600", borderRadius: "3px", whiteSpace: "nowrap", cursor: "pointer" }}
                                          onClick={(e) => { e.stopPropagation(); handleOpenRejectModal(row); }}
                                          title="Reject Payment"
                                        >
                                          ✕ Reject
                                        </button>
                                      </>
                                    )}
                                    <button
                                      className="ar-btn ar-btn-edit ar-btn-sm"
                                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }}
                                      style={{ whiteSpace: "nowrap" }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="ar-btn ar-btn-danger ar-btn-sm"
                                      onClick={(e) => { e.stopPropagation(); handleDelete(row._id); }}
                                      style={{ whiteSpace: "nowrap" }}
                                    >
                                      Del
                                    </button>
                                  </div>
                                </td>
                              );
                            }
                            if (col.key === "job_no") {
                              const raw = row.job_no || "";
                              const displayJobNo = String(raw).includes("/") ? raw : `DGFT/${raw}`;
                              return (
                                <td key={col.key} onClick={() => navigate(`/dgft/register-details/${row._id}`)}>
                                  <span className="ar-job-link">{displayJobNo}</span>
                                  {row.payment_document && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDownloadDocument(e, row.payment_document, row.payment_document_name)}
                                      title={`Download Document: ${row.payment_document_name || "Payment Document"}`}
                                      style={{
                                        marginLeft: "6px",
                                        padding: "1px 5px",
                                        fontSize: "10px",
                                        borderRadius: "4px",
                                        border: "1px solid #bbf7d0",
                                        background: "#f0fdf4",
                                        color: "#16a34a",
                                        cursor: "pointer",
                                        fontWeight: "600",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "2px"
                                      }}
                                    >
                                      <span>📎</span> Doc
                                    </button>
                                  )}
                                </td>
                              );
                            }
                            if (col.key === "accounts_inv_no") {
                              return (
                                <td key={col.key} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    defaultValue={row.accounts_inv_no || row.matter_closed_inv_no || ""}
                                    placeholder="Enter Invoice No"
                                    onBlur={(e) => handleInvoiceNoChange(row._id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.target.blur();
                                      }
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: "3px",
                                      border: "1px solid #d0d7e2",
                                      width: "100%",
                                      fontSize: "11px",
                                      outline: "none",
                                      background: "#fff",
                                      color: "#111827",
                                      fontWeight: "500",
                                    }}
                                  />
                                </td>
                              );
                            }
                            if (col.key === "job_status") {
                              return (
                                <td key={col.key} onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={row.job_status || ""}
                                    onChange={(e) => handleStatusChange(row._id, e.target.value)}
                                    style={{ padding: "4px 8px", borderRadius: "3px", border: "1px solid #d0d7e2", width: "100%", fontSize: "11px", outline: "none", background: "#fff" }}
                                  >
                                    <option value="">-- Select --</option>
                                    {JOB_STATUS_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              );
                            }
                            if (col.key === "scheme") {
                              return <td key={col.key}>{row.scheme || row.category || ""}</td>;
                            }
                            if (col.key === "file_no") {
                              return <td key={col.key}>{row.file_no || row.file_no_key_no || ""}</td>;
                            }
                            if (DATE_FIELDS.has(col.key)) {
                              return <td key={col.key}>{formatDateToDdMmYyyy(row[col.key])}</td>;
                            }
                            return <td key={col.key}>{row[col.key] || ""}</td>;
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  }

                  return (
                    <tr key={row._id} className="ar-data-row">
                      {flatCols.map((col) => {
                        if (col.key === "_actions") {
                          return (
                            <td
                              key="_actions"
                              className="ar-td-sticky ar-td-actions"
                              style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="ar-actions-cell" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                {showRowApproveReject && (
                                  <>
                                    <button
                                      className="ar-btn ar-btn-sm"
                                      style={{ background: "#16a34a", color: "#fff", border: "none", padding: "3px 7px", fontSize: "11px", fontWeight: "600", borderRadius: "3px", whiteSpace: "nowrap", cursor: "pointer" }}
                                      onClick={(e) => { e.stopPropagation(); handleOpenApproveModal(row); }}
                                      title="Approve Payment"
                                    >
                                      ✓ Approve
                                    </button>
                                    <button
                                      className="ar-btn ar-btn-sm"
                                      style={{ background: "#dc2626", color: "#fff", border: "none", padding: "3px 7px", fontSize: "11px", fontWeight: "600", borderRadius: "3px", whiteSpace: "nowrap", cursor: "pointer" }}
                                      onClick={(e) => { e.stopPropagation(); handleOpenRejectModal(row); }}
                                      title="Reject Payment"
                                    >
                                      ✕ Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  className="ar-btn ar-btn-edit ar-btn-sm"
                                  onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }}
                                  style={{ whiteSpace: "nowrap" }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="ar-btn ar-btn-danger ar-btn-sm"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(row._id); }}
                                  style={{ whiteSpace: "nowrap" }}
                                >
                                  Del
                                </button>
                              </div>
                            </td>
                          );
                        }
                        if (col.key === "job_no") {
                          const raw = row.job_no || "";
                          const displayJobNo = String(raw).includes("/") ? raw : `DGFT/${raw}`;
                          return (
                            <td key={col.key} onClick={() => navigate(`/dgft/register-details/${row._id}`)}>
                              <span className="ar-job-link">{displayJobNo}</span>
                              {row.payment_document && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadDocument(e, row.payment_document, row.payment_document_name)}
                                  title={`Download Document: ${row.payment_document_name || "Payment Document"}`}
                                  style={{
                                    marginLeft: "6px",
                                    padding: "1px 5px",
                                    fontSize: "10px",
                                    borderRadius: "4px",
                                    border: "1px solid #bbf7d0",
                                    background: "#f0fdf4",
                                    color: "#16a34a",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "2px"
                                  }}
                                >
                                  <span>📎</span> Doc
                                </button>
                              )}
                            </td>
                          );
                        }
                        if (col.key === "accounts_inv_no") {
                          return (
                            <td key={col.key} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                defaultValue={row.accounts_inv_no || row.matter_closed_inv_no || ""}
                                placeholder="Enter Invoice No"
                                onBlur={(e) => handleInvoiceNoChange(row._id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.target.blur();
                                  }
                                }}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "3px",
                                  border: "1px solid #d0d7e2",
                                  width: "100%",
                                  fontSize: "11px",
                                  outline: "none",
                                  background: "#fff",
                                  color: "#111827",
                                  fontWeight: "500",
                                }}
                              />
                            </td>
                          );
                        }
                        if (col.key === "job_status") {
                          return (
                            <td key={col.key} onClick={(e) => e.stopPropagation()}>
                              <select
                                value={row.job_status || ""}
                                onChange={(e) => handleStatusChange(row._id, e.target.value)}
                                style={{ padding: "4px 8px", borderRadius: "3px", border: "1px solid #d0d7e2", width: "100%", fontSize: "11px", outline: "none", background: "#fff" }}
                              >
                                <option value="">-- Select --</option>
                                {JOB_STATUS_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }
                        if (col.key === "scheme") {
                          return <td key={col.key}>{row.scheme || row.category || ""}</td>;
                        }
                        if (col.key === "file_no") {
                          return <td key={col.key}>{row.file_no || row.file_no_key_no || ""}</td>;
                        }
                        if (DATE_FIELDS.has(col.key)) {
                          return <td key={col.key}>{formatDateToDdMmYyyy(row[col.key])}</td>;
                        }
                        return <td key={col.key}>{row[col.key] || ""}</td>;
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination inside table card */}
        <div className="ar-pagination">
          <div className="ar-pagination-info">
            Showing {filtered.length === 0 ? 0 : page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filtered.length)} of {filtered.length} records
          </div>
          <div className="ar-pagination-controls">
            <span style={{ color: "#000000ff" }}>Rows:</span>
            <select className="ar-rows-select" value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}>
              {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="ar-page-btn" onClick={() => setPage((p) => Math.max(0, p - 1))}           disabled={page === 0}              >‹ Prev</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button className="ar-page-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next ›</button>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog (MUI Dialog allowed) */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          {editingId ? "Edit Record" : "Add New Record"}
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <div className="dgft-form-grid">
            {FIELDS.map((field) => {
              // Handle category field with custom category input
              if (field.key === "category") {
                return (
                  <div className="dgft-form-group" key={field.key}>
                    <label>{field.label}</label>
                    <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                      <select
                        value={formData[field.key]}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                      >
                        <option value="">-- Select Category --</option>
                        {availableCategories.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <input
                          type="text"
                          placeholder="Add custom category..."
                          value={categoryInput}
                          onChange={(e) => setCategoryInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddCustomCategory()}
                          style={{ height: "30px", padding: "0 8px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "3px", outline: "none", flex: 1, minWidth: "150px" }}
                        />
                        <button
                          onClick={handleAddCustomCategory}
                          style={{
                            padding: "4px 10px",
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {errors[field.key] && (
                      <span className="field-error">{errors[field.key]}</span>
                    )}
                  </div>
                );
              }

              // Skip rendering sr_no since it's auto-generated
              if (field.key === "sr_no") return null;

              // Handle read-only job_no
              if (field.readOnly) {
                return (
                  <div className="dgft-form-group" key={field.key}>
                    <label>{field.label}</label>
                    <input
                      type="text"
                      value={formData[field.key]}
                      readOnly
                      style={{ height: "30px", padding: "0 8px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "3px", outline: "none", background: "#f3f4f6", color: "#666" }}
                    />
                  </div>
                );
              }

              return (
                <div className="dgft-form-group" key={field.key}>
                  <label>{field.label}</label>
                  {field.select ? (
                    <select
                      value={formData[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "date" ? "date" : "text"}
                      value={formData[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className={errors[field.key] ? "input-error" : ""}
                    />
                  )}
                  {errors[field.key] && (
                    <span className="field-error">{errors[field.key]}</span>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", padding: "14px 20px", borderTop: "1px solid #e5e7eb" }}>
          <button className="ar-btn ar-btn-secondary" onClick={() => setDialogOpen(false)}>Cancel</button>
          <button className="ar-btn ar-btn-primary" onClick={handleSubmit}>{editingId ? "Update" : "Add"}</button>
        </div>
      </Dialog>

      {/* Payment Approval Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: "700", fontSize: "17px", color: "#0f172a" }}>💳 Payment Approvals</span>
            {pendingPaymentCount > 0 && (
              <span style={{ fontSize: "11px", fontWeight: "700", background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d", padding: "2px 8px", borderRadius: "12px" }}>
                {pendingPaymentCount} Pending
              </span>
            )}
          </div>
          <IconButton onClick={() => setPaymentDialogOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {/* Subheader Toolbar with Filter Tabs and Search */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            {/* Status Filter Tabs */}
            <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "3px", borderRadius: "6px" }}>
              {[
                { key: "PENDING", label: "Pending", count: paymentRequests.filter(r => r.payment_status === "Payment Requested").length },
                { key: "APPROVED", label: "Approved", count: paymentRequests.filter(r => r.payment_status === "Payment Approved").length },
                { key: "REJECTED", label: "Rejected", count: paymentRequests.filter(r => r.payment_status === "Payment Rejected").length },
                { key: "ALL", label: "All", count: paymentRequests.length },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setPaymentStatusTab(t.key)}
                  style={{
                    padding: "5px 12px",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: paymentStatusTab === t.key ? "700" : "500",
                    background: paymentStatusTab === t.key ? "#ffffff" : "transparent",
                    color: paymentStatusTab === t.key ? "#2563eb" : "#64748b",
                    boxShadow: paymentStatusTab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {t.label}
                  <span style={{
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "1px 5px",
                    borderRadius: "8px",
                    background: paymentStatusTab === t.key ? "#eff6ff" : "#e2e8f0",
                    color: paymentStatusTab === t.key ? "#2563eb" : "#64748b",
                  }}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div style={{ minWidth: "220px" }}>
              <input
                type="text"
                placeholder="Search Job No, Firm, Scheme..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                style={{
                  width: "100%",
                  height: "32px",
                  padding: "0 10px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  outline: "none",
                  background: "#fff",
                }}
              />
            </div>
          </div>

          {/* Table */}
          {paymentRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
              No payment requests found in DGFT register.
            </div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: "700", color: "#475569" }}>Job No</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: "700", color: "#475569" }}>Firm Name</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: "700", color: "#475569" }}>Scheme</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: "700", color: "#475569" }}>EFT Amount</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: "700", color: "#475569" }}>Status</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: "700", color: "#475569" }}>Requested By</th>
                    <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: "700", color: "#475569" }}>Requested At</th>
                    <th style={{ padding: "9px 12px", textAlign: "center", fontWeight: "700", color: "#475569" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRequests
                    .filter((req) => {
                      if (paymentStatusTab === "PENDING" && req.payment_status !== "Payment Requested") return false;
                      if (paymentStatusTab === "APPROVED" && req.payment_status !== "Payment Approved") return false;
                      if (paymentStatusTab === "REJECTED" && req.payment_status !== "Payment Rejected") return false;

                      if (paymentSearch.trim()) {
                        const q = paymentSearch.toLowerCase();
                        if (
                          !(req.job_no || "").toLowerCase().includes(q) &&
                          !(req.party_name || "").toLowerCase().includes(q) &&
                          !(req.scheme || req.category || "").toLowerCase().includes(q) &&
                          !(req.file_no || "").toLowerCase().includes(q) &&
                          !(req.licence_no || "").toLowerCase().includes(q) &&
                          !(req.payment_requested_by || "").toLowerCase().includes(q)
                        ) {
                          return false;
                        }
                      }
                      return true;
                    })
                    .map((req) => {
                      const jobNo = req.job_no
                        ? (String(req.job_no).includes("/") ? req.job_no : `DGFT/${req.job_no}`)
                        : "";
                      const statusStyle =
                        req.payment_status === "Payment Requested"
                          ? { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }
                          : req.payment_status === "Payment Approved"
                          ? { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }
                          : req.payment_status === "Payment Rejected"
                          ? { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }
                          : { background: "#f3f4f6", color: "#4b5563", border: "1px solid #d1d5db" };
                      const reqAt = req.payment_requested_at
                        ? new Date(req.payment_requested_at).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—";
                      return (
                        <tr key={req._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "9px 12px" }}>
                            <span
                              onClick={() => handleOpenDetailView(req)}
                              style={{ fontWeight: "700", color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}
                              title="Click to view full record details"
                            >
                              {jobNo}
                            </span>
                          </td>
                          <td style={{ padding: "9px 12px", fontWeight: "500" }}>{req.party_name || "—"}</td>
                          <td style={{ padding: "9px 12px" }}>{req.scheme || req.category || "—"}</td>
                          <td style={{ padding: "9px 12px", fontWeight: "700", color: "#0f172a" }}>
                            {req.eft_amount ? `₹${req.eft_amount}` : "—"}
                          </td>
                          <td style={{ padding: "9px 12px" }}>
                            <span style={{ ...statusStyle, padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>
                              {req.payment_status || "—"}
                            </span>
                            {req.payment_status === "Payment Rejected" && req.payment_rejection_reason && (
                              <div style={{ fontSize: "10px", color: "#991b1b", marginTop: "3px", maxWidth: "160px" }} title={req.payment_rejection_reason}>
                                Reason: {req.payment_rejection_reason}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "9px 12px" }}>{req.payment_requested_by || "—"}</td>
                          <td style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b" }}>{reqAt}</td>
                          <td style={{ padding: "9px 12px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                              {/* 👁 View All Details Button */}
                              <button
                                onClick={() => handleOpenDetailView(req)}
                                style={{
                                  padding: "4px 10px",
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                                title="View all details of this DGFT record"
                              >
                                👁 Details
                              </button>

                              {req.payment_status === "Payment Requested" ? (
                                <>
                                  <button
                                    onClick={() => handleApprovePayment(req._id)}
                                    style={{
                                      padding: "4px 10px",
                                      background: "#059669",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      cursor: "pointer",
                                    }}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={() => handleOpenRejectDialog(req._id)}
                                    style={{
                                      padding: "4px 10px",
                                      background: "#dc2626",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      cursor: "pointer",
                                    }}
                                  >
                                    ✕ Reject
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>
                                  {req.payment_status === "Payment Approved" ? "Approved" : "Rejected"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setPaymentDialogOpen(false)} variant="outlined" size="small">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Comprehensive DGFT Record Details Modal ── */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>
              DGFT Details — {selectedDetailRecord?.job_no ? (String(selectedDetailRecord.job_no).includes("/") ? selectedDetailRecord.job_no : `DGFT/${selectedDetailRecord.job_no}`) : "—"}
            </span>
            {selectedDetailRecord?.payment_status && (
              <span style={{
                fontSize: "11px",
                fontWeight: "700",
                padding: "2px 10px",
                borderRadius: "12px",
                ...(selectedDetailRecord.payment_status === "Payment Requested"
                  ? { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }
                  : selectedDetailRecord.payment_status === "Payment Approved"
                  ? { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }
                  : { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }),
              }}>
                {selectedDetailRecord.payment_status}
              </span>
            )}
          </div>
          <IconButton onClick={() => setDetailDialogOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          {selectedDetailRecord && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "12px" }}>
              {/* Payment & Approval Info Banner */}
              <div style={{
                background: selectedDetailRecord.payment_status === "Payment Approved" ? "#f0fdf4" : selectedDetailRecord.payment_status === "Payment Rejected" ? "#fef2f2" : "#fffbeb",
                border: `1px solid ${selectedDetailRecord.payment_status === "Payment Approved" ? "#bbf7d0" : selectedDetailRecord.payment_status === "Payment Rejected" ? "#fecaca" : "#fde68a"}`,
                borderRadius: "6px",
                padding: "12px 16px",
              }}>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginBottom: "8px" }}>
                  Payment Approval Information
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                  <div>
                    <span style={{ color: "#64748b" }}>EFT Amount: </span>
                    <strong style={{ fontSize: "14px", color: "#0f172a" }}>₹{selectedDetailRecord.eft_amount || "0"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Payment Status: </span>
                    <strong>{selectedDetailRecord.payment_status || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Requested By: </span>
                    <strong>{selectedDetailRecord.payment_requested_by || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Requested On: </span>
                    <strong>{selectedDetailRecord.payment_requested_at ? new Date(selectedDetailRecord.payment_requested_at).toLocaleDateString("en-IN") : "—"}</strong>
                  </div>
                  {selectedDetailRecord.payment_approved_by && (
                    <div>
                      <span style={{ color: "#64748b" }}>Actioned By: </span>
                      <strong>{selectedDetailRecord.payment_approved_by}</strong>
                    </div>
                  )}
                  {selectedDetailRecord.payment_approved_at && (
                    <div>
                      <span style={{ color: "#64748b" }}>Actioned On: </span>
                      <strong>{new Date(selectedDetailRecord.payment_approved_at).toLocaleDateString("en-IN")}</strong>
                    </div>
                  )}
                </div>
                {selectedDetailRecord.payment_status === "Payment Rejected" && selectedDetailRecord.payment_rejection_reason && (
                  <div style={{ marginTop: "8px", color: "#991b1b", fontSize: "12px", background: "#fee2e2", padding: "6px 10px", borderRadius: "4px" }}>
                    <strong>Rejection Reason: </strong>{selectedDetailRecord.payment_rejection_reason}
                  </div>
                )}
              </div>

              {/* General Information */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ background: "#f8fafc", padding: "8px 14px", fontWeight: "700", color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  General Information
                </div>
                <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  <div><span style={{ color: "#64748b" }}>Firm Name: </span><strong>{selectedDetailRecord.party_name || "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>IEC No.: </span><strong>{selectedDetailRecord.iec_no || "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Scheme: </span><strong>{selectedDetailRecord.scheme || selectedDetailRecord.category || "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Auth / Licence No.: </span><strong>{selectedDetailRecord.licence_no || "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Auth Date: </span><strong>{selectedDetailRecord.licence_date ? formatDateToDdMmYyyy(selectedDetailRecord.licence_date) : "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>File No.: </span><strong>{selectedDetailRecord.file_no || selectedDetailRecord.file_no_key_no || "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>File Date: </span><strong>{selectedDetailRecord.file_date ? formatDateToDdMmYyyy(selectedDetailRecord.file_date) : "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Port of Registration: </span><strong>{selectedDetailRecord.port_of_registration || "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Licence / CIF Value: </span><strong>{selectedDetailRecord.licence_cif_value || "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Job Status: </span><strong>{selectedDetailRecord.job_status || "—"}</strong></div>
                </div>
              </div>

              {/* Validity & Document Dates */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ background: "#f8fafc", padding: "8px 14px", fontWeight: "700", color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  Validity &amp; Document Tracking
                </div>
                <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  <div><span style={{ color: "#64748b" }}>Import Validity: </span><strong>{selectedDetailRecord.import_validity ? formatDateToDdMmYyyy(selectedDetailRecord.import_validity) : "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Export Validity: </span><strong>{selectedDetailRecord.export_validity ? formatDateToDdMmYyyy(selectedDetailRecord.export_validity) : "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Docs Received Date: </span><strong>{selectedDetailRecord.docs_received_date ? formatDateToDdMmYyyy(selectedDetailRecord.docs_received_date) : "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Online Submission Date: </span><strong>{selectedDetailRecord.online_submission_date || selectedDetailRecord.submitted_at_dgft_on ? formatDateToDdMmYyyy(selectedDetailRecord.online_submission_date || selectedDetailRecord.submitted_at_dgft_on) : "—"}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Docs to Accounts Date: </span><strong>{selectedDetailRecord.documents_send_to_accounts_date || selectedDetailRecord.docs_handed_over_to_ac ? formatDateToDdMmYyyy(selectedDetailRecord.documents_send_to_accounts_date || selectedDetailRecord.docs_handed_over_to_ac) : "—"}</strong></div>
                </div>
              </div>

              {/* Export Details Table */}
              {Array.isArray(selectedDetailRecord.export_details_array) && selectedDetailRecord.export_details_array.length > 0 && (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ background: "#f8fafc", padding: "8px 14px", fontWeight: "700", color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                    Export Items
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Description</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>HS Code</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Qty</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Unit</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>FOB USD</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Value (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetailRecord.export_details_array.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 10px" }}>{item.item_description_export || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.hs_code_export || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.qty_export || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.unit_export || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.export_value_fob_usd || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.export_value_rs || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Import Details Table */}
              {Array.isArray(selectedDetailRecord.import_details_array) && selectedDetailRecord.import_details_array.length > 0 && (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ background: "#f8fafc", padding: "8px 14px", fontWeight: "700", color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                    Import Items
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Description</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>HS Code</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Qty</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Unit</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>FOB USD</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Value (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetailRecord.import_details_array.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 10px" }}>{item.item_description_import || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.hs_code_import || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.qty_import || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.unit_import || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.import_value_fob_usd || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{item.import_value_rs || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, display: "flex", justifyContent: "space-between" }}>
          <div>
            {selectedDetailRecord?._id && (
              <button
                onClick={() => {
                  setDetailDialogOpen(false);
                  setPaymentDialogOpen(false);
                  navigate(`/dgft/register-details/${selectedDetailRecord._id}`);
                }}
                style={{
                  padding: "6px 14px",
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Open Full Detail Page ↗
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {selectedDetailRecord?.payment_status === "Payment Requested" && (
              <>
                <button
                  onClick={() => handleApprovePayment(selectedDetailRecord._id)}
                  style={{
                    padding: "6px 14px",
                    background: "#059669",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ✓ Approve Payment
                </button>
                <button
                  onClick={() => handleOpenRejectDialog(selectedDetailRecord._id)}
                  style={{
                    padding: "6px 14px",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ✕ Reject Payment
                </button>
              </>
            )}
            <Button onClick={() => setDetailDialogOpen(false)} variant="outlined" size="small">
              Close
            </Button>
          </div>
        </DialogActions>
      </Dialog>

      {/* ── Direct Row Approve Payment Dialog ── */}
      <Dialog
        open={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "10px", overflow: "hidden" }
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f0fdf4",
            borderBottom: "1px solid #bbf7d0",
            py: 1.5,
            px: 2.5,
            color: "#166534",
            fontWeight: "700",
            fontSize: "16px"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>✓</span> Approve Payment Request
          </span>
          <IconButton onClick={() => setApproveModalOpen(false)} size="small" sx={{ color: "#166534" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedApproveRow && (
            <div>
              <p style={{ margin: "0 0 14px 0", fontSize: "13px", color: "#374151" }}>
                Are you sure you want to approve the payment for this DGFT job?
              </p>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "14px 18px", marginBottom: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                  <div>
                    <span style={{ color: "#6b7280", display: "block" }}>Job Number:</span>
                    <strong style={{ color: "#111827", fontSize: "13px" }}>
                      {String(selectedApproveRow.job_no || "").includes("/") ? selectedApproveRow.job_no : `DGFT/${selectedApproveRow.job_no}`}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280", display: "block" }}>Firm / Party Name:</span>
                    <strong style={{ color: "#111827" }}>{selectedApproveRow.party_name || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280", display: "block" }}>Scheme:</span>
                    <strong style={{ color: "#111827" }}>{selectedApproveRow.scheme || selectedApproveRow.category || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280", display: "block" }}>EFT Amount:</span>
                    <strong style={{ color: "#15803d", fontSize: "15px" }}>
                      ₹ {Number(selectedApproveRow.eft_amount || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              </div>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "10px 14px", fontSize: "11px", color: "#1e40af" }}>
                ℹ️ <strong>Note:</strong> Approving this payment will update the status to <strong>PAYMENT APPROVED</strong> to fill in Quantity &amp; Value Tracking.
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
          <Button onClick={() => setApproveModalOpen(false)} variant="outlined" size="small" sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmApprove}
            variant="contained"
            size="small"
            sx={{
              background: "#16a34a",
              "&:hover": { background: "#15803d" },
              textTransform: "none",
              fontWeight: "600",
              px: 2
            }}
          >
            ✓ Confirm & Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Direct Row Reject Payment Dialog ── */}
      <Dialog
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "10px", overflow: "hidden" }
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fef2f2",
            borderBottom: "1px solid #fecaca",
            py: 1.5,
            px: 2.5,
            color: "#991b1b",
            fontWeight: "700",
            fontSize: "16px"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>✕</span> Reject Payment Request
          </span>
          <IconButton onClick={() => setRejectModalOpen(false)} size="small" sx={{ color: "#991b1b" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedRejectRow && (
            <div>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 16px", marginBottom: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                  <div>
                    <span style={{ color: "#6b7280", display: "block" }}>Job Number:</span>
                    <strong style={{ color: "#111827" }}>
                      {String(selectedRejectRow.job_no || "").includes("/") ? selectedRejectRow.job_no : `DGFT/${selectedRejectRow.job_no}`}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#6b7280", display: "block" }}>EFT Amount:</span>
                    <strong style={{ color: "#b91c1c", fontSize: "14px" }}>
                      ₹ {Number(selectedRejectRow.eft_amount || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              </div>
              <TextField
                label="Reason for Rejection (Optional)"
                placeholder="Enter rejection reason or deficiency details..."
                multiline
                rows={3}
                fullWidth
                value={rejectModalReason}
                onChange={(e) => setRejectModalReason(e.target.value)}
                variant="outlined"
                size="small"
                sx={{ mb: 1.5 }}
              />
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "10px 14px", fontSize: "11px", color: "#92400e" }}>
                ⚠️ <strong>Note:</strong> Rejecting this payment will move the record status to <strong>DEFICIENT</strong>.
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
          <Button onClick={() => setRejectModalOpen(false)} variant="outlined" size="small" sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReject}
            variant="contained"
            color="error"
            size="small"
            sx={{
              background: "#dc2626",
              "&:hover": { background: "#b91c1c" },
              textTransform: "none",
              fontWeight: "600",
              px: 2
            }}
          >
            ✕ Reject Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Toast
        toast={toast}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}

export default React.memo(DgftRegisterList);

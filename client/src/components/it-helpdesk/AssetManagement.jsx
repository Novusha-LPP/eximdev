import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Box,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Search,
  Download,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  RotateCcw,
  X,
  Tag,
  Cpu,
  UserCheck,
  Calendar,
  Layers,
  Server,
  Smartphone,
  MapPin,
  DollarSign,
  FileText,
  Printer,
  Wifi,
  Key,
  Phone,
  UploadCloud,
  Check,
  ShieldCheck,
  Clock,
  Copy,
  Laptop,
  Monitor,
  Building,
  Receipt,
  XCircle,
} from "lucide-react";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import AddVendorModal from "./AddVendorModal";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import "../../styles/scorecard.scss";

const ASSET_TYPES = ["Desktop", "Laptop", "Printer", "Network Device", "Software", "Phone", "SIM Card", "Rack", "Cable"];
const STATUSES = ["Available", "Assigned", "In Repair", "Repair", "Retired", "Lost", "Active", "Inactive", "Damaged", "Spare", "Expired", "Suspended"];
const SERVICE_PROVIDERS = ["Airtel", "Jio", "Vi", "BSNL"];
const PLAN_TYPES = ["Prepaid", "Postpaid"];
const PRINTER_TYPES = ["Laser", "Inkjet", "Thermal", "Dot Matrix"];
const CONNECTION_TYPES = ["USB", "Wi-Fi", "LAN"];
const DEVICE_CATEGORIES = ["Router", "Switch", "Firewall", "AP"];
const RAM_OPTIONS = ["4 GB", "8 GB", "12 GB", "16 GB", "32 GB", "64 GB"];
const STORAGE_OPTIONS = [
  "128 GB SSD",
  "256 GB SSD",
  "512 GB SSD",
  "1 TB SSD",
  "2 TB SSD",
  "500 GB HDD",
  "1 TB HDD",
  "2 TB HDD",
  "256 GB SSD + 1 TB HDD",
  "512 GB SSD + 1 TB HDD",
];
const OPERATING_SYSTEM_OPTIONS = ["Windows", "Linux", "MacOS"];
const USERS_FETCH_LIMIT = 200;

// Added department options
const DEPARTMENTS = ["Import", "Export", "DGFT", "Alluvium-IT", "Nousha-IT", "Paramount", "Account", "E-sanchit", "Admin/Hr"];

const modalFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    transition: "all 0.15s ease",
    "& fieldset": {
      borderColor: "#e2e8f0",
    },
    "&:hover fieldset": {
      borderColor: "#94a3b8",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#2563eb",
      borderWidth: "1.5px",
    },
    "&.Mui-error fieldset": {
      borderColor: "#ef4444",
    },
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.85rem",
    color: "#64748b",
    "&.Mui-focused": {
      color: "#2563eb",
      fontWeight: 600,
    },
    "&.Mui-error": {
      color: "#ef4444",
    },
  },
  "& .MuiOutlinedInput-input": {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#0f172a",
    padding: "9px 12px",
  },
  "& .MuiFormHelperText-root": {
    marginLeft: "2px",
    fontSize: "0.72rem",
    fontWeight: 500,
  },
};

const selectMenuProps = {
  anchorOrigin: {
    vertical: "bottom",
    horizontal: "left",
  },
  transformOrigin: {
    vertical: "top",
    horizontal: "left",
  },
  BackdropProps: {
    invisible: true,
    sx: {
      backgroundColor: "transparent !important",
      backdropFilter: "none !important",
      WebkitBackdropFilter: "none !important",
    },
  },
  PaperProps: {
    sx: {
      borderRadius: "10px",
      boxShadow: "0 12px 32px -4px rgba(15, 23, 42, 0.18), 0 6px 12px -4px rgba(15, 23, 42, 0.08)",
      maxHeight: 260,
      border: "1px solid #e2e8f0",
      marginTop: "4px",
      boxSizing: "border-box",
      "& .MuiList-root": {
        padding: "4px 0",
      },
      "& .MuiMenuItem-root": {
        fontSize: "13px",
        fontWeight: 500,
        color: "#334155",
        padding: "7px 12px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "block",
        "&:hover": {
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        },
        "&.Mui-selected": {
          backgroundColor: "#eff6ff",
          color: "#2563eb",
          fontWeight: 600,
          "&:hover": {
            backgroundColor: "#dbeafe",
          },
        },
      },
    },
  },
  TransitionProps: {
    onEnter: (node) => {
      const anchor = document.activeElement?.closest(".MuiOutlinedInput-root") || document.activeElement;
      if (anchor && anchor.clientWidth) {
        node.style.width = `${anchor.clientWidth}px`;
        node.style.minWidth = `${anchor.clientWidth}px`;
        node.style.maxWidth = `${anchor.clientWidth}px`;
      }
    },
  },
};


const FormSectionTitle = ({ icon: Icon, title }) => (
  <Grid item xs={12} sx={{ mt: 1, mb: 0.25 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.6, borderBottom: "1px solid #f1f5f9" }}>
      {Icon && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: "5px",
            bgcolor: "#eff6ff",
            color: "#2563eb",
            flexShrink: 0,
          }}
        >
          <Icon size={13} />
        </Box>
      )}
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {title}
      </Typography>
    </Box>
  </Grid>
);

const FIELD_LABELS = {
  asset_tag: "Asset Tag",
  serial_number: "Serial Number",
  asset_type: "Asset Type",
  manufacturer: "Manufacturer",
  model: "Model",
  purchase_date: "Purchase Date",
  warranty_expiry: "Warranty Expiry",
  status: "Status",
  assigned_to: "Assigned To",
  assigned_date: "Assigned Date",
  location: "Location",
  purchase_cost: "Purchase Cost",
  vendor: "Vendor",
  description: "Description",
  asset_name: "Asset Name",
  processor: "Processor",
  ram: "RAM",
  storage: "Storage",
  operating_system: "Operating System",
  device_name: "Device Name",
  device_category: "Device Category",
  ip_address: "IP Address",
  mac_address: "MAC Address",
  software_category: "Software Category",
  version: "Version",
  license_type: "License Type",
  license_key_subscription_id: "License Key / Subscription ID",
  number_of_licenses: "Number of Licenses",
  expiry_renewal_date: "Expiry/Renewal Date",
  imei_number: "IMEI Number",
  rack_name: "Rack Name/Number",
  rack_type: "Rack Type",
  rack_size_u_height: "Rack Size (U Height)",
  installation_date: "Installation Date",
  cable_name: "Cable Name",
  cable_type: "Cable Type",
  length: "Length",
  printer_type: "Printer Type",
  connection_type: "Connection Type",
  sim_number_iccid: "SIM Number",
  mobile_number: "Mobile Number",
  imsi_number: "IMSI Number",
  puk_code: "PUK Code",
  service_provider: "Service Provider",
  department: "Department",
  allocation_date: "Assigned Date",
  plan_type: "Plan Type",
  monthly_plan_package: "Monthly Plan/Package",
  remarks: "Remarks",
  invoice_number: "Invoice Number",
  invoice_date: "Invoice Date",
};

const ASSET_TYPE_REQUIRED_FIELDS = {
  Desktop: ["asset_tag", "asset_name", "manufacturer", "model", "serial_number", "processor", "ram", "storage", "operating_system", "assigned_to", "department", "location", "status", "purchase_date"],
  Laptop: ["asset_tag", "asset_name", "manufacturer", "model", "serial_number", "processor", "ram", "storage", "operating_system", "assigned_to", "department", "location", "status", "purchase_date"],
  Printer: ["asset_tag", "asset_name", "manufacturer", "model", "serial_number", "printer_type", "connection_type", "location", "assigned_to", "department", "status", "purchase_date"],
  "Network Device": ["asset_tag", "asset_name", "device_category", "manufacturer", "model", "serial_number", "ip_address", "mac_address", "location", "status"],
  Software: ["asset_tag", "asset_name", "software_category", "version", "license_type", "license_key_subscription_id", "vendor", "number_of_licenses", "assigned_to", "department", "status", "purchase_date", "expiry_renewal_date"],
  Phone: ["asset_tag", "manufacturer", "model", "imei_number", "serial_number", "mobile_number", "assigned_to", "department", "status", "purchase_date", "location"],
  "SIM Card": ["asset_tag", "sim_number_iccid", "mobile_number", "service_provider", "assigned_to", "department", "status", "allocation_date", "plan_type", "monthly_plan_package"],
  Rack: ["asset_tag", "rack_name", "rack_type", "location", "rack_size_u_height", "manufacturer", "status", "installation_date"],
  Cable: ["asset_tag", "cable_name", "cable_type", "length", "location", "status", "purchase_date"],
};

const getRequiredFieldsForType = (assetType) => {
  const base = ASSET_TYPE_REQUIRED_FIELDS[assetType] || ASSET_TYPE_REQUIRED_FIELDS.Laptop;
  return base.map((field) => (field === "status" ? "status" : field));
};

const getMissingRequiredFields = (assetForm) => getRequiredFieldsForType(assetForm.asset_type).filter((field) => {
  const value = assetForm[field];
  return value === undefined || value === null || value === "";
});

const STATUS_NORMALIZATION_MAP = {
  active: "Active",
  assigned: "Assigned",
  available: "Available",
  "in repair": "In Repair",
  repair: "Repair",
  retired: "Retired",
  lost: "Lost",
  inactive: "Inactive",
  damaged: "Damaged",
  spare: "Spare",
  expired: "Expired",
  suspended: "Suspended",
};

const PLAN_TYPE_MAP = {
  prepaid: "Prepaid",
  postpaid: "Postpaid",
};

const normalizeStatus = (status) => STATUS_NORMALIZATION_MAP[String(status || "").toLowerCase()] || status;
const normalizePlanType = (planType) => PLAN_TYPE_MAP[String(planType || "").toLowerCase()] || planType;

const formatUserFriendlyError = (rawMsg) => {
  if (!rawMsg) return "An unexpected error occurred. Please try again.";
  const strMsg = typeof rawMsg === "string" ? rawMsg : String(rawMsg?.message || rawMsg);
  if (strMsg.includes("E11000 duplicate key error") || strMsg.includes("dup key")) {
    const match = strMsg.match(/dup key:\s*\{\s*(\w+):\s*"([^"]+)"\s*\}/);
    if (match) {
      const fieldName = match[1] === "asset_tag" ? "Asset Tag" : match[1] === "serial_number" ? "Serial Number" : match[1];
      return `${fieldName} "${match[2]}" already exists. Please use a unique value.`;
    }
    return "An asset with this Asset Tag or identifier already exists. Please use a unique value.";
  }
  return strMsg;
};

const EMPTY_FORM = {
  asset_tag: "",
  serial_number: "",
  asset_type: "Laptop",
  manufacturer: "",
  model: "",
  purchase_date: "",
  warranty_expiry: "",
  status: "Available",
  assigned_to: "",
  assigned_date: "",
  location: "",
  purchase_cost: "",
  vendor: "",
  description: "",
  asset_name: "",
  processor: "",
  ram: "",
  storage: "",
  operating_system: "",
  device_category: "",
  ip_address: "",
  mac_address: "",
  software_category: "",
  version: "",
  license_type: "",
  license_key_subscription_id: "",
  number_of_licenses: "",
  expiry_renewal_date: "",
  imei_number: "",
  rack_name: "",
  rack_type: "",
  rack_size_u_height: "",
  installation_date: "",
  cable_name: "",
  cable_type: "",
  length: "",
  printer_type: "",
  connection_type: "",
  sim_number_iccid: "",
  mobile_number: "",
  imsi_number: "",
  puk_code: "",
  service_provider: "",
  department: "",
  allocation_date: "",
  plan_type: "",
  monthly_plan_package: "",
  remarks: "",
  image_url: "",
  invoice_number: "",
  invoice_date: "",
};

// Reusable Spec Tile component for technical specifications in View Modal
const SpecTile = ({ label, value, isChip, chipColor, copyable, icon, onCopy, isCopied }) => (
  <Box
    sx={{
      p: 1.2,
      backgroundColor: "#f8fafc",
      borderRadius: "8px",
      border: "1px solid #f1f5f9",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: 54,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Typography
        sx={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.3px",
        }}
      >
        {label}
      </Typography>
      {icon && <Box sx={{ color: "#94a3b8", display: "flex" }}>{icon}</Box>}
      {copyable && value && value !== "—" && (
        <Tooltip title={isCopied ? "Copied!" : "Copy"}>
          <IconButton
            size="small"
            onClick={() => onCopy && onCopy(value)}
            sx={{ p: 0.2, color: isCopied ? "#16a34a" : "#94a3b8", "&:hover": { color: "#2563eb" } }}
          >
            {isCopied ? <Check size={12} /> : <Copy size={12} />}
          </IconButton>
        </Tooltip>
      )}
    </Box>
    <Box sx={{ mt: 0.4 }}>
      {isChip && value && value !== "—" ? (
        <Chip
          label={value}
          size="small"
          sx={{
            height: 22,
            fontSize: "0.74rem",
            fontWeight: 700,
            backgroundColor: chipColor?.bg || "#eff6ff",
            color: chipColor?.text || "#2563eb",
            border: `1px solid ${chipColor?.border || "#bfdbfe"}`,
            borderRadius: "6px",
          }}
        />
      ) : (
        <Typography
          sx={{
            fontSize: "0.84rem",
            fontWeight: 600,
            color: value && value !== "—" ? "#0f172a" : "#94a3b8",
            wordBreak: "break-word",
            lineHeight: 1.3,
          }}
        >
          {value || "—"}
        </Typography>
      )}
    </Box>
  </Box>
);

export default function AssetManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useContext(UserContext);

  const userRole = String(currentUser?.role || currentUser?.userRole || "").trim();

  const isAdmin =
    userRole.toLowerCase() === "admin" ||
    userRole.toLowerCase() === "administrator" ||
    userRole.toLowerCase().includes("admin") ||
    currentUser?.username === "admin" ||
    Boolean(currentUser?.is_operator);

  // Support staff / IT department detection
  const isPureITDept = !isAdmin;

  const currentUsername = String(currentUser?.username || "").toLowerCase().trim();
  const isShalini = currentUsername === "shalini_arun" || currentUsername === "admin";
  const isManu = currentUsername === "manu_pillai" || currentUsername === "admin";

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectAssetRecord, setRejectAssetRecord] = useState(null);
  const [rejectActionType, setRejectActionType] = useState("reject_admin");
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [submittingWorkflow, setSubmittingWorkflow] = useState(false);

  // Resubmit modal state (TC-09)
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitAssetRecord, setResubmitAssetRecord] = useState(null);
  const [resubmitRemarks, setResubmitRemarks] = useState("");
  const [resubmitInvoiceUrl, setResubmitInvoiceUrl] = useState("");
  const [resubmitInvoiceNumber, setResubmitInvoiceNumber] = useState("");
  const [resubmitInvoiceDate, setResubmitInvoiceDate] = useState("");
  const [uploadingResubmitInvoice, setUploadingResubmitInvoice] = useState(false);

  // Return-to-IT confirm modal state (TC-11)
  const [showReturnToITModal, setShowReturnToITModal] = useState(false);
  const [returnToITAssetRecord, setReturnToITAssetRecord] = useState(null);
  const [returnToITRemarks, setReturnToITRemarks] = useState("");

  const handleWorkflowAction = async (assetId, actionType, remarks = "") => {
    setSubmittingWorkflow(true);
    try {
      const res = await itHelpdeskAPI.assets.updateWorkflow(assetId, { action: actionType, remarks });
      if (res?.success) {
        toast.success("Workflow status updated successfully");
        fetchData();
        if (viewRecord && viewRecord._id === assetId) {
          setViewRecord(res.data);
        }
      } else {
        toast.error(res?.message || "Failed to update workflow");
      }
    } catch (err) {
      console.error("Workflow update error:", err);
      toast.error(err.response?.data?.message || err.message || "Workflow action failed");
    } finally {
      setSubmittingWorkflow(false);
      setShowRejectModal(false);
      setRejectRemarks("");
      setRejectAssetRecord(null);
      setShowReturnToITModal(false);
      setReturnToITRemarks("");
      setReturnToITAssetRecord(null);
    }
  };

  // TC-09: Resubmit workflow handler with optional invoice update
  const handleResubmitWorkflow = async () => {
    if (!resubmitAssetRecord?._id) return;
    setSubmittingWorkflow(true);
    try {
      const payload = {
        action: "resubmit_it",
        remarks: resubmitRemarks.trim() || "Resubmitted by HR Admin Department.",
        ...(resubmitInvoiceUrl ? { image_url: resubmitInvoiceUrl } : {}),
        ...(resubmitInvoiceNumber ? { invoice_number: resubmitInvoiceNumber } : {}),
        ...(resubmitInvoiceDate ? { invoice_date: resubmitInvoiceDate } : {}),
      };
      const res = await itHelpdeskAPI.assets.updateWorkflow(resubmitAssetRecord._id, payload);
      if (res?.success) {
        toast.success("Asset resubmitted for Admin Approval.");
        fetchData();
        if (viewRecord && viewRecord._id === resubmitAssetRecord._id) {
          setViewRecord(res.data);
        }
      } else {
        toast.error(res?.message || "Resubmit failed");
      }
    } catch (err) {
      console.error("Resubmit error:", err);
      toast.error(err.response?.data?.message || err.message || "Resubmit failed");
    } finally {
      setSubmittingWorkflow(false);
      setShowResubmitModal(false);
      setResubmitAssetRecord(null);
      setResubmitRemarks("");
      setResubmitInvoiceUrl("");
      setResubmitInvoiceNumber("");
      setResubmitInvoiceDate("");
    }
  };

  // TC-09: Invoice upload handler for Resubmit modal
  const handleResubmitInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isPdf) {
      toast.error("Please select a valid invoice file (PDF, PNG, JPG, JPEG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Invoice file size must be less than 10MB");
      return;
    }
    setUploadingResubmitInvoice(true);
    try {
      const res = await uploadFileToS3(file, "it-assets");
      const url = res?.Location || res?.urls?.[0];
      if (url) {
        setResubmitInvoiceUrl(url);
        toast.success("Invoice uploaded successfully");
      } else {
        throw new Error("No URL returned");
      }
    } catch (err) {
      console.warn("S3 upload failed, using data URL:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setResubmitInvoiceUrl(ev.target.result);
        toast.success("Invoice attached successfully");
      };
      reader.onerror = () => toast.error("Failed to read invoice file");
      reader.readAsDataURL(file);
    } finally {
      setUploadingResubmitInvoice(false);
      if (e.target) e.target.value = "";
    }
  };

  const getWorkflowBadgeClass = (stage, status) => {
    const norm = String(status || stage || "").toLowerCase();
    if (norm.includes("completed")) return "badge-excellent";
    if (norm.includes("manu")) return "badge-good";
    if (norm.includes("shalini") || norm.includes("admin") || norm.includes("pending")) return "badge-warning";
    if (norm.includes("returned") || norm.includes("correction")) return "badge-warning";
    if (norm.includes("rejected")) return "badge-danger";
    return "badge-secondary";
  };

  const getWorkflowStatusLabel = (stage, status) => {
    const norm = String(status || stage || "").toLowerCase();
    if (norm.includes("completed")) return "Completed";
    if (norm.includes("rejected")) return "Rejected";
    if (norm.includes("returned") || norm.includes("correction")) return "Returned to IT";
    if (norm.includes("manu")) return "Pending Final Approval (manu_pillai)";
    if (norm.includes("shalini")) return "Pending First Approval (shalini_arun)";
    if (norm.includes("pending") || norm.includes("admin") || norm.includes("hod")) {
      return "Pending Approval";
    }
    return status || stage || "Pending Approval";
  };

  const handleBack = () => {
    navigate("/it-helpdesk");
  };

  // Audit logs
  const { logRead, logExport } = useModuleAuditLogs("Asset");

  // Server-side pagination & filter state derived directly from URL query params
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = parseInt(searchParams.get("limit")) || 15;
  const typeFilter = searchParams.get("type") || "";
  const statusFilter = searchParams.get("status") || "";
  const departmentFilter = searchParams.get("department") || "";
  const searchParam = searchParams.get("search") || "";

  const [data, setData] = useState([]);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [viewTab, setViewTab] = useState("overview");
  const [copiedTag, setCopiedTag] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewInvoiceUrl, setPreviewInvoiceUrl] = useState(null);
  const [previewInvoiceTitle, setPreviewInvoiceTitle] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  // Helper to trigger direct file download for invoices (PDF/Images)
  const handleDownloadInvoice = async (url, title = "Asset_Invoice") => {
    if (!url) return;
    try {
      setDownloadingInvoice(true);
      const cleanTitle = (title || "Asset_Invoice").replace(/[^a-zA-Z0-9_-]/g, "_");

      // Handle Data URL or Blob URL directly
      if (url.startsWith("data:") || url.startsWith("blob:")) {
        let ext = "pdf";
        if (url.includes("image/jpeg") || url.includes("image/jpg")) ext = "jpg";
        else if (url.includes("image/png")) ext = "png";
        else if (url.includes("image/webp")) ext = "webp";
        else if (url.includes("application/pdf")) ext = "pdf";

        const a = document.createElement("a");
        a.href = url;
        a.download = `${cleanTitle}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Download started");
        return;
      }

      // Handle remote URLs (S3 / server endpoint)
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error("Could not fetch remote file for download");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      let ext = "pdf";
      if (url.toLowerCase().includes(".png") || blob.type.includes("png")) ext = "png";
      else if (url.toLowerCase().includes(".jpg") || url.toLowerCase().includes(".jpeg") || blob.type.includes("jpeg")) ext = "jpg";
      else if (url.toLowerCase().includes(".webp") || blob.type.includes("webp")) ext = "webp";
      else if (url.toLowerCase().includes(".pdf") || blob.type.includes("pdf")) ext = "pdf";

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${cleanTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch (err) {
      console.warn("Direct blob download fallback to direct link:", err);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = `${(title || "Asset_Invoice").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Invoice opened for download");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  // Helper to update search params while preserving existing ones
  const updateQueryParams = useCallback(
    (newParams) => {
      const current = Object.fromEntries(searchParams.entries());
      const merged = { ...current, ...newParams };
      const cleaned = {};
      Object.keys(merged).forEach((key) => {
        const val = merged[key];
        if (val !== "" && val !== undefined && val !== null) {
          cleaned[key] = String(val);
        }
      });
      setSearchParams(cleaned);
    },
    [searchParams, setSearchParams]
  );

  // Helper function to safely get assigned user name
  const getAssignedToName = useCallback(
    (assignedTo) => {
      if (!assignedTo) return "Unassigned";
      if (typeof assignedTo === "object") {
        const nameStr = assignedTo.first_name
          ? `${assignedTo.first_name} ${assignedTo.last_name || ""}`.trim()
          : assignedTo.username || assignedTo.name || assignedTo.email || "";
        if (nameStr) return nameStr;
      }
      const user = users.find((u) => String(u._id) === String(assignedTo));
      if (user) {
        return user.first_name
          ? `${user.first_name} ${user.last_name || ""}`.trim()
          : user.username || user.name || user.email;
      }
      if (/^[0-9a-fA-F]{24}$/.test(String(assignedTo).trim())) {
        return "Unassigned";
      }
      return String(assignedTo);
    },
    [users]
  );

  // Format dates cleanly for display (e.g. 19 Sep 2026)
  const formatAssetDate = (dateVal) => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(dateVal);
    }
  };

  // Calculate real-time warranty status
  const getWarrantyStatus = (warrantyDate) => {
    if (!warrantyDate) return null;
    try {
      const expiry = new Date(warrantyDate);
      if (isNaN(expiry.getTime())) return null;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return { status: "expired", label: "Expired", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
      } else if (diffDays <= 30) {
        return { status: "expiring_soon", label: `Expires in ${diffDays}d`, color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
      } else {
        return { status: "active", label: "Active", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
      }
    } catch {
      return null;
    }
  };

  // Helper for asset type icon
  const getAssetTypeIcon = (assetType, size = 18) => {
    const norm = String(assetType || "").toLowerCase();
    if (norm.includes("laptop")) return <Laptop size={size} />;
    if (norm.includes("desktop") || norm.includes("computer")) return <Monitor size={size} />;
    if (norm.includes("printer")) return <Printer size={size} />;
    if (norm.includes("network") || norm.includes("router") || norm.includes("switch") || norm.includes("firewall")) return <Wifi size={size} />;
    if (norm.includes("software")) return <Key size={size} />;
    if (norm.includes("sim")) return <Smartphone size={size} />;
    if (norm.includes("phone")) return <Phone size={size} />;
    if (norm.includes("rack")) return <Server size={size} />;
    if (norm.includes("cable")) return <Layers size={size} />;
    return <Tag size={size} />;
  };

  // Helper for theme accents per asset type
  const getAssetTypeTheme = (assetType) => {
    const norm = String(assetType || "").toLowerCase();
    if (norm.includes("laptop")) return { bg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "#2563eb", lightBg: "#eff6ff", border: "#dbeafe" };
    if (norm.includes("desktop") || norm.includes("computer")) return { bg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", color: "#0284c7", lightBg: "#f0f9ff", border: "#e0f2fe" };
    if (norm.includes("printer")) return { bg: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "#059669", lightBg: "#ecfdf5", border: "#d1fae5" };
    if (norm.includes("network")) return { bg: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)", color: "#0891b2", lightBg: "#ecfeff", border: "#cffafe" };
    if (norm.includes("software")) return { bg: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "#7c3aed", lightBg: "#f5f3ff", border: "#ede9fe" };
    if (norm.includes("sim") || norm.includes("phone")) return { bg: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", color: "#ea580c", lightBg: "#fff7ed", border: "#ffedd5" };
    if (norm.includes("rack")) return { bg: "linear-gradient(135deg, #475569 0%, #334155 100%)", color: "#475569", lightBg: "#f8fafc", border: "#e2e8f0" };
    if (norm.includes("cable")) return { bg: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "#d97706", lightBg: "#fffbeb", border: "#fef3c7" };
    return { bg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "#2563eb", lightBg: "#eff6ff", border: "#dbeafe" };
  };

  // Helper for copy to clipboard
  const handleCopyText = (text, type = "tag") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "tag") {
      setCopiedTag(true);
      setTimeout(() => setCopiedTag(false), 2000);
    } else if (type === "serial") {
      setCopiedSerial(true);
      setTimeout(() => setCopiedSerial(false), 2000);
    }
    toast.success(`Copied ${type === "tag" ? "Asset Tag" : "Serial Number"} to clipboard`);
  };

  // User initials avatar
  const getAssignedUserInitials = (name) => {
    if (!name || name === "Unassigned") return "UA";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Resolve vendor name
  const getVendorName = (vendorRef) => {
    if (!vendorRef) return "—";
    if (typeof vendorRef === "object" && vendorRef?.name) return vendorRef.name;
    const found = vendors.find((v) => String(v._id) === String(vendorRef));
    if (found) return found.name;
    return String(vendorRef);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      logRead("asset-list-view", "Accessed asset list with server-side pagination & filters", "info");

      const params = { page, limit };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (departmentFilter) params.department = departmentFilter;
      if (searchParam) params.search = searchParam;

      const res = await itHelpdeskAPI.assets.getAll(params);
      setData(res.data || []);
      setPagination(
        res.pagination || {
          total: res.data?.length || 0,
          page,
          limit,
          totalPages: Math.ceil((res.data?.length || 0) / limit) || 1,
        }
      );
    } catch (err) {
      toast.error("Failed to load assets");
      console.error("Failed to load assets:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, statusFilter, departmentFilter, searchParam, logRead]);

  const handleClearFilters = () => {
    setSearchParams({ page: "1", limit: String(limit) });
  };

  const fetchUsers = useCallback(async () => {
    try {
      logRead("asset-users-fetch", "Fetched users for asset assignment", "info");
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, {
        withCredentials: true,
        params: { limit: USERS_FETCH_LIMIT },
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, [logRead]);

  const fetchVendors = useCallback(async () => {
    try {
      logRead("asset-vendors-fetch", "Fetched vendors for asset assignment", "info");
      const res = await itHelpdeskAPI.vendors.getAll({ all: "true" });
      setVendors(res.data || []);
    } catch {
      // non-blocking
    }
  }, [logRead]);

  const handleVendorCreated = (newVendor) => {
    fetchVendors();
    if (newVendor && (newVendor._id || newVendor.id)) {
      const vId = newVendor._id || newVendor.id;
      updateField("vendor", vId);
    }
  };

  useEffect(() => {
    logRead("asset-module-access", "Accessed Asset Management module", "info");
    fetchData();
  }, [fetchData, logRead]);

  useEffect(() => {
    fetchUsers();
    fetchVendors();
  }, [fetchUsers, fetchVendors]);

  const handleOpen = (record = null) => {
    if (record) {
      logRead("asset-edit-access", `Opened asset for editing with ID: ${record._id}`, "info");
      setEditId(record._id);
      setErrors({});
      const isCustom = Boolean(record.department && !DEPARTMENTS.includes(record.department));
      setIsCustomDept(isCustom);
      setForm({
        asset_tag: record.asset_tag || "",
        serial_number: record.serial_number || "",
        asset_type: record.asset_type || "Laptop",
        manufacturer: record.manufacturer || "",
        model: record.model || "",
        purchase_date: record.purchase_date ? record.purchase_date.slice(0, 10) : "",
        warranty_expiry: record.warranty_expiry ? record.warranty_expiry.slice(0, 10) : "",
        status: record.status || "Available",
        assigned_to: record.assigned_to?._id || record.assigned_to || "",
        assigned_date: record.assigned_date ? record.assigned_date.slice(0, 10) : "",
        location: record.location || "",
        purchase_cost: record.purchase_cost ?? "",
        vendor: record.vendor?._id || record.vendor || "",
        description: record.description || "",
        asset_name: record.asset_name || "",
        processor: record.processor || "",
        ram: record.ram || "",
        storage: record.storage || "",
        operating_system: record.operating_system || "",
        device_category: record.device_category || "",
        ip_address: record.ip_address || "",
        mac_address: record.mac_address || "",
        software_category: record.software_category || "",
        version: record.version || "",
        license_type: record.license_type || "",
        license_key_subscription_id: record.license_key_subscription_id || "",
        number_of_licenses: record.number_of_licenses ?? "",
        expiry_renewal_date: record.expiry_renewal_date ? record.expiry_renewal_date.slice(0, 10) : "",
        imei_number: record.imei_number || "",
        rack_name: record.rack_name || "",
        rack_type: record.rack_type || "",
        rack_size_u_height: record.rack_size_u_height || "",
        installation_date: record.installation_date ? record.installation_date.slice(0, 10) : "",
        cable_name: record.cable_name || "",
        cable_type: record.cable_type || "",
        length: record.length || "",
        printer_type: record.printer_type || "",
        connection_type: record.connection_type || "",
        sim_number_iccid: record.sim_number_iccid || "",
        mobile_number: record.mobile_number || "",
        imsi_number: record.imsi_number || "",
        puk_code: record.puk_code || "",
        service_provider: record.service_provider || "",
        department: record.department || "",
        allocation_date: record.allocation_date ? record.allocation_date.slice(0, 10) : "",
        plan_type: record.plan_type || "",
        monthly_plan_package: record.monthly_plan_package || "",
        remarks: record.remarks || "",
        image_url: record.image_url || "",
        invoice_number: record.invoice_number || "",
        invoice_date: record.invoice_date ? record.invoice_date.slice(0, 10) : "",
      });
    } else {
      setEditId(null);
      setIsCustomDept(false);
      const currentYear = new Date().getFullYear();
      let defaultTag = `AST-${currentYear}-001`;

      // Fallback local calculation from loaded asset data
      const regex = new RegExp(`^AST-${currentYear}-(\\d+)$`, "i");
      let localMax = 0;
      (data || []).forEach((a) => {
        if (a.asset_tag) {
          const m = a.asset_tag.match(regex);
          if (m) {
            const seq = parseInt(m[1], 10);
            if (!isNaN(seq) && seq > localMax) localMax = seq;
          }
        }
      });
      defaultTag = `AST-${currentYear}-${String(localMax + 1).padStart(3, "0")}`;

      setForm({ ...EMPTY_FORM, asset_tag: defaultTag });
      setErrors({});

      // Fetch precise next tag from server
      itHelpdeskAPI.assets
        .getNextTag()
        .then((res) => {
          if (res?.success && res?.data?.nextTag) {
            setForm((prev) => ({ ...prev, asset_tag: res.data.nextTag }));
          }
        })
        .catch((err) => {
          console.error("Failed to fetch next asset tag from server:", err);
        });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    const missingFields = getMissingRequiredFields(form);
    if (missingFields.length > 0) {
      const nextErrors = {};
      missingFields.forEach((field) => {
        nextErrors[field] = `${FIELD_LABELS[field]} is required for ${form.asset_type}`;
      });
      setErrors(nextErrors);
      toast.error(`Please fill required fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`);
      return;
    }

    const basePayload = {
      ...form,
      purchase_cost: form.purchase_cost === "" ? undefined : Number(form.purchase_cost),
      invoice_number: form.invoice_number?.trim() || undefined,
      invoice_date: form.invoice_date || undefined,
      assigned_to: form.assigned_to || undefined,
      vendor: form.vendor || undefined,
      purchase_date: form.purchase_date || undefined,
      warranty_expiry: form.warranty_expiry || undefined,
      assigned_date: form.assigned_date || undefined,
      allocation_date: form.allocation_date || undefined,
      status: normalizeStatus(form.status),
      plan_type: normalizePlanType(form.plan_type),
      asset_name: form.asset_name || undefined,
      processor: form.processor || undefined,
      ram: form.ram || undefined,
      storage: form.storage || undefined,
      operating_system: form.operating_system || undefined,
      device_category: form.device_category || undefined,
      ip_address: form.ip_address || undefined,
      mac_address: form.mac_address || undefined,
      software_category: form.software_category || undefined,
      version: form.version || undefined,
      license_type: form.license_type || undefined,
      license_key_subscription_id: form.license_key_subscription_id || undefined,
      number_of_licenses: form.number_of_licenses === "" ? undefined : Number(form.number_of_licenses),
      expiry_renewal_date: form.expiry_renewal_date || undefined,
      imei_number: form.imei_number || undefined,
      rack_name: form.rack_name || undefined,
      rack_type: form.rack_type || undefined,
      rack_size_u_height: form.rack_size_u_height || undefined,
      installation_date: form.installation_date || undefined,
      cable_name: form.cable_name || undefined,
      cable_type: form.cable_type || undefined,
      length: form.length === "" ? undefined : Number(form.length),
      printer_type: form.printer_type || undefined,
      connection_type: form.connection_type || undefined,
      sim_number_iccid: form.sim_number_iccid || undefined,
      mobile_number: form.mobile_number || undefined,
      service_provider: form.service_provider || undefined,
      department: form.department?.trim() || undefined,
      monthly_plan_package: form.monthly_plan_package || undefined,
      remarks: form.remarks || undefined,
    };

    let payload = { ...basePayload };
    if (form.asset_type !== "SIM Card") {
      delete payload.service_provider;
      delete payload.plan_type;
      delete payload.allocation_date;
      delete payload.sim_number_iccid;
      delete payload.monthly_plan_package;
    }
    if (form.asset_type !== "SIM Card" && form.asset_type !== "Phone") {
      delete payload.mobile_number;
    }
    setSaving(true);
    try {
      if (editId) {
        await itHelpdeskAPI.assets.update(editId, payload);
        toast.success("Asset updated");
      } else {
        await itHelpdeskAPI.assets.create(payload);
        toast.success("Asset created");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.message || "Save failed";
      toast.error(formatUserFriendlyError(serverMessage));
      console.error(`Failed to ${editId ? "update" : "create"} asset: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this asset?")) return;
    try {
      await itHelpdeskAPI.assets.remove(id);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.message || "Delete failed";
      toast.error(formatUserFriendlyError(serverMessage));
      console.error(`Failed to delete asset with ID: ${id}: ${err.message}`);
    }
  };

  // --- Excel Export Functionality (Backend Generated) ---
  const handleExportAllToExcel = useCallback(async () => {
    setExporting(true);
    try {
      // Backend queries all assets directly from DB and streams binary .xlsx
      const response = await itHelpdeskAPI.assets.export();

      if (response.data && response.data.type === "application/json") {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || "Failed to generate asset report");
      }

      let fileName = `Assets_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const disposition = response.headers ? response.headers["content-disposition"] : null;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Excel exported successfully");
      logExport("excel-export", "Exported complete assets list to Excel via backend generator", "info");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(error.message || "Failed to export Excel");
      logExport("excel-export-failed", "Excel export failed", "error");
    } finally {
      setExporting(false);
    }
  }, [logExport]);
  // ----------------------------------

  const requiredFieldsForType = getRequiredFieldsForType(form.asset_type);
  const canSave = true;
  const statusOptions = form.asset_type === "SIM Card" ? ["Available", "Assigned", "Active", "Inactive"] : form.asset_type === "Printer" ? ["Available", "Active", "Repair", "Retired"] : form.asset_type === "Network Device" ? ["Active", "Spare", "Repair", "Retired"] : form.asset_type === "Software" ? ["Active", "Expired", "Suspended"] : form.asset_type === "Rack" ? ["Active", "Inactive", "Occupied", "Available", "Blocked", "Under Maintenance"] : form.asset_type === "Desktop" || form.asset_type === "Laptop" || form.asset_type === "Phone" ? ["Available", "Assigned", "Active", "Inactive", "In Repair", "Retired"] : form.asset_type === "Cable" ? ["Available", "Assigned", "In Repair", "Retired"] : STATUSES;
  const isComputerAsset = form.asset_type === "Desktop" || form.asset_type === "Laptop" || form.asset_type === "Computer";
  const manufacturerLabel = isComputerAsset ? "Brand" : "Manufacturer";
  const warrantyLabel = isComputerAsset ? "Warranty End Date" : "Warranty Expiry";

  const isRequiredField = (field) => requiredFieldsForType.includes(field);
  const getFieldError = (field) => errors[field];
  const getFieldHelperText = (field) => getFieldError(field);
  const getRequiredProps = (field) => ({
    required: isRequiredField(field),
    error: Boolean(getFieldError(field)),
    helperText: getFieldHelperText(field),
    sx: modalFieldSx,
    SelectProps: {
      MenuProps: selectMenuProps,
    },
  });

  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      if (value === undefined || value === null || value === "") return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const renderDepartmentField = () => {
    if (isCustomDept) {
      return (
        <Grid item xs={6}>
          <TextField
            label="Department"
            size="small"
            fullWidth
            autoFocus
            required={isRequiredField("department")}
            error={Boolean(getFieldError("department"))}
            helperText={getFieldHelperText("department")}
            sx={modalFieldSx}
            placeholder="Type department name..."
            value={form.department || ""}
            onChange={(e) => updateField("department", e.target.value)}
            InputProps={{
              endAdornment: (
                <Tooltip title="Select from list">
                  <IconButton
                    size="small"
                    edge="end"
                    onClick={() => {
                      setIsCustomDept(false);
                      updateField("department", "");
                    }}
                    sx={{ color: "#64748b", mr: -0.5 }}
                  >
                    <RotateCcw size={15} />
                  </IconButton>
                </Tooltip>
              ),
            }}
          />
        </Grid>
      );
    }

    return (
      <Grid item xs={6}>
        <TextField
          select
          label="Department"
          size="small"
          fullWidth
          {...getRequiredProps("department")}
          value={DEPARTMENTS.includes(form.department) ? form.department : ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "Other") {
              setIsCustomDept(true);
              updateField("department", "");
            } else {
              updateField("department", val);
            }
          }}
        >
          <MenuItem value="">Select Department</MenuItem>
          {DEPARTMENTS.map((dept) => (
            <MenuItem key={dept} value={dept}>
              {dept}
            </MenuItem>
          ))}
          <MenuItem value="Other">Other</MenuItem>
        </TextField>
      </Grid>
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isPdf) {
      toast.error("Please select a valid invoice file (PDF, PNG, JPG, JPEG, WEBP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Invoice file size must be less than 10MB");
      return;
    }

    setUploadingImage(true);
    try {
      const res = await uploadFileToS3(file, "it-assets");
      const url = res?.Location || res?.urls?.[0];
      if (url) {
        updateField("image_url", url);
        toast.success("Asset invoice uploaded successfully");
      } else {
        throw new Error("No URL returned from upload service");
      }
    } catch (err) {
      console.warn("S3 upload failed, falling back to data URL:", err);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        updateField("image_url", uploadEvent.target.result);
        toast.success("Asset invoice attached successfully");
      };
      reader.onerror = () => {
        toast.error("Failed to read invoice file");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  const getStatusBadgeClass = (s) => {
    switch (String(s || "").toLowerCase()) {
      case "available":
      case "active":
        return "badge-excellent";
      case "assigned":
        return "badge-good";
      case "in repair":
      case "repair":
      case "suspended":
        return "badge-warning";
      case "lost":
      case "expired":
      case "damaged":
      case "retired":
        return "badge-danger";
      case "spare":
      case "inactive":
      default:
        return "badge-secondary";
    }
  };

  return (
    <div className="scorecard-container">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={handleBack} title="Back to IT Helpdesk">
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="page-title">Asset Management</div>
            <div className="page-subtitle">Track, assign, and manage enterprise hardware, laptops, and IT infrastructure</div>
          </div>
        </div>
        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={() => fetchData()}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExportAllToExcel}
            disabled={exporting}
            style={{ opacity: exporting ? 0.7 : 1, cursor: exporting ? "not-allowed" : "pointer" }}
          >
            <Download size={15} /> {exporting ? "Generating Excel..." : "Export Excel"}
          </button>
          <button className="btn btn-primary" onClick={() => handleOpen()}>
            <Plus size={15} /> Add Asset
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="card mb-16">
        <div className="card-body">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-val">{pagination.total || data.length}</div>
              <div className="stat-lbl">Total Assets</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" style={{ color: "#10b981" }}>
                {data.filter(a => ["available", "active"].includes(String(a.status || "").toLowerCase())).length}
              </div>
              <div className="stat-lbl">Available / Active</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" style={{ color: "#3b82f6" }}>
                {data.filter(a => ["assigned"].includes(String(a.status || "").toLowerCase())).length}
              </div>
              <div className="stat-lbl">Assigned Assets</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" style={{ color: "#f59e0b" }}>
                {data.filter(a => ["in repair", "repair", "damaged", "suspended"].includes(String(a.status || "").toLowerCase())).length}
              </div>
              <div className="stat-lbl">In Repair / Damaged</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card mb-16">
        <div className="card-body">
          <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "12px", alignItems: "flex-end" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Search Assets</label>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "32px", height: "38px" }}
                  placeholder="Search by tag, model, serial, assignee..."
                  value={searchParam}
                  onChange={(e) => updateQueryParams({ search: e.target.value, page: 1 })}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Asset Type</label>
              <CustomSelect
                value={typeFilter}
                onChange={(val) => updateQueryParams({ type: val, status: "", page: 1 })}
                options={[
                  { label: "All Types", value: "" },
                  ...ASSET_TYPES.map((t) => ({ label: t, value: t })),
                ]}
                placeholder="All Types"
                width="100%"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <CustomSelect
                value={statusFilter}
                onChange={(val) => updateQueryParams({ status: val, page: 1 })}
                options={[
                  { label: "All Statuses", value: "" },
                  ...(typeFilter === "SIM Card"
                    ? ["Available", "Assigned", "Active", "Inactive"]
                    : typeFilter === "Printer"
                      ? ["Available", "Active", "Repair", "Retired"]
                      : typeFilter === "Network Device"
                        ? ["Active", "Spare", "Repair", "Retired"]
                        : typeFilter === "Software"
                          ? ["Active", "Expired", "Suspended"]
                          : typeFilter === "Rack"
                            ? ["Active", "Inactive", "Occupied", "Available", "Blocked", "Under Maintenance"]
                            : typeFilter === "Desktop" || typeFilter === "Laptop" || typeFilter === "Phone"
                              ? ["Available", "Assigned", "Active", "Inactive", "In Repair", "Retired"]
                              : typeFilter === "Cable"
                                ? ["Available", "Assigned", "In Repair", "Retired"]
                                : STATUSES
                  ).map((s) => ({ label: s, value: s })),
                ]}
                placeholder="All Statuses"
                width="100%"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Department</label>
              <CustomSelect
                value={departmentFilter}
                onChange={(val) => updateQueryParams({ department: val, page: 1 })}
                options={[
                  { label: "All Departments", value: "" },
                  ...DEPARTMENTS.map((dept) => ({ label: dept, value: dept })),
                ]}
                placeholder="All Departments"
                width="100%"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: "130px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearFilters}
                style={{
                  height: "38px",
                  width: "100%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontWeight: 600,
                  fontSize: "13px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  padding: "0 14px",
                  whiteSpace: "nowrap",
                }}
                title="Clear Filters"
              >
                <RotateCcw size={14} /> <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Assets Directory</div>
            <div className="card-subtitle">
              Showing {data.length} of {pagination.total || data.length} records (Page {page} of {pagination.totalPages || 1})
            </div>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
              Loading assets...
            </div>
          ) : (
            <div className="table-wrap">
              <table style={{ width: "100%", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th style={{ width: "11%" }}>Asset Tag</th>
                    <th style={{ width: "9%" }}>Type</th>
                    <th style={{ width: "15%" }}>Manufacturer / Model</th>
                    <th style={{ width: "12%" }}>Assigned To</th>
                    <th style={{ width: "10%" }}>Department</th>
                    <th style={{ width: "9%" }}>Status</th>
                    <th style={{ width: "13%" }}>Location</th>
                    <th style={{ width: "15%" }}>Invoice Approval Status</th>
                    <th style={{ width: "6%", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "30px", color: "var(--color-text-muted)" }}>
                        No assets found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    data.map((a) => (
                      <tr key={a._id}>
                        <td style={{ width: "11%", fontWeight: 700, color: "#0f172a", fontSize: "13px", overflowWrap: "break-word" }}>{a.asset_tag}</td>
                        <td style={{ width: "9%", color: "#334155", fontSize: "13px", fontWeight: 500, overflowWrap: "break-word" }}>
                          {a.asset_type || "—"}
                        </td>
                        <td style={{ width: "15%", overflowWrap: "break-word" }}>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>{a.manufacturer || "—"}</div>
                          {a.model && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{a.model}</div>}
                        </td>
                        <td style={{ width: "12%", color: "#334155", fontWeight: 500, overflowWrap: "break-word" }}>{getAssignedToName(a.assigned_to)}</td>
                        <td style={{ width: "10%", color: "#475569", overflowWrap: "break-word" }}>{a.department || "—"}</td>
                        <td style={{ width: "9%" }}>
                          <span className={`score-badge ${getStatusBadgeClass(a.status)}`}>
                            {a.status}
                          </span>
                        </td>
                        <td style={{ width: "13%", color: "#475569", overflowWrap: "break-word" }}>{a.location || "—"}</td>
                        <td style={{ width: "15%", verticalAlign: "top" }}>
                          {(() => {
                            const rawStage = a.approval_stage || "";
                            const rawStatus = a.approval_status || "";
                            const normStage = rawStage.toLowerCase().trim();
                            const normStatus = rawStatus.toLowerCase().trim();
                            const currentCycle = a.approval_cycle || 1;
                            const hasShaliniVerified = Array.isArray(a.admin_verifications) && a.admin_verifications.some(
                              (v) => String(v.username || "").toLowerCase() === "shalini_arun" && (v.approval_cycle === currentCycle || !v.approval_cycle)
                            );
                            const hasManuVerified = Array.isArray(a.admin_verifications) && a.admin_verifications.some(
                              (v) => String(v.username || "").toLowerCase() === "manu_pillai" && (v.approval_cycle === currentCycle || !v.approval_cycle)
                            );

                            const isReturnedToIT =
                              normStage.includes("correction") ||
                              normStatus.includes("returned") ||
                              normStage === "it correction" ||
                              normStatus === "returned to it";

                            const isRejectedStatus =
                              (normStage.includes("reject") || normStatus.includes("reject")) &&
                              !isReturnedToIT;

                            const isCompleted =
                              normStage.includes("completed") || normStatus.includes("completed") || (hasShaliniVerified && hasManuVerified);

                            // Primary status badge colours
                            let badgeColor = "#64748b";
                            let badgeBg = "#f1f5f9";
                            let badgeBorder = "#e2e8f0";
                            let badgeLabel = "Pending Approval";

                            if (isReturnedToIT) {
                              badgeColor = "#c2410c";
                              badgeBg = "#fff7ed";
                              badgeBorder = "#fed7aa";
                              badgeLabel = "Returned to IT";
                            } else if (isRejectedStatus) {
                              badgeColor = "#b91c1c";
                              badgeBg = "#fef2f2";
                              badgeBorder = "#fecaca";
                              badgeLabel = "Rejected";
                            } else if (isCompleted) {
                              badgeColor = "#15803d";
                              badgeBg = "#f0fdf4";
                              badgeBorder = "#bbf7d0";
                              badgeLabel = "Completed";
                            } else if (hasShaliniVerified && !hasManuVerified) {
                              badgeColor = "#1d4ed8";
                              badgeBg = "#eff6ff";
                              badgeBorder = "#bfdbfe";
                              badgeLabel = "Pending manu_pillai";
                            } else {
                              badgeColor = "#92400e";
                              badgeBg = "#fffbeb";
                              badgeBorder = "#fde68a";
                              badgeLabel = "Pending shalini_arun";
                            }

                            // Rejection by info (for tooltip / title)
                            let rejectUser = a.rejected_by_name || a.rejected_by?.username || "";
                            if (!rejectUser && Array.isArray(a.workflow_history)) {
                              const lastReject = [...a.workflow_history].reverse().find((h) =>
                                (h.action || "").toLowerCase().includes("reject") ||
                                (h.action || "").toLowerCase().includes("returned")
                              );
                              rejectUser = lastReject?.performed_by_name || lastReject?.performed_by?.username || "";
                            }

                            // Verifier chips (admin)
                            const verifiers = [];
                            if (!isReturnedToIT && Array.isArray(a.admin_verifications)) {
                              a.admin_verifications.forEach((v) => {
                                const u = v.username || v.name;
                                if (u && !verifiers.some((x) => x.username === u)) {
                                  verifiers.push({ username: u, action: v.action });
                                }
                              });
                            }

                            const rejectTitle = isReturnedToIT
                              ? `Returned to IT${rejectUser ? ` by ${rejectUser}` : ""}${a.rejection_remarks ? `: ${a.rejection_remarks}` : ""}`
                              : isRejectedStatus
                                ? `Rejected${rejectUser ? ` by ${rejectUser}` : ""}${a.rejection_remarks ? `: ${a.rejection_remarks}` : ""}`
                                : badgeLabel;

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {/* Primary Workflow Status Badge — always visible */}
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: badgeColor,
                                    backgroundColor: badgeBg,
                                    border: `1px solid ${badgeBorder}`,
                                    padding: "2px 8px",
                                    borderRadius: "5px",
                                    width: "fit-content",
                                    cursor: rejectUser ? "help" : "default",
                                  }}
                                  title={rejectTitle}
                                >
                                  {isReturnedToIT && <RotateCcw size={11} />}
                                  {isRejectedStatus && <XCircle size={11} />}
                                  {isCompleted && <ShieldCheck size={11} />}
                                  {!isReturnedToIT && !isRejectedStatus && !isCompleted && <Clock size={11} />}
                                  <span>{badgeLabel}</span>
                                </div>

                                {/* Verifier chips */}
                                {verifiers.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                                    {verifiers.map((item, idx) => (
                                      <div
                                        key={`ver-${idx}`}
                                        style={{
                                          fontSize: "11px",
                                          fontWeight: 600,
                                          color: "#166534",
                                          backgroundColor: "#f0fdf4",
                                          border: "1px solid #bbf7d0",
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "3px",
                                          width: "fit-content",
                                        }}
                                        title={`Verified by ${item.username}`}
                                      >
                                        <ShieldCheck size={10} color="#16a34a" />
                                        <span>{item.username}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Rejection remarks short tooltip hint */}
                                {(isReturnedToIT || isRejectedStatus) && a.rejection_remarks && (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "#92400e",
                                      fontStyle: "italic",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: "150px",
                                    }}
                                    title={a.rejection_remarks}
                                  >
                                    {a.rejection_remarks}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ width: "6%", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="btn btn-icon btn-info"
                              onClick={() => {
                                setViewRecord(a);
                                setViewTab("overview");
                                setShowViewModal(true);
                              }}
                              title="View Asset Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-icon btn-primary"
                              onClick={() => handleOpen(a)}
                              title="Edit Asset"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-icon btn-danger"
                              onClick={(e) => handleDelete(e, a._id)}
                              title="Delete Asset"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <ITPagination
            page={page}
            totalPages={pagination.totalPages || Math.max(1, Math.ceil((pagination.total || 1) / limit))}
            totalRecords={pagination.total || 0}
            limit={limit}
            onPageChange={(newPage) => updateQueryParams({ page: newPage })}
            onLimitChange={(newLimit) => updateQueryParams({ limit: newLimit, page: 1 })}
          />
        </div>
      </div>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="md"
        fullWidth
        disableEnforceFocus={showAddVendorModal}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            py: 2,
            borderBottom: "1px solid #f1f5f9",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "9px",
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)",
              }}
            >
              {editId ? <Edit2 size={18} /> : <Plus size={18} />}
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                  {editId ? "Edit Asset" : "New Asset"}
                </Typography>
                <Chip
                  label={form.asset_type}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    border: "1px solid #dbeafe",
                    borderRadius: "6px",
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: "0.76rem", color: "#64748b", mt: 0.2 }}>
                {editId ? "Update hardware configurations and assignments." : "Fill in the asset specifications, status, and assignment details."}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setShowModal(false)}
            size="small"
            sx={{
              color: "#94a3b8",
              borderRadius: "8px",
              "&:hover": { color: "#0f172a", backgroundColor: "#f1f5f9" },
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 3, maxHeight: "calc(82vh - 140px)", overflowY: "auto" }}>
          <Grid container spacing={2}>
            {/* General Identification */}
            <FormSectionTitle icon={Tag} title="Asset Identification" />
            <Grid item xs={6}>
              <TextField
                label="Asset Tag"
                size="small"
                fullWidth
                {...getRequiredProps("asset_tag")}
                value={form.asset_tag}
                onChange={(e) => updateField("asset_tag", e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Asset Type"
                size="small"
                fullWidth
                {...getRequiredProps("asset_type")}
                value={form.asset_type}
                onChange={(e) => {
                  const assetType = e.target.value;
                  const simStatuses = ["Available", "Assigned", "Active", "Inactive"];
                  const printerStatuses = ["Available", "Active", "Repair", "Retired"];
                  const networkStatuses = ["Active", "Spare", "Repair", "Retired"];
                  const softwareStatuses = ["Active", "Expired", "Suspended"];
                  const desktopStatuses = ["Available", "Assigned", "Active", "Inactive", "In Repair", "Retired"];
                  const phoneStatuses = ["Available", "Assigned", "Active", "Inactive", "In Repair", "Retired"];
                  const cableStatuses = ["Available", "Assigned", "In Repair", "Retired"];
                  let nextStatus = form.status;
                  if (assetType === "SIM Card" && !simStatuses.includes(form.status)) nextStatus = "Available";
                  if (assetType === "Printer" && !printerStatuses.includes(form.status)) nextStatus = "Available";
                  if (assetType === "Network Device" && !networkStatuses.includes(form.status)) nextStatus = "Active";
                  if (assetType === "Software" && !softwareStatuses.includes(form.status)) nextStatus = "Active";
                  if ((assetType === "Desktop" || assetType === "Laptop") && !desktopStatuses.includes(form.status)) nextStatus = "Available";
                  if (assetType === "Phone" && !phoneStatuses.includes(form.status)) nextStatus = "Available";
                  if (assetType === "Cable" && !cableStatuses.includes(form.status)) nextStatus = "Available";
                  setForm((f) => ({ ...f, asset_type: assetType, status: nextStatus }));
                  setErrors((current) => {
                    const next = { ...current };
                    const requiredFields = getRequiredFieldsForType(assetType);
                    Object.keys(next).forEach((field) => {
                      if (!requiredFields.includes(field)) delete next[field];
                    });
                    return next;
                  });
                }}
              >
                {ASSET_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {form.asset_type === "SIM Card" ? (
              <>
                <FormSectionTitle icon={Smartphone} title="SIM & Plan Details" />
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="SIM Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("sim_number_iccid")}
                    value={form.sim_number_iccid}
                    onChange={(e) => updateField("sim_number_iccid", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Mobile Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("mobile_number")}
                    value={form.mobile_number}
                    onChange={(e) => updateField("mobile_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="IMSI Number"
                    size="small"
                    fullWidth
                    sx={modalFieldSx}
                    value={form.imsi_number}
                    onChange={(e) => updateField("imsi_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Service Provider"
                    size="small"
                    fullWidth
                    {...getRequiredProps("service_provider")}
                    value={form.service_provider}
                    onChange={(e) => updateField("service_provider", e.target.value)}
                  >
                    <MenuItem value="">Select Service Provider</MenuItem>
                    {SERVICE_PROVIDERS.map((provider) => (
                      <MenuItem key={provider} value={provider}>
                        {provider}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Plan Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("plan_type")}
                    value={form.plan_type}
                    onChange={(e) => updateField("plan_type", e.target.value)}
                  >
                    <MenuItem value="">Select Plan Type</MenuItem>
                    {PLAN_TYPES.map((planType) => (
                      <MenuItem key={planType} value={planType}>
                        {planType}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Monthly Plan/Package"
                    size="small"
                    fullWidth
                    {...getRequiredProps("monthly_plan_package")}
                    value={form.monthly_plan_package}
                    onChange={(e) => updateField("monthly_plan_package", e.target.value)}
                  />
                </Grid>

                <FormSectionTitle icon={UserCheck} title="Assignment & Allocation" />
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Select User</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {renderDepartmentField()}
                <Grid item xs={6}>
                  <TextField
                    label="Assigned Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("allocation_date")}
                    value={form.allocation_date}
                    onChange={(e) => updateField("allocation_date", e.target.value)}
                  />
                </Grid>

                <FormSectionTitle icon={Calendar} title="Procurement & Vendor" />
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={modalFieldSx}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      select
                      label="Vendor"
                      size="small"
                      fullWidth
                      {...getRequiredProps("vendor")}
                      value={form.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                      sx={{ ...modalFieldSx, flex: 1 }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((v) => (
                        <MenuItem key={v._id} value={v._id} title={v.name}>{v.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowAddVendorModal(true)}
                      sx={{
                        height: 38,
                        minWidth: "auto",
                        px: 1.5,
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        borderColor: "#cbd5e1",
                        color: "#2563eb",
                        borderRadius: "8px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          background: "#eff6ff",
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.12)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                      title="Add New Vendor / Supplier"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Vendor
                    </Button>
                  </Box>
                </Grid>

                <FormSectionTitle icon={FileText} title="Additional Notes" />
                <Grid item xs={12}>
                  <TextField
                    label="Remarks"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    sx={modalFieldSx}
                    value={form.remarks}
                    onChange={(e) => updateField("remarks", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Printer" ? (
              <>
                <FormSectionTitle icon={Layers} title="Printer Specifications" />
                <Grid item xs={6}>
                  <TextField
                    label="Printer Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("asset_name")}
                    value={form.asset_name}
                    onChange={(e) => updateField("asset_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Brand"
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Model"
                    size="small"
                    fullWidth
                    {...getRequiredProps("model")}
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("serial_number")}
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Printer Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("printer_type")}
                    value={form.printer_type}
                    onChange={(e) => updateField("printer_type", e.target.value)}
                  >
                    <MenuItem value="">Select Printer Type</MenuItem>
                    {PRINTER_TYPES.map((printerType) => (
                      <MenuItem key={printerType} value={printerType}>
                        {printerType}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Connection Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("connection_type")}
                    value={form.connection_type}
                    onChange={(e) => updateField("connection_type", e.target.value)}
                  >
                    <MenuItem value="">Select Connection Type</MenuItem>
                    {CONNECTION_TYPES.map((connectionType) => (
                      <MenuItem key={connectionType} value={connectionType}>
                        {connectionType}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <FormSectionTitle icon={UserCheck} title="Location & Status" />
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Select User</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {renderDepartmentField()}
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <FormSectionTitle icon={Calendar} title="Procurement & Vendor" />
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Warranty Expiry"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("warranty_expiry")}
                    value={form.warranty_expiry}
                    onChange={(e) => updateField("warranty_expiry", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      select
                      label="Vendor"
                      size="small"
                      fullWidth
                      {...getRequiredProps("vendor")}
                      value={form.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                      sx={{ ...modalFieldSx, flex: 1 }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((v) => (
                        <MenuItem key={v._id} value={v._id} title={v.name}>{v.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowAddVendorModal(true)}
                      sx={{
                        height: 38,
                        minWidth: "auto",
                        px: 1.5,
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        borderColor: "#cbd5e1",
                        color: "#2563eb",
                        borderRadius: "8px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          background: "#eff6ff",
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.12)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                      title="Add New Vendor / Supplier"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Vendor
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Cost"
                    type="number"
                    size="small"
                    fullWidth
                    sx={modalFieldSx}
                    value={form.purchase_cost}
                    onChange={(e) => updateField("purchase_cost", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Network Device" ? (
              <>
                <FormSectionTitle icon={Server} title="Device & Network Details" />
                <Grid item xs={6}>
                  <TextField
                    label="Device Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("asset_name")}
                    value={form.asset_name}
                    onChange={(e) => updateField("asset_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Device Category"
                    size="small"
                    fullWidth
                    {...getRequiredProps("device_category")}
                    value={form.device_category}
                    onChange={(e) => updateField("device_category", e.target.value)}
                  >
                    <MenuItem value="">Select Device Category</MenuItem>
                    {DEVICE_CATEGORIES.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Brand"
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Model"
                    size="small"
                    fullWidth
                    {...getRequiredProps("model")}
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("serial_number")}
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="IP Address"
                    size="small"
                    fullWidth
                    {...getRequiredProps("ip_address")}
                    value={form.ip_address}
                    onChange={(e) => updateField("ip_address", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="MAC Address"
                    size="small"
                    fullWidth
                    {...getRequiredProps("mac_address")}
                    value={form.mac_address}
                    onChange={(e) => updateField("mac_address", e.target.value)}
                  />
                </Grid>

                <FormSectionTitle icon={MapPin} title="Location & Status" />
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <FormSectionTitle icon={Calendar} title="Procurement & Vendor" />
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={modalFieldSx}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Warranty Expiry"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("warranty_expiry")}
                    value={form.warranty_expiry}
                    onChange={(e) => updateField("warranty_expiry", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      select
                      label="Vendor"
                      size="small"
                      fullWidth
                      {...getRequiredProps("vendor")}
                      value={form.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                      sx={{ ...modalFieldSx, flex: 1 }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((v) => (
                        <MenuItem key={v._id} value={v._id} title={v.name}>{v.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowAddVendorModal(true)}
                      sx={{
                        height: 38,
                        minWidth: "auto",
                        px: 1.5,
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        borderColor: "#cbd5e1",
                        color: "#2563eb",
                        borderRadius: "8px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          background: "#eff6ff",
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.12)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                      title="Add New Vendor / Supplier"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Vendor
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Cost"
                    type="number"
                    size="small"
                    fullWidth
                    sx={modalFieldSx}
                    value={form.purchase_cost}
                    onChange={(e) => updateField("purchase_cost", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Software" ? (
              <>
                <FormSectionTitle icon={Layers} title="Software & Licensing Details" />
                <Grid item xs={6}>
                  <TextField
                    label="Software Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("asset_name")}
                    value={form.asset_name}
                    onChange={(e) => updateField("asset_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Software Category"
                    size="small"
                    fullWidth
                    {...getRequiredProps("software_category")}
                    value={form.software_category}
                    onChange={(e) => updateField("software_category", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Version"
                    size="small"
                    fullWidth
                    {...getRequiredProps("version")}
                    value={form.version}
                    onChange={(e) => updateField("version", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="License Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("license_type")}
                    value={form.license_type}
                    onChange={(e) => updateField("license_type", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="License Key / Subscription ID"
                    size="small"
                    fullWidth
                    {...getRequiredProps("license_key_subscription_id")}
                    value={form.license_key_subscription_id}
                    onChange={(e) => updateField("license_key_subscription_id", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Number of Licenses"
                    type="number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("number_of_licenses")}
                    value={form.number_of_licenses}
                    onChange={(e) => updateField("number_of_licenses", e.target.value)}
                  />
                </Grid>

                <FormSectionTitle icon={UserCheck} title="Allocation & Status" />
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Select User</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {renderDepartmentField()}
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <FormSectionTitle icon={Calendar} title="Vendor & Renewal" />
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      select
                      label="Vendor/Publisher"
                      size="small"
                      fullWidth
                      {...getRequiredProps("vendor")}
                      value={form.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                      sx={{ ...modalFieldSx, flex: 1 }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((v) => (
                        <MenuItem key={v._id} value={v._id} title={v.name}>{v.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowAddVendorModal(true)}
                      sx={{
                        height: 38,
                        minWidth: "auto",
                        px: 1.5,
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        borderColor: "#cbd5e1",
                        color: "#2563eb",
                        borderRadius: "8px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          background: "#eff6ff",
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.12)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                      title="Add New Vendor / Supplier"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Vendor
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Expiry/Renewal Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("expiry_renewal_date")}
                    value={form.expiry_renewal_date}
                    onChange={(e) => updateField("expiry_renewal_date", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Phone" ? (
              <>
                <FormSectionTitle icon={Smartphone} title="Device Specifications" />
                <Grid item xs={6}>
                  <TextField
                    label="Brand"
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Model"
                    size="small"
                    fullWidth
                    {...getRequiredProps("model")}
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="IMEI Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("imei_number")}
                    value={form.imei_number}
                    onChange={(e) => updateField("imei_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("serial_number")}
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Mobile Number (if SIM assigned)"
                    size="small"
                    fullWidth
                    {...getRequiredProps("mobile_number")}
                    value={form.mobile_number}
                    onChange={(e) => updateField("mobile_number", e.target.value)}
                  />
                </Grid>

                <FormSectionTitle icon={UserCheck} title="Assignment & Location" />
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Select User</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {renderDepartmentField()}
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <FormSectionTitle icon={Calendar} title="Procurement & Vendor" />
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Warranty Expiry"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("warranty_expiry")}
                    value={form.warranty_expiry}
                    onChange={(e) => updateField("warranty_expiry", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      select
                      label="Vendor"
                      size="small"
                      fullWidth
                      {...getRequiredProps("vendor")}
                      value={form.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                      sx={{ ...modalFieldSx, flex: 1 }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((v) => (
                        <MenuItem key={v._id} value={v._id} title={v.name}>{v.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowAddVendorModal(true)}
                      sx={{
                        height: 38,
                        minWidth: "auto",
                        px: 1.5,
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        borderColor: "#cbd5e1",
                        color: "#2563eb",
                        borderRadius: "8px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          background: "#eff6ff",
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.12)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                      title="Add New Vendor / Supplier"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Vendor
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Cost"
                    type="number"
                    size="small"
                    fullWidth
                    sx={modalFieldSx}
                    value={form.purchase_cost}
                    onChange={(e) => updateField("purchase_cost", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Rack" ? (
              <>
                <FormSectionTitle icon={Server} title="Rack Specifications" />
                <Grid item xs={6}>
                  <TextField
                    label="Rack Name/Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("rack_name")}
                    value={form.rack_name}
                    onChange={(e) => updateField("rack_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Rack Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("rack_type")}
                    value={form.rack_type}
                    onChange={(e) => updateField("rack_type", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Rack Size (U Height)"
                    size="small"
                    fullWidth
                    {...getRequiredProps("rack_size_u_height")}
                    value={form.rack_size_u_height}
                    onChange={(e) => updateField("rack_size_u_height", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Manufacturer/Brand"
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>

                <FormSectionTitle icon={MapPin} title="Deployment & Status" />
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Installation Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("installation_date")}
                    value={form.installation_date}
                    onChange={(e) => updateField("installation_date", e.target.value)}
                  />
                </Grid>

                <FormSectionTitle icon={Calendar} title="Procurement & Vendor" />
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={modalFieldSx}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      select
                      label="Vendor"
                      size="small"
                      fullWidth
                      {...getRequiredProps("vendor")}
                      value={form.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                      sx={{ ...modalFieldSx, flex: 1 }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((v) => (
                        <MenuItem key={v._id} value={v._id} title={v.name}>{v.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowAddVendorModal(true)}
                      sx={{
                        height: 38,
                        minWidth: "auto",
                        px: 1.5,
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        borderColor: "#cbd5e1",
                        color: "#2563eb",
                        borderRadius: "8px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          background: "#eff6ff",
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.12)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                      title="Add New Vendor / Supplier"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Vendor
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Cost"
                    type="number"
                    size="small"
                    fullWidth
                    sx={modalFieldSx}
                    value={form.purchase_cost}
                    onChange={(e) => updateField("purchase_cost", e.target.value)}
                  />
                </Grid>
              </>
            ) : form.asset_type === "Cable" ? (
              <>
                <FormSectionTitle icon={Layers} title="Cable Specifications" />
                <Grid item xs={6}>
                  <TextField
                    label="Cable Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("cable_name")}
                    value={form.cable_name}
                    onChange={(e) => updateField("cable_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Cable Type"
                    size="small"
                    fullWidth
                    {...getRequiredProps("cable_type")}
                    value={form.cable_type}
                    onChange={(e) => updateField("cable_type", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Length"
                    type="number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("length")}
                    value={form.length}
                    onChange={(e) => updateField("length", e.target.value)}
                  />
                </Grid>

                <FormSectionTitle icon={MapPin} title="Deployment & Status" />
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <FormSectionTitle icon={Calendar} title="Procurement & Vendor" />
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      select
                      label="Vendor"
                      size="small"
                      fullWidth
                      {...getRequiredProps("vendor")}
                      value={form.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                      sx={{ ...modalFieldSx, flex: 1 }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((v) => (
                        <MenuItem key={v._id} value={v._id} title={v.name}>{v.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowAddVendorModal(true)}
                      sx={{
                        height: 38,
                        minWidth: "auto",
                        px: 1.5,
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        borderColor: "#cbd5e1",
                        color: "#2563eb",
                        borderRadius: "8px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          background: "#eff6ff",
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.12)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                      title="Add New Vendor / Supplier"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Vendor
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Cost"
                    type="number"
                    size="small"
                    fullWidth
                    sx={modalFieldSx}
                    value={form.purchase_cost}
                    onChange={(e) => updateField("purchase_cost", e.target.value)}
                  />
                </Grid>
              </>
            ) : isComputerAsset ? (
              <>
                <FormSectionTitle icon={Cpu} title="Hardware & Specifications" />
                <Grid item xs={6}>
                  <TextField
                    label="Asset Name"
                    size="small"
                    fullWidth
                    {...getRequiredProps("asset_name")}
                    value={form.asset_name}
                    onChange={(e) => updateField("asset_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label={manufacturerLabel}
                    size="small"
                    fullWidth
                    {...getRequiredProps("manufacturer")}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Model"
                    size="small"
                    fullWidth
                    {...getRequiredProps("model")}
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    {...getRequiredProps("serial_number")}
                    value={form.serial_number}
                    onChange={(e) => updateField("serial_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Processor"
                    size="small"
                    fullWidth
                    {...getRequiredProps("processor")}
                    value={form.processor}
                    onChange={(e) => updateField("processor", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="RAM"
                    size="small"
                    fullWidth
                    {...getRequiredProps("ram")}
                    value={form.ram}
                    onChange={(e) => updateField("ram", e.target.value)}
                  >
                    <MenuItem value="">Select RAM</MenuItem>
                    {RAM_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                    {Boolean(form.ram && !RAM_OPTIONS.includes(form.ram)) && (
                      <MenuItem value={form.ram}>{form.ram}</MenuItem>
                    )}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Storage"
                    size="small"
                    fullWidth
                    {...getRequiredProps("storage")}
                    value={form.storage}
                    onChange={(e) => updateField("storage", e.target.value)}
                  >
                    <MenuItem value="">Select Storage</MenuItem>
                    {STORAGE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                    {Boolean(form.storage && !STORAGE_OPTIONS.includes(form.storage)) && (
                      <MenuItem value={form.storage}>{form.storage}</MenuItem>
                    )}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Operating System"
                    size="small"
                    fullWidth
                    {...getRequiredProps("operating_system")}
                    value={form.operating_system}
                    onChange={(e) => updateField("operating_system", e.target.value)}
                  >
                    <MenuItem value="">Select Operating System</MenuItem>
                    {OPERATING_SYSTEM_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                    {Boolean(form.operating_system && !OPERATING_SYSTEM_OPTIONS.includes(form.operating_system)) && (
                      <MenuItem value={form.operating_system}>{form.operating_system}</MenuItem>
                    )}
                  </TextField>
                </Grid>

                <FormSectionTitle icon={UserCheck} title="Assignment & Status" />
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Select User</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                {renderDepartmentField()}
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    {...getRequiredProps("status")}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <FormSectionTitle icon={Calendar} title="Procurement & Warranty" />
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("purchase_date")}
                    value={form.purchase_date}
                    onChange={(e) => updateField("purchase_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label={warrantyLabel}
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("warranty_expiry")}
                    value={form.warranty_expiry}
                    onChange={(e) => updateField("warranty_expiry", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      select
                      label="Vendor"
                      size="small"
                      fullWidth
                      {...getRequiredProps("vendor")}
                      value={form.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                      sx={{ ...modalFieldSx, flex: 1 }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((v) => (
                        <MenuItem key={v._id} value={v._id} title={v.name}>{v.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowAddVendorModal(true)}
                      sx={{
                        height: 38,
                        minWidth: "auto",
                        px: 1.5,
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        borderColor: "#cbd5e1",
                        color: "#2563eb",
                        borderRadius: "8px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          background: "#eff6ff",
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.12)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                      title="Add New Vendor / Supplier"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Vendor
                    </Button>
                  </Box>
                </Grid>
              </>
            ) : (
              <>
                <FormSectionTitle icon={UserCheck} title="Assignment & Location" />
                <Grid item xs={6}>
                  <TextField
                    label="Assigned To"
                    select
                    size="small"
                    fullWidth
                    {...getRequiredProps("assigned_to")}
                    value={form.assigned_to}
                    onChange={(e) => updateField("assigned_to", e.target.value)}
                  >
                    <MenuItem value="">Select User</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    {...getRequiredProps("assigned_date")}
                    value={form.assigned_date}
                    onChange={(e) => updateField("assigned_date", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Location"
                    size="small"
                    fullWidth
                    {...getRequiredProps("location")}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                  />
                </Grid>

                <FormSectionTitle icon={DollarSign} title="Financial & Vendor Details" />
                <Grid item xs={6}>
                  <TextField
                    label="Purchase Cost"
                    type="number"
                    size="small"
                    fullWidth
                    sx={modalFieldSx}
                    value={form.purchase_cost}
                    onChange={(e) => updateField("purchase_cost", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      select
                      label="Vendor"
                      size="small"
                      fullWidth
                      {...getRequiredProps("vendor")}
                      value={form.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                      sx={{ ...modalFieldSx, flex: 1 }}
                    >
                      <MenuItem value="">Select Vendor</MenuItem>
                      {vendors.map((v) => (
                        <MenuItem key={v._id} value={v._id} title={v.name}>{v.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowAddVendorModal(true)}
                      sx={{
                        height: 38,
                        minWidth: "auto",
                        px: 1.5,
                        whiteSpace: "nowrap",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        borderColor: "#cbd5e1",
                        color: "#2563eb",
                        borderRadius: "8px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          background: "#eff6ff",
                          borderColor: "#93c5fd",
                          color: "#1d4ed8",
                          boxShadow: "0 2px 4px rgba(37, 99, 235, 0.12)",
                        },
                        "&:active": {
                          transform: "scale(0.98)",
                        },
                      }}
                      title="Add New Vendor / Supplier"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Vendor
                    </Button>
                  </Box>
                </Grid>
              </>
            )}

            {/* Asset Invoice Details & Upload Section (Available for all Asset Types) */}
            <FormSectionTitle icon={FileText} title="Asset Invoice Details" />
            <Grid item xs={6}>
              <TextField
                label="Invoice Number"
                size="small"
                fullWidth
                placeholder="e.g. INV-2026-0042"
                sx={modalFieldSx}
                value={form.invoice_number}
                onChange={(e) => updateField("invoice_number", e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Invoice Date"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={modalFieldSx}
                value={form.invoice_date}
                onChange={(e) => updateField("invoice_date", e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Box
                sx={{
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  p: 1.2,
                  px: 2,
                  backgroundColor: form.image_url ? "#f8fafc" : "#fbfcfe",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#3b82f6",
                    backgroundColor: "#eff6ff",
                  },
                }}
              >
                {form.image_url ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <Box
                      onClick={() => {
                        setPreviewInvoiceUrl(form.image_url);
                        setPreviewInvoiceTitle(
                          form.invoice_number ? `Invoice_${form.invoice_number}` : `Invoice_${form.asset_tag || "Asset"}`
                        );
                      }}
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "6px",
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        flexShrink: 0,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: "#3b82f6",
                          transform: "scale(1.02)",
                        },
                      }}
                      title="Click to preview invoice document"
                    >
                      {form.image_url.includes(".pdf") || form.image_url.startsWith("data:application/pdf") ? (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#dc2626" }}>
                          <FileText size={20} />
                          <Typography sx={{ fontSize: "0.6rem", fontWeight: 700 }}>PDF</Typography>
                        </Box>
                      ) : (
                        <img
                          src={form.image_url}
                          alt="Invoice Preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: "150px", textAlign: "left" }}>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#0f172a" }}>
                        Asset Invoice Attached
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                        Invoice document uploaded and ready to save.
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Eye size={13} />}
                        onClick={() => {
                          setPreviewInvoiceUrl(form.image_url);
                          setPreviewInvoiceTitle(
                            form.invoice_number ? `Invoice_${form.invoice_number}` : `Invoice_${form.asset_tag || "Asset"}`
                          );
                        }}
                        disabled={uploadingImage}
                        sx={{
                          textTransform: "none",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          borderRadius: "6px",
                          py: 0.3,
                          px: 1.2,
                          color: "#2563eb",
                          borderColor: "#bfdbfe",
                          backgroundColor: "#eff6ff",
                          "&:hover": {
                            backgroundColor: "#dbeafe",
                            borderColor: "#93c5fd",
                          },
                        }}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        component="label"
                        disabled={uploadingImage}
                        sx={{
                          textTransform: "none",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          borderRadius: "6px",
                          py: 0.3,
                          px: 1.2,
                        }}
                      >
                        Change
                        <input
                          type="file"
                          hidden
                          accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                          onChange={handleImageUpload}
                        />
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => updateField("image_url", "")}
                        disabled={uploadingImage}
                        sx={{
                          textTransform: "none",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          borderRadius: "6px",
                          py: 0.3,
                          px: 1.2,
                        }}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    component="label"
                    sx={{
                      cursor: uploadingImage ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.2,
                      py: 0.5,
                    }}
                  >
                    <input
                      type="file"
                      hidden
                      disabled={uploadingImage}
                      accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                      onChange={handleImageUpload}
                    />
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "6px",
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {uploadingImage ? <RefreshCw className="animate-spin" size={14} /> : <UploadCloud size={15} />}
                    </Box>
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>
                      {uploadingImage ? "Uploading Asset Invoice..." : "Click or drag to upload asset invoice (PDF, PNG, JPG - Max 10MB)"}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Additional Notes (Bottom of Modal) */}
            <FormSectionTitle icon={FileText} title="Additional Notes" />
            <Grid item xs={12}>
              <TextField
                label="Remarks"
                size="small"
                fullWidth
                multiline
                minRows={2}
                sx={modalFieldSx}
                placeholder="Enter any remarks or additional details..."
                value={form.remarks || form.description || ""}
                onChange={(e) => {
                  updateField("remarks", e.target.value);
                  updateField("description", e.target.value);
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #f1f5f9",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
          }}
        >
          <Button
            onClick={() => setShowModal(false)}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "#64748b",
              px: 2.5,
              py: 0.8,
              borderRadius: "8px",
              "&:hover": { backgroundColor: "#e2e8f0", color: "#334155" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !canSave}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              px: 3,
              py: 0.8,
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              "&:hover": {
                background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                boxShadow: "0 6px 16px rgba(37, 99, 235, 0.35)",
              },
              "&:disabled": {
                background: "#94a3b8",
                color: "#ffffff",
              },
            }}
          >
            {saving ? "Saving..." : editId ? "Update Asset" : "Save Asset"}
          </Button>
        </DialogActions>
      </Dialog>

      <AddVendorModal
        isOpen={showAddVendorModal}
        onClose={() => setShowAddVendorModal(false)}
        onSuccess={handleVendorCreated}
        defaultVendorType={form.asset_type === "Software" ? "Software" : "Hardware"}
      />

      {/* View Asset Details Modal */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            maxWidth: "1060px",
            width: "100%",
          },
        }}
      >
        {viewRecord && (() => {
          const theme = getAssetTypeTheme(viewRecord.asset_type);
          const warrantyInfo = getWarrantyStatus(viewRecord.warranty_expiry || viewRecord.expiry_renewal_date);
          const assignedName = getAssignedToName(viewRecord.assigned_to);
          const vendorName = getVendorName(viewRecord.vendor);

          const formatRejectRole = (role) => {
            if (!role) return "";
            const map = {
              head_of_department: "Head of Department",
              sr_manager_accounts: "Sr. Manager Accounts",
              admin: "Admin",
              user: "User",
              it_admin: "IT Admin",
              super_admin: "Super Admin",
            };
            const lower = String(role).toLowerCase();
            if (map[lower]) return map[lower];
            return String(role).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          };

          const latestReject = Array.isArray(viewRecord.workflow_history)
            ? [...viewRecord.workflow_history].reverse().find(
              (h) =>
                (h.action || "").toLowerCase().includes("reject") ||
                (h.stage || "").toLowerCase().includes("reject") ||
                (h.stage || "").toLowerCase().includes("correction") ||
                (h.action || "").toLowerCase().includes("returned") ||
                Boolean(viewRecord.rejection_remarks && (h.remarks === viewRecord.rejection_remarks || (h.action || "").includes(viewRecord.rejection_remarks)))
            )
            : null;

          const rejectedByName =
            viewRecord.rejected_by_name ||
            viewRecord.rejected_by?.username ||
            viewRecord.rejected_by?.name ||
            (viewRecord.rejected_by?.first_name ? `${viewRecord.rejected_by.first_name} ${viewRecord.rejected_by.last_name || ""}`.trim() : "") ||
            latestReject?.performed_by_name ||
            latestReject?.performed_by?.username ||
            (latestReject?.performed_by?.first_name ? `${latestReject.performed_by.first_name} ${latestReject.performed_by.last_name || ""}`.trim() : "") ||
            "";

          const rawRejectRole =
            viewRecord.rejected_by_role ||
            latestReject?.performed_by_role ||
            "";
          const rejectedByRole = formatRejectRole(rawRejectRole);

          const rawRejectDate = viewRecord.rejected_at || latestReject?.timestamp;
          const rejectedAtDate = rawRejectDate
            ? new Date(rawRejectDate).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
            : "";

          const normStatus = String(viewRecord.approval_status || "").toLowerCase();
          const normStage = String(viewRecord.approval_stage || "").toLowerCase();
          const isRejectedEntry =
            Boolean(viewRecord.rejection_remarks) ||
            normStatus.includes("reject") ||
            normStage.includes("reject") ||
            normStatus.includes("returned") ||
            normStage.includes("correction");

          return (
            <>
              {/* ── Dialog Header ── */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 3,
                  py: 2,
                  borderBottom: "1px solid #f1f5f9",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "12px",
                      background: theme.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      boxShadow: `0 4px 12px ${theme.color}40`,
                      flexShrink: 0,
                    }}
                  >
                    {getAssetTypeIcon(viewRecord.asset_type, 22)}
                  </Box>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
                      <Typography sx={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, flexShrink: 0 }}>
                        {viewRecord.asset_name || viewRecord.asset_tag}
                      </Typography>

                      {/* Asset Tag with 1-click Copy */}
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          backgroundColor: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "6px",
                          px: 1,
                          py: "3px",
                          flexShrink: 0,
                        }}
                      >
                        <Typography sx={{ fontSize: "0.76rem", fontWeight: 700, color: "#1d4ed8", lineHeight: 1 }}>
                          {viewRecord.asset_tag}
                        </Typography>
                        <Tooltip title={copiedTag ? "Copied!" : "Copy Asset Tag"}>
                          <IconButton
                            size="small"
                            onClick={() => handleCopyText(viewRecord.asset_tag, "tag")}
                            sx={{ p: 0.2, color: copiedTag ? "#16a34a" : "#3b82f6", "&:hover": { color: "#1d4ed8" } }}
                          >
                            {copiedTag ? <Check size={12} /> : <Copy size={12} />}
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* Status Badge */}
                      {(() => {
                        const norm = String(viewRecord.status || "").toLowerCase();
                        let bg = "#f0fdf4";
                        let color = "#166534";
                        let border = "#bbf7d0";
                        if (norm.includes("assigned")) {
                          bg = "#eff6ff";
                          color = "#1d4ed8";
                          border = "#bfdbfe";
                        } else if (norm.includes("repair") || norm.includes("suspended")) {
                          bg = "#fffbeb";
                          color = "#b45309";
                          border = "#fde68a";
                        } else if (norm.includes("lost") || norm.includes("expired") || norm.includes("damaged") || norm.includes("retired")) {
                          bg = "#fef2f2";
                          color = "#b91c1c";
                          border = "#fecaca";
                        }
                        return (
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              height: 24,
                              px: 1,
                              borderRadius: "6px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              backgroundColor: bg,
                              color: color,
                              border: `1px solid ${border}`,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            {viewRecord.status || "Available"}
                          </Box>
                        );
                      })()}

                      {/* Asset Type Chip */}
                      <Chip
                        label={viewRecord.asset_type || "Hardware"}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          backgroundColor: "#f8fafc",
                          color: "#475569",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          flexShrink: 0,
                        }}
                      />
                    </Box>

                    {/* Meta Subtitle */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.5, flexWrap: "wrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", fontSize: "0.75rem" }}>
                        <Building size={13} color="#94a3b8" />
                        <span>{viewRecord.department || "General Dept"}</span>
                      </Box>
                      <span style={{ color: "#cbd5e1", fontSize: "0.7rem" }}>•</span>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", fontSize: "0.75rem" }}>
                        <MapPin size={13} color="#94a3b8" />
                        <span>{viewRecord.location || "Office"}</span>
                      </Box>
                      <span style={{ color: "#cbd5e1", fontSize: "0.7rem" }}>•</span>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", fontSize: "0.75rem" }}>
                        <UserCheck size={13} color="#94a3b8" />
                        <span>{assignedName}</span>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Header Right Actions */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <IconButton
                    onClick={() => setShowViewModal(false)}
                    size="small"
                    sx={{
                      color: "#94a3b8",
                      borderRadius: "8px",
                      "&:hover": { color: "#0f172a", backgroundColor: "#f1f5f9" },
                    }}
                  >
                    <X size={18} />
                  </IconButton>
                </Box>
              </Box>

              {/* ── Segmented Navigation Tabs ── */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 3,
                  py: 1,
                  borderBottom: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                }}
              >
                <Box sx={{ display: "flex", gap: 0.8, backgroundColor: "#f1f5f9", p: "4px", borderRadius: "10px" }}>
                  {[
                    { id: "overview", label: "Overview & Specs", icon: <Cpu size={14} /> },
                    {
                      id: "procurement",
                      label: "Procurement & Invoice",
                      icon: <Receipt size={14} />,
                      badge: viewRecord.image_url ? "Invoice Attached" : null,
                    },
                    {
                      id: "workflow",
                      label: "Approval & Audit",
                      icon: <ShieldCheck size={14} />,
                      badge:
                        Array.isArray(viewRecord.workflow_history) && viewRecord.workflow_history.length > 0
                          ? `${viewRecord.workflow_history.length}`
                          : null,
                    },
                  ].map((tab) => {
                    const isActive = viewTab === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        onClick={() => setViewTab(tab.id)}
                        size="small"
                        startIcon={tab.icon}
                        sx={{
                          textTransform: "none",
                          fontSize: "0.8rem",
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? "#0f172a" : "#64748b",
                          backgroundColor: isActive ? "#ffffff" : "transparent",
                          boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                          borderRadius: "7px",
                          px: 1.8,
                          py: 0.5,
                          transition: "all 0.15s ease",
                          "&:hover": {
                            backgroundColor: isActive ? "#ffffff" : "rgba(255,255,255,0.6)",
                            color: "#0f172a",
                          },
                        }}
                      >
                        {tab.label}
                        {tab.badge && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.8,
                              px: 0.8,
                              py: "1px",
                              borderRadius: "10px",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              backgroundColor: isActive ? "#eff6ff" : "#e2e8f0",
                              color: isActive ? "#2563eb" : "#475569",
                            }}
                          >
                            {tab.badge}
                          </Box>
                        )}
                      </Button>
                    );
                  })}
                </Box>
                <Typography sx={{ fontSize: "0.74rem", color: "#94a3b8", display: { xs: "none", sm: "block" } }}>
                  Workflow: <strong style={{ color: "#475569" }}>{getWorkflowStatusLabel(viewRecord.approval_stage, viewRecord.approval_status)}</strong>
                </Typography>
              </Box>

              {/* ── Dialog Content Body ── */}
              <DialogContent
                sx={{
                  p: 2.5,
                  backgroundColor: "#f8fafc",
                  maxHeight: "calc(88vh - 140px)",
                  overflowY: "auto",
                }}
              >
                {/* ── TAB 1: OVERVIEW & SPECS (Zero-Scroll Layout) ── */}
                {viewTab === "overview" && (
                  <Grid container spacing={2}>
                    {/* Left Column: Technical Specifications Card */}
                    <Grid item xs={12} md={7}>
                      <Box
                        sx={{
                          backgroundColor: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          p: 2,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                      >
                        {/* Card Header */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            pb: 1.2,
                            mb: 1.5,
                            borderBottom: "1px solid #f1f5f9",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ p: 0.6, borderRadius: "6px", backgroundColor: theme.lightBg, color: theme.color, display: "flex" }}>
                              {getAssetTypeIcon(viewRecord.asset_type, 16)}
                            </Box>
                            <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                              {viewRecord.asset_type === "Software"
                                ? "Software & License Specifications"
                                : viewRecord.asset_type === "SIM Card"
                                  ? "SIM Card & Plan Details"
                                  : viewRecord.asset_type === "Printer"
                                    ? "Printer Specifications"
                                    : viewRecord.asset_type === "Network Device"
                                      ? "Network Device Specifications"
                                      : viewRecord.asset_type === "Rack"
                                        ? "Rack Specifications"
                                        : viewRecord.asset_type === "Cable"
                                          ? "Cable Specifications"
                                          : viewRecord.asset_type === "Phone"
                                            ? "Phone Specifications"
                                            : "Hardware & Device Specifications"}
                            </Typography>
                          </Box>
                          <Chip
                            label={viewRecord.asset_type || "Asset"}
                            size="small"
                            sx={{ fontSize: "0.7rem", height: 20, fontWeight: 600, backgroundColor: "#f1f5f9", color: "#475569" }}
                          />
                        </Box>

                        {/* Spec Grid */}
                        <Grid container spacing={1.2}>
                          {/* Laptop / Desktop / Computer */}
                          {(viewRecord.asset_type === "Laptop" ||
                            viewRecord.asset_type === "Desktop" ||
                            viewRecord.asset_type === "Computer" ||
                            viewRecord.processor ||
                            viewRecord.ram ||
                            viewRecord.storage) && (
                              <>
                                <Grid item xs={6} sm={4}>
                                  <SpecTile label="Brand / Manufacturer" value={viewRecord.manufacturer} />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                  <SpecTile label="Model" value={viewRecord.model} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <SpecTile
                                    label="Serial Number"
                                    value={viewRecord.serial_number}
                                    copyable
                                    onCopy={(val) => handleCopyText(val, "serial")}
                                    isCopied={copiedSerial}
                                  />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                  <SpecTile label="Processor" value={viewRecord.processor} icon={<Cpu size={13} />} />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                  <SpecTile
                                    label="RAM"
                                    value={viewRecord.ram}
                                    isChip
                                    chipColor={{ bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" }}
                                  />
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                  <SpecTile
                                    label="Storage"
                                    value={viewRecord.storage}
                                    isChip
                                    chipColor={{ bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" }}
                                  />
                                </Grid>
                                {viewRecord.operating_system && (
                                  <Grid item xs={6} sm={6}>
                                    <SpecTile label="Operating System" value={viewRecord.operating_system} />
                                  </Grid>
                                )}
                                {viewRecord.asset_name && (
                                  <Grid item xs={6} sm={6}>
                                    <SpecTile label="Asset Name / Hostname" value={viewRecord.asset_name} />
                                  </Grid>
                                )}
                              </>
                            )}

                          {/* SIM Card */}
                          {viewRecord.asset_type === "SIM Card" && (
                            <>
                              <Grid item xs={6} sm={6}>
                                <SpecTile
                                  label="SIM Number (ICCID)"
                                  value={viewRecord.sim_number_iccid}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              <Grid item xs={6} sm={6}>
                                <SpecTile
                                  label="Mobile Number"
                                  value={viewRecord.mobile_number}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Service Provider" value={viewRecord.service_provider} isChip chipColor={{ bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" }} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Plan Type" value={viewRecord.plan_type} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <SpecTile label="Monthly Package" value={viewRecord.monthly_plan_package} />
                              </Grid>
                              {viewRecord.imsi_number && (
                                <Grid item xs={12}>
                                  <SpecTile
                                    label="IMSI Number"
                                    value={viewRecord.imsi_number}
                                    copyable
                                    onCopy={(val) => handleCopyText(val, "serial")}
                                    isCopied={copiedSerial}
                                  />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Printer */}
                          {viewRecord.asset_type === "Printer" && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Manufacturer" value={viewRecord.manufacturer} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Model" value={viewRecord.model} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <SpecTile
                                  label="Serial Number"
                                  value={viewRecord.serial_number}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Printer Type" value={viewRecord.printer_type} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Connection" value={viewRecord.connection_type} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="IP Address" value={viewRecord.ip_address} />
                              </Grid>
                              {viewRecord.mac_address && (
                                <Grid item xs={12}>
                                  <SpecTile
                                    label="MAC Address"
                                    value={viewRecord.mac_address}
                                    copyable
                                    onCopy={(val) => handleCopyText(val, "serial")}
                                    isCopied={copiedSerial}
                                  />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Network Device */}
                          {viewRecord.asset_type === "Network Device" && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Device Name" value={viewRecord.device_name} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Category" value={viewRecord.device_category} isChip chipColor={{ bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc" }} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Brand" value={viewRecord.manufacturer} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Model" value={viewRecord.model} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile
                                  label="Serial Number"
                                  value={viewRecord.serial_number}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="IP Address" value={viewRecord.ip_address} />
                              </Grid>
                              {viewRecord.mac_address && (
                                <Grid item xs={12}>
                                  <SpecTile
                                    label="MAC Address"
                                    value={viewRecord.mac_address}
                                    copyable
                                    onCopy={(val) => handleCopyText(val, "serial")}
                                    isCopied={copiedSerial}
                                  />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Software */}
                          {viewRecord.asset_type === "Software" && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Software Category" value={viewRecord.software_category} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Version" value={viewRecord.version} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="License Type" value={viewRecord.license_type} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Total Licenses" value={viewRecord.number_of_licenses} />
                              </Grid>
                              {viewRecord.license_key_subscription_id && (
                                <Grid item xs={12} sm={8}>
                                  <SpecTile
                                    label="License Key / Subscription ID"
                                    value={viewRecord.license_key_subscription_id}
                                    copyable
                                    onCopy={(val) => handleCopyText(val, "serial")}
                                    isCopied={copiedSerial}
                                  />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Phone */}
                          {viewRecord.asset_type === "Phone" && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Brand" value={viewRecord.manufacturer} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Model" value={viewRecord.model} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile
                                  label="IMEI Number"
                                  value={viewRecord.imei_number}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              {viewRecord.serial_number && (
                                <Grid item xs={12}>
                                  <SpecTile
                                    label="Serial Number"
                                    value={viewRecord.serial_number}
                                    copyable
                                    onCopy={(val) => handleCopyText(val, "serial")}
                                    isCopied={copiedSerial}
                                  />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Rack */}
                          {viewRecord.asset_type === "Rack" && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Rack Name / #" value={viewRecord.rack_name} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Rack Type" value={viewRecord.rack_type} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="U Height" value={viewRecord.rack_size_u_height} />
                              </Grid>
                              {viewRecord.installation_date && (
                                <Grid item xs={12}>
                                  <SpecTile label="Installation Date" value={formatAssetDate(viewRecord.installation_date)} />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Cable */}
                          {viewRecord.asset_type === "Cable" && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Cable Name" value={viewRecord.cable_name} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Cable Type" value={viewRecord.cable_type} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Length" value={viewRecord.length} />
                              </Grid>
                            </>
                          )}
                        </Grid>

                        {/* Remarks / Description Callout inside Left Card if present */}
                        {(viewRecord.remarks || viewRecord.description) && (
                          <Box
                            sx={{
                              mt: 2,
                              pt: 1.5,
                              borderTop: "1px solid #f1f5f9",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1,
                            }}
                          >
                            <FileText size={14} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                            <Box>
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                Remarks & Description
                              </Typography>
                              <Typography sx={{ fontSize: "0.8rem", color: "#334155", mt: 0.3, lineHeight: 1.4 }}>
                                {viewRecord.remarks || viewRecord.description}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Grid>

                    {/* Right Column: Assignment & Location + Quick Warranty / Financial Snapshot */}
                    <Grid item xs={12} md={5}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {/* Assignment & Location Card */}
                        <Box
                          sx={{
                            backgroundColor: "#ffffff",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            p: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1.2, mb: 1.5, borderBottom: "1px solid #f1f5f9" }}>
                            <Box sx={{ p: 0.6, borderRadius: "6px", backgroundColor: "#f0fdf4", color: "#16a34a", display: "flex" }}>
                              <UserCheck size={16} />
                            </Box>
                            <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                              Assignment & Location
                            </Typography>
                          </Box>

                          {/* Assigned User Hero Card */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              p: 1.2,
                              backgroundColor: "#f8fafc",
                              borderRadius: "9px",
                              border: "1px solid #f1f5f9",
                              mb: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.82rem",
                                flexShrink: 0,
                                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
                              }}
                            >
                              {getAssignedUserInitials(assignedName)}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                                Assigned User
                              </Typography>
                              <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {assignedName}
                              </Typography>
                            </Box>
                            <Chip
                              label={viewRecord.assigned_to ? "Assigned" : "Unallocated"}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                backgroundColor: viewRecord.assigned_to ? "#dcfce7" : "#f1f5f9",
                                color: viewRecord.assigned_to ? "#15803d" : "#64748b",
                              }}
                            />
                          </Box>

                          <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Department</Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.2 }}>
                                <Building size={13} color="#64748b" />
                                <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600 }}>
                                  {viewRecord.department || "—"}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Physical Location</Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.2 }}>
                                <MapPin size={13} color="#64748b" />
                                <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600 }}>
                                  {viewRecord.location || "—"}
                                </Typography>
                              </Box>
                            </Grid>
                            {viewRecord.assigned_date && (
                              <Grid item xs={12}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, pt: 0.8, borderTop: "1px dashed #f1f5f9" }}>
                                  <Calendar size={13} color="#64748b" />
                                  <Typography sx={{ fontSize: "0.74rem", color: "#64748b" }}>
                                    Assigned on: <strong style={{ color: "#334155" }}>{formatAssetDate(viewRecord.assigned_date)}</strong>
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                        </Box>

                        {/* Warranty & Financial Snapshot Card */}
                        <Box
                          sx={{
                            backgroundColor: "#ffffff",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            p: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1.2, mb: 1.5, borderBottom: "1px solid #f1f5f9" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box sx={{ p: 0.6, borderRadius: "6px", backgroundColor: "#fff7ed", color: "#ea580c", display: "flex" }}>
                                <Calendar size={16} />
                              </Box>
                              <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                                Procurement & Warranty
                              </Typography>
                            </Box>
                            {warrantyInfo && (
                              <Chip
                                label={warrantyInfo.label}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  backgroundColor: warrantyInfo.bg,
                                  color: warrantyInfo.color,
                                  border: `1px solid ${warrantyInfo.border}`,
                                }}
                              />
                            )}
                          </Box>

                          <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Purchase Date</Typography>
                              <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, mt: 0.2 }}>
                                {formatAssetDate(viewRecord.purchase_date)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Warranty Expiry</Typography>
                              <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, mt: 0.2 }}>
                                {formatAssetDate(viewRecord.warranty_expiry || viewRecord.expiry_renewal_date)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Vendor / Supplier</Typography>
                              <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, mt: 0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {vendorName}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Purchase Cost</Typography>
                              <Typography sx={{ fontSize: "0.88rem", color: "#166534", fontWeight: 700, mt: 0.2 }}>
                                {viewRecord.purchase_cost ? `₹${Number(viewRecord.purchase_cost).toLocaleString("en-IN")}` : "—"}
                              </Typography>
                            </Grid>
                          </Grid>

                          {/* Quick link button to Tab 2 if invoice is attached */}
                          {viewRecord.image_url ? (
                            <Box
                              onClick={() => setViewTab("procurement")}
                              sx={{
                                mt: 1.5,
                                p: 0.8,
                                px: 1.2,
                                borderRadius: "8px",
                                backgroundColor: "#eff6ff",
                                border: "1px solid #dbeafe",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                "&:hover": { backgroundColor: "#dbeafe" },
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Receipt size={14} color="#2563eb" />
                                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#1e40af" }}>
                                  Invoice Attached ({viewRecord.invoice_number || "View Doc"})
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#2563eb" }}>
                                View →
                              </Typography>
                            </Box>
                          ) : (
                            <Box
                              onClick={() => setViewTab("procurement")}
                              sx={{
                                mt: 1.5,
                                pt: 1,
                                borderTop: "1px dashed #f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer",
                              }}
                            >
                              <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                                Financial & billing details
                              </Typography>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: "#2563eb" }}>
                                View Full Tab →
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {/* ── TAB 2: PROCUREMENT & INVOICE ── */}
                {viewTab === "procurement" && (
                  <Grid container spacing={2.5}>
                    {/* Left: Financial & Procurement Overview */}
                    <Grid item xs={12} md={6}>
                      <Box
                        sx={{
                          backgroundColor: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          p: 2.5,
                          height: "100%",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1.5, mb: 2, borderBottom: "1px solid #f1f5f9" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ p: 0.6, borderRadius: "6px", backgroundColor: "#ecfdf5", color: "#059669", display: "flex" }}>
                              <DollarSign size={16} />
                            </Box>
                            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                              Financial & Warranty Overview
                            </Typography>
                          </Box>
                          {warrantyInfo && (
                            <Chip
                              label={warrantyInfo.label}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                backgroundColor: warrantyInfo.bg,
                                color: warrantyInfo.color,
                                border: `1px solid ${warrantyInfo.border}`,
                              }}
                            />
                          )}
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Purchase Cost</Typography>
                            <Typography sx={{ fontSize: "0.95rem", color: "#166534", fontWeight: 700, mt: 0.3 }}>
                              {viewRecord.purchase_cost ? `₹${Number(viewRecord.purchase_cost).toLocaleString("en-IN")}` : "Not Specified"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Purchase Date</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                              {formatAssetDate(viewRecord.purchase_date)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Warranty Expiry</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                              {formatAssetDate(viewRecord.warranty_expiry || viewRecord.expiry_renewal_date)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Vendor / Supplier</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                              {vendorName}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>

                    {/* Right: Attached Invoice & Billing Document */}
                    <Grid item xs={12} md={6}>
                      <Box
                        sx={{
                          backgroundColor: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          p: 2.5,
                          height: "100%",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1.5, mb: 2, borderBottom: "1px solid #f1f5f9" }}>
                          <Box sx={{ p: 0.6, borderRadius: "6px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex" }}>
                            <Receipt size={16} />
                          </Box>
                          <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                            Invoice & Billing Details
                          </Typography>
                        </Box>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Invoice Number</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 700, mt: 0.3 }}>
                              {viewRecord.invoice_number || "—"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Invoice Date</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                              {formatAssetDate(viewRecord.invoice_date)}
                            </Typography>
                          </Grid>
                        </Grid>

                        {/* Document Thumbnail / Attachment */}
                        {viewRecord.image_url ? (
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: "10px",
                              backgroundColor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Box
                              onClick={() => {
                                setPreviewInvoiceUrl(viewRecord.image_url);
                                setPreviewInvoiceTitle(
                                  viewRecord.invoice_number
                                    ? `Invoice_${viewRecord.invoice_number}`
                                    : `Invoice_${viewRecord.asset_tag || "Asset"}`
                                );
                              }}
                              sx={{
                                width: 76,
                                height: 76,
                                borderRadius: "8px",
                                overflow: "hidden",
                                border: "1px solid #cbd5e1",
                                flexShrink: 0,
                                backgroundColor: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                  borderColor: "#3b82f6",
                                  transform: "scale(1.03)",
                                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                                },
                              }}
                              title="Click to preview invoice document"
                            >
                              {viewRecord.image_url.includes(".pdf") || viewRecord.image_url.startsWith("data:application/pdf") ? (
                                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#dc2626" }}>
                                  <FileText size={30} />
                                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, mt: 0.3 }}>PDF</Typography>
                                </Box>
                              ) : (
                                <img
                                  src={viewRecord.image_url}
                                  alt={viewRecord.asset_tag}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                                {viewRecord.invoice_number ? `Invoice #${viewRecord.invoice_number}` : "Asset Invoice Document"}
                              </Typography>
                              <Typography sx={{ fontSize: "0.74rem", color: "#64748b", mt: 0.3 }}>
                                Official purchase invoice & billing documentation
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, mt: 1.2, flexWrap: "wrap" }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<Eye size={13} />}
                                  onClick={() => {
                                    setPreviewInvoiceUrl(viewRecord.image_url);
                                    setPreviewInvoiceTitle(
                                      viewRecord.invoice_number
                                        ? `Invoice_${viewRecord.invoice_number}`
                                        : `Invoice_${viewRecord.asset_tag || "Asset"}`
                                    );
                                  }}
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    borderRadius: "6px",
                                    py: 0.3,
                                    px: 1.2,
                                  }}
                                >
                                  Preview
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<Download size={13} />}
                                  onClick={() =>
                                    handleDownloadInvoice(
                                      viewRecord.image_url,
                                      viewRecord.invoice_number
                                        ? `Invoice_${viewRecord.invoice_number}`
                                        : `Invoice_${viewRecord.asset_tag || "Asset"}`
                                    )
                                  }
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    borderRadius: "6px",
                                    py: 0.3,
                                    px: 1.2,
                                    backgroundColor: "#2563eb",
                                    "&:hover": { backgroundColor: "#1d4ed8" },
                                  }}
                                >
                                  Download
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              p: 3,
                              borderRadius: "10px",
                              border: "2px dashed #cbd5e1",
                              backgroundColor: "#f8fafc",
                              textAlign: "center",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Receipt size={32} color="#94a3b8" />
                            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", mt: 1 }}>
                              No Invoice Document Attached
                            </Typography>
                            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", mt: 0.3 }}>
                              You can attach a PDF or image invoice by editing this asset.
                            </Typography>
                          </Box>
                        )}

                        {/* Invoice Approval Status & Actions */}
                        <Box
                          sx={{
                            mt: 2.5,
                            pt: 2,
                            borderTop: "1px solid #f1f5f9",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                              <Box sx={{ p: 0.5, borderRadius: "6px", backgroundColor: "#f0fdf4", color: "#16a34a", display: "flex" }}>
                                <ShieldCheck size={16} />
                              </Box>
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>
                                Invoice Approval Status
                              </Typography>
                            </Box>
                            <span className={`score-badge ${getWorkflowBadgeClass(viewRecord.approval_stage, viewRecord.approval_status)}`}>
                              {getWorkflowStatusLabel(viewRecord.approval_stage, viewRecord.approval_status)}
                            </span>
                          </Box>

                          {/* Rejection remarks if any */}
                          {viewRecord.rejection_remarks && (
                            <Box
                              sx={{
                                p: 1.6,
                                mb: 1.6,
                                borderRadius: "10px",
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fecaca",
                                boxShadow: "0 1px 3px rgba(239, 68, 68, 0.06)",
                              }}
                            >
                              {/* Header: Rejecting User + Timestamp */}
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
                                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8 }}>
                                  <Box
                                    sx={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: "50%",
                                      backgroundColor: "#fee2e2",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid #fca5a5",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <XCircle size={13} color="#dc2626" />
                                  </Box>
                                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#991b1b" }}>
                                    Rejected by: <span style={{ color: "#7f1d1d" }}>{rejectedByName || "Approver"}</span>
                                    {rejectedByRole && <span style={{ color: "#b91c1c", fontWeight: 500 }}> ({rejectedByRole})</span>}
                                  </Typography>
                                </Box>

                                {rejectedAtDate && (
                                  <Typography sx={{ fontSize: "0.72rem", color: "#991b1b", fontWeight: 500, fontStyle: "italic" }}>
                                    {rejectedAtDate}
                                  </Typography>
                                )}
                              </Box>

                              {/* Remarks Box */}
                              <Box
                                sx={{
                                  backgroundColor: "#ffffff",
                                  p: 1.2,
                                  px: 1.5,
                                  borderRadius: "7px",
                                  border: "1px solid #fee2e2",
                                }}
                              >
                                <Typography sx={{ fontSize: "0.84rem", color: "#7f1d1d", fontWeight: 500, lineHeight: 1.55 }}>
                                  {viewRecord.rejection_remarks}
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          {/* Verification Badges for shalini_arun & manu_pillai - NEVER shown on active entry view when rejected */}
                          {!isRejectedEntry && (
                            <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap", mb: 1.5 }}>
                              {/* 1st Approver badge (shalini_arun) */}
                              {((viewRecord.admin_verifications || []).some(
                                (v) => String(v.username || "").toLowerCase() === "shalini_arun" || v.action === "approved_first"
                              ) ||
                                String(viewRecord.approval_stage || "") === "Second Admin Approval" ||
                                String(viewRecord.approval_status || "").toLowerCase().includes("completed")) ? (
                                <Chip
                                  size="small"
                                  icon={<Check size={12} color="#16a34a" />}
                                  label="1st Approved: shalini_arun"
                                  sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 600,
                                    backgroundColor: "#f0fdf4",
                                    color: "#166534",
                                    border: "1px solid #bbf7d0",
                                  }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  icon={<Clock size={12} color="#ca8a04" />}
                                  label="Pending 1st Approval: shalini_arun"
                                  sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 600,
                                    backgroundColor: "#fefce8",
                                    color: "#854d0e",
                                    border: "1px solid #fef08a",
                                  }}
                                />
                              )}

                              {/* 2nd Approver badge (manu_pillai) */}
                              {((viewRecord.admin_verifications || []).some(
                                (v) => String(v.username || "").toLowerCase() === "manu_pillai" || v.action === "approved_final"
                              ) ||
                                String(viewRecord.approval_status || "").toLowerCase().includes("completed")) ? (
                                <Chip
                                  size="small"
                                  icon={<Check size={12} color="#16a34a" />}
                                  label="Final Approved: manu_pillai"
                                  sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 600,
                                    backgroundColor: "#f0fdf4",
                                    color: "#166534",
                                    border: "1px solid #bbf7d0",
                                  }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  icon={<Clock size={12} color="#ca8a04" />}
                                  label="Pending Final Approval: manu_pillai"
                                  sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 600,
                                    backgroundColor: "#fefce8",
                                    color: "#854d0e",
                                    border: "1px solid #fef08a",
                                  }}
                                />
                              )}
                            </Box>
                          )}

                          {/* Role-based Workflow Action Buttons */}
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                            {/* Step 1: First Admin Approval (shalini_arun) */}
                            {!isRejectedEntry &&
                              !String(viewRecord.approval_status || "").toLowerCase().includes("completed") &&
                              !(
                                viewRecord.approval_stage === "IT Correction" ||
                                viewRecord.approval_status === "Returned to IT" ||
                                viewRecord.approval_stage === "Second Admin Approval" ||
                                viewRecord.approval_status === "Pending Final Approval (manu_pillai)"
                              ) && (
                                isShalini ? (
                                  <>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={<Check size={14} />}
                                      onClick={() => handleWorkflowAction(viewRecord._id, "approve_admin")}
                                      disabled={submittingWorkflow}
                                      sx={{
                                        textTransform: "none",
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        borderRadius: "8px",
                                        backgroundColor: "#16a34a",
                                        "&:hover": { backgroundColor: "#15803d" },
                                        boxShadow: "none",
                                      }}
                                    >
                                      Approve (1st Approval)
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      startIcon={<X size={14} />}
                                      onClick={() => {
                                        setRejectAssetRecord(viewRecord);
                                        setRejectActionType("reject_admin");
                                        setShowRejectModal(true);
                                      }}
                                      disabled={submittingWorkflow}
                                      sx={{
                                        textTransform: "none",
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        borderRadius: "8px",
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                ) : (
                                  <Box
                                    sx={{
                                      p: 0.8,
                                      px: 1.2,
                                      borderRadius: "8px",
                                      backgroundColor: "#eff6ff",
                                      border: "1px solid #bfdbfe",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.8,
                                    }}
                                  >
                                    <Typography sx={{ fontSize: "0.74rem", color: "#1e40af", fontWeight: 600 }}>
                                      ⏳ Awaiting 1st Approval from shalini_arun
                                    </Typography>
                                  </Box>
                                )
                              )}

                            {/* Step 2: Second / Final Admin Approval (manu_pillai) */}
                            {!isRejectedEntry &&
                              !String(viewRecord.approval_status || "").toLowerCase().includes("completed") &&
                              !(
                                viewRecord.approval_stage === "IT Correction" ||
                                viewRecord.approval_status === "Returned to IT"
                              ) &&
                              (viewRecord.approval_stage === "Second Admin Approval" ||
                               viewRecord.approval_status === "Pending Final Approval (manu_pillai)") && (
                                isManu ? (
                                  <>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={<Check size={14} />}
                                      onClick={() => handleWorkflowAction(viewRecord._id, "approve_admin")}
                                      disabled={submittingWorkflow}
                                      sx={{
                                        textTransform: "none",
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        borderRadius: "8px",
                                        backgroundColor: "#16a34a",
                                        "&:hover": { backgroundColor: "#15803d" },
                                        boxShadow: "none",
                                      }}
                                    >
                                      Approve (Final Approval)
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      startIcon={<X size={14} />}
                                      onClick={() => {
                                        setRejectAssetRecord(viewRecord);
                                        setRejectActionType("reject_admin");
                                        setShowRejectModal(true);
                                      }}
                                      disabled={submittingWorkflow}
                                      sx={{
                                        textTransform: "none",
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        borderRadius: "8px",
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                ) : (
                                  <Box
                                    sx={{
                                      p: 0.8,
                                      px: 1.2,
                                      borderRadius: "8px",
                                      backgroundColor: "#eff6ff",
                                      border: "1px solid #bfdbfe",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.8,
                                    }}
                                  >
                                    <Typography sx={{ fontSize: "0.74rem", color: "#1e40af", fontWeight: 600 }}>
                                      ⏳ Awaiting Final Approval from manu_pillai
                                    </Typography>
                                  </Box>
                                )
                              )}

                            {/* Returned / IT Correction Stage — Resubmit button visible ONLY for IT users */}
                            {(viewRecord.approval_stage === "IT Correction" ||
                              viewRecord.approval_status === "Returned to IT") &&
                              isPureITDept && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<RotateCcw size={14} />}
                                  onClick={() => {
                                    setResubmitAssetRecord(viewRecord);
                                    setResubmitInvoiceUrl(viewRecord.image_url || "");
                                    setResubmitInvoiceNumber(viewRecord.invoice_number || "");
                                    setResubmitInvoiceDate(
                                      viewRecord.invoice_date ? String(viewRecord.invoice_date).slice(0, 10) : ""
                                    );
                                    setResubmitRemarks("");
                                    setShowResubmitModal(true);
                                  }}
                                  disabled={submittingWorkflow}
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    borderRadius: "8px",
                                    backgroundColor: "#2563eb",
                                    "&:hover": { backgroundColor: "#1d4ed8" },
                                    boxShadow: "none",
                                  }}
                                >
                                  Resubmit for Approval
                                </Button>
                              )}

                            {/* Informational banner when an asset is in Returned to IT stage */}
                            {(viewRecord.approval_stage === "IT Correction" ||
                              viewRecord.approval_status === "Returned to IT") &&
                              !isPureITDept && (
                                <Box
                                  sx={{
                                    p: 1,
                                    px: 1.5,
                                    borderRadius: "8px",
                                    backgroundColor: "#fff7ed",
                                    border: "1px dashed #fdba74",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography sx={{ fontSize: "0.74rem", color: "#c2410c", fontStyle: "italic", fontWeight: 500 }}>
                                    ⏳ Returned to IT — Awaiting IT Department to make corrections and resubmit.
                                  </Typography>
                                </Box>
                              )}

                            {/* Rejected Stage — Admin sees Return to IT button */}
                            {(viewRecord.approval_stage === "Rejected" ||
                              viewRecord.approval_status === "Rejected") &&
                              isAdmin && (
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  size="small"
                                  startIcon={<RotateCcw size={14} />}
                                  onClick={() => {
                                    setReturnToITAssetRecord(viewRecord);
                                    setReturnToITRemarks("");
                                    setShowReturnToITModal(true);
                                  }}
                                  disabled={submittingWorkflow}
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    borderRadius: "8px",
                                    borderColor: "#f97316",
                                    color: "#c2410c",
                                    backgroundColor: "#fff7ed",
                                    "&:hover": { borderColor: "#ea580c", backgroundColor: "#ffedd5" },
                                  }}
                                >
                                  Return to IT
                                </Button>
                              )}
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {/* ── TAB 3: APPROVAL & WORKFLOW AUDIT ── */}
                {viewTab === "workflow" && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {/* Workflow Status Card */}
                    <Box
                      sx={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        p: 2.2,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1.2, mb: 2, borderBottom: "1px solid #f1f5f9" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ p: 0.6, borderRadius: "6px", backgroundColor: "#f0fdf4", color: "#16a34a", display: "flex" }}>
                            <ShieldCheck size={16} />
                          </Box>
                          <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>
                            Approval Workflow & Verification Status
                          </Typography>
                        </Box>
                        <span className={`score-badge ${getWorkflowBadgeClass(viewRecord.approval_stage, viewRecord.approval_status)}`}>
                          {getWorkflowStatusLabel(viewRecord.approval_stage, viewRecord.approval_status)}
                        </span>
                      </Box>

                      {/* Stepper Progress Bar */}
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2.5, px: 1 }}>
                        {[
                          { label: "1. Created", done: true },
                          {
                            label: "2. shalini_arun (1st Approval)",
                            done:
                              !(
                                String(viewRecord.approval_stage || "").toLowerCase().includes("correction") ||
                                String(viewRecord.approval_status || "").toLowerCase().includes("returned")
                              ) &&
                              ((Array.isArray(viewRecord.admin_verifications) &&
                                viewRecord.admin_verifications.some(
                                  (v) => String(v.username || "").toLowerCase() === "shalini_arun" || v.action === "approved_first"
                                )) ||
                                String(viewRecord.approval_stage || "") === "Second Admin Approval" ||
                                String(viewRecord.approval_status || "").toLowerCase().includes("completed")),
                            active:
                              !String(viewRecord.approval_status || "").toLowerCase().includes("completed") &&
                              !String(viewRecord.approval_status || "").toLowerCase().includes("reject") &&
                              !(String(viewRecord.approval_stage || "") === "Second Admin Approval" ||
                                viewRecord.approval_status === "Pending Final Approval (manu_pillai)"),
                          },
                          {
                            label: "3. manu_pillai (Final Approval)",
                            done:
                              !(
                                String(viewRecord.approval_stage || "").toLowerCase().includes("correction") ||
                                String(viewRecord.approval_status || "").toLowerCase().includes("returned")
                              ) &&
                              ((Array.isArray(viewRecord.admin_verifications) &&
                                viewRecord.admin_verifications.some(
                                  (v) => String(v.username || "").toLowerCase() === "manu_pillai" || v.action === "approved_final"
                                )) ||
                                String(viewRecord.approval_status || "").toLowerCase().includes("completed")),
                            active:
                              (String(viewRecord.approval_stage || "") === "Second Admin Approval" ||
                               viewRecord.approval_status === "Pending Final Approval (manu_pillai)") &&
                              !String(viewRecord.approval_status || "").toLowerCase().includes("completed") &&
                              !String(viewRecord.approval_status || "").toLowerCase().includes("reject"),
                          },
                          {
                            label: "4. Completed",
                            done: String(viewRecord.approval_status || "").toLowerCase().includes("completed"),
                          },
                        ].map((step, idx, arr) => (
                          <React.Fragment key={idx}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: "50%",
                                  backgroundColor: step.done ? "#16a34a" : step.active ? "#2563eb" : "#e2e8f0",
                                  color: step.done || step.active ? "#ffffff" : "#64748b",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                }}
                              >
                                {step.done ? <Check size={13} /> : idx + 1}
                              </Box>
                              <Typography
                                sx={{
                                  fontSize: "0.78rem",
                                  fontWeight: step.active || step.done ? 700 : 500,
                                  color: step.active ? "#1d4ed8" : step.done ? "#166534" : "#64748b",
                                }}
                              >
                                {step.label}
                              </Typography>
                            </Box>
                            {idx < arr.length - 1 && (
                              <Box
                                sx={{
                                  flex: 1,
                                  height: 2,
                                  backgroundColor: step.done ? "#16a34a" : "#e2e8f0",
                                  mx: 1.5,
                                }}
                              />
                            )}
                          </React.Fragment>
                        ))}
                      </Box>

                      {/* Verification Details - 2-tier approval cards */}
                      <Grid container spacing={2}>
                        {/* 1. First Admin Approval (shalini_arun) */}
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 1.5, backgroundColor: "#f8fafc", borderRadius: "9px", border: "1px solid #f1f5f9", height: "100%" }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                                1. First Admin Approval (shalini_arun)
                              </Typography>
                              {isShalini &&
                                !(
                                  Array.isArray(viewRecord.admin_verifications) &&
                                  viewRecord.admin_verifications.some(
                                    (v) => String(v.username || "").toLowerCase() === "shalini_arun" || v.action === "approved_first"
                                  )
                                ) &&
                                !(
                                  viewRecord.approval_stage === "Second Admin Approval" ||
                                  String(viewRecord.approval_status || "").toLowerCase().includes("completed") ||
                                  viewRecord.approval_stage === "IT Correction" ||
                                  viewRecord.approval_status === "Returned to IT"
                                ) && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    onClick={() => handleWorkflowAction(viewRecord._id, "approve_admin")}
                                    disabled={submittingWorkflow}
                                    sx={{ fontSize: "0.7rem", textTransform: "none", py: 0.1, px: 1, fontWeight: 700, borderRadius: "6px" }}
                                  >
                                    + Approve (shalini_arun)
                                  </Button>
                                )}
                            </Box>
                            {Array.isArray(viewRecord.admin_verifications) &&
                            viewRecord.admin_verifications.some(
                              (v) => String(v.username || "").toLowerCase() === "shalini_arun" || v.action === "approved_first"
                            ) ? (
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                                {viewRecord.admin_verifications
                                  .filter((v) => String(v.username || "").toLowerCase() === "shalini_arun" || v.action === "approved_first")
                                  .map((v, idx) => (
                                    <Chip
                                      key={idx}
                                      icon={<ShieldCheck size={13} color="#16a34a" />}
                                      label={`Approved by ${v.username || "shalini_arun"}${v.timestamp ? " on " + new Date(v.timestamp).toLocaleDateString() : ""}`}
                                      size="small"
                                      sx={{
                                        height: 24,
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        backgroundColor: "#f0fdf4",
                                        color: "#166534",
                                        border: "1px solid #bbf7d0",
                                        width: "fit-content",
                                      }}
                                    />
                                  ))}
                              </Box>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>
                                Pending 1st Approval from shalini_arun
                              </Typography>
                            )}
                          </Box>
                        </Grid>

                        {/* 2. Final Admin Approval (manu_pillai) */}
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 1.5, backgroundColor: "#f8fafc", borderRadius: "9px", border: "1px solid #f1f5f9", height: "100%" }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                                2. Final Admin Approval (manu_pillai)
                              </Typography>
                              {isManu &&
                                (viewRecord.approval_stage === "Second Admin Approval" ||
                                 viewRecord.approval_status === "Pending Final Approval (manu_pillai)") &&
                                !(
                                  Array.isArray(viewRecord.admin_verifications) &&
                                  viewRecord.admin_verifications.some(
                                    (v) => String(v.username || "").toLowerCase() === "manu_pillai" || v.action === "approved_final"
                                  )
                                ) &&
                                !String(viewRecord.approval_status || "").toLowerCase().includes("completed") && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    onClick={() => handleWorkflowAction(viewRecord._id, "approve_admin")}
                                    disabled={submittingWorkflow}
                                    sx={{ fontSize: "0.7rem", textTransform: "none", py: 0.1, px: 1, fontWeight: 700, borderRadius: "6px" }}
                                  >
                                    + Approve (manu_pillai)
                                  </Button>
                                )}
                            </Box>
                            {Array.isArray(viewRecord.admin_verifications) &&
                            viewRecord.admin_verifications.some(
                              (v) => String(v.username || "").toLowerCase() === "manu_pillai" || v.action === "approved_final"
                            ) ? (
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                                {viewRecord.admin_verifications
                                  .filter((v) => String(v.username || "").toLowerCase() === "manu_pillai" || v.action === "approved_final")
                                  .map((v, idx) => (
                                    <Chip
                                      key={idx}
                                      icon={<ShieldCheck size={13} color="#16a34a" />}
                                      label={`Approved by ${v.username || "manu_pillai"}${v.timestamp ? " on " + new Date(v.timestamp).toLocaleDateString() : ""}`}
                                      size="small"
                                      sx={{
                                        height: 24,
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        backgroundColor: "#f0fdf4",
                                        color: "#166534",
                                        border: "1px solid #bbf7d0",
                                        width: "fit-content",
                                      }}
                                    />
                                  ))}
                              </Box>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>
                                {viewRecord.approval_stage === "Second Admin Approval" ||
                                 viewRecord.approval_status === "Pending Final Approval (manu_pillai)"
                                  ? "Pending Final Approval from manu_pillai"
                                  : "Awaiting 1st Approval (shalini_arun) first"}
                              </Typography>
                            )}
                          </Box>
                        </Grid>

                        {/* Rejection remarks */}
                        {viewRecord.rejection_remarks && (
                          <Grid item xs={12}>
                            <Box
                              sx={{
                                p: 1.8,
                                background: "linear-gradient(180deg, #fff5f5 0%, #fef2f2 100%)",
                                borderRadius: "10px",
                                border: "1px solid #fecaca",
                                boxShadow: "0 1px 3px rgba(239, 68, 68, 0.08)",
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 0.8, mb: 1 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Box
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: "50%",
                                      backgroundColor: "#fee2e2",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid #fca5a5",
                                    }}
                                  >
                                    <XCircle size={14} color="#dc2626" />
                                  </Box>
                                  <Typography sx={{ fontSize: "0.76rem", fontWeight: 700, color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Rejection Details / Remarks
                                  </Typography>
                                </Box>

                                <Chip
                                  size="small"
                                  icon={<XCircle size={12} color="#b91c1c" />}
                                  label={`Rejected by: ${rejectedByName || "Approver"}${rejectedByRole ? ` (${rejectedByRole})` : ""}`}
                                  sx={{
                                    height: 22,
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    backgroundColor: "#fee2e2",
                                    color: "#991b1b",
                                    border: "1px solid #fca5a5",
                                  }}
                                />
                              </Box>

                              <Box
                                sx={{
                                  backgroundColor: "#ffffff",
                                  p: 1.2,
                                  px: 1.5,
                                  borderRadius: "6px",
                                  border: "1px dashed #fca5a5",
                                  mb: 1,
                                }}
                              >
                                <Typography sx={{ fontSize: "0.84rem", color: "#7f1d1d", fontWeight: 500, lineHeight: 1.5 }}>
                                  {viewRecord.rejection_remarks}
                                </Typography>
                              </Box>

                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, pt: 0.3 }}>
                                <Typography sx={{ fontSize: "0.74rem", color: "#991b1b", fontWeight: 600 }}>
                                  Rejected by: <span style={{ color: "#7f1d1d", fontWeight: 700 }}>{rejectedByName || "Approver"}</span>
                                  {rejectedByRole && <span style={{ color: "#b91c1c", fontWeight: 500 }}> • {rejectedByRole}</span>}
                                </Typography>
                                {rejectedAtDate && (
                                  <Typography sx={{ fontSize: "0.72rem", color: "#b91c1c", fontStyle: "italic" }}>
                                    {rejectedAtDate}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </Box>

                    {/* Stage History Timeline */}
                    <Box
                      sx={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        p: 2.2,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      }}
                    >
                      <Typography sx={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", mb: 1.5 }}>
                        Workflow Stage History & Audit Trail
                      </Typography>
                      {Array.isArray(viewRecord.workflow_history) && viewRecord.workflow_history.length > 0 ? (
                        <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                          {viewRecord.workflow_history.map((h, i) => {
                            const actLower = (h.action || "").toLowerCase();
                            const stgLower = (h.stage || "").toLowerCase();
                            const isHistoryRejected =
                              actLower.includes("reject") ||
                              stgLower.includes("reject") ||
                              actLower.includes("returned") ||
                              stgLower.includes("correction");
                            const isHistoryVerified =
                              actLower.includes("verified") ||
                              actLower.includes("approved");

                            return (
                              <Box
                                key={i}
                                sx={{
                                  p: 1.4,
                                  px: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  borderBottom: i < viewRecord.workflow_history.length - 1 ? "1px solid #f1f5f9" : "none",
                                  borderLeft: isHistoryRejected
                                    ? "4px solid #ef4444"
                                    : isHistoryVerified
                                      ? "4px solid #22c55e"
                                      : "4px solid transparent",
                                  backgroundColor: isHistoryRejected
                                    ? "#fef2f2"
                                    : i % 2 === 0
                                      ? "#ffffff"
                                      : "#f8fafc",
                                  transition: "background-color 0.15s ease",
                                }}
                              >
                                <Box display="flex" alignItems="center" gap={1.4}>
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: isHistoryRejected
                                        ? "#fee2e2"
                                        : isHistoryVerified
                                          ? "#f0fdf4"
                                          : "#f1f5f9",
                                      border: isHistoryRejected
                                        ? "1px solid #fca5a5"
                                        : isHistoryVerified
                                          ? "1px solid #bbf7d0"
                                          : "1px solid #e2e8f0",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {isHistoryRejected ? (
                                      <XCircle size={15} color="#dc2626" />
                                    ) : isHistoryVerified ? (
                                      <Check size={14} color="#16a34a" />
                                    ) : (
                                      <Clock size={14} color="#64748b" />
                                    )}
                                  </Box>
                                  <Box>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                      <Typography
                                        sx={{
                                          fontSize: "0.82rem",
                                          fontWeight: isHistoryRejected ? 700 : 600,
                                          color: isHistoryRejected ? "#991b1b" : "#0f172a",
                                        }}
                                      >
                                        {h.action || h.stage}
                                      </Typography>
                                      {isHistoryRejected && (
                                        <Chip
                                          size="small"
                                          label="Rejected"
                                          sx={{
                                            height: 18,
                                            fontSize: "0.62rem",
                                            fontWeight: 700,
                                            backgroundColor: "#fee2e2",
                                            color: "#991b1b",
                                            border: "1px solid #fca5a5",
                                            textTransform: "uppercase",
                                          }}
                                        />
                                      )}
                                    </Box>
                                    <Typography
                                      sx={{
                                        fontSize: "0.72rem",
                                        color: isHistoryRejected ? "#b91c1c" : "#64748b",
                                        mt: 0.2,
                                      }}
                                    >
                                      By <strong>{h.performed_by_name || h.performed_by?.username || "System"}</strong> ({formatRejectRole(h.performed_by_role) || h.performed_by_role || "User"})
                                    </Typography>
                                    {h.remarks && h.remarks !== h.action && (
                                      <Typography
                                        sx={{
                                          fontSize: "0.72rem",
                                          color: isHistoryRejected ? "#7f1d1d" : "#475569",
                                          fontStyle: "italic",
                                          mt: 0.3,
                                          pl: 1,
                                          borderLeft: isHistoryRejected ? "2px solid #fca5a5" : "2px solid #cbd5e1",
                                        }}
                                      >
                                        Remarks: &quot;{h.remarks}&quot;
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                                <Typography
                                  sx={{
                                    fontSize: "0.72rem",
                                    color: isHistoryRejected ? "#b91c1c" : "#94a3b8",
                                    fontWeight: isHistoryRejected ? 600 : 500,
                                    whiteSpace: "nowrap",
                                    ml: 2,
                                  }}
                                >
                                  {h.timestamp ? new Date(h.timestamp).toLocaleString("en-IN") : "—"}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic", p: 1 }}>
                          No workflow history recorded yet.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </DialogContent>

              {/* ── Dialog Actions Footer ── */}
              <DialogActions
                sx={{
                  px: 3,
                  py: 1.5,
                  borderTop: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Asset Tag: <strong style={{ color: "#475569" }}>{viewRecord.asset_tag}</strong>
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    onClick={() => setShowViewModal(false)}
                    variant="outlined"
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      color: "#475569",
                      borderColor: "#cbd5e1",
                      px: 2.5,
                      py: 0.6,
                      borderRadius: "8px",
                      "&:hover": { backgroundColor: "#f1f5f9", borderColor: "#94a3b8", color: "#0f172a" },
                    }}
                  >
                    Close
                  </Button>
                </Box>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Invoice Document Preview & Download Modal (In-App Current Window) */}
      <Dialog
        open={Boolean(previewInvoiceUrl)}
        onClose={() => setPreviewInvoiceUrl(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.3)",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
          },
        }}
      >
        {previewInvoiceUrl && (
          <>
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 3,
                py: 2,
                borderBottom: "1px solid #f1f5f9",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "9px",
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  <FileText size={18} />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                      Asset Invoice Preview
                    </Typography>
                    {previewInvoiceTitle && (
                      <Chip
                        label={previewInvoiceTitle}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid #dbeafe",
                          borderRadius: "6px",
                        }}
                      />
                    )}
                  </Box>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.2 }}>
                    {previewInvoiceUrl.includes(".pdf") || previewInvoiceUrl.startsWith("data:application/pdf")
                      ? "PDF Document"
                      : "Image Document"}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={() => setPreviewInvoiceUrl(null)}
                size="small"
                sx={{
                  color: "#94a3b8",
                  borderRadius: "8px",
                  "&:hover": { color: "#0f172a", backgroundColor: "#f1f5f9" },
                }}
              >
                <X size={18} />
              </IconButton>
            </Box>

            {/* Content Preview Body */}
            <DialogContent
              sx={{
                p: 2,
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "450px",
                maxHeight: "75vh",
                overflow: "auto",
              }}
            >
              {previewInvoiceUrl.includes(".pdf") || previewInvoiceUrl.startsWith("data:application/pdf") ? (
                <iframe
                  src={previewInvoiceUrl}
                  title="Invoice PDF Preview"
                  style={{
                    width: "100%",
                    height: "65vh",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 1,
                  }}
                >
                  <img
                    src={previewInvoiceUrl}
                    alt={previewInvoiceTitle || "Invoice Preview"}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "68vh",
                      objectFit: "contain",
                      borderRadius: "8px",
                      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                    }}
                  />
                </Box>
              )}
            </DialogContent>

            {/* Actions Footer */}
            <DialogActions
              sx={{
                px: 3,
                py: 2,
                borderTop: "1px solid #f1f5f9",
                backgroundColor: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Button
                onClick={() => setPreviewInvoiceUrl(null)}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  color: "#64748b",
                  px: 2.5,
                  py: 0.8,
                  borderRadius: "8px",
                  "&:hover": { backgroundColor: "#f1f5f9", color: "#334155" },
                }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                disabled={downloadingInvoice}
                startIcon={downloadingInvoice ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                onClick={() => handleDownloadInvoice(previewInvoiceUrl, previewInvoiceTitle || "Asset_Invoice")}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  px: 2.8,
                  py: 0.8,
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #047857 0%, #065f46 100%)",
                    boxShadow: "0 6px 16px rgba(5, 150, 105, 0.35)",
                  },
                }}
              >
                {downloadingInvoice ? "Downloading..." : "Download Invoice"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Rejection Remarks Modal */}
      <Dialog
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        maxWidth="xs"
        fullWidth
        sx={{ zIndex: 1400 }}
        PaperProps={{ sx: { borderRadius: "14px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.05rem", pb: 1 }}>
          Reject Asset Request
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Please specify the rejection remarks. The asset request will be returned to IT for correction.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Enter detailed rejection remarks..."
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            sx={modalFieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowRejectModal(false)} disabled={submittingWorkflow}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={submittingWorkflow || !rejectRemarks.trim()}
            onClick={() => handleWorkflowAction(rejectAssetRecord?._id, rejectActionType, rejectRemarks)}
            sx={{ borderRadius: "8px", fontWeight: 600, textTransform: "none" }}
          >
            {submittingWorkflow ? "Rejecting..." : "Submit Rejection"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* TC-11: Return to IT Confirm Modal */}
      <Dialog
        open={showReturnToITModal}
        onClose={() => setShowReturnToITModal(false)}
        maxWidth="xs"
        fullWidth
        sx={{ zIndex: 1400 }}
        PaperProps={{ sx: { borderRadius: "14px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.05rem", pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <RotateCcw size={18} color="#c2410c" />
          Return to IT Department
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            The asset request will be returned to the HR Admin Department (Hardware and Network Engineer) for correction. You may optionally add remarks.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Optional: Enter remarks for IT (e.g. what needs to be corrected)..."
            value={returnToITRemarks}
            onChange={(e) => setReturnToITRemarks(e.target.value)}
            sx={modalFieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowReturnToITModal(false)} disabled={submittingWorkflow}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={submittingWorkflow}
            onClick={() =>
              handleWorkflowAction(
                returnToITAssetRecord?._id,
                "admin_return_to_it",
                returnToITRemarks.trim() || "Please make necessary corrections."
              )
            }
            sx={{
              borderRadius: "8px",
              fontWeight: 600,
              textTransform: "none",
              backgroundColor: "#f97316",
              "&:hover": { backgroundColor: "#ea580c" },
            }}
          >
            {submittingWorkflow ? "Returning..." : "Return to IT"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* TC-09: Resubmit Invoice Modal — Displayed ONLY when IT user resubmits, never for Admin or Accounts */}
      <Dialog
        open={showResubmitModal && isPureITDept}
        onClose={() => setShowResubmitModal(false)}
        maxWidth="sm"
        fullWidth
        sx={{ zIndex: 1400 }}
        PaperProps={{ sx: { borderRadius: "14px", overflow: "hidden" } }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid #f1f5f9",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box sx={{ p: 0.7, borderRadius: "8px", backgroundColor: "#eff6ff", display: "flex" }}>
            <RotateCcw size={18} color="#2563eb" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
              Resubmit Asset for Admin Approval
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.2 }}>
              Cycle {(resubmitAssetRecord?.approval_cycle || 1) + 1} · Asset: {resubmitAssetRecord?.asset_tag || "—"}
            </Typography>
          </Box>
        </Box>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          {/* Previous rejection / return reason callout */}
          {resubmitAssetRecord?.rejection_remarks && (
            <Box
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: "8px",
                backgroundColor: "#fff7ed",
                border: "1px solid #fed7aa",
              }}
            >
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#c2410c", mb: 0.4 }}>
                Returned with remarks:
              </Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "#7c2d12" }}>
                {resubmitAssetRecord.rejection_remarks}
              </Typography>
              {resubmitAssetRecord.rejected_by_name && (
                <Typography sx={{ fontSize: "0.71rem", color: "#9a3412", mt: 0.5, fontStyle: "italic" }}>
                  — by {resubmitAssetRecord.rejected_by_name}
                  {resubmitAssetRecord.rejected_by_role ? ` (${resubmitAssetRecord.rejected_by_role})` : ""}
                </Typography>
              )}
            </Box>
          )}

          {/* Invoice Number + Date */}
          <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
            <TextField
              label="Invoice Number"
              size="small"
              fullWidth
              value={resubmitInvoiceNumber}
              onChange={(e) => setResubmitInvoiceNumber(e.target.value)}
              sx={modalFieldSx}
              placeholder="e.g. INV-2026-001"
            />
            <TextField
              label="Invoice Date"
              size="small"
              type="date"
              fullWidth
              value={resubmitInvoiceDate}
              onChange={(e) => setResubmitInvoiceDate(e.target.value)}
              sx={modalFieldSx}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Invoice File Upload */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", mb: 0.8 }}>
              Invoice Document
            </Typography>
            {resubmitInvoiceUrl ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1.2,
                  borderRadius: "8px",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <ShieldCheck size={16} color="#16a34a" />
                <Typography sx={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 600, flex: 1 }}>
                  Invoice document attached
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setResubmitInvoiceUrl("")}
                  sx={{ fontSize: "0.72rem", color: "#dc2626", textTransform: "none", p: 0.3 }}
                >
                  Remove
                </Button>
              </Box>
            ) : (
              <label
                style={{
                  display: "block",
                  border: "2px dashed #bfdbfe",
                  borderRadius: "8px",
                  padding: "14px",
                  textAlign: "center",
                  cursor: uploadingResubmitInvoice ? "not-allowed" : "pointer",
                  backgroundColor: "#f8faff",
                  color: "#3b82f6",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  style={{ display: "none" }}
                  onChange={handleResubmitInvoiceUpload}
                  disabled={uploadingResubmitInvoice}
                />
                {uploadingResubmitInvoice ? "Uploading..." : "Click to upload revised invoice (PDF or Image, max 10MB)"}
              </label>
            )}
          </Box>

          {/* Resubmission Remarks */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Resubmission Remarks"
            placeholder="Describe what was corrected (e.g. GST breakdown added, invoice replaced)..."
            value={resubmitRemarks}
            onChange={(e) => setResubmitRemarks(e.target.value)}
            sx={modalFieldSx}
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setShowResubmitModal(false)}
            disabled={submittingWorkflow}
            variant="outlined"
            sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 600, borderColor: "#cbd5e1" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={submittingWorkflow || !resubmitRemarks.trim()}
            onClick={handleResubmitWorkflow}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 600,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              "&:hover": { background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)" },
            }}
          >
            {submittingWorkflow ? "Resubmitting..." : "Resubmit for Approval"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

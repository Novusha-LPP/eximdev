import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import axios from "axios";
import {
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Box,
  IconButton,
  Chip,
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
  ChevronRight,
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
  Globe,
  Key,
  Phone,
  Image as ImageIcon,
  UploadCloud,
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

export default function AssetManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleBack = () => {
    navigate("/it-helpdesk");
  };

  // Audit logs
  const { logCreate, logRead, logUpdate, logDelete, logExport } = useModuleAuditLogs("Asset");

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
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
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
  }, [page, limit, typeFilter, statusFilter, departmentFilter, searchParam]);

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
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      logRead("asset-vendors-fetch", "Fetched vendors for asset assignment", "info");
      const res = await itHelpdeskAPI.vendors.getAll({ all: "true" });
      setVendors(res.data || []);
    } catch {
      // non-blocking
    }
  }, []);

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
  }, [fetchData]);

  useEffect(() => {
    fetchUsers();
    fetchVendors();
  }, [fetchUsers, fetchVendors]);

  const handleOpen = (record = null) => {
    if (record) {
      logRead("asset-edit-access", `Opened asset for editing with ID: ${record._id}`, "info");
      setEditId(record._id);
      setErrors({});
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
      department: form.department || undefined,
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
  const requiredHint = requiredFieldsForType.map((field) => FIELD_LABELS[field]).join(", ");
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
              <table style={{ width: "100%", minWidth: "1150px" }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 130 }}>Asset Tag</th>
                    <th style={{ minWidth: 120 }}>Type</th>
                    <th style={{ minWidth: 180 }}>Manufacturer / Model</th>
                    <th style={{ minWidth: 150 }}>Assigned To</th>
                    <th style={{ minWidth: 140 }}>Department</th>
                    <th style={{ minWidth: 110 }}>Status</th>
                    <th style={{ minWidth: 150 }}>Location</th>
                    <th style={{ width: 110, minWidth: 110, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--color-text-muted)" }}>
                        No assets found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    data.map((a) => (
                      <tr key={a._id}>
                        <td style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>{a.asset_tag}</td>
                        <td style={{ color: "#334155", fontSize: "13px", fontWeight: 500 }}>
                          {a.asset_type || "—"}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>{a.manufacturer || "—"}</div>
                          {a.model && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{a.model}</div>}
                        </td>
                        <td style={{ color: "#334155", fontWeight: 500 }}>{getAssignedToName(a.assigned_to)}</td>
                        <td style={{ color: "#475569" }}>{a.department || "—"}</td>
                        <td>
                          <span className={`score-badge ${getStatusBadgeClass(a.status)}`}>
                            {a.status}
                          </span>
                        </td>
                        <td style={{ color: "#475569" }}>{a.location || "—"}</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="btn btn-icon btn-info"
                              onClick={() => {
                                setViewRecord(a);
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
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {DEPARTMENTS.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
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
                      SelectProps={selectMenuProps}
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
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {DEPARTMENTS.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </TextField>
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
                      SelectProps={selectMenuProps}
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
                      SelectProps={selectMenuProps}
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
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {DEPARTMENTS.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </TextField>
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
                      SelectProps={selectMenuProps}
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
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {DEPARTMENTS.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </TextField>
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
                      SelectProps={selectMenuProps}
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
                      SelectProps={selectMenuProps}
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
                      SelectProps={selectMenuProps}
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
                    {form.ram && !RAM_OPTIONS.includes(form.ram) && (
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
                    {form.storage && !STORAGE_OPTIONS.includes(form.storage) && (
                      <MenuItem value={form.storage}>{form.storage}</MenuItem>
                    )}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Operating System"
                    size="small"
                    fullWidth
                    {...getRequiredProps("operating_system")}
                    value={form.operating_system}
                    onChange={(e) => updateField("operating_system", e.target.value)}
                  />
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
                    <MenuItem value="">Unassigned</MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username} {u.first_name ? `(${u.first_name})` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Department"
                    size="small"
                    fullWidth
                    {...getRequiredProps("department")}
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {DEPARTMENTS.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </TextField>
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
                      SelectProps={selectMenuProps}
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
                    <MenuItem value="">Unassigned</MenuItem>
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
                      SelectProps={selectMenuProps}
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
        maxWidth="md"
        fullWidth
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
        {viewRecord && (
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
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 4px 10px rgba(2, 132, 199, 0.25)",
                  }}
                >
                  <Eye size={18} />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                      Asset Details
                    </Typography>
                    <Chip
                      label={viewRecord.asset_tag}
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
                    <span className={`score-badge ${getStatusBadgeClass(viewRecord.status)}`}>
                      {viewRecord.status || "Available"}
                    </span>
                  </Box>
                  <Typography sx={{ fontSize: "0.76rem", color: "#64748b", mt: 0.2 }}>
                    Comprehensive specifications, hardware details, and assignment logs
                  </Typography>
                </Box>
              </Box>
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

            <DialogContent sx={{ p: 3, maxHeight: "calc(82vh - 140px)", overflowY: "auto" }}>
              <Grid container spacing={2.5}>
                {/* General Details */}
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                    <Tag size={16} color="#475569" />
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Basic Identification
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Asset Tag</Typography>
                  <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 700 }}>{viewRecord.asset_tag || "—"}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Asset Type</Typography>
                  <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.asset_type || "—"}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Status</Typography>
                  <Box sx={{ mt: 0.3 }}>
                    <span className={`score-badge ${getStatusBadgeClass(viewRecord.status)}`}>
                      {viewRecord.status || "—"}
                    </span>
                  </Box>
                </Grid>
                {viewRecord.asset_name && (
                  <Grid item xs={6} sm={4}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Asset Name</Typography>
                    <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.asset_name}</Typography>
                  </Grid>
                )}

                {/* Hardware Specifications */}
                {(viewRecord.asset_type === "Laptop" || viewRecord.asset_type === "Desktop" || viewRecord.asset_type === "Computer" || viewRecord.processor || viewRecord.ram || viewRecord.storage) && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <Cpu size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Hardware Specifications
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Brand / Manufacturer</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.manufacturer || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Model</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.model || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Serial Number</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.serial_number || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Processor</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.processor || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>RAM</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.ram || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Storage</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.storage || "—"}</Typography>
                    </Grid>
                    {viewRecord.operating_system && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Operating System</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.operating_system}</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {/* SIM Card Specifications */}
                {viewRecord.asset_type === "SIM Card" && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <Smartphone size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          SIM & Plan Specifications
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>SIM Number (ICCID)</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.sim_number_iccid || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Mobile Number</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.mobile_number || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Service Provider</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.service_provider || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Plan Type</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.plan_type || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Monthly Plan / Package</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.monthly_plan_package || "—"}</Typography>
                    </Grid>
                    {viewRecord.imsi_number && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>IMSI Number</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.imsi_number}</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {/* Printer Specifications */}
                {viewRecord.asset_type === "Printer" && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <Printer size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Printer Specifications
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Brand / Manufacturer</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.manufacturer || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Model</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.model || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Serial Number</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.serial_number || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Printer Type</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.printer_type || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Connection Type</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.connection_type || "—"}</Typography>
                    </Grid>
                    {viewRecord.ip_address && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>IP Address</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.ip_address}</Typography>
                      </Grid>
                    )}
                    {viewRecord.mac_address && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>MAC Address</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.mac_address}</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {/* Network Device Specifications */}
                {viewRecord.asset_type === "Network Device" && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <Wifi size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Network Device Specifications
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Device Name</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.device_name || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Device Category</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.device_category || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Brand / Manufacturer</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.manufacturer || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Model</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.model || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Serial Number</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.serial_number || "—"}</Typography>
                    </Grid>
                    {viewRecord.ip_address && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>IP Address</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.ip_address}</Typography>
                      </Grid>
                    )}
                    {viewRecord.mac_address && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>MAC Address</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.mac_address}</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {/* Software Specifications */}
                {viewRecord.asset_type === "Software" && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <Key size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Software & License Specifications
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Software Category</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.software_category || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Version</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.version || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>License Type</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.license_type || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Number of Licenses</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.number_of_licenses || "—"}</Typography>
                    </Grid>
                    {viewRecord.license_key_subscription_id && (
                      <Grid item xs={12} sm={8}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>License Key / Subscription ID</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, fontFamily: "monospace" }}>{viewRecord.license_key_subscription_id}</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {/* Phone Specifications */}
                {viewRecord.asset_type === "Phone" && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <Phone size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Phone Specifications
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Brand / Manufacturer</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.manufacturer || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Model</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.model || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>IMEI Number</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.imei_number || "—"}</Typography>
                    </Grid>
                    {viewRecord.serial_number && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Serial Number</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.serial_number}</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {/* Rack Specifications */}
                {viewRecord.asset_type === "Rack" && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <Server size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Rack Specifications
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Rack Name / Number</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.rack_name || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Rack Type</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.rack_type || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Rack Size (U Height)</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.rack_size_u_height || "—"}</Typography>
                    </Grid>
                    {viewRecord.installation_date && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Installation Date</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.installation_date}</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {/* Cable Specifications */}
                {viewRecord.asset_type === "Cable" && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <Layers size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Cable Specifications
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Cable Name</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.cable_name || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Cable Type</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.cable_type || "—"}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Length</Typography>
                      <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.length || "—"}</Typography>
                    </Grid>
                  </>
                )}

                {/* Assignment & Location */}
                <Grid item xs={12} sx={{ mt: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                    <UserCheck size={16} color="#475569" />
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Assignment & Location
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Assigned User</Typography>
                  <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{getAssignedToName(viewRecord.assigned_to)}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Department</Typography>
                  <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.department || "—"}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Location</Typography>
                  <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.location || "—"}</Typography>
                </Grid>
                {viewRecord.assigned_date && (
                  <Grid item xs={6} sm={4}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Assigned Date</Typography>
                    <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.assigned_date}</Typography>
                  </Grid>
                )}

                {/* Procurement & Vendor */}
                <Grid item xs={12} sx={{ mt: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                    <Calendar size={16} color="#475569" />
                    <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Procurement & Warranty
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Purchase Date</Typography>
                  <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.purchase_date || "—"}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Warranty Expiry / End Date</Typography>
                  <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.warranty_expiry || viewRecord.expiry_renewal_date || "—"}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Vendor / Supplier</Typography>
                  <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>
                    {vendors.find((v) => v._id === viewRecord.vendor)?.name || (typeof viewRecord.vendor === "object" ? viewRecord.vendor?.name : null) || "—"}
                  </Typography>
                </Grid>
                {viewRecord.purchase_cost && (
                  <Grid item xs={6} sm={4}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Purchase Cost</Typography>
                    <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>₹{Number(viewRecord.purchase_cost).toLocaleString("en-IN")}</Typography>
                  </Grid>
                )}

                {/* Additional Notes */}
                {(viewRecord.remarks || viewRecord.description) && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <FileText size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Additional Notes & Remarks
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ p: 1.5, background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#334155" }}>
                        {viewRecord.remarks || viewRecord.description}
                      </Box>
                    </Grid>
                  </>
                )}

                {/* Attached Asset Invoice & Billing Details (Bottom of Modal) */}
                {(viewRecord.invoice_number || viewRecord.invoice_date || viewRecord.image_url) && (
                  <>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.8, borderBottom: "1px solid #f1f5f9" }}>
                        <FileText size={16} color="#475569" />
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Invoice & Billing Details
                        </Typography>
                      </Box>
                    </Grid>
                    {viewRecord.invoice_number && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Invoice Number</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{viewRecord.invoice_number}</Typography>
                      </Grid>
                    )}
                    {viewRecord.invoice_date && (
                      <Grid item xs={6} sm={4}>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Invoice Date</Typography>
                        <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>
                          {viewRecord.invoice_date ? viewRecord.invoice_date.slice(0, 10) : "—"}
                        </Typography>
                      </Grid>
                    )}
                    {viewRecord.image_url && (
                      <Grid item xs={12}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            p: 1.5,
                            borderRadius: "10px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
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
                              width: 80,
                              height: 80,
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
                                transform: "scale(1.02)",
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
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                              Asset Purchase Invoice Document
                            </Typography>
                            <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.3 }}>
                              Click below to view the invoice preview in current window and download it.
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Eye size={14} />}
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
                                  py: 0.4,
                                  px: 1.5,
                                  borderColor: "#cbd5e1",
                                  color: "#2563eb",
                                  backgroundColor: "#ffffff",
                                  "&:hover": {
                                    backgroundColor: "#eff6ff",
                                    borderColor: "#93c5fd",
                                  },
                                }}
                              >
                                View / Download Invoice
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </DialogContent>

            <DialogActions
              sx={{
                px: 3,
                py: 2,
                borderTop: "1px solid #f1f5f9",
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Button
                onClick={() => setShowViewModal(false)}
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
                Close
              </Button>
              <Button
                onClick={() => {
                  const target = viewRecord;
                  setShowViewModal(false);
                  handleOpen(target);
                }}
                variant="contained"
                startIcon={<Edit2 size={15} />}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  px: 2.5,
                  py: 0.8,
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                  },
                }}
              >
                Edit Asset
              </Button>
            </DialogActions>
          </>
        )}
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
    </div>
  );
}

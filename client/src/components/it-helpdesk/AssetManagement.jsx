import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import axios from "axios";
import * as XLSX from "xlsx";
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
} from "lucide-react";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import "../../styles/scorecard.scss";

const ASSET_TYPES = ["Desktop", "Laptop", "Printer", "Network Device", "Software", "Phone", "SIM Card", "Rack", "Cable"];
const STATUSES = ["Available", "Assigned", "In Repair", "Repair", "Retired", "Lost", "Active", "Inactive", "Damaged", "Spare", "Expired", "Suspended"];
const SERVICE_PROVIDERS = ["Airtel", "Jio", "Vi", "BSNL"];
const PLAN_TYPES = ["Prepaid", "Postpaid"];
const PRINTER_TYPES = ["Laser", "Inkjet", "Thermal", "Dot Matrix"];
const CONNECTION_TYPES = ["USB", "Wi-Fi", "LAN"];
const DEVICE_CATEGORIES = ["Router", "Switch", "Firewall", "AP"];
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
};

export default function AssetManagement() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/it-helpdesk");
  };

  // Audit logs
  const { logCreate, logRead, logUpdate, logDelete, logExport } = useModuleAuditLogs("Asset");

  const [data, setData] = useState([]);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "", status: "", department: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15 });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Helper function to safely get assigned user name
  const getAssignedToName = (assignedTo) => {
    if (!assignedTo) return "Unassigned";
    // If backend returns a populated object with username/first_name
    if (typeof assignedTo === 'object') {
      return assignedTo.username || assignedTo.first_name || "Unknown User";
    }
    // If backend returns an ID, try to find it in the local users list
    const user = users.find(u => u._id === assignedTo);
    return user ? (user.username || user.first_name) : "Unknown User";
  };

  // Computed property for filtered data (moved inside component)
  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.asset_tag || "").toLowerCase().includes(term) ||
      (item.asset_name || "").toLowerCase().includes(term) ||
      (item.asset_type || "").toLowerCase().includes(term) ||
      (item.manufacturer || "").toLowerCase().includes(term) ||
      (item.model || "").toLowerCase().includes(term) ||
      (item.serial_number || "").toLowerCase().includes(term) ||
      (item.location || "").toLowerCase().includes(term) ||
      (item.department || "").toLowerCase().includes(term)
    );
  });

  const fetchData = useCallback(
    async (page = 1, overrideFilters = null) => {
      setLoading(true);
      try {
        logRead("asset-list-view", "Accessed asset list with filters", "info");

        const activeFilters = overrideFilters || filters;
        const params = { page, limit: pagination.limit };
        if (activeFilters.type) params.type = activeFilters.type;
        if (activeFilters.status) params.status = activeFilters.status;
        if (activeFilters.department) params.department = activeFilters.department;

        const res = await itHelpdeskAPI.assets.getAll(params);
        setData(res.data || []);
        setPagination(res.pagination || { total: 0, page: 1, limit: params.limit });
      } catch (err) {
        toast.error("Failed to load assets");
        console.error(err);
        console.error(`Failed to load assets: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  const handleClearFilters = () => {
    setSearchTerm("");
    const emptyFilters = { type: "", status: "", department: "" };
    setFilters(emptyFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchData(1, emptyFilters);
  };

  const fetchUsers = useCallback(async () => {
    try {
      logRead("asset-users-fetch", "Fetched users for asset assignment", "info");
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, {
        withCredentials: true,
        params: { limit: USERS_FETCH_LIMIT },
      });
      setUsers(res.data || []);
      console.log("Fetched users:", res.data?.length || 0);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      console.error(`Failed to fetch users: ${err.message}`);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      logRead("asset-vendors-fetch", "Fetched vendors for asset assignment", "info");
      const res = await itHelpdeskAPI.vendors.getAll();
      setVendors(res.data || []);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    logRead("asset-module-access", "Accessed Asset Management module", "info");
    fetchData(1);
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
      });
    } else {
      setEditId(null);
      const generatedTag = `AST-${Date.now().toString().slice(-6)}`;
      setForm({ ...EMPTY_FORM, asset_tag: generatedTag });
      setErrors({});
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
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
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
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
      console.error(`Failed to delete asset with ID: ${id}: ${err.message}`);
    }
  };

  // --- Excel Export Functionality ---
  const handleExportAllToExcel = useCallback(() => {
    try {
      // 1. Map data to a cleaner format for Excel
      const excelData = filteredData.map((item, index) => ({
        "S.No": index + 1,
        "Asset Tag": item.asset_tag || "",
        "Asset Type": item.asset_type || "",
        "Asset Name": item.asset_name || "",
        "Manufacturer": item.manufacturer || "",
        "Model": item.model || "",
        "Serial Number": item.serial_number || "",
        "Processor": item.processor || "",
        "RAM": item.ram || "",
        "Storage": item.storage || "",
        "Operating System": item.operating_system || "",
        "Assigned To": getAssignedToName(item.assigned_to),
        "Department": item.department || "",
        "Location": item.location || "",
        "Status": item.status || "",
        "Purchase Date": item.purchase_date ? item.purchase_date.slice(0, 10) : "",
        "Warranty Expiry": item.warranty_expiry ? item.warranty_expiry.slice(0, 10) : "",
        "Purchase Cost": item.purchase_cost || "",
        "Vendor": item.vendor?.name || "",
        "Description": item.description || "",
        "Device Category": item.device_category || "",
        "IP Address": item.ip_address || "",
        "MAC Address": item.mac_address || "",
        "Software Category": item.software_category || "",
        "Version": item.version || "",
        "License Type": item.license_type || "",
        "License Key / Subscription ID": item.license_key_subscription_id || "",
        "Number of Licenses": item.number_of_licenses || "",
        "Expiry/Renewal Date": item.expiry_renewal_date ? item.expiry_renewal_date.slice(0, 10) : "",
        "IMEI Number": item.imei_number || "",
        "Rack Name/Number": item.rack_name || "",
        "Rack Type": item.rack_type || "",
        "Rack Size (U Height)": item.rack_size_u_height || "",
        "Installation Date": item.installation_date ? item.installation_date.slice(0, 10) : "",
        "Cable Name": item.cable_name || "",
        "Cable Type": item.cable_type || "",
        "Length": item.length || "",
        "Printer Type": item.printer_type || "",
        "Connection Type": item.connection_type || "",
        "SIM Number": item.sim_number_iccid || "",
        "Mobile Number": item.mobile_number || "",
        "IMSI Number": item.imsi_number || "",
        "Service Provider": item.service_provider || "",
        "Plan Type": item.plan_type || "",
        "Monthly Plan/Package": item.monthly_plan_package || "",
        "Remarks": item.remarks || "",
      }));

      // 2. Create a new workbook
      const wb = XLSX.utils.book_new();

      // 3. Convert JSON data to a worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // 4. Set column widths (optional but makes it look better)
      const wscols = Object.keys(excelData[0] || {}).map(() => ({ wch: 20 }));
      ws['!cols'] = wscols;

      // 5. Append worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Assets");

      // 6. Generate filename with current date
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `Assets_Export_${date}.xlsx`;

      // 7. Write file and trigger download
      XLSX.writeFile(wb, fileName);

      toast.success("Excel exported successfully");
      logExport("excel-export", `Exported assets list to Excel (${excelData.length} records)`, "info");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export Excel");
      logExport("excel-export-failed", "Excel export failed", "error");
    }
  }, [filteredData, users, logExport]);
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
          <button className="btn btn-secondary" onClick={() => fetchData(pagination.page)}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={handleExportAllToExcel}>
            <Download size={15} /> Export Excel
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Asset Type</label>
              <CustomSelect
                value={filters.type}
                onChange={(val) => setFilters((f) => ({ ...f, type: val, status: "" }))}
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
                value={filters.status}
                onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
                options={[
                  { label: "All Statuses", value: "" },
                  ...(filters.type === "SIM Card"
                    ? ["Available", "Assigned", "Active", "Inactive"]
                    : filters.type === "Printer"
                      ? ["Available", "Active", "Repair", "Retired"]
                      : filters.type === "Network Device"
                        ? ["Active", "Spare", "Repair", "Retired"]
                        : filters.type === "Software"
                          ? ["Active", "Expired", "Suspended"]
                          : filters.type === "Rack"
                            ? ["Active", "Inactive", "Occupied", "Available", "Blocked", "Under Maintenance"]
                            : filters.type === "Desktop" || filters.type === "Laptop" || filters.type === "Phone"
                              ? ["Available", "Assigned", "Active", "Inactive", "In Repair", "Retired"]
                              : filters.type === "Cable"
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
                value={filters.department || ""}
                onChange={(val) => setFilters((f) => ({ ...f, department: val }))}
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
            <div className="card-subtitle">Showing {filteredData.length} records</div>
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
                    <th style={{ width: 80, minWidth: 80, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--color-text-muted)" }}>
                        No assets found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((a) => (
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
                              className="btn btn-icon btn-primary"
                              style={{ width: "28px", height: "28px" }}
                              onClick={() => handleOpen(a)}
                              title="Edit Asset"
                            >
                              <Edit2 size={14} color="#2563eb" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-icon btn-danger"
                              style={{ width: "28px", height: "28px" }}
                              onClick={(e) => handleDelete(e, a._id)}
                              title="Delete Asset"
                            >
                              <Trash2 size={14} color="#dc2626" />
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
            page={pagination.page}
            totalPages={Math.max(1, Math.ceil((pagination.total || data.length || 1) / pagination.limit))}
            totalRecords={pagination.total || data.length}
            limit={pagination.limit}
            onPageChange={(newPage) => fetchData(newPage)}
            onLimitChange={(newLimit) => {
              setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
            }}
          />
        </div>
      </div>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
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
                  <TextField
                    select
                    label="Vendor"
                    size="small"
                    fullWidth
                    sx={modalFieldSx}
                    value={form.vendor}
                    onChange={(e) => updateField("vendor", e.target.value)}
                  >
                    <MenuItem value="">No Vendor</MenuItem>
                    {vendors.map((v) => (
                      <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                    ))}
                  </TextField>
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

                <FormSectionTitle icon={Calendar} title="Procurement" />
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

                <FormSectionTitle icon={Calendar} title="Procurement" />
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
                  <TextField
                    select
                    label="Vendor/Publisher"
                    size="small"
                    fullWidth
                    {...getRequiredProps("vendor")}
                    value={form.vendor}
                    onChange={(e) => updateField("vendor", e.target.value)}
                  >
                    <MenuItem value="">No Vendor/Publisher</MenuItem>
                    {vendors.map((v) => (
                      <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                    ))}
                  </TextField>
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

                <FormSectionTitle icon={Calendar} title="Procurement" />
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
                    label="RAM"
                    size="small"
                    fullWidth
                    {...getRequiredProps("ram")}
                    value={form.ram}
                    onChange={(e) => updateField("ram", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Storage"
                    size="small"
                    fullWidth
                    {...getRequiredProps("storage")}
                    value={form.storage}
                    onChange={(e) => updateField("storage", e.target.value)}
                  />
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
                  <TextField
                    select
                    label="Vendor"
                    size="small"
                    fullWidth
                    sx={modalFieldSx}
                    value={form.vendor}
                    onChange={(e) => updateField("vendor", e.target.value)}
                  >
                    <MenuItem value="">No Vendor</MenuItem>
                    {vendors.map((v) => (
                      <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                    ))}
                  </TextField>
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
                  <TextField
                    select
                    label="Vendor"
                    size="small"
                    fullWidth
                    {...getRequiredProps("vendor")}
                    value={form.vendor}
                    onChange={(e) => updateField("vendor", e.target.value)}
                  >
                    <MenuItem value="">No Vendor</MenuItem>
                    {vendors.map((v) => (
                      <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <FormSectionTitle icon={FileText} title="Description" />
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    sx={modalFieldSx}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </Grid>
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
    </div>
  );
}

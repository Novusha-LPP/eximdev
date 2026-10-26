import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { UserContext } from "../../contexts/UserContext";
import {
  ChevronLeft,
  Search,
  Download,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  X,
  Tag,
  Cpu,
  UserCheck,
  Layers,
  Server,
  Smartphone,
  Printer,
  Wifi,
  Laptop,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  ArrowRightLeft,
  ShieldCheck,
  HardDrive,
  PackageCheck,
  Boxes,
  Package,
  Wrench,
  Archive,
  Check,
  XCircle,
  FileText,
  Receipt,
  CreditCard,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Grid,
  Chip,
  Button,
} from "@mui/material";

import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import AddVendorModal from "./AddVendorModal";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import "../../styles/scorecard.scss";

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

const getCategoryTheme = (category) => {
  const norm = String(category || "").toLowerCase();
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

const getCategoryIcon = (category, size = 18) => {
  const norm = String(category || "").toLowerCase();
  if (norm.includes("laptop")) return <Laptop size={size} />;
  if (norm.includes("desktop") || norm.includes("computer")) return <Monitor size={size} />;
  if (norm.includes("printer")) return <Printer size={size} />;
  if (norm.includes("network") || norm.includes("router") || norm.includes("switch") || norm.includes("firewall")) return <Wifi size={size} />;
  if (norm.includes("software")) return <FileText size={size} />;
  if (norm.includes("sim") || norm.includes("phone")) return <Smartphone size={size} />;
  if (norm.includes("rack")) return <Server size={size} />;
  if (norm.includes("cable")) return <Layers size={size} />;
  return <Tag size={size} />;
};

const getAssignedUserInitials = (name) => {
  if (!name || name === "Unassigned") return "UA";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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

const CATEGORIES = [
  "Computer / Desktop",
  "Laptop",
  "Monitor",
  "Printer",
  "Server",
  "Network Device",
  "Mobile Device",
  "Software License",
  "Other",
];

const INVENTORY_TYPES = ["Old Inventory", "New Inventory"];

const CONDITIONS = ["Good", "Fair", "Damaged", "Non-Functional"];

const LIFECYCLE_STATUSES = [
  "Available",
  "In Use",
  "Under Repair",
  "Under Maintenance",
  "Damaged",
  "Lost",
  "Disposed",
  "Returned",
];

const STOCK_TYPES = ["New", "Old", "Refurbished"];

const DEPARTMENTS = [
  "Import",
  "Export",
  "DGFT",
  "Alluvium-IT",
  "Nousha-IT",
  "Paramount",
  "Account",
  "E-sanchit",
  "Admin/Hr",
  "Operations",
  "Management",
];

const EMPTY_FORM = {
  // 1. Common Asset Information (15 Standard Fields)
  asset_tag: "",
  inventory_type: "Old Inventory",
  category: "Computer / Desktop",
  brand: "",
  model: "",
  serial_number: "",
  purchase_date: "",
  warranty_start_date: "",
  warranty_end_date: "",
  assigned_to: "",
  assigned_to_name: "",
  department: "",
  location: "",
  lifecycle_status: "Available",
  condition: "Good",
  remarks: "",

  // Supporting & Procurement Fields
  asset_name: "",
  asset_type: "Computer / Desktop",
  stock_type: "Old",
  vendor: "",
  vendor_name: "",
  purchase_cost: "",
  invoice_number: "",
  invoice_date: "",
  payment_mode: "UPI",
  invoice_url: "",

  // Dynamic Technical Specifications (Standard Sections 2 - 10)
  specs: {
    // Computer / Desktop / Laptop (Image 1 & 2)
    processor: "",
    ram: "",
    storage: "",
    storage_type: "SSD",
    storage_capacity: "512 GB",
    operating_system: "Windows 11 Pro",
    hostname: "",
    mac_address: "",

    // Monitor (Image 2 & Sec 4)
    screen_size: "24 Inch",
    resolution: "1920 × 1080",
    warranty_duration: "3 Years",

    // Printer (Sec 5)
    printer_type: "Laser",
    color_mono: "Monochrome",
    print_technology: "Laser",
    connectivity: "Network & USB",
    print_count: "",

    // Server (Sec 6)
    cpu_cores: "",
    total_storage: "",
    raid_config: "",
    server_role: "",

    // Network Device (Sec 7)
    device_type: "Switch",
    firmware_version: "",
    management_ip: "",
    port_count: "24-Port",
    poe_support: "No",
    poe_budget: "",
    uplink_port: "",
    rack_cabinet: "",
    form_factor: "Rack",

    // Mobile Device (Sec 8)
    imei_number: "",
    imei_2: "",
    sim_number: "",
    service_provider: "",

    // Software License (Sec 9)
    software_name: "",
    version: "",
    license_type: "Subscription",
    license_key: "",
    seat_count: "1",

    // Shared / Other (Sec 10)
    ip_address: "",
    custom_notes: "",
  },
};

export default function UnifiedAssetInventory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── States ───────────────────────────────────────────────────────────────
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    assigned: 0,
    spares: 0,
    maintenance: 0,
    retired: 0,
    expiringWarranty: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Masters
  const [usersList, setUsersList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [detailsTab, setDetailsTab] = useState("overview");
  const [copiedTag, setCopiedTag] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [previewInvoiceUrl, setPreviewInvoiceUrl] = useState(null);
  const [previewInvoiceTitle, setPreviewInvoiceTitle] = useState("");

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

  const handleDownloadInvoice = async (url, title = "Asset_Invoice") => {
    if (!url) return;
    try {
      const cleanTitle = (title || "Asset_Invoice").replace(/[^a-zA-Z0-9_-]/g, "_");
      if (url.startsWith("data:") || url.startsWith("blob:")) {
        let ext = "pdf";
        if (url.includes("image/jpeg") || url.includes("image/jpg")) ext = "jpg";
        else if (url.includes("image/png")) ext = "png";
        else if (url.includes("image/webp")) ext = "webp";
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cleanTitle}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Download started");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = cleanTitle;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Invoice opened for download");
    } catch (err) {
      window.open(url, "_blank");
    }
  };

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignForm, setAssignForm] = useState({
    userId: "",
    userName: "",
    department: "",
    location: "",
    remarks: "",
  });

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnForm, setReturnForm] = useState({
    stockType: "Old",
    remarks: "",
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [syncingLegacy, setSyncingLegacy] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Logged-in user context
  const { user: currentUser } = useContext(UserContext) || {};
  const currentUsername = String(currentUser?.username || "").toLowerCase().trim();
  const currentUserRole = String(currentUser?.role || "").toLowerCase();
  const isAdmin =
    currentUsername === "admin" ||
    currentUserRole.includes("admin") ||
    Boolean(currentUser?.is_operator);

  // Workflow Dialog States
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workflowTarget, setWorkflowTarget] = useState(null);
  const [workflowAction, setWorkflowAction] = useState("");
  const [workflowRemarks, setWorkflowRemarks] = useState("");
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false);

  // Active Filters (synchronized with URL params)
  const activeTab = searchParams.get("tab") || "ALL";
  const categoryFilter = searchParams.get("category") || "";
  const inventoryTypeFilter = searchParams.get("inventory_type") || "";
  const conditionFilter = searchParams.get("condition") || "";
  const stockTypeFilter = searchParams.get("stock_type") || "";
  const departmentFilter = searchParams.get("department") || "";
  const warrantyFilter = searchParams.get("warranty") || "";
  const searchQuery = searchParams.get("search") || "";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const limitParam = parseInt(searchParams.get("limit") || "15", 10);

  const [searchInput, setSearchInput] = useState(searchQuery);

  const updateFilters = useCallback(
    (newParams) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(newParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "" && v !== "ALL") {
            next.set(k, String(v));
          } else {
            next.delete(k);
          }
        });
        return next;
      });
    },
    [setSearchParams]
  );

  // ── Fetch Master Data (Users & Vendors) ──────────────────────────────────
  const fetchVendorsList = useCallback(async () => {
    try {
      const res = await itHelpdeskAPI.vendors.getAll({ all: "true" }).catch(() => ({ data: [] }));
      const list = (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
        .slice()
        .sort((a, b) => (a.name || a.vendor_name || "").localeCompare(b.name || b.vendor_name || ""));
      setVendorsList(list);
      return list;
    } catch (e) {
      console.error("Error loading vendors:", e);
      return [];
    }
  }, []);

  const handleVendorCreated = useCallback(async (newVendor) => {
    const list = await fetchVendorsList();
    if (newVendor && (newVendor._id || newVendor.id)) {
      const vId = newVendor._id || newVendor.id;
      setFormData((prev) => ({
        ...prev,
        vendor: vId,
        vendor_name: newVendor.name || newVendor.vendor_name || "",
      }));
    }
  }, [fetchVendorsList]);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [usersRes] = await Promise.all([
          itHelpdeskAPI.users.getAll({ limit: 1000 }).catch(() => ({ data: [] })),
          fetchVendorsList(),
        ]);
        const userList = Array.isArray(usersRes?.data)
          ? usersRes.data
          : Array.isArray(usersRes)
            ? usersRes
            : [];
        setUsersList(userList);
      } catch (e) {
        console.error("Error loading master data:", e);
      }
    };
    fetchMasters();
  }, [fetchVendorsList]);

  // ── Fetch Assets & Stats ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pageParam,
        limit: limitParam,
        search: searchQuery,
      };

      if (activeTab !== "ALL") {
        params.status = activeTab;
      }
      if (categoryFilter) params.category = categoryFilter;
      if (inventoryTypeFilter) params.inventory_type = inventoryTypeFilter;
      if (conditionFilter) params.condition = conditionFilter;
      if (stockTypeFilter) params.stock_type = stockTypeFilter;
      if (departmentFilter) params.department = departmentFilter;
      if (warrantyFilter) params.warranty_status = warrantyFilter;

      const [listRes, statsRes] = await Promise.all([
        itHelpdeskAPI.unifiedAssets.getAll(params),
        itHelpdeskAPI.unifiedAssets.getStats(),
      ]);

      if (listRes?.success) {
        setData(listRes.data || []);
        if (listRes.pagination) {
          setPagination(listRes.pagination);
        }
      }
      if (statsRes?.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load equipment data");
    } finally {
      setLoading(false);
    }
  }, [
    pageParam,
    limitParam,
    activeTab,
    categoryFilter,
    stockTypeFilter,
    departmentFilter,
    warrantyFilter,
    searchQuery,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep searchInput in sync with searchQuery param
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // ── Next Tag Generator ──────────────────────────────────────────────────
  const handleOpenAddModal = async () => {
    setEditingId(null);
    let autoTag = "AST-2026-001";
    try {
      const res = await itHelpdeskAPI.unifiedAssets.getNextTag();
      if (res?.nextTag) autoTag = res.nextTag;
    } catch (e) {
      console.warn("Could not fetch next tag", e);
    }
    setFormData({
      ...EMPTY_FORM,
      asset_tag: autoTag,
      inventory_type: "Old Inventory",
      category: "Computer / Desktop",
      brand: "",
      model: "",
      serial_number: "",
      lifecycle_status: "Available",
      condition: "Good",
    });
    setFormModalOpen(true);
  };

  const handleRegenerateTag = async () => {
    try {
      const res = await itHelpdeskAPI.unifiedAssets.getNextTag();
      if (res?.nextTag) {
        setFormData((prev) => ({ ...prev, asset_tag: res.nextTag }));
        toast.success(`Generated: ${res.nextTag}`);
      }
    } catch (e) {
      toast.error("Failed to generate next tag");
    }
  };

  const handleOpenEditModal = (item) => {
    setEditingId(item._id);
    setFormData({
      // 1. Common Asset Information
      asset_tag: item.asset_tag || "",
      inventory_type: item.inventory_type || (item.stock_type === "New" ? "New Inventory" : "Old Inventory"),
      category: item.category || "Computer / Desktop",
      brand: item.brand || "",
      model: item.model || "",
      serial_number: item.serial_number || "",
      purchase_date: item.purchase_date ? item.purchase_date.slice(0, 10) : "",
      warranty_start_date: item.warranty_start_date ? item.warranty_start_date.slice(0, 10) : "",
      warranty_end_date: item.warranty_end_date ? item.warranty_end_date.slice(0, 10) : "",
      assigned_to: item.assigned_to?._id || item.assigned_to || "",
      assigned_to_name: item.assigned_to_name || item.assigned_to?.name || "",
      department: item.department || "",
      location: item.location || "",
      lifecycle_status: item.lifecycle_status || "Available",
      condition: item.condition || "Good",
      remarks: item.remarks || "",

      // Supporting fields
      asset_name: item.asset_name || "",
      asset_type: item.asset_type || item.category || "Computer / Desktop",
      stock_type: item.stock_type || "Old",
      vendor: item.vendor?._id || item.vendor || "",
      vendor_name: item.vendor_name || item.vendor?.name || item.vendor?.vendor_name || "",
      purchase_cost: item.purchase_cost || "",
      invoice_number: item.invoice_number || "",
      invoice_date: item.invoice_date ? item.invoice_date.slice(0, 10) : "",
      payment_mode: item.payment_mode || "UPI",
      invoice_url: item.invoice_url || "",

      // Dynamic Specifications (All categories)
      specs: {
        processor: item.specs?.processor || "",
        cpu_cores: item.specs?.cpu_cores || "",
        ram: item.specs?.ram || "",
        storage: item.specs?.storage || "",
        storage_type: item.specs?.storage_type || "SSD",
        storage_capacity: item.specs?.storage_capacity || "",
        total_storage: item.specs?.total_storage || "",
        raid_config: item.specs?.raid_config || "",
        operating_system: item.specs?.operating_system || "",
        hostname: item.specs?.hostname || "",
        server_role: item.specs?.server_role || "",
        screen_size: item.specs?.screen_size || "",
        resolution: item.specs?.resolution || "",
        warranty_duration: item.specs?.warranty_duration || "",
        printer_type: item.specs?.printer_type || "Laser",
        color_mono: item.specs?.color_mono || "Monochrome",
        print_technology: item.specs?.print_technology || "Laser",
        connectivity: item.specs?.connectivity || "Network & USB",
        print_count: item.specs?.print_count || "",
        device_type: item.specs?.device_type || "Switch",
        firmware_version: item.specs?.firmware_version || "",
        management_ip: item.specs?.management_ip || "",
        port_count: item.specs?.port_count || "",
        poe_support: item.specs?.poe_support || "No",
        poe_budget: item.specs?.poe_budget || "",
        uplink_port: item.specs?.uplink_port || "",
        rack_cabinet: item.specs?.rack_cabinet || "",
        form_factor: item.specs?.form_factor || "Rack",
        ip_address: item.specs?.ip_address || "",
        mac_address: item.specs?.mac_address || "",
        imei_number: item.specs?.imei_number || "",
        imei_2: item.specs?.imei_2 || "",
        sim_number: item.specs?.sim_number || "",
        service_provider: item.specs?.service_provider || "",
        software_name: item.specs?.software_name || "",
        version: item.specs?.version || "",
        license_type: item.specs?.license_type || "Subscription",
        license_key: item.specs?.license_key || "",
        seat_count: item.specs?.seat_count || "1",
        custom_notes: item.specs?.custom_notes || "",
      },
    });
    setFormModalOpen(true);
  };

  // ── Save Add/Edit ────────────────────────────────────────────────────────
  const handleSaveForm = async (e) => {
    if (e) e.preventDefault();
    if (!formData.asset_tag.trim()) {
      toast.error("Asset ID / Asset Tag is mandatory");
      return;
    }
    if (!formData.inventory_type) {
      toast.error("Inventory Type is mandatory");
      return;
    }
    if (!formData.category) {
      toast.error("Category is mandatory");
      return;
    }

    const isSoftware = formData.category === "Software License" || formData.category === "Software";

    if (isSoftware) {
      if (!formData.specs.software_name?.trim() && !formData.brand.trim()) {
        toast.error("Software Name is mandatory");
        return;
      }
    } else {
      if (!formData.brand.trim()) {
        toast.error("Brand is mandatory");
        return;
      }
      if (!formData.model.trim()) {
        toast.error("Model is mandatory");
        return;
      }
      if (!formData.serial_number.trim()) {
        toast.error("Serial Number is mandatory");
        return;
      }
    }

    if (!formData.lifecycle_status) {
      toast.error("Status is mandatory");
      return;
    }

    setFormSaving(true);
    try {
      const payload = {
        ...formData,
        stock_type: formData.inventory_type === "New Inventory" ? "New" : "Old",
      };

      if (isSoftware) {
        if (!payload.brand) payload.brand = formData.specs.software_name || "Software";
        if (!payload.model) payload.model = formData.specs.version || "License";
        if (!payload.serial_number) payload.serial_number = formData.specs.license_key || "N/A";
        payload.asset_name = formData.specs.software_name || "Software License";
      } else {
        payload.asset_name = `${formData.brand} ${formData.model}`.trim();
      }

      if (editingId) {
        await itHelpdeskAPI.unifiedAssets.update(editingId, payload);
        toast.success("Equipment details updated successfully");
      } else {
        await itHelpdeskAPI.unifiedAssets.create(payload);
        if (payload.inventory_type === "New Inventory" || payload.stock_type === "New") {
          toast.success("New equipment created and submitted for Invoice Approval (Shalini Arun)");
        } else {
          toast.success("New equipment created and added to registry");
        }
      }
      setFormModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save equipment");
    } finally {
      setFormSaving(false);
    }
  };

  // ── Invoice Approval Workflow Helpers ─────────────────────────────────────
  const getApprovalPermissions = (item) => {
    if (!item) {
      return {
        canApproveFirst: false,
        canApproveSecond: false,
        canReturn: false,
        canResubmit: false,
        isCompleted: false,
        isReturnedToIT: false,
        hasFirstVerified: false,
        hasManuVerified: false,
        isExistingInventory: false,
      };
    }
    const rawStage = item.approval_stage || "";
    const rawStatus = item.approval_status || "";
    const normStage = rawStage.toLowerCase().trim();
    const normStatus = rawStatus.toLowerCase().trim();
    const currentCycle = item.approval_cycle || 1;

    const hasFirstVerified =
      Array.isArray(item.admin_verifications) &&
      item.admin_verifications.some(
        (v) =>
          (String(v.username || "").toLowerCase() === "shalini_arun" ||
            String(v.username || "").toLowerCase() ===
            String(item.first_approver_username || "").toLowerCase().trim() ||
            String(v.action || "").toLowerCase().includes("first")) &&
          (v.approval_cycle === currentCycle || !v.approval_cycle)
      );

    const hasManuVerified =
      Array.isArray(item.admin_verifications) &&
      item.admin_verifications.some(
        (v) =>
          String(v.username || "").toLowerCase() === "manu_pillai" &&
          (v.approval_cycle === currentCycle || !v.approval_cycle)
      );

    const isReturnedToIT =
      normStage.includes("correction") ||
      normStatus.includes("returned") ||
      normStatus === "returned to it";

    const isExistingInventory =
      normStatus.includes("n/a") ||
      normStatus.includes("existing") ||
      normStage === "n/a";

    const isPending =
      normStatus.includes("pending") ||
      normStage.includes("first admin approval") ||
      normStage.includes("second admin approval");

    const isCompleted =
      !isReturnedToIT &&
      !isPending &&
      !isExistingInventory &&
      (hasManuVerified || (normStatus === "completed" && (hasFirstVerified || normStage === "completed")));

    const isFirstApprover =
      currentUsername === "shalini_arun" ||
      currentUsername === String(item.first_approver_username || "").toLowerCase().trim() ||
      currentUsername === "admin";

    const isManuPillai = currentUsername === "manu_pillai" || currentUsername === "admin";
    const isReturnedFromManu = normStatus.includes("rejected by manu_pillai");

    const canApproveFirst =
      !isCompleted &&
      !isExistingInventory &&
      (!hasFirstVerified || isReturnedFromManu) &&
      !isReturnedToIT &&
      isFirstApprover;

    const canApproveSecond =
      !isCompleted &&
      !isExistingInventory &&
      (hasFirstVerified || String(item.approval_stage || "") === "Second Admin Approval") &&
      !hasManuVerified &&
      !isReturnedToIT &&
      isManuPillai;

    const canReturn = !isCompleted && !isExistingInventory && !isReturnedToIT && (canApproveFirst || canApproveSecond);
    const canResubmit = isReturnedToIT && !isExistingInventory;

    return {
      canApproveFirst,
      canApproveSecond,
      canReturn,
      canResubmit,
      isCompleted,
      isReturnedToIT,
      hasFirstVerified,
      hasManuVerified,
      isExistingInventory,
    };
  };

  const getWorkflowBadgeInfo = (stage = "", status = "", verifications = [], approverUsername = "") => {
    const normStage = String(stage || "").toLowerCase().trim();
    const normStatus = String(status || "").toLowerCase().trim();

    const isReturnedToIT =
      normStage.includes("correction") ||
      normStatus.includes("returned") ||
      normStatus === "returned to it";

    const isRejectedStatus =
      (normStage.includes("reject") || normStatus.includes("reject")) && !isReturnedToIT;

    const hasFirst = (verifications || []).some(
      (v) =>
        String(v.username || "").toLowerCase() === "shalini_arun" ||
        String(v.username || "").toLowerCase() === String(approverUsername || "").toLowerCase() ||
        String(v.action || "").toLowerCase().includes("first")
    );
    const hasManu = (verifications || []).some(
      (v) => String(v.username || "").toLowerCase() === "manu_pillai"
    );

    if (isReturnedToIT) {
      return {
        color: "#c2410c",
        bg: "#fff7ed",
        border: "#fed7aa",
        label: "Returned to IT",
        icon: "rotate",
      };
    }
    if (isRejectedStatus) {
      return {
        color: "#b91c1c",
        bg: "#fef2f2",
        border: "#fecaca",
        label: "Rejected",
        icon: "reject",
      };
    }
    // Existing inventory / N/A
    if (normStatus.includes("n/a") || normStatus.includes("existing") || normStage === "n/a") {
      return {
        color: "#475569",
        bg: "#f1f5f9",
        border: "#cbd5e1",
        label: "N/A - Existing Inventory",
        icon: "info",
      };
    }
    // Pending Manu (Final Approval)
    if (normStatus.includes("manu") || (hasFirst && !hasManu)) {
      return {
        color: "#1d4ed8",
        bg: "#eff6ff",
        border: "#bfdbfe",
        label: "Pending manu_pillai",
        icon: "clock",
      };
    }
    // Pending First Approval
    if (normStage.includes("first") || normStatus.includes("first") || (!hasFirst && !hasManu)) {
      return {
        color: "#92400e",
        bg: "#fffbeb",
        border: "#fde68a",
        label: approverUsername ? `Pending ${approverUsername}` : "Pending shalini_arun",
        icon: "clock",
      };
    }
    // Completed ONLY when manu has verified or status is explicitly completed
    if (hasManu || (normStatus === "completed" && (hasFirst || normStage === "completed"))) {
      return {
        color: "#15803d",
        bg: "#f0fdf4",
        border: "#bbf7d0",
        label: "Completed",
        icon: "shield",
      };
    }
    return {
      color: "#64748b",
      bg: "#f8fafc",
      border: "#e2e8f0",
      label: status || stage || "In Review",
      icon: "clock",
    };
  };

  const handleOpenWorkflowAction = (asset, actionType) => {
    setWorkflowTarget(asset);
    setWorkflowAction(actionType);
    setWorkflowRemarks("");
    setWorkflowModalOpen(true);
  };

  const handleExecuteWorkflow = async () => {
    if (!workflowTarget || !workflowAction) return;
    setWorkflowSubmitting(true);
    try {
      const res = await itHelpdeskAPI.unifiedAssets.updateWorkflow(workflowTarget._id, {
        action: workflowAction,
        remarks: workflowRemarks,
      });
      toast.success(res.message || "Approval status updated successfully!");
      setWorkflowModalOpen(false);
      if (detailsModalOpen && selectedAsset?._id === workflowTarget._id) {
        setSelectedAsset(res.data || res);
      }
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update workflow.");
    } finally {
      setWorkflowSubmitting(false);
    }
  };

  // ── Quick Assign ─────────────────────────────────────────────────────────
  const handleOpenAssign = (item) => {
    setAssignTarget(item);
    setAssignForm({
      userId: "",
      userName: "",
      department: item.department || "",
      location: item.location || "",
      remarks: "",
    });
    setAssignModalOpen(true);
  };

  const handleExecuteAssign = async () => {
    if (!assignForm.userId) {
      toast.error("Please select an employee");
      return;
    }
    try {
      await itHelpdeskAPI.unifiedAssets.quickAssign(assignTarget._id, assignForm);
      toast.success(`Assigned ${assignTarget.asset_tag} to ${assignForm.userName}`);
      setAssignModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to assign asset");
    }
  };

  // ── Quick Return ─────────────────────────────────────────────────────────
  const handleOpenReturn = (item) => {
    setReturnTarget(item);
    setReturnForm({
      stockType: "Old",
      remarks: "",
    });
    setReturnModalOpen(true);
  };

  const handleExecuteReturn = async () => {
    try {
      await itHelpdeskAPI.unifiedAssets.quickReturn(returnTarget._id, returnForm);
      toast.success(`${returnTarget.asset_tag} returned to stock inventory`);
      setReturnModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to return asset to stock");
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await itHelpdeskAPI.unifiedAssets.remove(deleteTargetId);
      toast.success("Equipment deleted successfully");
      setDeleteConfirmOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete equipment");
    }
  };

  // ── Safe Clone from Legacy ───────────────────────────────────────────────
  const handleSyncLegacy = async () => {
    setSyncingLegacy(true);
    try {
      const res = await itHelpdeskAPI.unifiedAssets.cloneFromLegacy();
      toast.success(res.message || "Synced records from legacy modules");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to sync legacy data");
    } finally {
      setSyncingLegacy(false);
    }
  };

  // ── Export Excel ─────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const params = {};
      if (activeTab !== "ALL") params.status = activeTab;
      if (categoryFilter) params.category = categoryFilter;
      if (stockTypeFilter) params.stock_type = stockTypeFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await itHelpdeskAPI.unifiedAssets.exportExcel(params);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Unified_IT_Asset_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Excel exported successfully");
    } catch (err) {
      toast.error("Failed to export Excel report");
    } finally {
      setExportingExcel(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Copied: ${text}`, { duration: 1500 });
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case "Laptop":
        return <Laptop size={15} color="#2563eb" />;
      case "Computer":
      case "Computer / Desktop":
        return <Cpu size={15} color="#4f46e5" />;
      case "Printer":
        return <Printer size={15} color="#d97706" />;
      case "Monitor":
        return <Monitor size={15} color="#0891b2" />;
      case "Server":
        return <Server size={15} color="#7c3aed" />;
      case "Network Device":
        return <Wifi size={15} color="#059669" />;
      case "Mobile Device":
        return <Smartphone size={15} color="#e11d48" />;
      case "Software":
      case "Software License":
        return <Layers size={15} color="#0284c7" />;
      default:
        return <HardDrive size={15} color="#64748b" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Available":
      case "In Stock":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              background: "#ecfdf5",
              color: "#059669",
              border: "1px solid #a7f3d0",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            {status === "In Stock" ? "In Stock" : "Available"}
          </span>
        );
      case "In Use":
      case "Assigned":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              background: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6" }} />
            {status === "Assigned" ? "Assigned" : "In Use"}
          </span>
        );
      case "Under Maintenance":
      case "Under Repair":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              background: "#fffbeb",
              color: "#d97706",
              border: "1px solid #fde68a",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
            {status}
          </span>
        );
      case "Damaged":
      case "Lost":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
            {status}
          </span>
        );
      case "Disposed":
      case "Retired":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              background: "#f1f5f9",
              color: "#64748b",
              border: "1px solid #cbd5e1",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8" }} />
            {status}
          </span>
        );
      case "Returned":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              background: "#eef2ff",
              color: "#4f46e5",
              border: "1px solid #c7d2fe",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />
            Returned
          </span>
        );
      case "Spare":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              background: "#faf5ff",
              color: "#7c3aed",
              border: "1px solid #e9d5ff",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }} />
            Spare Pool
          </span>
        );
      default:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 8px",
              borderRadius: "6px",
              fontSize: "12px",
              background: "#f8fafc",
              color: "#334155",
              border: "1px solid #e2e8f0",
            }}
          >
            {status}
          </span>
        );
    }
  };

  const getInventoryTypeBadge = (type) => {
    const isNew = type === "New Inventory" || type === "New";
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 700,
          background: isNew ? "#ecfdf5" : "#f1f5f9",
          color: isNew ? "#059669" : "#475569",
          border: `1px solid ${isNew ? "#a7f3d0" : "#cbd5e1"}`,
          whiteSpace: "nowrap",
        }}
      >
        {isNew ? "New Inventory" : "Old Inventory"}
      </span>
    );
  };

  const getConditionBadge = (cond) => {
    switch (cond) {
      case "Good":
        return (
          <span
            style={{
              padding: "2px 7px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              background: "#ecfdf5",
              color: "#059669",
              border: "1px solid #a7f3d0",
            }}
          >
            Good
          </span>
        );
      case "Fair":
        return (
          <span
            style={{
              padding: "2px 7px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              background: "#fffbeb",
              color: "#d97706",
              border: "1px solid #fde68a",
            }}
          >
            Fair
          </span>
        );
      case "Damaged":
        return (
          <span
            style={{
              padding: "2px 7px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
            }}
          >
            Damaged
          </span>
        );
      case "Non-Functional":
        return (
          <span
            style={{
              padding: "2px 7px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              background: "#450a0a",
              color: "#fecaca",
              border: "1px solid #991b1b",
            }}
          >
            Non-Functional
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: "2px 7px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              background: "#f8fafc",
              color: "#64748b",
              border: "1px solid #e2e8f0",
            }}
          >
            {cond || "Good"}
          </span>
        );
    }
  };

  const getWarrantyBadge = (endStr) => {
    if (!endStr) {
      return (
        <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 500 }}>
          — No Warranty
        </span>
      );
    }
    const end = new Date(endStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: "11.5px",
            fontWeight: 700,
            background: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fecaca",
          }}
          title={`Expired on ${end.toLocaleDateString("en-IN")}`}
        >
          <AlertCircle size={12} /> Expired
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: "11.5px",
            fontWeight: 700,
            background: "#fffbeb",
            color: "#d97706",
            border: "1px solid #fde68a",
          }}
          title={`Expires in ${diffDays} days (${end.toLocaleDateString("en-IN")})`}
        >
          <Clock size={12} /> Expiring ({diffDays}d)
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          borderRadius: "6px",
          fontSize: "11.5px",
          fontWeight: 700,
          background: "#ecfdf5",
          color: "#059669",
          border: "1px solid #a7f3d0",
        }}
        title={`Valid until ${end.toLocaleDateString("en-IN")}`}
      >
        <CheckCircle2 size={12} /> Active ({diffDays}d)
      </span>
    );
  };

  return (
    <>
      {/* ── TOPBAR ───────────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="back-btn"
            onClick={() => navigate("/it-helpdesk")}
            title="Back to IT Helpdesk Home"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="topbar-title">IT Asset &amp; Inventory Management</span>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "#eef2ff",
                  color: "#4f46e5",
                  border: "1px solid #c7d2fe",
                  textTransform: "uppercase",
                }}
              >
                Unified Hub
              </span>
            </div>
            <div className="topbar-breadcrumb">
              Consolidated lifecycle tracking: from stockroom &amp; spares to active employee assignments and warranty.
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Procurement Pipeline */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/it-helpdesk/procurement")}
            title="Open IT Procurement, Quotations & Approvals Pipeline"
            style={{ borderColor: "#ea580c", color: "#c2410c", background: "#fff7ed", fontWeight: 650 }}
          >
            <ShoppingCart size={14} color="#ea580c" />
            <span>Procurement &amp; Approvals</span>
          </button>

          {/* Sync from Legacy */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSyncLegacy}
            disabled={syncingLegacy}
            title="Import existing records from old Asset & Inventory collections safely"
          >
            <RotateCcw size={14} className={syncingLegacy ? "animate-spin" : ""} color="#475569" />
            <span>{syncingLegacy ? "Syncing..." : "Sync from Legacy"}</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportExcel}
            disabled={exportingExcel}
          >
            <Download size={14} color="#475569" />
            <span>{exportingExcel ? "Exporting..." : "Export Excel"}</span>
          </button>

          {/* Refresh Grid */}
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={fetchData}
            disabled={loading}
            title="Refresh Data"
            style={{ width: "36px", height: "36px", borderRadius: "8px" }}
          >
            <RefreshCw size={15} color="#475569" className={loading ? "animate-spin" : ""} />
          </button>

          {/* Add Equipment */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>Add Equipment</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── KPI METRICS CARDS ────────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body" style={{ padding: "12px 14px" }}>
            <div
              className="stat-grid"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "10px",
              }}
            >
              {/* Total Units */}
              <div
                className="stat-card"
                onClick={() => updateFilters({ tab: "ALL", page: 1 })}
                style={{
                  cursor: "pointer",
                  border: activeTab === "ALL" ? "2px solid #4f46e5" : "1px solid #e2e8f0",
                  background: activeTab === "ALL" ? "#f5f3ff" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Units</span>
                  <Layers size={15} color="#4f46e5" />
                </div>
                <div className="stat-val" style={{ color: "#0f172a", fontSize: "20px" }}>{stats.total}</div>
                <div className="stat-lbl" style={{ fontSize: "10px", color: "#94a3b8" }}>All registered</div>
              </div>

              {/* In Stock */}
              <div
                className="stat-card"
                onClick={() => updateFilters({ tab: "In Stock", page: 1 })}
                style={{
                  cursor: "pointer",
                  border: activeTab === "In Stock" ? "2px solid #10b981" : "1px solid #e2e8f0",
                  background: activeTab === "In Stock" ? "#ecfdf5" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>In Stock</span>
                  <PackageCheck size={15} color="#10b981" />
                </div>
                <div className="stat-val" style={{ color: "#059669", fontSize: "20px" }}>{stats.inStock}</div>
                <div className="stat-lbl" style={{ fontSize: "10px", color: "#059669" }}>Ready to deploy</div>
              </div>

              {/* Deployed */}
              <div
                className="stat-card"
                onClick={() => updateFilters({ tab: "Assigned", page: 1 })}
                style={{
                  cursor: "pointer",
                  border: activeTab === "Assigned" ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  background: activeTab === "Assigned" ? "#eff6ff" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>Deployed</span>
                  <UserCheck size={15} color="#2563eb" />
                </div>
                <div className="stat-val" style={{ color: "#2563eb", fontSize: "20px" }}>{stats.assigned}</div>
                <div className="stat-lbl" style={{ fontSize: "10px", color: "#2563eb" }}>In use with staff</div>
              </div>

              {/* Spare Pool */}
              <div
                className="stat-card"
                onClick={() => updateFilters({ tab: "Spare", page: 1 })}
                style={{
                  cursor: "pointer",
                  border: activeTab === "Spare" ? "2px solid #7c3aed" : "1px solid #e2e8f0",
                  background: activeTab === "Spare" ? "#faf5ff" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>Spare Pool</span>
                  <HardDrive size={15} color="#7c3aed" />
                </div>
                <div className="stat-val" style={{ color: "#7c3aed", fontSize: "20px" }}>{stats.spares}</div>
                <div className="stat-lbl" style={{ fontSize: "10px", color: "#7c3aed" }}>Backup hardware</div>
              </div>

              {/* Maintenance */}
              <div
                className="stat-card"
                onClick={() => updateFilters({ tab: "Under Maintenance", page: 1 })}
                style={{
                  cursor: "pointer",
                  border: activeTab === "Under Maintenance" ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                  background: activeTab === "Under Maintenance" ? "#fffbeb" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", textTransform: "uppercase" }}>Maintenance</span>
                  <Wrench size={15} color="#f59e0b" />
                </div>
                <div className="stat-val" style={{ color: "#d97706", fontSize: "20px" }}>{stats.maintenance}</div>
                <div className="stat-lbl" style={{ fontSize: "10px", color: "#d97706" }}>In repair / servicing</div>
              </div>

              {/* Expiring Warranty */}
              <div
                className="stat-card"
                onClick={() => updateFilters({ warranty: "expiring", page: 1 })}
                style={{
                  cursor: "pointer",
                  border: warrantyFilter === "expiring" ? "2px solid #ef4444" : "1px solid #e2e8f0",
                  background: warrantyFilter === "expiring" ? "#fef2f2" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>Warranty (30d)</span>
                  <ShieldCheck size={15} color="#ef4444" />
                </div>
                <div className="stat-val" style={{ color: "#dc2626", fontSize: "20px" }}>{stats.expiringWarranty}</div>
                <div className="stat-lbl" style={{ fontSize: "10px", color: "#dc2626" }}>Renewal needed</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS & FILTER CARD ───────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body" style={{ padding: "14px 16px" }}>
            {/* Top row: Pill Segment Navigation Tabs */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "12px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  background: "#f1f5f9",
                  padding: "4px",
                  borderRadius: "10px",
                  gap: "4px",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { id: "ALL", label: "All Equipment", count: stats.total, icon: Boxes },
                  { id: "In Stock", label: "In Stock (Inventory)", count: stats.inStock, icon: Package },
                  { id: "Assigned", label: "Deployed / In Use", count: stats.assigned, icon: UserCheck },
                  { id: "Spare", label: "Spares Pool", count: stats.spares, icon: HardDrive },
                  { id: "Under Maintenance", label: "Maintenance", count: stats.maintenance, icon: Wrench },
                  { id: "Retired", label: "Retired / Disposed", count: stats.retired, icon: Archive },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const IconComp = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => updateFilters({ tab: tab.id, page: 1 })}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: isActive ? "#ffffff" : "transparent",
                        color: isActive ? "#0f172a" : "#64748b",
                        fontWeight: isActive ? 700 : 500,
                        fontSize: "12.5px",
                        cursor: "pointer",
                        boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <IconComp size={14} color={isActive ? "#4f46e5" : "#64748b"} />
                      <span>{tab.label}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          background: isActive ? "#eef2ff" : "#e2e8f0",
                          color: isActive ? "#4f46e5" : "#64748b",
                          padding: "1px 6px",
                          borderRadius: "10px",
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom row: Filter Controls */}
            {/* Bottom row: Filter Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              {/* Search Bar */}
              <div style={{ position: "relative", minWidth: "260px", maxWidth: "380px", flex: "1 1 auto" }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by tag, brand, model, user, IP..."
                  value={searchInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchInput(val);
                    updateFilters({ search: val, page: 1 });
                  }}
                  style={{
                    paddingLeft: "34px",
                    paddingRight: searchInput ? "32px" : "12px",
                    height: "38px",
                    width: "100%",
                    borderRadius: "8px",
                  }}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      updateFilters({ search: "", page: 1 });
                    }}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdowns Group */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                {/* Category Dropdown */}
                <div style={{ width: "170px" }}>
                  <CustomSelect
                    value={categoryFilter || "ALL"}
                    onChange={(val) => updateFilters({ category: val, page: 1 })}
                    options={[
                      { label: "All Categories", value: "ALL" },
                      ...CATEGORIES.map((c) => ({ label: c, value: c })),
                    ]}
                    placeholder="All Categories"
                    width="100%"
                    minWidth="100%"
                  />
                </div>

                {/* Inventory Type Dropdown */}
                <div style={{ width: "160px" }}>
                  <CustomSelect
                    value={inventoryTypeFilter || "ALL"}
                    onChange={(val) => updateFilters({ inventory_type: val, page: 1 })}
                    options={[
                      { label: "All Types", value: "ALL" },
                      ...INVENTORY_TYPES.map((t) => ({ label: t, value: t })),
                    ]}
                    placeholder="Inventory Type"
                    width="100%"
                    minWidth="100%"
                  />
                </div>

                {/* Condition Dropdown */}
                <div style={{ width: "150px" }}>
                  <CustomSelect
                    value={conditionFilter || "ALL"}
                    onChange={(val) => updateFilters({ condition: val, page: 1 })}
                    options={[
                      { label: "All Conditions", value: "ALL" },
                      ...CONDITIONS.map((c) => ({ label: c, value: c })),
                    ]}
                    placeholder="Condition"
                    width="100%"
                    minWidth="100%"
                  />
                </div>

                {/* Department Dropdown */}
                <div style={{ width: "160px" }}>
                  <CustomSelect
                    value={departmentFilter || "ALL"}
                    onChange={(val) => updateFilters({ department: val, page: 1 })}
                    options={[
                      { label: "All Depts", value: "ALL" },
                      ...DEPARTMENTS.map((d) => ({ label: d, value: d })),
                    ]}
                    placeholder="All Depts"
                    width="100%"
                    minWidth="100%"
                  />
                </div>

                {/* Clear Filters Button */}
                {(categoryFilter || inventoryTypeFilter || conditionFilter || stockTypeFilter || departmentFilter || warrantyFilter || searchQuery) && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearchInput("");
                      updateFilters({
                        category: "",
                        inventory_type: "",
                        condition: "",
                        stock_type: "",
                        department: "",
                        warranty: "",
                        search: "",
                        page: 1,
                      });
                    }}
                    style={{
                      height: "38px",
                      padding: "0 14px",
                      color: "#dc2626",
                      borderColor: "#fecaca",
                      background: "#ffffff",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      whiteSpace: "nowrap",
                    }}
                    title="Reset All Filters"
                  >
                    <RotateCcw size={13} color="#dc2626" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── DATA TABLE CARD ─────────────────────────────────────────── */}
        <div className="card">
          <div
            className="card-header"
            style={{
              padding: "10px 16px",
              background: "linear-gradient(to right, #f8fafc, #ffffff)",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div
              className="card-title"
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Boxes size={18} color="#4f46e5" />
              <span>Unified Asset &amp; Inventory Registry</span>
            </div>

            <span
              style={{
                fontSize: "12px",
                color: "#64748b",
                background: "#f1f5f9",
                padding: "4px 10px",
                borderRadius: "12px",
                fontWeight: 600,
              }}
            >
              Showing {data.length} of {pagination.total || 0} records
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
                <RefreshCw size={20} className="animate-spin" style={{ display: "inline-block", marginRight: "8px" }} />
                Loading equipment registry...
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%", minWidth: "1150px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44, minWidth: 44, textAlign: "center" }}>#</th>
                      <th style={{ minWidth: 140 }}>Asset Tag / Serial</th>
                      <th style={{ minWidth: 180 }}>Equipment &amp; Model</th>
                      <th style={{ minWidth: 120 }}>Category</th>
                      <th style={{ minWidth: 125 }}>Inventory Type</th>
                      <th style={{ minWidth: 110 }}>Status</th>
                      <th style={{ minWidth: 100 }}>Condition</th>
                      <th style={{ minWidth: 160 }}>Assigned To</th>
                      <th style={{ minWidth: 165 }}>Invoice Approval Status</th>
                      <th style={{ minWidth: 110 }}>Warranty</th>
                      <th style={{ width: 140, minWidth: 140, textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                          <PackageCheck size={36} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
                          <div style={{ fontWeight: 700, fontSize: "14px", color: "#475569" }}>
                            No equipment found matching criteria
                          </div>
                          <div style={{ fontSize: "12px", marginTop: "4px" }}>
                            Try resetting filters or click <b>"Sync from Legacy"</b> to import records from older tables.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.map((item, idx) => (
                        <tr
                          key={item._id}
                          style={{
                            background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd",
                            transition: "background 0.15s ease",
                          }}
                        >
                          {/* Index */}
                          <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                            {(pagination.page - 1) * pagination.limit + idx + 1}
                          </td>

                          {/* Asset Tag & Serial */}
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  fontWeight: 800,
                                  fontSize: "13px",
                                  color: "#0f172a",
                                }}
                              >
                                {item.asset_tag}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.asset_tag)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  padding: 0,
                                  color: "#94a3b8",
                                }}
                                title="Copy Tag"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                            {item.serial_number && (
                              <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace", marginTop: "2px" }}>
                                S/N: {item.serial_number}
                              </div>
                            )}
                          </td>

                          {/* Equipment & Model */}
                          <td>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                              <div
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  background: "#f1f5f9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  marginTop: "2px",
                                }}
                              >
                                {getCategoryIcon(item.category)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                                  {item.asset_name || `${item.brand || ""} ${item.model || ""}`.trim() || item.category}
                                </div>
                                <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                                  {item.brand ? <b>{item.brand} </b> : ""}
                                  {item.model || ""}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td>
                            <span
                              style={{
                                fontSize: "11.5px",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                background: "#f8fafc",
                                color: "#334155",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {item.category}
                            </span>
                          </td>

                          {/* Inventory Type */}
                          <td>{getInventoryTypeBadge(item.inventory_type || item.stock_type)}</td>

                          {/* Status */}
                          <td>{getStatusBadge(item.lifecycle_status)}</td>

                          {/* Condition */}
                          <td>{getConditionBadge(item.condition)}</td>

                          {/* Assigned To */}
                          <td>
                            {(item.assigned_to || item.assigned_to_name) ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    background: "#e0e7ff",
                                    color: "#4338ca",
                                    fontWeight: 700,
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  {(item.assigned_to_name || item.assigned_to?.name || "U")[0].toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "12.5px" }}>
                                    {item.assigned_to_name || item.assigned_to?.name || item.assigned_to?.username}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                                    {item.department || "Staff"}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>
                                — Unassigned
                              </span>
                            )}
                          </td>

                          {/* Invoice Approval Status (Two-Tier Workflow for New Inventory) */}
                          <td style={{ verticalAlign: "middle" }}>
                            {item.inventory_type === "New Inventory" || item.stock_type === "New" ? (
                              (() => {
                                const perms = getApprovalPermissions(item);
                                const badge = getWorkflowBadgeInfo(
                                  item.approval_stage,
                                  item.approval_status,
                                  item.admin_verifications,
                                  item.first_approver_username
                                );
                                const verifiers = [];
                                if (!perms.isReturnedToIT && Array.isArray(item.admin_verifications)) {
                                  item.admin_verifications.forEach((v) => {
                                    const u = v.username || v.name;
                                    if (u && !verifiers.some((x) => x.username === u)) {
                                      verifiers.push({ username: u, action: v.action });
                                    }
                                  });
                                }

                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <div
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color: badge.color,
                                        backgroundColor: badge.bg,
                                        border: `1px solid ${badge.border}`,
                                        padding: "2px 8px",
                                        borderRadius: "5px",
                                        width: "fit-content",
                                      }}
                                    >
                                      {badge.icon === "rotate" && <RotateCcw size={11} />}
                                      {badge.icon === "reject" && <XCircle size={11} />}
                                      {badge.icon === "shield" && <ShieldCheck size={11} />}
                                      {badge.icon === "clock" && <Clock size={11} />}
                                      <span>{badge.label}</span>
                                    </div>

                                    {verifiers.length > 0 && (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                                        {verifiers.map((v, i) => (
                                          <span
                                            key={i}
                                            style={{
                                              fontSize: "10px",
                                              padding: "1px 6px",
                                              borderRadius: "3px",
                                              backgroundColor: "#f0fdf4",
                                              color: "#166534",
                                              border: "1px solid #bbf7d0",
                                              fontWeight: 600,
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "2px",
                                            }}
                                          >
                                            ✓ {v.username}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Action button if logged-in user can approve */}
                                    {(perms.canApproveFirst || perms.canApproveSecond) && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenWorkflowAction(
                                            item,
                                            perms.canApproveFirst ? "approve_first" : "approve_second"
                                          )
                                        }
                                        style={{
                                          marginTop: "2px",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          fontSize: "10.5px",
                                          fontWeight: 700,
                                          color: "#166534",
                                          background: "#dcfce7",
                                          border: "1px solid #86efac",
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          cursor: "pointer",
                                          width: "fit-content",
                                        }}
                                      >
                                        <Check size={11} />{" "}
                                        {perms.canApproveFirst ? "Verify (Shalini)" : "Approve (Manu)"}
                                      </button>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <span
                                style={{
                                  display: "inline-block",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#64748b",
                                  backgroundColor: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  padding: "2px 8px",
                                  borderRadius: "5px",
                                }}
                              >
                                N/A — Existing Inventory
                              </span>
                            )}
                          </td>

                          {/* Warranty */}
                          <td>{getWarrantyBadge(item.warranty_end_date)}</td>

                          {/* Action Buttons */}
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                              {/* Quick Assign / Return Button */}
                              {item.lifecycle_status === "Assigned" ? (
                                <Tooltip title="Return to Stock">
                                  <button
                                    type="button"
                                    className="btn btn-icon btn-secondary"
                                    onClick={() => handleOpenReturn(item)}
                                    style={{ width: "28px", height: "28px", color: "#d97706" }}
                                  >
                                    <ArrowRightLeft size={13} color="#d97706" />
                                  </button>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Assign to Employee">
                                  <button
                                    type="button"
                                    className="btn btn-icon btn-secondary"
                                    onClick={() => handleOpenAssign(item)}
                                    style={{ width: "28px", height: "28px", color: "#059669" }}
                                  >
                                    <UserCheck size={14} color="#059669" />
                                  </button>
                                </Tooltip>
                              )}

                              {/* View Details */}
                              <Tooltip title="View Specifications, Invoice & History">
                                <button
                                  type="button"
                                  className="btn btn-icon btn-secondary"
                                  onClick={async () => {
                                    try {
                                      const res = await itHelpdeskAPI.unifiedAssets.getById(item._id);
                                      setSelectedAsset(res.data || res || item);
                                    } catch (err) {
                                      setSelectedAsset(item);
                                    }
                                    setDetailsTab("overview");
                                    setCopiedTag(false);
                                    setCopiedSerial(false);
                                    setDetailsModalOpen(true);
                                  }}
                                  style={{ width: "28px", height: "28px", color: "#4f46e5" }}
                                >
                                  <Eye size={14} color="#4f46e5" />
                                </button>
                              </Tooltip>

                              {/* Edit */}
                              <Tooltip title="Edit Details">
                                <button
                                  type="button"
                                  className="btn btn-icon btn-secondary"
                                  onClick={() => handleOpenEditModal(item)}
                                  style={{ width: "28px", height: "28px", color: "#475569" }}
                                >
                                  <Edit2 size={13} color="#475569" />
                                </button>
                              </Tooltip>

                              {/* Delete */}
                              <Tooltip title="Delete Equipment">
                                <button
                                  type="button"
                                  className="btn btn-icon btn-danger"
                                  onClick={() => {
                                    setDeleteTargetId(item._id);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  style={{ width: "28px", height: "28px" }}
                                >
                                  <Trash2 size={13} color="#dc2626" />
                                </button>
                              </Tooltip>
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
              page={pagination.page || pageParam}
              totalPages={pagination.totalPages || 1}
              totalRecords={pagination.total || 0}
              limit={pagination.limit || limitParam}
              onPageChange={(newPage) => updateFilters({ page: newPage })}
              onLimitChange={(newLimit) => updateFilters({ limit: newLimit, page: 1 })}
            />
          </div>
        </div>
      </div>

      {/* ── MODAL: ADD / EDIT EQUIPMENT ───────────────────────────────────── */}
      <Dialog
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        maxWidth="md"
        fullWidth
        disableEnforceFocus={showAddVendorModal}
      >
        <DialogTitle
          style={{
            padding: "14px 20px",
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 700,
            fontSize: "16px",
            color: "#0f172a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Boxes size={20} color="#4f46e5" />
            <span>{editingId ? "Edit Equipment Details" : "Add Equipment to Unified Registry"}</span>
          </div>
          <IconButton size="small" onClick={() => setFormModalOpen(false)}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSaveForm}>
          <DialogContent style={{ padding: "20px 24px", maxHeight: "74vh", overflowY: "auto" }}>
            {(() => {
              const isComputer = formData.category === "Computer" || formData.category === "Computer / Desktop";
              const isLaptop = formData.category === "Laptop";
              const isMonitor = formData.category === "Monitor";
              const isPrinter = formData.category === "Printer";
              const isServer = formData.category === "Server";
              const isNetworkDevice = formData.category === "Network Device";
              const isMobileDevice = formData.category === "Mobile Device";
              const isSoftware = formData.category === "Software License" || formData.category === "Software";
              const isOther = !isComputer && !isLaptop && !isMonitor && !isPrinter && !isServer && !isNetworkDevice && !isMobileDevice && !isSoftware;

              return (
                <>
                  {/* Category Standard Notification Pill */}
                  <div
                    style={{
                      padding: "10px 14px",
                      background: isMonitor
                        ? "#ecfeff"
                        : isComputer || isLaptop
                          ? "#eff6ff"
                          : isPrinter
                            ? "#fffbeb"
                            : isServer
                              ? "#f5f3ff"
                              : isNetworkDevice
                                ? "#ecfdf5"
                                : isSoftware
                                  ? "#f0fdf4"
                                  : "#f8fafc",
                      border: `1px solid ${isMonitor
                        ? "#a5f3fc"
                        : isComputer || isLaptop
                          ? "#bfdbfe"
                          : isPrinter
                            ? "#fde68a"
                            : isServer
                              ? "#ddd6fe"
                              : isNetworkDevice
                                ? "#a7f3d0"
                                : isSoftware
                                  ? "#bbf7d0"
                                  : "#e2e8f0"
                        }`,
                      borderRadius: "8px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "#0f172a",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {getCategoryIcon(formData.category)}
                      <span>
                        Active Standard: <b>{formData.category}</b> — Showing specific fields defined in Suraj IT Asset Standard.
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      {isComputer
                        ? "Sec 2 • Desktop Standard"
                        : isLaptop
                          ? "Sec 3 • Laptop Standard"
                          : isMonitor
                            ? "Sec 4 • Monitor Standard"
                            : isPrinter
                              ? "Sec 5 • Printer Standard"
                              : isServer
                                ? "Sec 6 • Server Standard"
                                : isNetworkDevice
                                  ? "Sec 7 • Network Device Standard"
                                  : isMobileDevice
                                    ? "Sec 8 • Mobile Device Standard"
                                    : isSoftware
                                      ? "Sec 9 • Software License Standard"
                                      : "Sec 10 • Other Assets"}
                    </span>
                  </div>

                  {/* ── SECTION 1: CORE IDENTIFIERS ── */}
                  <div style={{ marginBottom: "18px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#4f46e5",
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: "5px",
                      }}
                    >
                      <Tag size={14} /> 1. Core Identification
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px" }}>
                      {/* Asset ID / Asset Tag (Mandatory) */}
                      <div className="form-field">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                          <label style={{ margin: 0, fontWeight: 700 }}>
                            {isSoftware ? "Asset ID / License ID *" : "Asset ID / Asset Tag *"}
                          </label>
                          <button
                            type="button"
                            onClick={handleRegenerateTag}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#4f46e5",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                            title="Generate next sequential tag in AST-2026-XXX series"
                          >
                            <RefreshCw size={11} /> Auto Tag
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={formData.asset_tag}
                          onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value.toUpperCase() })}
                          placeholder={
                            isSoftware
                              ? "e.g. SURAJ-LIC-001"
                              : isComputer
                                ? "e.g. SURAJ-PC-001"
                                : isLaptop
                                  ? "e.g. SURAJ-LAP-001"
                                  : isMonitor
                                    ? "e.g. SURAJ-MON-001"
                                    : "e.g. AST-2026-001"
                          }
                          style={{ fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.5px" }}
                        />
                        <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                          Unique identifier (Mandatory) • Editable
                        </span>
                      </div>

                      {/* Inventory Type (Mandatory) */}
                      <div className="form-field">
                        <label style={{ fontWeight: 700 }}>Inventory Type *</label>
                        <select
                          className="form-select"
                          required
                          value={formData.inventory_type}
                          onChange={(e) => setFormData({ ...formData, inventory_type: e.target.value })}
                        >
                          {INVENTORY_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                          Old Inventory / New Inventory
                        </span>
                      </div>

                      {/* Category (Mandatory) */}
                      <div className="form-field">
                        <label style={{ fontWeight: 700 }}>Category *</label>
                        <select
                          className="form-select"
                          required
                          value={formData.category}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            setFormData({
                              ...formData,
                              category: newCat,
                              asset_type: newCat,
                            });
                          }}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                          Selecting category updates dynamic fields below
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 2: EQUIPMENT / SOFTWARE IDENTITY ── */}
                  <div style={{ marginBottom: "18px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#4f46e5",
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: "5px",
                      }}
                    >
                      <Boxes size={14} /> 2. {isSoftware ? "Software Information" : "Equipment Identity"}
                    </div>

                    {isSoftware ? (
                      /* Software License Fields (Sec 9) */
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px" }}>
                        <div className="form-field">
                          <label style={{ fontWeight: 700 }}>Software Name *</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            value={formData.specs.software_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                brand: e.target.value,
                                specs: { ...formData.specs, software_name: e.target.value },
                              })
                            }
                            placeholder="e.g. Microsoft 365 / Tally Prime / Adobe"
                          />
                        </div>
                        <div className="form-field">
                          <label>Version</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.specs.version}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                model: e.target.value,
                                specs: { ...formData.specs, version: e.target.value },
                              })
                            }
                            placeholder="e.g. 2024 / v4.1"
                          />
                        </div>
                        <div className="form-field">
                          <label>License Type</label>
                          <select
                            className="form-select"
                            value={formData.specs.license_type}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                specs: { ...formData.specs, license_type: e.target.value },
                              })
                            }
                          >
                            <option value="Subscription">Annual Subscription</option>
                            <option value="Perpetual">Perpetual</option>
                            <option value="OEM">OEM</option>
                            <option value="Volume">Volume License</option>
                          </select>
                        </div>
                        <div className="form-field">
                          <label>License Key / Subscription ID</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.specs.license_key}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                serial_number: e.target.value,
                                specs: { ...formData.specs, license_key: e.target.value },
                              })
                            }
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            style={{ fontFamily: "monospace" }}
                          />
                        </div>
                        <div className="form-field">
                          <label>Number of Licenses / Seats</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.specs.seat_count}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                specs: { ...formData.specs, seat_count: e.target.value },
                              })
                            }
                            placeholder="e.g. 25 Seats"
                          />
                        </div>
                        <div className="form-field">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label style={{ margin: 0 }}>Vendor</label>
                            <button
                              type="button"
                              onClick={() => setShowAddVendorModal(true)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#4f46e5",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                                padding: 0,
                              }}
                            >
                              <Plus size={12} /> Add Vendor
                            </button>
                          </div>
                          <select
                            className="form-select"
                            value={formData.vendor}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const v = vendorsList.find((vnd) => String(vnd._id) === String(selectedId));
                              setFormData({
                                ...formData,
                                vendor: selectedId,
                                vendor_name: v?.name || v?.vendor_name || "",
                              });
                            }}
                          >
                            <option value="">— Select Vendor —</option>
                            {vendorsList.map((v) => (
                              <option key={v._id} value={v._id}>
                                {v.name || v.vendor_name}{v.vendor_code ? ` (${v.vendor_code})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* Physical Equipment Identity (Brand, Model, Serial Number) */
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isNetworkDevice ? "1fr 1fr 1fr 1fr" : "1fr 1.2fr 1fr",
                          gap: "12px",
                        }}
                      >
                        <div className="form-field">
                          <label style={{ fontWeight: 700 }}>Brand *</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            placeholder={
                              isMonitor
                                ? "e.g. Dell / HP / Lenovo / Samsung / LG"
                                : isPrinter
                                  ? "e.g. HP / Canon / Epson"
                                  : isNetworkDevice
                                    ? "e.g. Cisco / Fortinet / Aruba"
                                    : isMobileDevice
                                      ? "e.g. Samsung / Apple"
                                      : "e.g. Dell / HP / Lenovo"
                            }
                          />
                        </div>
                        <div className="form-field">
                          <label style={{ fontWeight: 700 }}>Model *</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            value={formData.model}
                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            placeholder={
                              isComputer
                                ? "e.g. OptiPlex 7090"
                                : isLaptop
                                  ? "e.g. Latitude 5400"
                                  : isMonitor
                                    ? "e.g. P2422H"
                                    : isPrinter
                                      ? "e.g. LaserJet Pro MFP M428fdw"
                                      : isServer
                                        ? "e.g. PowerEdge R750"
                                        : "Model name or number"
                            }
                          />
                        </div>
                        <div className="form-field">
                          <label style={{ fontWeight: 700 }}>Serial Number *</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            value={formData.serial_number}
                            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                            placeholder={isMonitor ? "Monitor serial number" : "Manufacturer serial number"}
                            style={{ fontFamily: "monospace" }}
                          />
                        </div>
                        {isNetworkDevice && (
                          <div className="form-field">
                            <label style={{ fontWeight: 700 }}>Device Type *</label>
                            <select
                              className="form-select"
                              value={formData.specs.device_type}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  specs: { ...formData.specs, device_type: e.target.value },
                                })
                              }
                            >
                              <option value="Switch">Switch</option>
                              <option value="Firewall">Firewall</option>
                              <option value="Router">Router</option>
                              <option value="Access Point">Access Point</option>
                              <option value="Gateway">Gateway</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── SECTION 3: DYNAMIC CATEGORY-SPECIFIC TECHNICAL SPECIFICATIONS ── */}
                  {!isSoftware && (
                    <div style={{ marginBottom: "18px" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#4f46e5",
                          marginBottom: "10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          borderBottom: "1px solid #e2e8f0",
                          paddingBottom: "5px",
                        }}
                      >
                        <Cpu size={14} /> 3. Technical Specifications ({formData.category})
                      </div>

                      {/* Case A: Computer / Desktop (Image 1) & Laptop (Image 2) */}
                      {(isComputer || isLaptop) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>Processor</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.processor}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, processor: e.target.value } })
                                }
                                placeholder={isComputer ? "e.g. Intel Core i5-11500" : "e.g. Intel Core i5-8365U"}
                              />
                            </div>
                            <div className="form-field">
                              <label>RAM</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.ram}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, ram: e.target.value } })
                                }
                                placeholder="e.g. 16 GB"
                              />
                            </div>
                            <div className="form-field">
                              <label>Operating System</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.operating_system}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, operating_system: e.target.value } })
                                }
                                placeholder="e.g. Windows 11 Pro"
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>Storage Type</label>
                              <select
                                className="form-select"
                                value={formData.specs.storage_type}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, storage_type: e.target.value } })
                                }
                              >
                                <option value="SSD">SSD</option>
                                <option value="NVMe SSD">NVMe SSD</option>
                                <option value="HDD">HDD</option>
                                <option value="Hybrid">Hybrid</option>
                              </select>
                            </div>
                            <div className="form-field">
                              <label>Storage Capacity</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.storage_capacity}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, storage_capacity: e.target.value } })
                                }
                                placeholder="e.g. 512 GB"
                              />
                            </div>
                            <div className="form-field">
                              <label>Hostname</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.hostname}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, hostname: e.target.value } })
                                }
                                placeholder={isComputer ? "e.g. ACC-PC-01" : "e.g. LAP-RAHUL"}
                              />
                            </div>
                            <div className="form-field">
                              <label>MAC Address</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.mac_address}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, mac_address: e.target.value } })
                                }
                                placeholder="XX-XX-XX-XX-XX-XX"
                                style={{ fontFamily: "monospace" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Case B: Monitor (Image 2 & Sec 4) */}
                      {isMonitor && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                          <div className="form-field">
                            <label>Screen Size</label>
                            <input
                              type="text"
                              className="form-input"
                              value={formData.specs.screen_size}
                              onChange={(e) =>
                                setFormData({ ...formData, specs: { ...formData.specs, screen_size: e.target.value } })
                              }
                              placeholder="e.g. 24 Inch"
                            />
                          </div>
                          <div className="form-field">
                            <label>Resolution</label>
                            <input
                              type="text"
                              className="form-input"
                              value={formData.specs.resolution}
                              onChange={(e) =>
                                setFormData({ ...formData, specs: { ...formData.specs, resolution: e.target.value } })
                              }
                              placeholder="e.g. 1920 × 1080"
                            />
                          </div>
                          <div className="form-field">
                            <label>Warranty (Duration)</label>
                            <input
                              type="text"
                              className="form-input"
                              value={formData.specs.warranty_duration}
                              onChange={(e) =>
                                setFormData({ ...formData, specs: { ...formData.specs, warranty_duration: e.target.value } })
                              }
                              placeholder="e.g. 3 Years"
                            />
                          </div>
                        </div>
                      )}

                      {/* Case C: Printer (Sec 5) */}
                      {isPrinter && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>Printer Type</label>
                              <select
                                className="form-select"
                                value={formData.specs.printer_type}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, printer_type: e.target.value } })
                                }
                              >
                                <option value="Laser">Laser</option>
                                <option value="Inkjet">Inkjet</option>
                                <option value="Multifunction (MFP)">Multifunction (MFP)</option>
                                <option value="Thermal">Thermal</option>
                                <option value="Dot Matrix">Dot Matrix</option>
                              </select>
                            </div>
                            <div className="form-field">
                              <label>Color / Monochrome</label>
                              <select
                                className="form-select"
                                value={formData.specs.color_mono}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, color_mono: e.target.value } })
                                }
                              >
                                <option value="Monochrome">Monochrome</option>
                                <option value="Color">Color</option>
                              </select>
                            </div>
                            <div className="form-field">
                              <label>Print Technology</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.print_technology}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, print_technology: e.target.value } })
                                }
                                placeholder="e.g. Laser / Ink Tank / Thermal"
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>Network / USB</label>
                              <select
                                className="form-select"
                                value={formData.specs.connectivity}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, connectivity: e.target.value } })
                                }
                              >
                                <option value="Network & USB">Network & USB</option>
                                <option value="Network (Ethernet)">Network (Ethernet)</option>
                                <option value="USB Only">USB Only</option>
                                <option value="Wi-Fi">Wi-Fi</option>
                              </select>
                            </div>
                            <div className="form-field">
                              <label>IP Address</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.ip_address}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, ip_address: e.target.value } })
                                }
                                placeholder="192.168.1.150"
                                style={{ fontFamily: "monospace" }}
                              />
                            </div>
                            <div className="form-field">
                              <label>MAC Address</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.mac_address}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, mac_address: e.target.value } })
                                }
                                placeholder="XX-XX-XX-XX-XX-XX"
                                style={{ fontFamily: "monospace" }}
                              />
                            </div>
                            <div className="form-field">
                              <label>Meter / Print Count</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.print_count}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, print_count: e.target.value } })
                                }
                                placeholder="e.g. 15,420 pages"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Case D: Server (Sec 6) */}
                      {isServer && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>Processor</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.processor}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, processor: e.target.value } })
                                }
                                placeholder="e.g. Intel Xeon Silver 4314"
                              />
                            </div>
                            <div className="form-field">
                              <label>CPU Cores</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.cpu_cores}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, cpu_cores: e.target.value } })
                                }
                                placeholder="e.g. 16 Cores / 32 Threads"
                              />
                            </div>
                            <div className="form-field">
                              <label>RAM</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.ram}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, ram: e.target.value } })
                                }
                                placeholder="e.g. 64 GB ECC DDR4"
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>Storage Type</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.storage_type}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, storage_type: e.target.value } })
                                }
                                placeholder="e.g. SAS SSD / NVMe / SATA"
                              />
                            </div>
                            <div className="form-field">
                              <label>Total Storage</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.total_storage}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, total_storage: e.target.value } })
                                }
                                placeholder="e.g. 4 TB"
                              />
                            </div>
                            <div className="form-field">
                              <label>RAID Configuration</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.raid_config}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, raid_config: e.target.value } })
                                }
                                placeholder="e.g. RAID 5 / RAID 10"
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>Operating System</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.operating_system}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, operating_system: e.target.value } })
                                }
                                placeholder="e.g. Windows Server 2022 / Ubuntu 22.04 LTS"
                              />
                            </div>
                            <div className="form-field">
                              <label>Server Hostname</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.hostname}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, hostname: e.target.value } })
                                }
                                placeholder="e.g. PROD-SRV-01"
                              />
                            </div>
                            <div className="form-field">
                              <label>Server Role</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.server_role}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, server_role: e.target.value } })
                                }
                                placeholder="e.g. Database / Active Directory / ERP"
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>IP Address</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.ip_address}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, ip_address: e.target.value } })
                                }
                                placeholder="192.168.1.10"
                                style={{ fontFamily: "monospace" }}
                              />
                            </div>
                            <div className="form-field">
                              <label>MAC Address</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.mac_address}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, mac_address: e.target.value } })
                                }
                                placeholder="XX-XX-XX-XX-XX-XX"
                                style={{ fontFamily: "monospace" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Case E: Network Device (Sec 7) */}
                      {isNetworkDevice && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>Firmware Version</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.firmware_version}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, firmware_version: e.target.value } })
                                }
                                placeholder="e.g. v15.2(4)E"
                              />
                            </div>
                            <div className="form-field">
                              <label>Number of Ports</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.port_count}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, port_count: e.target.value } })
                                }
                                placeholder="e.g. 24 Ports / 48 Ports"
                              />
                            </div>
                            <div className="form-field">
                              <label>Management IP (Optional)</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.management_ip || formData.specs.ip_address}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    specs: {
                                      ...formData.specs,
                                      management_ip: e.target.value,
                                      ip_address: e.target.value,
                                    },
                                  })
                                }
                                placeholder="192.168.1.1"
                                style={{ fontFamily: "monospace" }}
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>PoE (Yes / No)</label>
                              <select
                                className="form-select"
                                value={formData.specs.poe_support}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, poe_support: e.target.value } })
                                }
                              >
                                <option value="No">No</option>
                                <option value="Yes (PoE 802.3af)">Yes (PoE 802.3af)</option>
                                <option value="Yes (PoE+ 802.3at)">Yes (PoE+ 802.3at)</option>
                                <option value="Yes (PoE++ 802.3bt)">Yes (PoE++ 802.3bt)</option>
                              </select>
                            </div>
                            <div className="form-field">
                              <label>PoE Budget (if applicable)</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.poe_budget}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, poe_budget: e.target.value } })
                                }
                                placeholder="e.g. 370W"
                              />
                            </div>
                            <div className="form-field">
                              <label>Uplink Port</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.uplink_port}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, uplink_port: e.target.value } })
                                }
                                placeholder="e.g. 4x 10G SFP+"
                              />
                            </div>
                            <div className="form-field">
                              <label>Rack / Cabinet</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.rack_cabinet}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, rack_cabinet: e.target.value } })
                                }
                                placeholder="e.g. Rack 2 - U14"
                              />
                            </div>
                          </div>

                          <div className="form-field">
                            <label>MAC Address</label>
                            <input
                              type="text"
                              className="form-input"
                              value={formData.specs.mac_address}
                              onChange={(e) =>
                                setFormData({ ...formData, specs: { ...formData.specs, mac_address: e.target.value } })
                              }
                              placeholder="XX-XX-XX-XX-XX-XX"
                              style={{ fontFamily: "monospace" }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Case F: Mobile Device (Sec 8) */}
                      {isMobileDevice && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>IMEI 1</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.imei_number}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, imei_number: e.target.value } })
                                }
                                placeholder="15-digit IMEI 1"
                                style={{ fontFamily: "monospace" }}
                              />
                            </div>
                            <div className="form-field">
                              <label>IMEI 2 (if applicable)</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.imei_2}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, imei_2: e.target.value } })
                                }
                                placeholder="Secondary IMEI (optional)"
                                style={{ fontFamily: "monospace" }}
                              />
                            </div>
                            <div className="form-field">
                              <label>SIM Number / Mobile Number</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.sim_number}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, sim_number: e.target.value } })
                                }
                                placeholder="+91 9876543210"
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div className="form-field">
                              <label>RAM</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.ram}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, ram: e.target.value } })
                                }
                                placeholder="e.g. 8 GB"
                              />
                            </div>
                            <div className="form-field">
                              <label>Storage</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.storage_capacity || formData.specs.storage}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    specs: {
                                      ...formData.specs,
                                      storage_capacity: e.target.value,
                                      storage: e.target.value,
                                    },
                                  })
                                }
                                placeholder="e.g. 128 GB / 256 GB"
                              />
                            </div>
                            <div className="form-field">
                              <label>Operating System</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formData.specs.operating_system}
                                onChange={(e) =>
                                  setFormData({ ...formData, specs: { ...formData.specs, operating_system: e.target.value } })
                                }
                                placeholder="e.g. Android 14 / iOS 17"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Case G: Other IT Assets (Sec 10) */}
                      {isOther && (
                        <div className="form-field">
                          <label>Custom Specifications / Notes</label>
                          <textarea
                            rows={3}
                            className="form-input"
                            style={{ height: "auto" }}
                            value={formData.specs.custom_notes}
                            onChange={(e) =>
                              setFormData({ ...formData, specs: { ...formData.specs, custom_notes: e.target.value } })
                            }
                            placeholder="Describe any other technical attributes, power ratings, interfaces, or specifications..."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── SECTION 4: ASSIGNMENT & LOCATION ── */}
                  <div style={{ marginBottom: "18px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#4f46e5",
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: "5px",
                      }}
                    >
                      <UserCheck size={14} /> 4. Assignment &amp; Location
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px" }}>
                      {/* Assigned To */}
                      <div className="form-field">
                        <label>{isSoftware ? "Assigned User / Department" : "Assigned To"}</label>
                        <select
                          className="form-select"
                          value={formData.assigned_to}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const u = usersList.find((usr) => String(usr._id) === String(selectedId));
                            setFormData({
                              ...formData,
                              assigned_to: selectedId,
                              assigned_to_name: u?.name || u?.username || "",
                              department: u?.department || formData.department,
                              lifecycle_status: selectedId
                                ? "In Use"
                                : formData.lifecycle_status === "In Use" || formData.lifecycle_status === "Assigned"
                                  ? "Available"
                                  : formData.lifecycle_status,
                            });
                          }}
                        >
                          <option value="">— Unassigned (Available in Pool) —</option>
                          {usersList.map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name || u.username} {u.department ? `(${u.department})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Department */}
                      <div className="form-field">
                        <label>Department</label>
                        <select
                          className="form-select"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        >
                          <option value="">Select Department</option>
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Location */}
                      <div className="form-field">
                        <label>Location</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder={
                            isPrinter
                              ? "e.g. 1st Floor Print Room"
                              : isServer
                                ? "e.g. Server Room - Rack A"
                                : "e.g. 1st Floor / Desk"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 5: STATUS & CONDITION ── */}
                  <div style={{ marginBottom: "18px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#4f46e5",
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: "5px",
                      }}
                    >
                      <CheckCircle2 size={14} /> 5. Lifecycle Status &amp; Condition
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isSoftware ? "1fr" : "1fr 1fr", gap: "12px" }}>
                      {/* Status (Mandatory) */}
                      <div className="form-field">
                        <label style={{ fontWeight: 700 }}>Status *</label>
                        <select
                          className="form-select"
                          required
                          value={formData.lifecycle_status}
                          onChange={(e) => setFormData({ ...formData, lifecycle_status: e.target.value })}
                        >
                          {LIFECYCLE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                          In Use / Available / Under Maintenance / Damaged / Retired
                        </span>
                      </div>

                      {/* Condition (Physical assets) */}
                      {!isSoftware && (
                        <div className="form-field">
                          <label>Condition</label>
                          <select
                            className="form-select"
                            value={formData.condition}
                            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                          >
                            {CONDITIONS.map((cd) => (
                              <option key={cd} value={cd}>
                                {cd}
                              </option>
                            ))}
                          </select>
                          <span style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                            Good / Fair / Damaged / Non-Functional
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── SECTION 6: WARRANTY & DATES ── */}
                  <div style={{ marginBottom: "18px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#4f46e5",
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: "5px",
                      }}
                    >
                      <Clock size={14} /> 6. {isSoftware ? "Subscription Dates & Expiry" : "Dates & Warranty Period"}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isSoftware ? "1fr 1fr" : "1fr 1fr 1fr", gap: "12px" }}>
                      {/* Purchase Date */}
                      <div className="form-field">
                        <label>Purchase Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.purchase_date}
                          onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                        />
                      </div>

                      {!isSoftware ? (
                        <>
                          {/* Warranty Start Date */}
                          <div className="form-field">
                            <label>Warranty Start Date</label>
                            <input
                              type="date"
                              className="form-input"
                              value={formData.warranty_start_date}
                              onChange={(e) => setFormData({ ...formData, warranty_start_date: e.target.value })}
                            />
                          </div>

                          {/* Warranty End Date / Expiry */}
                          <div className="form-field">
                            <label>Warranty Expiry Date</label>
                            <input
                              type="date"
                              className="form-input"
                              value={formData.warranty_end_date}
                              onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
                            />
                          </div>
                        </>
                      ) : (
                        /* Expiry Date for Software */
                        <div className="form-field">
                          <label>Expiry / Renewal Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={formData.warranty_end_date}
                            onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── SECTION 7: REMARKS ── */}
                  <div style={{ marginBottom: "18px" }}>
                    <div className="form-field">
                      <label>Remarks / Additional Notes</label>
                      <textarea
                        rows={2}
                        className="form-input"
                        style={{ height: "auto", minHeight: "55px" }}
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        placeholder="Additional equipment information, condition details, or handover notes..."
                      />
                    </div>
                  </div>

                  {/* ── SECTION 8: COMMERCIALS & PROCUREMENT (OPTIONAL) ── */}
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#4f46e5",
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: "5px",
                      }}
                    >
                      <ShieldCheck size={14} /> 7. Procurement &amp; Invoicing (Optional)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                      <div className="form-field">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <label style={{ margin: 0 }}>Vendor</label>
                          <button
                            type="button"
                            onClick={() => setShowAddVendorModal(true)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#4f46e5",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                              padding: 0,
                            }}
                          >
                            <Plus size={12} /> Add Vendor
                          </button>
                        </div>
                        <select
                          className="form-select"
                          value={formData.vendor}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const v = vendorsList.find((vnd) => String(vnd._id) === String(selectedId));
                            setFormData({
                              ...formData,
                              vendor: selectedId,
                              vendor_name: v?.name || v?.vendor_name || "",
                            });
                          }}
                        >
                          <option value="">— Select Vendor —</option>
                          {vendorsList.map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.name || v.vendor_name}{v.vendor_code ? ` (${v.vendor_code})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Purchase Cost (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={formData.purchase_cost}
                          onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                          placeholder="e.g. 55000"
                        />
                      </div>
                      <div className="form-field">
                        <label>Invoice Number</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.invoice_number}
                          onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                          placeholder="e.g. INV-2026-098"
                        />
                      </div>
                      <div className="form-field">
                        <label>Payment Mode</label>
                        <select
                          className="form-select"
                          value={formData.payment_mode || "UPI"}
                          onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                        >
                          <option value="UPI">UPI</option>
                          <option value="Net Banking">Net Banking</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Debit Card">Debit Card</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Invoice Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.invoice_date}
                          onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                        />
                      </div>
                      <div className="form-field">
                        <label>Invoice Document / URL</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.invoice_url}
                          onChange={(e) => setFormData({ ...formData, invoice_url: e.target.value })}
                          placeholder="https://... or S3 link"
                        />
                      </div>

                      {/* Approval notice when inventory_type is New Inventory */}
                      {(formData.inventory_type === "New Inventory" || formData.inventory_type === "New") && (
                        <div
                          style={{
                            gridColumn: "1 / -1",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "8px",
                            padding: "9px 12px",
                            fontSize: "12px",
                            color: "#1e40af",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <ShieldCheck size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                          <span>
                            <b>Two-Tier Approval Notice:</b> Submitting this <b>New Inventory</b> asset will initiate the Invoice Approval Pipeline (Stage 1: <b>Shalini Arun</b> → Stage 2: <b>Manu Pillai</b>).
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>

          <DialogActions style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFormModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={formSaving}
            >
              {formSaving ? "Saving..." : editingId ? "Update Equipment" : "Save Equipment"}
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── MODAL: QUICK ASSIGN TO USER ───────────────────────────────────── */}
      <Dialog open={assignModalOpen} onClose={() => setAssignModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "15px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#059669",
          }}
        >
          <UserCheck size={18} color="#059669" />
          <span>Quick Assign: {assignTarget?.asset_tag}</span>
        </DialogTitle>
        <DialogContent style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 14px" }}>
            Allocate <b>{assignTarget?.asset_name || assignTarget?.brand}</b> to an active employee.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="form-field">
              <label>Select Employee *</label>
              <select
                className="form-select"
                value={assignForm.userId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const u = usersList.find((usr) => String(usr._id) === String(selectedId));
                  setAssignForm({
                    ...assignForm,
                    userId: selectedId,
                    userName: u?.name || u?.username || "",
                    department: u?.department || assignForm.department,
                  });
                }}
              >
                <option value="">Select Employee...</option>
                {usersList.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name || u.username} {u.department ? `(${u.department})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Department</label>
              <select
                className="form-select"
                value={assignForm.department}
                onChange={(e) => setAssignForm({ ...assignForm, department: e.target.value })}
              >
                <option value="">Department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Remarks</label>
              <textarea
                className="form-input"
                rows={2}
                style={{ height: "auto", minHeight: "55px" }}
                value={assignForm.remarks}
                onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                placeholder="Handover notes..."
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setAssignModalOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExecuteAssign}
            style={{ background: "#059669", borderColor: "#059669" }}
          >
            Confirm Assignment
          </button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: QUICK RETURN TO STOCK ──────────────────────────────────── */}
      <Dialog open={returnModalOpen} onClose={() => setReturnModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "15px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#d97706",
          }}
        >
          <ArrowRightLeft size={18} color="#d97706" />
          <span>Return to Stockroom: {returnTarget?.asset_tag}</span>
        </DialogTitle>
        <DialogContent style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 14px" }}>
            Return from <b>{returnTarget?.assigned_to_name || "Employee"}</b> back into available inventory pool.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="form-field">
              <label>Stock Condition</label>
              <select
                className="form-select"
                value={returnForm.stockType}
                onChange={(e) => setReturnForm({ ...returnForm, stockType: e.target.value })}
              >
                <option value="Old">Old / Used (Good Condition)</option>
                <option value="Refurbished">Refurbished / Serviced</option>
                <option value="New">Like New</option>
              </select>
            </div>
            <div className="form-field">
              <label>Return Remarks</label>
              <textarea
                className="form-input"
                rows={2}
                style={{ height: "auto", minHeight: "55px" }}
                value={returnForm.remarks}
                onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                placeholder="e.g. Employee returned equipment, formatted and cleaned"
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setReturnModalOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExecuteReturn}
            style={{ background: "#d97706", borderColor: "#d97706" }}
          >
            Confirm Return
          </button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: VIEW DETAILS ───────────────────────────────────────────── */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
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
        {selectedAsset && (() => {
          const theme = getCategoryTheme(selectedAsset.category);
          const warrantyInfo = getWarrantyStatus(selectedAsset.warranty_end_date || selectedAsset.warranty_expiry);
          const assignedName =
            selectedAsset.assigned_to_name ||
            selectedAsset.assigned_to?.name ||
            (typeof selectedAsset.assigned_to === "string" && !/^[0-9a-fA-F]{24}$/.test(selectedAsset.assigned_to)
              ? selectedAsset.assigned_to
              : "") ||
            "Unassigned";
          const vendorName =
            selectedAsset.vendor_name ||
            selectedAsset.vendor?.name ||
            selectedAsset.vendor?.vendor_name ||
            "—";
          const invoiceUrl = selectedAsset.invoice_url || selectedAsset.image_url || "";
          const invoiceNum = selectedAsset.invoice_number || "";

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

          const latestReject = Array.isArray(selectedAsset.workflow_history)
            ? [...selectedAsset.workflow_history].reverse().find(
                (h) =>
                  (h.action || "").toLowerCase().includes("reject") ||
                  (h.stage || "").toLowerCase().includes("reject") ||
                  (h.stage || "").toLowerCase().includes("correction") ||
                  (h.action || "").toLowerCase().includes("returned") ||
                  Boolean(
                    selectedAsset.rejection_remarks &&
                      (h.remarks === selectedAsset.rejection_remarks ||
                        (h.action || "").includes(selectedAsset.rejection_remarks))
                  )
              )
            : null;

          const rejectedByName =
            selectedAsset.rejected_by_name ||
            latestReject?.performed_by_name ||
            latestReject?.performed_by?.username ||
            "";

          const rawRejectRole =
            selectedAsset.rejected_by_role ||
            latestReject?.performed_by_role ||
            "";
          const rejectedByRole = formatRejectRole(rawRejectRole);

          const rawRejectDate = selectedAsset.rejected_at || latestReject?.timestamp;
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

          const recordFirstUsername = String(
            selectedAsset.first_approver_username || "shalini_arun"
          ).toLowerCase().trim();

          const recordFirstName =
            selectedAsset.first_approver_name ||
            (recordFirstUsername === "shalini_arun" ? "Shalini Arun" : recordFirstUsername);

          const perms = getApprovalPermissions(selectedAsset);
          const badge = getWorkflowBadgeInfo(
            selectedAsset.approval_stage,
            selectedAsset.approval_status,
            selectedAsset.admin_verifications,
            selectedAsset.first_approver_username
          );

          const deduplicatedWorkflowHistory = (Array.isArray(selectedAsset.workflow_history)
            ? selectedAsset.workflow_history
            : []
          ).filter((h, idx, arr) => {
            if (idx === 0) return true;
            const prev = arr[idx - 1];
            const actLower = (h.action || "").toLowerCase();
            const stgLower = (h.stage || "").toLowerCase();
            const isCurrentRej =
              actLower.includes("reject") ||
              stgLower.includes("reject") ||
              actLower.includes("returned") ||
              stgLower.includes("correction");

            const prevActLower = (prev.action || "").toLowerCase();
            const prevStgLower = (prev.stage || "").toLowerCase();
            const isPrevRej =
              prevActLower.includes("reject") ||
              prevStgLower.includes("reject") ||
              prevActLower.includes("returned") ||
              prevStgLower.includes("correction");

            if (
              isCurrentRej &&
              isPrevRej &&
              Number(h.approval_cycle) === Number(prev.approval_cycle) &&
              (String(h.performed_by?._id || h.performed_by || "") ===
                String(prev.performed_by?._id || prev.performed_by || "") ||
                String(h.performed_by_name || "") === String(prev.performed_by_name || ""))
            ) {
              return false;
            }
            return true;
          });

          const normCat = String(selectedAsset.category || "").toLowerCase();
          const isDesktop = normCat.includes("desktop") || normCat.includes("computer");
          const isLaptop = normCat.includes("laptop");
          const isCable = normCat.includes("cable");
          const isPrinter = normCat.includes("printer");
          const isNetwork = normCat.includes("network") || normCat.includes("switch") || normCat.includes("router");
          const isSoftware = normCat.includes("software");
          const isPhone = normCat.includes("phone") || normCat.includes("smartphone");
          const isSIM = normCat.includes("sim");
          const isRack = normCat.includes("rack") || normCat.includes("cabinet");

          const getWorkflowStatusLabelText = () => {
            const rawStage = selectedAsset.approval_stage || "";
            const rawStatus = selectedAsset.approval_status || "";
            const norm = String(rawStatus || rawStage || "").toLowerCase();
            if (norm.includes("completed")) return "Completed";
            if (norm.includes("rejected")) return "Rejected";
            if (norm.includes("returned") || norm.includes("correction")) return "Returned to IT";
            if (norm.includes("manu")) return "Pending Final Approval (manu_pillai)";
            if (norm.includes("shalini") || norm.includes("first")) return `Pending First Approval (${recordFirstName})`;
            return rawStatus || rawStage || "Pending Approval";
          };

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
                    {getCategoryIcon(selectedAsset.category, 22)}
                  </Box>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
                      <Typography sx={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, flexShrink: 0 }}>
                        {selectedAsset.asset_tag} — {selectedAsset.asset_name || `${selectedAsset.brand || ""} ${selectedAsset.model || ""}`.trim() || selectedAsset.category}
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
                          {selectedAsset.asset_tag}
                        </Typography>
                        <Tooltip title={copiedTag ? "Copied!" : "Copy Asset Tag"}>
                          <IconButton
                            size="small"
                            onClick={() => handleCopyText(selectedAsset.asset_tag, "tag")}
                            sx={{ p: 0.2, color: copiedTag ? "#16a34a" : "#3b82f6", "&:hover": { color: "#1d4ed8" } }}
                          >
                            {copiedTag ? <Check size={12} /> : <Copy size={12} />}
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* Status Badge */}
                      {(() => {
                        const norm = String(selectedAsset.lifecycle_status || selectedAsset.status || "").toLowerCase();
                        let bg = "#f0fdf4";
                        let color = "#166534";
                        let border = "#bbf7d0";
                        if (norm.includes("assigned") || norm.includes("in use")) {
                          bg = "#eff6ff";
                          color = "#1d4ed8";
                          border = "#bfdbfe";
                        } else if (norm.includes("repair") || norm.includes("maintenance")) {
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
                            {selectedAsset.lifecycle_status || selectedAsset.status || "Available"}
                          </Box>
                        );
                      })()}

                      {/* Category Chip */}
                      <Chip
                        label={selectedAsset.category || "Equipment"}
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

                      {/* Stock / Inventory Type Chip */}
                      {(selectedAsset.inventory_type || selectedAsset.stock_type) && (
                        <Chip
                          label={selectedAsset.inventory_type || (selectedAsset.stock_type === "New" ? "New Inventory" : "Old Inventory")}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            backgroundColor: selectedAsset.inventory_type === "New Inventory" || selectedAsset.stock_type === "New" ? "#ecfdf5" : "#f1f5f9",
                            color: selectedAsset.inventory_type === "New Inventory" || selectedAsset.stock_type === "New" ? "#059669" : "#475569",
                            border: `1px solid ${selectedAsset.inventory_type === "New Inventory" || selectedAsset.stock_type === "New" ? "#a7f3d0" : "#e2e8f0"}`,
                            borderRadius: "6px",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>

                    {/* Meta Subtitle */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.5, flexWrap: "wrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", fontSize: "0.75rem" }}>
                        <Building size={13} color="#94a3b8" />
                        <span>{selectedAsset.department || "General Dept"}</span>
                      </Box>
                      <span style={{ color: "#cbd5e1", fontSize: "0.7rem" }}>•</span>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", fontSize: "0.75rem" }}>
                        <MapPin size={13} color="#94a3b8" />
                        <span>{selectedAsset.location || "Office"}</span>
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
                    onClick={() => setDetailsModalOpen(false)}
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
                      badge: invoiceUrl ? "Invoice Attached" : null,
                    },
                    {
                      id: "workflow",
                      label: "Approval & Audit",
                      icon: <ShieldCheck size={14} />,
                      badge:
                        deduplicatedWorkflowHistory.length > 0
                          ? `${deduplicatedWorkflowHistory.length}`
                          : null,
                    },
                  ].map((tab) => {
                    const isActive = detailsTab === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        onClick={() => setDetailsTab(tab.id)}
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
                  Workflow: <strong style={{ color: "#475569" }}>{getWorkflowStatusLabelText()}</strong>
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
                {detailsTab === "overview" && (
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
                              {getCategoryIcon(selectedAsset.category, 16)}
                            </Box>
                            <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                              {isSoftware
                                ? "Software & License Specifications"
                                : isCable
                                ? "Cable Specifications"
                                : isPrinter
                                ? "Printer Specifications"
                                : isNetwork
                                ? "Network Device Specifications"
                                : isRack
                                ? "Rack Specifications"
                                : isPhone
                                ? "Phone Specifications"
                                : isSIM
                                ? "SIM Card & Plan Details"
                                : "Hardware & Device Specifications"}
                            </Typography>
                          </Box>
                          <Chip
                            label={selectedAsset.category || "Equipment"}
                            size="small"
                            sx={{ fontSize: "0.7rem", height: 20, fontWeight: 600, backgroundColor: "#f1f5f9", color: "#475569" }}
                          />
                        </Box>

                        {/* Spec Grid */}
                        <Grid container spacing={1.2}>
                          {/* Cable Category Specifications */}
                          {isCable && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Cable Name" value={selectedAsset.specs?.cable_name || selectedAsset.brand || selectedAsset.model} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Cable Type" value={selectedAsset.specs?.cable_type || selectedAsset.specs?.device_type} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <SpecTile label="Length" value={selectedAsset.specs?.length || selectedAsset.specs?.screen_size} />
                              </Grid>
                              {selectedAsset.serial_number && (
                                <Grid item xs={12} sm={6}>
                                  <SpecTile
                                    label="Serial / Lot #"
                                    value={selectedAsset.serial_number}
                                    copyable
                                    onCopy={(val) => handleCopyText(val, "serial")}
                                    isCopied={copiedSerial}
                                  />
                                </Grid>
                              )}
                              {selectedAsset.specs?.connectivity && (
                                <Grid item xs={12} sm={6}>
                                  <SpecTile label="Connector" value={selectedAsset.specs.connectivity} />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Desktop / Laptop / Computer Specifications */}
                          {(isDesktop || isLaptop || (!isCable && !isPrinter && !isNetwork && !isSoftware && !isPhone && !isSIM && !isRack)) && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Brand / Manufacturer" value={selectedAsset.brand} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Model" value={selectedAsset.model} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <SpecTile
                                  label="Serial Number"
                                  value={selectedAsset.serial_number}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              {selectedAsset.specs?.processor && (
                                <Grid item xs={6} sm={4}>
                                  <SpecTile label="Processor" value={selectedAsset.specs.processor} icon={<Cpu size={13} />} />
                                </Grid>
                              )}
                              {selectedAsset.specs?.ram && (
                                <Grid item xs={6} sm={4}>
                                  <SpecTile
                                    label="RAM"
                                    value={selectedAsset.specs.ram}
                                    isChip
                                    chipColor={{ bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" }}
                                  />
                                </Grid>
                              )}
                              {selectedAsset.specs?.storage && (
                                <Grid item xs={6} sm={4}>
                                  <SpecTile
                                    label="Storage"
                                    value={selectedAsset.specs.storage}
                                    isChip
                                    chipColor={{ bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" }}
                                  />
                                </Grid>
                              )}
                              {selectedAsset.specs?.operating_system && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="Operating System" value={selectedAsset.specs.operating_system} />
                                </Grid>
                              )}
                              {selectedAsset.specs?.screen_size && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="Screen Size" value={selectedAsset.specs.screen_size} />
                                </Grid>
                              )}
                              {selectedAsset.specs?.resolution && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="Resolution" value={selectedAsset.specs.resolution} />
                                </Grid>
                              )}
                              {(selectedAsset.specs?.warranty_duration || selectedAsset.warranty_duration) && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="Warranty (Duration)" value={selectedAsset.specs?.warranty_duration || selectedAsset.warranty_duration} />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Printer Specifications */}
                          {isPrinter && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Brand" value={selectedAsset.brand} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Model" value={selectedAsset.model} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <SpecTile
                                  label="Serial Number"
                                  value={selectedAsset.serial_number}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Printer Type" value={selectedAsset.specs?.printer_type} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Technology" value={selectedAsset.specs?.technology || selectedAsset.specs?.print_technology} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Connectivity" value={selectedAsset.specs?.connectivity} />
                              </Grid>
                              {selectedAsset.specs?.duplex_support && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="Duplex Support" value={selectedAsset.specs.duplex_support} />
                                </Grid>
                              )}
                              {selectedAsset.specs?.color_capability && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="Color Capability" value={selectedAsset.specs.color_capability} />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Network Device Specifications */}
                          {isNetwork && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Brand" value={selectedAsset.brand} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Model" value={selectedAsset.model} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <SpecTile
                                  label="Serial Number"
                                  value={selectedAsset.serial_number}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Device Type" value={selectedAsset.specs?.device_type} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Port Count" value={selectedAsset.specs?.port_count} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="PoE Support" value={selectedAsset.specs?.poe_support} />
                              </Grid>
                              {selectedAsset.specs?.ip_address && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="IP Address" value={selectedAsset.specs.ip_address} />
                                </Grid>
                              )}
                              {selectedAsset.specs?.mac_address && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="MAC Address" value={selectedAsset.specs.mac_address} />
                                </Grid>
                              )}
                              {selectedAsset.specs?.firmware_version && (
                                <Grid item xs={12} sm={6}>
                                  <SpecTile label="Firmware" value={selectedAsset.specs.firmware_version} />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Software License Specifications */}
                          {isSoftware && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Software Name" value={selectedAsset.specs?.software_name || selectedAsset.brand} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Version" value={selectedAsset.specs?.version || selectedAsset.model} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <SpecTile label="License Type" value={selectedAsset.specs?.license_type} />
                              </Grid>
                              <Grid item xs={12} sm={8}>
                                <SpecTile
                                  label="License Key"
                                  value={selectedAsset.specs?.license_key || selectedAsset.serial_number}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Seats" value={selectedAsset.specs?.seat_count} />
                              </Grid>
                            </>
                          )}

                          {/* Phone / SIM Specifications */}
                          {(isPhone || isSIM) && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Brand" value={selectedAsset.brand} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Model" value={selectedAsset.model} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <SpecTile
                                  label={isSIM ? "SIM / ICCID" : "IMEI 1"}
                                  value={selectedAsset.specs?.imei_number || selectedAsset.specs?.sim_number || selectedAsset.serial_number}
                                  copyable
                                  onCopy={(val) => handleCopyText(val, "serial")}
                                  isCopied={copiedSerial}
                                />
                              </Grid>
                              {selectedAsset.specs?.imei_2 && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="IMEI 2" value={selectedAsset.specs.imei_2} />
                                </Grid>
                              )}
                              {selectedAsset.specs?.service_provider && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="Service Provider" value={selectedAsset.specs.service_provider} />
                                </Grid>
                              )}
                              {selectedAsset.specs?.plan_type && (
                                <Grid item xs={6} sm={6}>
                                  <SpecTile label="Plan Type" value={selectedAsset.specs.plan_type} />
                                </Grid>
                              )}
                            </>
                          )}

                          {/* Rack Specifications */}
                          {isRack && (
                            <>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Rack Name / #" value={selectedAsset.specs?.rack_name || selectedAsset.brand} />
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <SpecTile label="Rack Type" value={selectedAsset.specs?.rack_type || selectedAsset.model} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <SpecTile label="U Height" value={selectedAsset.specs?.u_height || selectedAsset.specs?.rack_size_u_height} />
                              </Grid>
                              {selectedAsset.specs?.rack_cabinet && (
                                <Grid item xs={12} sm={6}>
                                  <SpecTile label="Cabinet" value={selectedAsset.specs.rack_cabinet} />
                                </Grid>
                              )}
                            </>
                          )}
                        </Grid>

                        {/* Remarks / Description Callout inside Left Card */}
                        {(selectedAsset.remarks || selectedAsset.description || selectedAsset.specs?.custom_notes) && (
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
                                {selectedAsset.remarks || selectedAsset.description || selectedAsset.specs?.custom_notes}
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
                              label={assignedName !== "Unassigned" ? "Assigned" : "Unallocated"}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                backgroundColor: assignedName !== "Unassigned" ? "#dcfce7" : "#f1f5f9",
                                color: assignedName !== "Unassigned" ? "#15803d" : "#64748b",
                              }}
                            />
                          </Box>

                          <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Department</Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.2 }}>
                                <Building size={13} color="#64748b" />
                                <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600 }}>
                                  {selectedAsset.department || "—"}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Physical Location</Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.2 }}>
                                <MapPin size={13} color="#64748b" />
                                <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600 }}>
                                  {selectedAsset.location || "—"}
                                </Typography>
                              </Box>
                            </Grid>
                            {selectedAsset.assigned_date && (
                              <Grid item xs={12}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, pt: 0.8, borderTop: "1px dashed #f1f5f9" }}>
                                  <Calendar size={13} color="#64748b" />
                                  <Typography sx={{ fontSize: "0.74rem", color: "#64748b" }}>
                                    Assigned on: <strong style={{ color: "#334155" }}>{formatAssetDate(selectedAsset.assigned_date)}</strong>
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
                                {formatAssetDate(selectedAsset.purchase_date)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Warranty Expiry</Typography>
                              <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, mt: 0.2 }}>
                                {formatAssetDate(selectedAsset.warranty_end_date || selectedAsset.warranty_expiry)}
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
                                {selectedAsset.purchase_cost ? `₹${Number(selectedAsset.purchase_cost).toLocaleString("en-IN")}` : "—"}
                              </Typography>
                            </Grid>
                          </Grid>

                          {/* Quick link button to Tab 2 if invoice is attached */}
                          {invoiceUrl ? (
                            <Box
                              onClick={() => setDetailsTab("procurement")}
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
                                  Invoice Attached ({invoiceNum || "View Doc"})
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#2563eb" }}>
                                View →
                              </Typography>
                            </Box>
                          ) : (
                            <Box
                              onClick={() => setDetailsTab("procurement")}
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
                {detailsTab === "procurement" && (
                  <Grid container spacing={2.5}>
                    {/* Left: Financial & Warranty Overview */}
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
                              Financial &amp; Warranty Overview
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
                              {selectedAsset.purchase_cost ? `₹${Number(selectedAsset.purchase_cost).toLocaleString("en-IN")}` : "Not Specified"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Payment Mode</Typography>
                            <Box sx={{ mt: 0.3 }}>
                              <Chip
                                size="small"
                                label={selectedAsset.payment_mode ? `${selectedAsset.payment_mode}` : "UPI Payment"}
                                sx={{
                                  height: 22,
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  backgroundColor: String(selectedAsset.payment_mode || "").toLowerCase().includes("cash") ? "#fef3c7" : "#eff6ff",
                                  color: String(selectedAsset.payment_mode || "").toLowerCase().includes("cash") ? "#92400e" : "#1e40af",
                                  border: `1px solid ${String(selectedAsset.payment_mode || "").toLowerCase().includes("cash") ? "#fde68a" : "#bfdbfe"}`,
                                }}
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Purchase Date</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                              {formatAssetDate(selectedAsset.purchase_date)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Warranty Expiry</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                              {formatAssetDate(selectedAsset.warranty_end_date || selectedAsset.warranty_expiry)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Vendor / Supplier</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                              {vendorName}
                            </Typography>
                          </Grid>
                          {selectedAsset.inventory_type && (
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Inventory Type</Typography>
                              <Typography sx={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                                {selectedAsset.inventory_type}
                              </Typography>
                            </Grid>
                          )}
                          {selectedAsset.stock_type && (
                            <Grid item xs={6}>
                              <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Stock Classification</Typography>
                              <Typography sx={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                                {selectedAsset.stock_type}
                              </Typography>
                            </Grid>
                          )}
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
                            Invoice &amp; Billing Details
                          </Typography>
                        </Box>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Invoice Number</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 700, mt: 0.3 }}>
                              {invoiceNum || "—"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Invoice Date</Typography>
                            <Typography sx={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, mt: 0.3 }}>
                              {formatAssetDate(selectedAsset.invoice_date)}
                            </Typography>
                          </Grid>
                        </Grid>

                        {/* Document Thumbnail / Attachment */}
                        {invoiceUrl ? (
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
                                setPreviewInvoiceUrl(invoiceUrl);
                                setPreviewInvoiceTitle(
                                  invoiceNum
                                    ? `Invoice_${invoiceNum}`
                                    : `Invoice_${selectedAsset.asset_tag || "Asset"}`
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
                              {invoiceUrl.includes(".pdf") || invoiceUrl.startsWith("data:application/pdf") ? (
                                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#dc2626" }}>
                                  <FileText size={30} />
                                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, mt: 0.3 }}>PDF</Typography>
                                </Box>
                              ) : (
                                <img
                                  src={invoiceUrl}
                                  alt={selectedAsset.asset_tag}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {invoiceNum ? `Invoice #${invoiceNum}` : "Asset Invoice Document"}
                              </Typography>
                              <Typography sx={{ fontSize: "0.74rem", color: "#64748b", mt: 0.3 }}>
                                Official purchase invoice &amp; billing documentation
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, mt: 1.2, flexWrap: "wrap" }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<Eye size={13} />}
                                  onClick={() => {
                                    setPreviewInvoiceUrl(invoiceUrl);
                                    setPreviewInvoiceTitle(
                                      invoiceNum
                                        ? `Invoice_${invoiceNum}`
                                        : `Invoice_${selectedAsset.asset_tag || "Asset"}`
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
                                      invoiceUrl,
                                      invoiceNum
                                        ? `Invoice_${invoiceNum}`
                                        : `Invoice_${selectedAsset.asset_tag || "Asset"}`
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

                        {/* Linked Procurement Request Banner */}
                        {selectedAsset.procurement_ref && (
                          <Box
                            sx={{
                              mt: 2,
                              p: 1.5,
                              borderRadius: "8px",
                              backgroundColor: "#fff7ed",
                              border: "1px solid #ffedd5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <ShoppingCart size={16} color="#ea580c" />
                              <Box>
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 750, color: "#9a3412" }}>
                                  Procurement Link: {selectedAsset.procurement_ref}
                                </Typography>
                                <Typography sx={{ fontSize: "0.7rem", color: "#c2410c" }}>
                                  Auto-bridged from IT Procurement &amp; Approval Pipeline
                                </Typography>
                              </Box>
                            </Box>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setDetailsModalOpen(false);
                                navigate(`/it-helpdesk/procurement?search=${selectedAsset.procurement_ref}`);
                              }}
                              sx={{
                                textTransform: "none",
                                fontSize: "0.72rem",
                                fontWeight: 650,
                                borderColor: "#ea580c",
                                color: "#ea580c",
                                "&:hover": { backgroundColor: "#ffedd5" },
                              }}
                            >
                              View PR Workflow →
                            </Button>
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
                            <Chip
                              label={badge.label}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                backgroundColor: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                              }}
                            />
                          </Box>

                          {/* Rejection remarks if any */}
                          {selectedAsset.rejection_remarks && (
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
                                  {selectedAsset.rejection_remarks}
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          {/* Verification Badges for active 1st approver & manu_pillai */}
                          <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap", mb: 1.5 }}>
                            {perms.hasFirstVerified ? (
                              <Chip
                                size="small"
                                icon={<Check size={12} color="#16a34a" />}
                                label={`1st Approved: ${recordFirstName}`}
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
                                label={`Pending 1st Approval: ${recordFirstName}`}
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

                            {perms.hasManuVerified ? (
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

                          {/* Quick Workflow Action Buttons */}
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                            {perms.canApproveFirst && (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<Check size={14} />}
                                onClick={() => handleOpenWorkflowAction(selectedAsset, "approve_first")}
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
                            )}
                            {perms.canApproveSecond && (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<Check size={14} />}
                                onClick={() => handleOpenWorkflowAction(selectedAsset, "approve_second")}
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
                            )}
                            {perms.canReturn && (
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<X size={14} />}
                                onClick={() => handleOpenWorkflowAction(selectedAsset, "reject_admin")}
                                sx={{
                                  textTransform: "none",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  borderRadius: "8px",
                                }}
                              >
                                Return to IT
                              </Button>
                            )}
                            {perms.canResubmit && (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<RotateCcw size={14} />}
                                onClick={() => handleOpenWorkflowAction(selectedAsset, "resubmit")}
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
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {/* ── TAB 3: APPROVAL & WORKFLOW AUDIT ── */}
                {detailsTab === "workflow" && (
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
                            Approval Workflow &amp; Verification Status
                          </Typography>
                        </Box>
                        <Chip
                          label={badge.label}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        />
                      </Box>

                      {/* 4-Step Stepper Progress Bar */}
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2.5, px: 1 }}>
                        {[
                          { label: "1. Created", done: true },
                          {
                            label: `2. ${recordFirstName} (1st Approval)`,
                            done:
                              perms.hasFirstVerified ||
                              String(selectedAsset.approval_stage || "") === "Second Admin Approval" ||
                              perms.isCompleted,
                            active:
                              !perms.hasFirstVerified &&
                              !perms.isReturnedToIT &&
                              !perms.isCompleted &&
                              !perms.isExistingInventory &&
                              String(selectedAsset.approval_stage || "") !== "Second Admin Approval",
                          },
                          {
                            label: "3. manu_pillai (Final Approval)",
                            done: perms.hasManuVerified || perms.isCompleted,
                            active:
                              (perms.hasFirstVerified || String(selectedAsset.approval_stage || "") === "Second Admin Approval") &&
                              !perms.hasManuVerified &&
                              !perms.isReturnedToIT &&
                              !perms.isCompleted &&
                              !perms.isExistingInventory,
                          },
                          {
                            label: "4. Completed",
                            done: perms.isCompleted,
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

                      {/* 2-tier approval cards */}
                      <Grid container spacing={2}>
                        {/* 1. First Admin Approval */}
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 1.5, backgroundColor: perms.hasFirstVerified ? "#f0fdf4" : perms.isReturnedToIT ? "#fff7ed" : "#eff6ff", borderRadius: "9px", border: `1px solid ${perms.hasFirstVerified ? "#86efac" : perms.isReturnedToIT ? "#fed7aa" : "#bfdbfe"}`, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <Box>
                              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                                  1. First Admin Approval ({recordFirstName})
                                </Typography>
                                {perms.hasFirstVerified ? (
                                  <Chip
                                    label="✓ Verified"
                                    size="small"
                                    sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#dcfce7", color: "#15803d" }}
                                  />
                                ) : (
                                  <Chip
                                    label="Pending"
                                    size="small"
                                    sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600, backgroundColor: "#fef3c7", color: "#92400e" }}
                                  />
                                )}
                              </Box>
                              <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                                Designated Approver: <strong style={{ color: "#334155" }}>{recordFirstName}</strong> ({recordFirstUsername})
                              </Typography>
                            </Box>

                            {perms.canApproveFirst && (
                              <Box sx={{ mt: 1.5 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<Check size={13} />}
                                  onClick={() => handleOpenWorkflowAction(selectedAsset, "approve_first")}
                                  sx={{
                                    fontSize: "0.74rem",
                                    textTransform: "none",
                                    fontWeight: 700,
                                    borderRadius: "6px",
                                    backgroundColor: "#16a34a",
                                    "&:hover": { backgroundColor: "#15803d" },
                                  }}
                                >
                                  + Approve ({recordFirstName})
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Grid>

                        {/* 2. Final Admin Approval (manu_pillai) */}
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 1.5, backgroundColor: perms.hasManuVerified ? "#f0fdf4" : perms.hasFirstVerified ? "#eff6ff" : "#f8fafc", borderRadius: "9px", border: `1px solid ${perms.hasManuVerified ? "#86efac" : perms.hasFirstVerified ? "#bfdbfe" : "#e2e8f0"}`, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <Box>
                              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                                  2. Final Admin Approval (manu_pillai)
                                </Typography>
                                {perms.hasManuVerified ? (
                                  <Chip
                                    label="✓ Approved"
                                    size="small"
                                    sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#dcfce7", color: "#15803d" }}
                                  />
                                ) : perms.hasFirstVerified ? (
                                  <Chip
                                    label="Pending"
                                    size="small"
                                    sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600, backgroundColor: "#dbeafe", color: "#1d4ed8" }}
                                  />
                                ) : (
                                  <Chip
                                    label="Awaiting Step 1"
                                    size="small"
                                    sx={{ height: 20, fontSize: "0.68rem", color: "#94a3b8", backgroundColor: "#f1f5f9" }}
                                  />
                                )}
                              </Box>
                              <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                                Final Sign-off: <strong style={{ color: "#334155" }}>Manu Pillai</strong> (manu_pillai)
                              </Typography>
                            </Box>

                            {perms.canApproveSecond && (
                              <Box sx={{ mt: 1.5 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<Check size={13} />}
                                  onClick={() => handleOpenWorkflowAction(selectedAsset, "approve_second")}
                                  sx={{
                                    fontSize: "0.74rem",
                                    textTransform: "none",
                                    fontWeight: 700,
                                    borderRadius: "6px",
                                    backgroundColor: "#16a34a",
                                    "&:hover": { backgroundColor: "#15803d" },
                                  }}
                                >
                                  + Approve (manu_pillai)
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Grid>

                        {/* Rejection remarks */}
                        {selectedAsset.rejection_remarks && (
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
                                  {selectedAsset.rejection_remarks}
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

                        {/* Secondary action buttons */}
                        {(perms.canReturn || perms.canResubmit) && (
                          <Grid item xs={12}>
                            <Box sx={{ display: "flex", gap: 1, pt: 1, borderTop: "1px dashed #e2e8f0" }}>
                              {perms.canReturn && (
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  startIcon={<X size={13} />}
                                  onClick={() => handleOpenWorkflowAction(selectedAsset, "reject_admin")}
                                  sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    borderRadius: "6px",
                                  }}
                                >
                                  Return to IT for Correction
                                </Button>
                              )}
                              {perms.canResubmit && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<RotateCcw size={13} />}
                                  onClick={() => handleOpenWorkflowAction(selectedAsset, "resubmit")}
                                  sx={{
                                    backgroundColor: "#2563eb",
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    borderRadius: "6px",
                                    "&:hover": { backgroundColor: "#1d4ed8" },
                                  }}
                                >
                                  Resubmit for Approval
                                </Button>
                              )}
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
                        Workflow Stage History &amp; Audit Trail
                      </Typography>
                      {deduplicatedWorkflowHistory.length > 0 ? (
                        <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                          {deduplicatedWorkflowHistory.map((h, i) => {
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
                                  borderBottom: i < deduplicatedWorkflowHistory.length - 1 ? "1px solid #f1f5f9" : "none",
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
                                      By <strong>{h.performed_by_name || h.performed_by?.username || "System"}</strong>
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

                    {/* Record Audit Metadata */}
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
                        Record Audit Metadata
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Created By</Typography>
                          <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, mt: 0.2 }}>
                            {selectedAsset.created_by_name || selectedAsset.history?.[0]?.changed_by_name || "System"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Created Date</Typography>
                          <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, mt: 0.2 }}>
                            {selectedAsset.createdAt ? new Date(selectedAsset.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Last Updated By</Typography>
                          <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, mt: 0.2 }}>
                            {selectedAsset.updated_by_name || selectedAsset.history?.[selectedAsset.history.length - 1]?.changed_by_name || "System"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Last Updated Date</Typography>
                          <Typography sx={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, mt: 0.2 }}>
                            {selectedAsset.updatedAt ? new Date(selectedAsset.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                          </Typography>
                        </Grid>
                      </Grid>
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
                  Asset Tag: <strong style={{ color: "#475569" }}>{selectedAsset.asset_tag}</strong>
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    onClick={() => setDetailsModalOpen(false)}
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

      {/* Invoice Document Preview & Download Modal */}
      <Dialog
        open={Boolean(previewInvoiceUrl)}
        onClose={() => setPreviewInvoiceUrl(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: "14px",
            overflow: "hidden",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 1.8,
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Receipt size={18} color="#2563eb" />
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
              {previewInvoiceTitle || "Invoice Document Preview"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Download size={14} />}
              onClick={() => handleDownloadInvoice(previewInvoiceUrl, previewInvoiceTitle)}
              sx={{ textTransform: "none", fontSize: "0.78rem", fontWeight: 600, borderRadius: "6px" }}
            >
              Download
            </Button>
            <IconButton
              size="small"
              onClick={() => setPreviewInvoiceUrl(null)}
              sx={{ color: "#94a3b8", "&:hover": { color: "#0f172a" } }}
            >
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, backgroundColor: "#0f172a", minHeight: "500px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {previewInvoiceUrl && (
            previewInvoiceUrl.includes(".pdf") || previewInvoiceUrl.startsWith("data:application/pdf") ? (
              <iframe
                src={previewInvoiceUrl}
                title="Invoice Preview"
                style={{ width: "100%", height: "75vh", border: "none" }}
              />
            ) : (
              <img
                src={previewInvoiceUrl}
                alt="Invoice Preview"
                style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }}
              />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL: DELETE CONFIRMATION ────────────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle style={{ color: "#dc2626", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
          <Trash2 size={20} color="#dc2626" />
          <span>Delete Equipment Record?</span>
        </DialogTitle>
        <DialogContent>
          <p style={{ fontSize: "13px", color: "#475569", margin: "4px 0 0" }}>
            Are you sure you want to delete this equipment record from the unified database? This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions style={{ padding: "12px 18px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
          >
            Yes, Delete
          </button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: WORKFLOW ACTION DIALOG (Approve / Reject / Resubmit) ───── */}
      <Dialog
        open={workflowModalOpen}
        onClose={() => !workflowSubmitting && setWorkflowModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "12px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "16px", pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          {workflowAction.includes("approve") ? (
            <>
              <CheckCircle2 size={18} color="#16a34a" />
              <span>Confirm Invoice Verification &amp; Approval</span>
            </>
          ) : workflowAction === "resubmit" ? (
            <>
              <RotateCcw size={18} color="#2563eb" />
              <span>Resubmit Asset for Approval</span>
            </>
          ) : (
            <>
              <AlertCircle size={18} color="#dc2626" />
              <span>Reject / Return Invoice to IT</span>
            </>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <div style={{ fontSize: "13px", color: "#475569", marginBottom: "12px" }}>
            {workflowAction.includes("approve") ? (
              <span>
                You are approving the invoice and equipment specifications for{" "}
                <b>{workflowTarget?.asset_tag}</b> ({workflowTarget?.asset_name || workflowTarget?.brand}).
              </span>
            ) : workflowAction === "resubmit" ? (
              <span>
                Resubmit <b>{workflowTarget?.asset_tag}</b> back to Shalini Arun for approval after making necessary corrections.
              </span>
            ) : (
              <span>
                Please state the reason for rejecting or returning <b>{workflowTarget?.asset_tag}</b> to IT for correction.
              </span>
            )}
          </div>
          <div className="form-field">
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
              {workflowAction.includes("approve") ? "Verification Remarks (Optional)" : "Reason / Remarks *"}
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder={
                workflowAction.includes("approve")
                  ? "e.g. Verified with physical invoice and vendor portal."
                  : "Explain what needs to be corrected by IT..."
              }
              value={workflowRemarks}
              onChange={(e) => setWorkflowRemarks(e.target.value)}
              style={{
                width: "100%",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                padding: "8px",
                fontSize: "13px",
                fontFamily: "inherit",
              }}
            />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={workflowSubmitting}
            onClick={() => setWorkflowModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={workflowSubmitting || (!workflowAction.includes("approve") && !workflowRemarks.trim())}
            onClick={handleExecuteWorkflow}
            style={{
              background: workflowAction.includes("approve")
                ? "#16a34a"
                : workflowAction === "resubmit"
                  ? "#2563eb"
                  : "#dc2626",
              color: "#ffffff",
              padding: "7px 16px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {workflowSubmitting
              ? "Processing..."
              : workflowAction.includes("approve")
                ? "Approve Invoice"
                : workflowAction === "resubmit"
                  ? "Resubmit"
                  : "Reject & Return"}
          </button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: ADD VENDOR MODAL ─────────────────────────────────────── */}
      <AddVendorModal
        isOpen={showAddVendorModal}
        onClose={() => setShowAddVendorModal(false)}
        onSuccess={handleVendorCreated}
        defaultVendorType="Supplier"
      />
    </>
  );
}

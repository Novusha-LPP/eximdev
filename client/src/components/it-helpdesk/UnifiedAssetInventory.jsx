import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
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
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";

import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import "../../styles/scorecard.scss";

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

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

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
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [usersRes, vendorsRes] = await Promise.all([
          itHelpdeskAPI.users.getAll({ limit: 1000 }).catch(() => ({ data: [] })),
          itHelpdeskAPI.vendors.getAll({ limit: 200 }).catch(() => ({ data: [] })),
        ]);
        const userList = Array.isArray(usersRes?.data)
          ? usersRes.data
          : Array.isArray(usersRes)
          ? usersRes
          : [];
        setUsersList(userList);

        const vendorList = Array.isArray(vendorsRes?.data)
          ? vendorsRes.data
          : Array.isArray(vendorsRes)
          ? vendorsRes
          : [];
        setVendorsList(vendorList);
      } catch (e) {
        console.error("Error loading master data:", e);
      }
    };
    fetchMasters();
  }, []);

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
      vendor_name: item.vendor_name || item.vendor?.vendor_name || "",
      purchase_cost: item.purchase_cost || "",
      invoice_number: item.invoice_number || "",
      invoice_date: item.invoice_date ? item.invoice_date.slice(0, 10) : "",

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
        toast.success("New equipment created and added to registry");
      }
      setFormModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save equipment");
    } finally {
      setFormSaving(false);
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
                      <th style={{ minWidth: 190 }}>Equipment &amp; Model</th>
                      <th style={{ minWidth: 120 }}>Category</th>
                      <th style={{ minWidth: 130 }}>Inventory Type</th>
                      <th style={{ minWidth: 130 }}>Status</th>
                      <th style={{ minWidth: 100 }}>Condition</th>
                      <th style={{ minWidth: 170 }}>Assigned To</th>
                      <th style={{ minWidth: 120 }}>Warranty</th>
                      <th style={{ width: 120, minWidth: 120, textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
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
                            {item.assigned_to ? (
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
                              <Tooltip title="View Specifications & History">
                                <button
                                  type="button"
                                  className="btn btn-icon btn-secondary"
                                  onClick={() => {
                                    setSelectedAsset(item);
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
      <Dialog open={formModalOpen} onClose={() => setFormModalOpen(false)} maxWidth="md" fullWidth>
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
                      border: `1px solid ${
                        isMonitor
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
                          <label>Vendor</label>
                          <select
                            className="form-select"
                            value={formData.vendor}
                            onChange={(e) => {
                              const v = vendorsList.find((vnd) => vnd._id === e.target.value);
                              setFormData({
                                ...formData,
                                vendor: e.target.value,
                                vendor_name: v?.vendor_name || "",
                              });
                            }}
                          >
                            <option value="">— Select Vendor —</option>
                            {vendorsList.map((v) => (
                              <option key={v._id} value={v._id}>
                                {v.vendor_name}
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
                        <label>Vendor</label>
                        <select
                          className="form-select"
                          value={formData.vendor}
                          onChange={(e) => {
                            const v = vendorsList.find((vnd) => vnd._id === e.target.value);
                            setFormData({
                              ...formData,
                              vendor: e.target.value,
                              vendor_name: v?.vendor_name || "",
                            });
                          }}
                        >
                          <option value="">— Select Vendor —</option>
                          {vendorsList.map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.vendor_name}
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
      <Dialog open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 700,
            fontSize: "15px",
            color: "#0f172a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Tag size={17} color="#4f46e5" />
            <span>Equipment Details: {selectedAsset?.asset_tag}</span>
          </div>
          <IconButton size="small" onClick={() => setDetailsModalOpen(false)}>
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent style={{ padding: "18px 20px", fontSize: "13px" }}>
          {selectedAsset && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Header Box */}
              <div
                style={{
                  padding: "12px 14px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>
                    {selectedAsset.asset_tag} — {selectedAsset.asset_name || `${selectedAsset.brand} ${selectedAsset.model}`.trim()}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    <b>{selectedAsset.brand}</b> {selectedAsset.model} • S/N: {selectedAsset.serial_number || "—"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                  {getStatusBadge(selectedAsset.lifecycle_status)}
                  {getInventoryTypeBadge(selectedAsset.inventory_type || selectedAsset.stock_type)}
                </div>
              </div>

              {/* 1. Common Asset Information */}
              <div>
                <div style={{ fontWeight: 700, fontSize: "12px", textTransform: "uppercase", color: "#4f46e5", marginBottom: "8px" }}>
                  Common Asset Information
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div><span style={{ color: "#64748b" }}>Category:</span> <b>{selectedAsset.category}</b></div>
                  <div><span style={{ color: "#64748b" }}>Condition:</span> <b>{selectedAsset.condition || "Good"}</b></div>
                  <div><span style={{ color: "#64748b" }}>Assigned To:</span> <b>{selectedAsset.assigned_to_name || selectedAsset.assigned_to?.name || "Unassigned"}</b></div>
                  <div><span style={{ color: "#64748b" }}>Department:</span> <b>{selectedAsset.department || "—"}</b></div>
                  <div><span style={{ color: "#64748b" }}>Location:</span> <b>{selectedAsset.location || "—"}</b></div>
                  <div><span style={{ color: "#64748b" }}>Purchase Date:</span> <b>{selectedAsset.purchase_date ? new Date(selectedAsset.purchase_date).toLocaleDateString("en-IN") : "—"}</b></div>
                  <div><span style={{ color: "#64748b" }}>Warranty Start:</span> <b>{selectedAsset.warranty_start_date ? new Date(selectedAsset.warranty_start_date).toLocaleDateString("en-IN") : "—"}</b></div>
                  <div><span style={{ color: "#64748b" }}>Warranty End:</span> <b>{selectedAsset.warranty_end_date ? new Date(selectedAsset.warranty_end_date).toLocaleDateString("en-IN") : "—"}</b></div>
                  {selectedAsset.remarks && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "#64748b" }}>Remarks:</span> <b>{selectedAsset.remarks}</b>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Technical Specifications */}
              <div>
                <div style={{ fontWeight: 700, fontSize: "12px", textTransform: "uppercase", color: "#4f46e5", marginBottom: "8px" }}>
                  Technical Specifications ({selectedAsset.category})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  {selectedAsset.specs?.processor && <div><span style={{ color: "#64748b" }}>Processor:</span> <b>{selectedAsset.specs.processor}</b></div>}
                  {selectedAsset.specs?.cpu_cores && <div><span style={{ color: "#64748b" }}>CPU Cores:</span> <b>{selectedAsset.specs.cpu_cores}</b></div>}
                  {selectedAsset.specs?.ram && <div><span style={{ color: "#64748b" }}>RAM:</span> <b>{selectedAsset.specs.ram}</b></div>}
                  {(selectedAsset.specs?.storage_capacity || selectedAsset.specs?.storage) && (
                    <div>
                      <span style={{ color: "#64748b" }}>Storage:</span>{" "}
                      <b>{[selectedAsset.specs.storage_capacity || selectedAsset.specs.storage, selectedAsset.specs.storage_type].filter(Boolean).join(" ")}</b>
                    </div>
                  )}
                  {selectedAsset.specs?.total_storage && <div><span style={{ color: "#64748b" }}>Total Storage:</span> <b>{selectedAsset.specs.total_storage}</b></div>}
                  {selectedAsset.specs?.raid_config && <div><span style={{ color: "#64748b" }}>RAID:</span> <b>{selectedAsset.specs.raid_config}</b></div>}
                  {selectedAsset.specs?.operating_system && <div><span style={{ color: "#64748b" }}>OS:</span> <b>{selectedAsset.specs.operating_system}</b></div>}
                  {selectedAsset.specs?.hostname && <div><span style={{ color: "#64748b" }}>Hostname:</span> <b>{selectedAsset.specs.hostname}</b></div>}
                  {selectedAsset.specs?.server_role && <div><span style={{ color: "#64748b" }}>Server Role:</span> <b>{selectedAsset.specs.server_role}</b></div>}
                  {selectedAsset.specs?.screen_size && <div><span style={{ color: "#64748b" }}>Screen Size:</span> <b>{selectedAsset.specs.screen_size}</b></div>}
                  {selectedAsset.specs?.resolution && <div><span style={{ color: "#64748b" }}>Resolution:</span> <b>{selectedAsset.specs.resolution}</b></div>}
                  {selectedAsset.specs?.warranty_duration && <div><span style={{ color: "#64748b" }}>Warranty (Duration):</span> <b>{selectedAsset.specs.warranty_duration}</b></div>}
                  {selectedAsset.specs?.printer_type && <div><span style={{ color: "#64748b" }}>Printer Type:</span> <b>{selectedAsset.specs.printer_type} ({selectedAsset.specs.color_mono || "Mono"})</b></div>}
                  {selectedAsset.specs?.print_technology && <div><span style={{ color: "#64748b" }}>Technology:</span> <b>{selectedAsset.specs.print_technology}</b></div>}
                  {selectedAsset.specs?.connectivity && <div><span style={{ color: "#64748b" }}>Connectivity:</span> <b>{selectedAsset.specs.connectivity}</b></div>}
                  {selectedAsset.specs?.print_count && <div><span style={{ color: "#64748b" }}>Print Meter:</span> <b>{selectedAsset.specs.print_count}</b></div>}
                  {selectedAsset.specs?.device_type && <div><span style={{ color: "#64748b" }}>Device Type:</span> <b>{selectedAsset.specs.device_type}</b></div>}
                  {selectedAsset.specs?.firmware_version && <div><span style={{ color: "#64748b" }}>Firmware:</span> <b>{selectedAsset.specs.firmware_version}</b></div>}
                  {selectedAsset.specs?.port_count && <div><span style={{ color: "#64748b" }}>Port Count:</span> <b>{selectedAsset.specs.port_count}</b></div>}
                  {selectedAsset.specs?.poe_support && selectedAsset.specs.poe_support !== "No" && (
                    <div><span style={{ color: "#64748b" }}>PoE Support:</span> <b>{selectedAsset.specs.poe_support} {selectedAsset.specs.poe_budget ? `(${selectedAsset.specs.poe_budget})` : ""}</b></div>
                  )}
                  {selectedAsset.specs?.uplink_port && <div><span style={{ color: "#64748b" }}>Uplink Port:</span> <b>{selectedAsset.specs.uplink_port}</b></div>}
                  {selectedAsset.specs?.rack_cabinet && <div><span style={{ color: "#64748b" }}>Rack / Cabinet:</span> <b>{selectedAsset.specs.rack_cabinet}</b></div>}
                  {selectedAsset.specs?.ip_address && <div><span style={{ color: "#64748b" }}>IP Address:</span> <b style={{ fontFamily: "monospace" }}>{selectedAsset.specs.ip_address}</b></div>}
                  {selectedAsset.specs?.mac_address && <div><span style={{ color: "#64748b" }}>MAC Address:</span> <b style={{ fontFamily: "monospace" }}>{selectedAsset.specs.mac_address}</b></div>}
                  {selectedAsset.specs?.imei_number && <div><span style={{ color: "#64748b" }}>IMEI 1:</span> <b style={{ fontFamily: "monospace" }}>{selectedAsset.specs.imei_number}</b></div>}
                  {selectedAsset.specs?.imei_2 && <div><span style={{ color: "#64748b" }}>IMEI 2:</span> <b style={{ fontFamily: "monospace" }}>{selectedAsset.specs.imei_2}</b></div>}
                  {selectedAsset.specs?.sim_number && <div><span style={{ color: "#64748b" }}>SIM Number:</span> <b>{selectedAsset.specs.sim_number}</b></div>}
                  {selectedAsset.specs?.software_name && <div><span style={{ color: "#64748b" }}>Software:</span> <b>{selectedAsset.specs.software_name}</b></div>}
                  {selectedAsset.specs?.version && <div><span style={{ color: "#64748b" }}>Version:</span> <b>{selectedAsset.specs.version}</b></div>}
                  {selectedAsset.specs?.license_type && <div><span style={{ color: "#64748b" }}>License Type:</span> <b>{selectedAsset.specs.license_type}</b></div>}
                  {selectedAsset.specs?.license_key && <div><span style={{ color: "#64748b" }}>License Key:</span> <b style={{ fontFamily: "monospace" }}>{selectedAsset.specs.license_key}</b></div>}
                  {selectedAsset.specs?.seat_count && <div><span style={{ color: "#64748b" }}>Seats:</span> <b>{selectedAsset.specs.seat_count}</b></div>}
                  {selectedAsset.specs?.custom_notes && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "#64748b" }}>Custom Specs:</span> <b>{selectedAsset.specs.custom_notes}</b>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Procurement & Commercial */}
              <div>
                <div style={{ fontWeight: 700, fontSize: "12px", textTransform: "uppercase", color: "#4f46e5", marginBottom: "8px" }}>
                  Procurement &amp; Invoice
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div><span style={{ color: "#64748b" }}>Vendor:</span> <b>{selectedAsset.vendor_name || selectedAsset.vendor?.vendor_name || "—"}</b></div>
                  <div><span style={{ color: "#64748b" }}>Purchase Cost:</span> <b>₹{selectedAsset.purchase_cost || 0}</b></div>
                  <div><span style={{ color: "#64748b" }}>Invoice No:</span> <b>{selectedAsset.invoice_number || "—"}</b></div>
                  <div>
                    <span style={{ color: "#64748b" }}>Warranty Expiry:</span>{" "}
                    <b>{selectedAsset.warranty_end_date ? new Date(selectedAsset.warranty_end_date).toLocaleDateString("en-IN") : "—"}</b>
                  </div>
                </div>
              </div>

              {/* Audit / Transition Timeline */}
              {selectedAsset.history && selectedAsset.history.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: "12px", textTransform: "uppercase", color: "#4f46e5", marginBottom: "8px" }}>
                    Audit &amp; Lifecycle Timeline
                  </div>
                  <div style={{ borderLeft: "2px solid #c7d2fe", paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedAsset.history.slice(-5).map((h, idx) => (
                      <div key={idx} style={{ position: "relative" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "12.5px" }}>{h.action}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {h.changed_by_name || "System"} •{" "}
                          {new Date(h.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                        {h.remarks && <div style={{ fontSize: "11px", color: "#475569", fontStyle: "italic", marginTop: "2px" }}>"{h.remarks}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Audit Tracking (Section 11, Recommendation 7) */}
              <div>
                <div style={{ fontWeight: 700, fontSize: "12px", textTransform: "uppercase", color: "#4f46e5", marginBottom: "8px" }}>
                  Record Audit Metadata
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <span style={{ color: "#64748b" }}>Created By:</span>{" "}
                    <b>{selectedAsset.created_by_name || selectedAsset.history?.[0]?.changed_by_name || "System"}</b>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Created Date:</span>{" "}
                    <b>{selectedAsset.createdAt ? new Date(selectedAsset.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</b>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Last Updated By:</span>{" "}
                    <b>{selectedAsset.updated_by_name || selectedAsset.history?.[selectedAsset.history.length - 1]?.changed_by_name || "System"}</b>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Last Updated Date:</span>{" "}
                    <b>{selectedAsset.updatedAt ? new Date(selectedAsset.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</b>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setDetailsModalOpen(false)}>
            Close
          </button>
        </DialogActions>
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
    </>
  );
}

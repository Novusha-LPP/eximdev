import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Download,
  BarChart3,
  Laptop,
  Ticket,
  Users,
  Key,
  HardDrive,
  ChevronLeft,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Box as BoxIcon,
  PieChart,
  Filter,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import ITPagination from "./ITPagination";
import { logExportAudit } from "./auditHelper";
import "../../styles/scorecard.scss";

const REPORT_TYPES = [
  { value: "assets", label: "Asset Report", icon: Laptop, color: "#059669", bg: "#ecfdf5" },
  { value: "tickets", label: "Ticket Report", icon: Ticket, color: "#2563eb", bg: "#eff6ff" },
  { value: "vendors", label: "Vendor Report", icon: Users, color: "#7c3aed", bg: "#f5f3ff" },
  { value: "licenses", label: "License Report", icon: Key, color: "#0284c7", bg: "#f0f9ff" },
  { value: "inventory", label: "Inventory Report", icon: HardDrive, color: "#db2777", bg: "#fdf2f8" },
];

export default function ITReports() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const reportType = searchParams.get("report_type") || searchParams.get("type") || "assets";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const limitParam = parseInt(searchParams.get("limit") || "10", 10);
  const searchParam = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "ALL";
  const categoryFilter = searchParams.get("category") || "ALL";
  const fromDate = searchParams.get("from_date") || searchParams.get("fromDate") || "";
  const toDate = searchParams.get("to_date") || searchParams.get("toDate") || "";
  const quickFilter = searchParams.get("quick_filter") || "ALL";

  const [data, setData] = useState([]);
  const [allFilterOptions, setAllFilterOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usersMap, setUsersMap] = useState({});
  const [searchInput, setSearchInput] = useState(searchParam);
  const [pagination, setPagination] = useState({
    page: pageParam,
    limit: limitParam,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const updateQueryParams = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || value === "ALL") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    // Fetch users list to map raw ObjectIds to usernames/names if needed
    itHelpdeskAPI.users
      .getAll()
      .then((res) => {
        const map = {};
        const userList = res?.data || res || [];
        if (Array.isArray(userList)) {
          userList.forEach((u) => {
            if (u._id) {
              map[String(u._id)] = u;
            }
          });
        }
        setUsersMap(map);
      })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const apiModule = itHelpdeskAPI[reportType] || itHelpdeskAPI.assets;
      const params = {
        page: pageParam,
        limit: limitParam,
      };
      if (searchParam) params.search = searchParam;
      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
      if (categoryFilter && categoryFilter !== "ALL") {
        params.category = categoryFilter;
        params.asset_type = categoryFilter;
        params.license_type = categoryFilter;
        params.vendor_type = categoryFilter;
        params.type = categoryFilter;
      }
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res = await apiModule.getAll(params);
      const items = res.data || [];
      setData(items);
      if (res.pagination) {
        setPagination(res.pagination);
      } else {
        setPagination({
          page: pageParam,
          limit: limitParam,
          total: items.length,
          totalPages: 1,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load ${reportType} report`);
    } finally {
      setLoading(false);
    }
  }, [reportType, pageParam, limitParam, searchParam, statusFilter, categoryFilter, fromDate, toDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Fetch full metadata per reportType for unique dropdown options & total KPI scorecards
  useEffect(() => {
    const fetchFullMetadata = async () => {
      try {
        const apiModule = itHelpdeskAPI[reportType] || itHelpdeskAPI.assets;
        const res = await apiModule.getAll({ all: "true" });
        setAllFilterOptions(res.data || []);
      } catch (e) {
        console.error(e);
        setAllFilterOptions([]);
      }
    };
    fetchFullMetadata();
  }, [reportType]);

  const formatUser = (userVal) => {
    if (!userVal) return "—";

    let target = userVal;
    const strVal = String(userVal).trim();

    if (typeof userVal !== "object" && usersMap[strVal]) {
      target = usersMap[strVal];
    }

    let raw = "";
    if (typeof target === "object" && target !== null) {
      raw = target.first_name
        ? `${target.first_name} ${target.last_name || ""}`.trim()
        : target.username || target.name || target.email || "";
    } else {
      raw = String(target);
    }

    // If unmapped 24-character hex ObjectId string, return dash instead of raw ID
    if (/^[0-9a-fA-F]{24}$/.test(raw.trim())) {
      return "—";
    }

    if (raw.includes("@")) {
      raw = raw.split("@")[0];
    }

    const formatted = raw
      .replace(/[._]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    return formatted || "—";
  };

  const formatDateStr = (dateVal) => {
    if (!dateVal) return "—";
    try {
      return new Date(dateVal).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // Derive unique categories dynamically for filtering dropdown
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    allFilterOptions.forEach((item) => {
      let val = null;
      if (reportType === "assets") val = item.asset_type;
      else if (reportType === "tickets") val = item.category;
      else if (reportType === "vendors") val = item.vendor_type || item.type;
      else if (reportType === "licenses") val = item.license_type;
      else if (reportType === "inventory") val = item.category;
      if (val) set.add(String(val).trim());
    });
    return Array.from(set).sort();
  }, [allFilterOptions, reportType]);

  // Derive unique statuses dynamically for filtering dropdown
  const uniqueStatuses = useMemo(() => {
    const set = new Set();
    allFilterOptions.forEach((item) => {
      let val = item.status;
      if (reportType === "inventory") val = item.inventory_type;
      if (val) set.add(String(val).trim());
    });
    return Array.from(set).sort();
  }, [allFilterOptions, reportType]);

  // Compute Metrics & KPI Statistics for current tab
  const metrics = useMemo(() => {
    const sourceList = allFilterOptions.length ? allFilterOptions : data;
    const total = pagination.total || sourceList.length;
    const now = new Date();

    if (reportType === "assets") {
      const available = sourceList.filter((d) => d.status === "Available" || d.status === "In Stock").length;
      const assigned = sourceList.filter((d) => d.status === "Assigned" || d.status === "In Use").length;
      const inRepair = sourceList.filter((d) => d.status === "In Repair" || d.status === "Under Maintenance").length;
      const retired = sourceList.filter((d) => d.status === "Retired" || d.status === "Scrapped" || d.status === "Lost").length;
      return [
        { label: "Total Assets", count: total, color: "#0f172a", bg: "#f8fafc", icon: Laptop },
        { label: "Assigned / In Use", count: assigned, color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
        { label: "Available in Stock", count: available, color: "#2563eb", bg: "#eff6ff", icon: BoxIcon },
        { label: "Under Repair", count: inRepair, color: "#d97706", bg: "#fffbeb", icon: AlertTriangle },
        { label: "Scrapped / Retired", count: retired, color: "#dc2626", bg: "#fef2f2", icon: ShieldAlert },
      ];
    }

    if (reportType === "tickets") {
      const openNew = sourceList.filter((d) => d.status === "New" || d.status === "Open").length;
      const inProgress = sourceList.filter((d) => d.status === "In Progress" || d.status === "Assigned").length;
      const resolvedClosed = sourceList.filter((d) => d.status === "Resolved" || d.status === "Closed").length;
      const criticalHigh = sourceList.filter((d) => d.priority === "Critical" || d.priority === "High").length;
      return [
        { label: "Total Tickets", count: total, color: "#0f172a", bg: "#f8fafc", icon: Ticket },
        { label: "New & Open", count: openNew, color: "#2563eb", bg: "#eff6ff", icon: Clock },
        { label: "In Progress / Assigned", count: inProgress, color: "#7c3aed", bg: "#f5f3ff", icon: Filter },
        { label: "Resolved & Closed", count: resolvedClosed, color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
        { label: "High / Critical Priority", count: criticalHigh, color: "#dc2626", bg: "#fef2f2", icon: AlertTriangle },
      ];
    }

    if (reportType === "vendors") {
      const hardwareAmc = sourceList.filter((d) => (d.vendor_type || d.type || "").toLowerCase().includes("hardware") || (d.vendor_type || d.type || "").toLowerCase().includes("amc")).length;
      const softwareSaas = sourceList.filter((d) => (d.vendor_type || d.type || "").toLowerCase().includes("software") || (d.vendor_type || d.type || "").toLowerCase().includes("saas")).length;
      const active = sourceList.filter((d) => !d.status || d.status === "Active").length;
      return [
        { label: "Total Suppliers & Vendors", count: total, color: "#0f172a", bg: "#f8fafc", icon: Users },
        { label: "Active Suppliers", count: active, color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
        { label: "Hardware & AMC Vendors", count: hardwareAmc, color: "#2563eb", bg: "#eff6ff", icon: Laptop },
        { label: "Software & Cloud Vendors", count: softwareSaas, color: "#7c3aed", bg: "#f5f3ff", icon: Key },
      ];
    }

    if (reportType === "licenses") {
      let totalSeatsSum = 0;
      let allocatedSeatsSum = 0;
      let expiring30Days = 0;

      sourceList.forEach((l) => {
        totalSeatsSum += Number(l.total_seats || l.seats || 0);
        allocatedSeatsSum += Number(l.allocated_seats || l.used_seats || 0);
        if (l.expiry_date) {
          const exp = new Date(l.expiry_date);
          const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 30) expiring30Days++;
        }
      });

      return [
        { label: "Total Subscriptions", count: total, color: "#0f172a", bg: "#f8fafc", icon: Key },
        { label: "Total Allocated Seats", count: `${allocatedSeatsSum} / ${totalSeatsSum || "—"}`, color: "#0284c7", bg: "#f0f9ff", icon: Users },
        { label: "Expiring in < 30 Days", count: expiring30Days, color: expiring30Days > 0 ? "#dc2626" : "#059669", bg: expiring30Days > 0 ? "#fef2f2" : "#ecfdf5", icon: AlertTriangle },
        { label: "Active Licenses", count: Math.max(0, total - expiring30Days), color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
      ];
    }

    if (reportType === "inventory") {
      const sparesCount = sourceList.reduce((acc, item) => acc + Number(item.quantity || 1), 0);
      let warrantyExpired = 0;
      let validWarranty = 0;

      sourceList.forEach((i) => {
        if (i.warranty_end_date) {
          const exp = new Date(i.warranty_end_date);
          if (exp < now) warrantyExpired++;
          else validWarranty++;
        }
      });

      return [
        { label: "Inventory Products", count: total, color: "#0f172a", bg: "#f8fafc", icon: HardDrive },
        { label: "Total Quantity Stock", count: sparesCount, color: "#db2777", bg: "#fdf2f8", icon: BoxIcon },
        { label: "Valid Warranty", count: validWarranty, color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
        { label: "Warranty Expired", count: warrantyExpired, color: warrantyExpired > 0 ? "#dc2626" : "#64748b", bg: warrantyExpired > 0 ? "#fef2f2" : "#f1f5f9", icon: ShieldAlert },
      ];
    }

    return [];
  }, [allFilterOptions, data, pagination.total, reportType]);

  // Compute Category Distribution Breakdown
  const categoryBreakdown = useMemo(() => {
    const sourceList = allFilterOptions.length ? allFilterOptions : data;
    if (!sourceList.length) return [];
    const counts = {};
    sourceList.forEach((item) => {
      let cat = "Other";
      if (reportType === "assets") cat = item.asset_type || "Other";
      else if (reportType === "tickets") cat = item.category || "Other";
      else if (reportType === "vendors") cat = item.vendor_type || item.type || "Other";
      else if (reportType === "licenses") cat = item.license_type || "Software";
      else if (reportType === "inventory") cat = item.category || "General";

      counts[cat] = (counts[cat] || 0) + 1;
    });

    const colors = ["#2563eb", "#059669", "#7c3aed", "#0284c7", "#db2777", "#d97706", "#475569"];
    return Object.entries(counts)
      .map(([name, count], index) => ({
        name,
        count,
        percentage: Math.round((count / sourceList.length) * 100),
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [allFilterOptions, data, reportType]);

  const getColumns = () => {
    switch (reportType) {
      case "assets":
        return [
          { name: "Asset Tag", minWidth: "120px" },
          { name: "Asset Name / Model", minWidth: "220px" },
          { name: "Asset Type", minWidth: "130px" },
          { name: "Status", minWidth: "130px" },
          { name: "Location", minWidth: "150px" },
          { name: "Assigned User", minWidth: "150px" },
          { name: "Warranty Status", minWidth: "160px" },
        ];
      case "tickets":
        return [
          { name: "Ticket ID", minWidth: "130px" },
          { name: "Title / Issue Description", minWidth: "240px" },
          { name: "Category", minWidth: "130px" },
          { name: "Status", minWidth: "130px" },
          { name: "Priority", minWidth: "120px" },
          { name: "Department", minWidth: "130px" },
          { name: "Assigned User", minWidth: "150px" },
          { name: "Created Date", minWidth: "130px" },
        ];
      case "vendors":
        return [
          { name: "Vendor Code", minWidth: "120px" },
          { name: "Company Name", minWidth: "220px" },
          { name: "Vendor Type", minWidth: "140px" },
          { name: "Contact Person", minWidth: "160px" },
          { name: "Email Address", minWidth: "200px" },
          { name: "Mobile", minWidth: "130px" },
          { name: "GSTIN / PAN", minWidth: "170px" },
          { name: "Status", minWidth: "110px" },
        ];
      case "licenses":
        return [
          { name: "Software Product", minWidth: "200px" },
          { name: "License Key", minWidth: "180px" },
          { name: "License Type", minWidth: "130px" },
          { name: "Vendor", minWidth: "160px" },
          { name: "Allocated Seats", minWidth: "140px" },
          { name: "Expiry Date", minWidth: "150px" },
          { name: "Status", minWidth: "110px" },
        ];
      case "inventory":
        return [
          { name: "Item ID", minWidth: "120px" },
          { name: "Brand & Model", minWidth: "240px" },
          { name: "Category", minWidth: "130px" },
          { name: "Quantity Stock", minWidth: "130px" },
          { name: "Inventory Type", minWidth: "130px" },
          { name: "Warranty Status", minWidth: "160px" },
        ];
      default:
        return [];
    }
  };

  const resetAllFilters = () => {
    setSearchInput("");
    setSearchParams({ report_type: reportType }, { replace: true });
    toast.success("Filters reset");
  };

  const exportToExcel = async () => {
    try {
      const apiModule = itHelpdeskAPI[reportType] || itHelpdeskAPI.assets;
      const params = { limit: 10000, all: "true" };
      if (searchParam) params.search = searchParam;
      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
      if (categoryFilter && categoryFilter !== "ALL") {
        params.category = categoryFilter;
        params.asset_type = categoryFilter;
        params.license_type = categoryFilter;
        params.vendor_type = categoryFilter;
        params.type = categoryFilter;
      }
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res = await apiModule.getAll(params);
      const exportData = res.data || [];

      if (!exportData || exportData.length === 0) {
        toast.error("No data to export");
        return;
      }

      const columns = getColumns();
      const headers = columns.map((c) => c.name);
      const wsData = [headers];

      exportData.forEach((item) => {
        const row = [];
        switch (reportType) {
          case "assets":
            row.push(
              item.asset_tag || "",
              item.name || item.asset_name || `${item.manufacturer || ""} ${item.model || ""}`.trim() || "—",
              item.asset_type || item.category || "—",
              item.status || "",
              (typeof item.location === "object" ? item.location?.name : item.location) || "—",
              formatUser(item.assigned_to || item.user),
              item.warranty_expiry ? (new Date(item.warranty_expiry) < new Date() ? "Expired" : "Active") : "—"
            );
            break;
          case "tickets":
            row.push(
              item.ticket_id || "",
              item.title || "",
              item.category || "—",
              item.status || "",
              item.priority || "",
              item.department || "—",
              formatUser(item.assigned_to || item.assignee),
              formatDateStr(item.createdAt)
            );
            break;
          case "vendors":
            row.push(
              item.vendor_code || "—",
              item.name || item.vendor_name || "",
              item.vendor_type || item.type || "",
              item.contact_person || "—",
              item.email || "—",
              item.mobile_number || item.phone || "—",
              `${item.gst_number || "—"} / ${item.pan_number || "—"}`,
              item.status || "Active"
            );
            break;
          case "licenses":
            row.push(
              item.software_name || item.license_name || "",
              item.license_code || "—",
              item.license_type || "",
              item.vendor?.name || item.vendor_name || "—",
              `${item.allocated_seats || 0} / ${item.total_seats || "—"}`,
              formatDateStr(item.expiry_date),
              item.status || "Active"
            );
            break;
          case "inventory":
            row.push(
              item.item_id || "",
              `${item.brand || ""} ${item.model || ""}`.trim() || "—",
              item.category || "",
              item.quantity || 1,
              item.inventory_type || "",
              item.warranty_end_date ? (new Date(item.warranty_end_date) < new Date() ? "Expired" : "Active") : "—"
            );
            break;
          default:
            return;
        }
        wsData.push(row);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const reportName = REPORT_TYPES.find((r) => r.value === reportType)?.label || "Report";
      XLSX.utils.book_append_sheet(wb, ws, reportName);

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `IT_${reportName.replace(/\s+/g, "_")}_Filtered_${dateStr}.xlsx`);
      toast.success(`${reportName} (${exportData.length} records) exported to Excel`);
      logExportAudit({
        module: "Helpdesk",
        details: `Exported ${reportName} to Excel (${exportData.length} records)`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  const renderPillBadge = (text, variant = "secondary") => {
    if (!text) return <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>;

    const baseStyle = {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 11px",
      borderRadius: "14px",
      fontSize: "12px",
      fontWeight: 600,
      lineHeight: "1.2",
      whiteSpace: "nowrap",
    };

    const variantStyles = {
      success: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
      primary: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
      warning: { background: "#fffbeb", color: "#b45309", border: "1px solid #fef08a" },
      danger: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecdd3" },
      purple: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
      teal: { background: "#f0fdf4", color: "#0f766e", border: "1px solid #99f6e4" },
      secondary: { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" },
    };

    const style = { ...baseStyle, ...(variantStyles[variant] || variantStyles.secondary) };
    return <span style={style}>{text}</span>;
  };

  const getStatusBadge = (status) => {
    if (!status) return renderPillBadge("—", "secondary");
    const s = String(status).toLowerCase();
    if (["available", "active", "closed", "resolved"].includes(s)) return renderPillBadge(status, "success");
    if (["assigned", "in progress", "in use"].includes(s)) return renderPillBadge(status, "primary");
    if (["in repair", "pending", "expiring soon"].includes(s)) return renderPillBadge(status, "warning");
    if (["retired", "lost", "expired", "new"].includes(s)) return renderPillBadge(status, "danger");
    return renderPillBadge(status, "secondary");
  };

  const getPriorityBadge = (priority) => {
    if (!priority) return renderPillBadge("Medium", "warning");
    const p = String(priority).toLowerCase();
    if (p === "critical" || p === "high") return renderPillBadge(priority, "danger");
    if (p === "medium") return renderPillBadge(priority, "warning");
    if (p === "low") return renderPillBadge(priority, "success");
    return renderPillBadge(priority, "secondary");
  };

  const getCategoryBadge = (category) => {
    if (!category) return renderPillBadge("General", "secondary");
    const c = String(category).toLowerCase();
    if (c.includes("hardware")) return renderPillBadge(category, "purple");
    if (c.includes("software")) return renderPillBadge(category, "primary");
    if (c.includes("network")) return renderPillBadge(category, "teal");
    if (c.includes("access")) return renderPillBadge(category, "warning");
    return renderPillBadge(category, "secondary");
  };

  const getCodeTag = (codeStr) => {
    if (!codeStr) return <span style={{ color: "#94a3b8" }}>—</span>;
    return (
      <span
        style={{
          fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
          fontWeight: 700,
          fontSize: "12px",
          color: "#0f172a",
          background: "#f8fafc",
          padding: "3px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          display: "inline-block",
        }}
      >
        {codeStr}
      </span>
    );
  };

  const getWarrantyBadge = (dateString) => {
    if (!dateString) return <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>;
    const exp = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return renderPillBadge(`Expired (${Math.abs(diffDays)}d ago)`, "danger");
    }
    if (diffDays <= 30) {
      return renderPillBadge(`Expires in ${diffDays}d`, "warning");
    }
    return renderPillBadge(`Active (${exp.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})`, "success");
  };

  const renderRow = (item, idx) => {
    const rowBg = idx % 2 === 0 ? "#ffffff" : "#fcfdfd";
    const rowIndex = (pagination.page - 1) * pagination.limit + idx + 1;
    switch (reportType) {
      case "assets":
        return (
          <tr key={item._id || idx} style={{ background: rowBg }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{rowIndex}</td>
            <td>{getCodeTag(item.asset_tag)}</td>
            <td style={{ color: "#0f172a", fontWeight: 600 }}>
              {item.name || item.asset_name || `${item.manufacturer || ""} ${item.model || ""}`.trim() || "—"}
            </td>
            <td>{getCategoryBadge(item.asset_type || item.category)}</td>
            <td>{getStatusBadge(item.status)}</td>
            <td style={{ color: "#475569" }}>{typeof item.location === "object" ? item.location?.name : item.location || "—"}</td>
            <td style={{ color: "#334155", fontWeight: 600 }}>{formatUser(item.assigned_to || item.user)}</td>
            <td>{getWarrantyBadge(item.warranty_expiry)}</td>
          </tr>
        );
      case "tickets":
        return (
          <tr key={item._id || idx} style={{ background: rowBg }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{rowIndex}</td>
            <td>{getCodeTag(item.ticket_id)}</td>
            <td style={{ color: "#0f172a", fontWeight: 600, maxWidth: "280px", lineHeight: "1.4" }} title={item.title}>
              {item.title}
            </td>
            <td>{getCategoryBadge(item.category || "General")}</td>
            <td>{getStatusBadge(item.status)}</td>
            <td>{getPriorityBadge(item.priority)}</td>
            <td style={{ color: "#475569", fontWeight: 500 }}>{item.department || "—"}</td>
            <td style={{ color: "#334155", fontWeight: 600 }}>{formatUser(item.assigned_to || item.assignee)}</td>
            <td style={{ color: "#64748b", fontSize: "12.5px" }}>{formatDateStr(item.createdAt)}</td>
          </tr>
        );
      case "vendors":
        return (
          <tr key={item._id || idx} style={{ background: rowBg }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{rowIndex}</td>
            <td>{getCodeTag(item.vendor_code)}</td>
            <td style={{ color: "#0f172a", fontWeight: 600 }}>{item.name || item.vendor_name}</td>
            <td>{getCategoryBadge(item.vendor_type || item.type || "Supplier")}</td>
            <td style={{ color: "#334155", fontWeight: 500 }}>{item.contact_person || "—"}</td>
            <td style={{ color: "#2563eb", fontSize: "12.5px" }}>{item.email || "—"}</td>
            <td style={{ color: "#475569" }}>{item.mobile_number || item.phone || "—"}</td>
            <td style={{ color: "#64748b", fontSize: "12px", fontFamily: "monospace" }}>
              {item.gst_number || item.pan_number ? `${item.gst_number || "—"} / ${item.pan_number || "—"}` : "—"}
            </td>
            <td>{getStatusBadge(item.status || "Active")}</td>
          </tr>
        );
      case "licenses":
        return (
          <tr key={item._id || idx} style={{ background: rowBg }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{rowIndex}</td>
            <td style={{ color: "#0f172a", fontWeight: 600 }}>{item.software_name || item.license_name}</td>
            <td>{getCodeTag(item.license_code)}</td>
            <td style={{ color: "#334155", fontSize: "13px" }}>{item.license_type || "Standard"}</td>
            <td style={{ color: "#334155" }}>{item.vendor?.name || item.vendor_name || "—"}</td>
            <td style={{ color: "#059669", fontWeight: 700 }}>{`${item.allocated_seats || 0} / ${item.total_seats || "—"}`}</td>
            <td>{getWarrantyBadge(item.expiry_date)}</td>
            <td>{getStatusBadge(item.status || "Active")}</td>
          </tr>
        );
      case "inventory":
        return (
          <tr key={item._id || idx} style={{ background: rowBg }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{rowIndex}</td>
            <td>{getCodeTag(item.item_id)}</td>
            <td style={{ color: "#0f172a", fontWeight: 600 }}>{`${item.brand || ""} ${item.model || ""}`.trim() || "—"}</td>
            <td>{getCategoryBadge(item.category)}</td>
            <td style={{ color: "#0284c7", fontWeight: 700 }}>{item.quantity || 1} units</td>
            <td style={{ color: "#334155", fontSize: "13px" }}>{item.inventory_type || "Old"}</td>
            <td>{getWarrantyBadge(item.warranty_end_date)}</td>
          </tr>
        );
      default:
        return null;
    }
  };

  const hasActiveFilters = Boolean(
    searchParam || statusFilter !== "ALL" || categoryFilter !== "ALL" || quickFilter !== "ALL" || fromDate || toDate
  );

  const columns = getColumns();

  return (
    <>
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="back-btn"
            onClick={() => navigate("/it-helpdesk")}
            title="Back to IT Helpdesk"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="topbar-title">IT Operational Reports &amp; Analytics</div>
            <div className="topbar-breadcrumb" style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Executive Analytics &amp; Consolidated Operational Exports
            </div>
          </div>
        </div>

        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportToExcel}
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
            }}
          >
            <Download size={15} /> <span>Export Excel ({pagination.total})</span>
          </button>
        </div>
      </div>

      <div className="page-body" style={{ padding: "0 24px 24px 24px" }}>
        {/* ── Category Selector Pills ───────────────────────────────── */}
        <div className="card" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
          <div className="card-body" style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
              {REPORT_TYPES.map((r) => {
                const IconComp = r.icon;
                const isSelected = reportType === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => updateQueryParams({ report_type: r.value, page: 1, status: "ALL", category: "ALL" })}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      border: isSelected ? `1.5px solid ${r.color}` : "1px solid #e2e8f0",
                      background: isSelected ? r.bg : "#ffffff",
                      color: isSelected ? r.color : "#475569",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: "13.5px",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <IconComp size={17} color={r.color} />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Executive Metric Scorecards ────────────────────────────── */}
        {metrics.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {metrics.map((m, idx) => {
              const IconComp = m.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: m.bg,
                      color: m.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={22} color={m.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                      {m.count}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginTop: "2px" }}>
                      {m.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Category Breakdown Progress Bar ─────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <div className="card" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "8px" }}>
                <PieChart size={16} color="#2563eb" />
                Category Distribution Breakdown
              </div>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Top Categories</span>
            </div>

            {/* Progress Track */}
            <div style={{ display: "flex", height: "12px", borderRadius: "8px", overflow: "hidden", background: "#f1f5f9", marginBottom: "14px" }}>
              {categoryBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${item.percentage}%`,
                    background: item.color,
                    transition: "width 0.3s ease",
                  }}
                  title={`${item.name}: ${item.count} (${item.percentage}%)`}
                />
              ))}
            </div>

            {/* Legend Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {categoryBreakdown.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#475569" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: item.color }} />
                  <strong>{item.name}:</strong>
                  <span>{item.count} ({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Multi-Dimensional Filters Card ─────────────────────────── */}
        <div className="card" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px", marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Top Filter Controls Row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              {/* Search Box */}
              <div style={{ position: "relative", minWidth: "240px", flex: 2 }}>
                <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Search ${REPORT_TYPES.find((r) => r.value === reportType)?.label || "records"}…`}
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    updateQueryParams({ search: e.target.value, page: 1 });
                  }}
                  style={{ paddingLeft: "34px", width: "100%", height: "38px", fontSize: "13px" }}
                />
              </div>

              {/* Status Filter */}
              {uniqueStatuses.length > 0 && (
                <div style={{ minWidth: "160px", flex: 1 }}>
                  <select
                    className="form-input"
                    value={statusFilter}
                    onChange={(e) => updateQueryParams({ status: e.target.value, page: 1 })}
                    style={{ height: "38px", fontSize: "13px", color: "#334155" }}
                  >
                    <option value="ALL">All Statuses</option>
                    {uniqueStatuses.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Filter */}
              {uniqueCategories.length > 0 && (
                <div style={{ minWidth: "160px", flex: 1 }}>
                  <select
                    className="form-input"
                    value={categoryFilter}
                    onChange={(e) => updateQueryParams({ category: e.target.value, page: 1 })}
                    style={{ height: "38px", fontSize: "13px", color: "#334155" }}
                  >
                    <option value="ALL">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date From */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12.5px", color: "#475569", fontWeight: 600 }}>From:</span>
                <input
                  type="date"
                  className="form-input"
                  value={fromDate}
                  onChange={(e) => updateQueryParams({ from_date: e.target.value, page: 1 })}
                  style={{ height: "38px", fontSize: "12.5px" }}
                />
              </div>

              {/* Date To */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12.5px", color: "#475569", fontWeight: 600 }}>To:</span>
                <input
                  type="date"
                  className="form-input"
                  value={toDate}
                  onChange={(e) => updateQueryParams({ to_date: e.target.value, page: 1 })}
                  style={{ height: "38px", fontSize: "12.5px" }}
                />
              </div>

              {/* Clear All Filters Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  style={{
                    height: "38px",
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: "1px solid #fecdd3",
                    background: "#fef2f2",
                    color: "#dc2626",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    transition: "all 0.15s ease",
                  }}
                  title="Reset all search & filters"
                >
                  <RotateCcw size={14} /> Clear Filters
                </button>
              )}
            </div>

            {/* Separator & Quick Presets Row */}
            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: "4px", paddingTop: "12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, marginRight: "4px" }}>Quick Presets:</span>
              <button
                type="button"
                onClick={() => updateQueryParams({ quick_filter: "ALL", page: 1 })}
                style={{
                  padding: "5px 14px",
                  borderRadius: "20px",
                  border: quickFilter === "ALL" ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                  background: quickFilter === "ALL" ? "#eff6ff" : "#ffffff",
                  color: quickFilter === "ALL" ? "#1d4ed8" : "#475569",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                All Records ({pagination.total})
              </button>

              <button
                type="button"
                onClick={() => updateQueryParams({ quick_filter: "EXPIRING_SOON", page: 1 })}
                style={{
                  padding: "5px 14px",
                  borderRadius: "20px",
                  border: quickFilter === "EXPIRING_SOON" ? "1.5px solid #d97706" : "1px solid #e2e8f0",
                  background: quickFilter === "EXPIRING_SOON" ? "#fffbeb" : "#ffffff",
                  color: quickFilter === "EXPIRING_SOON" ? "#b45309" : "#475569",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                ⚠️ Expiring Soon / Due (&lt; 30d)
              </button>

              <button
                type="button"
                onClick={() => updateQueryParams({ quick_filter: "ACTION_REQUIRED", page: 1 })}
                style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  border: quickFilter === "ACTION_REQUIRED" ? "1.5px solid #dc2626" : "1px solid #e2e8f0",
                  background: quickFilter === "ACTION_REQUIRED" ? "#fef2f2" : "#ffffff",
                  color: quickFilter === "ACTION_REQUIRED" ? "#b91c1c" : "#475569",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                🚨 Action Required / Repair Needed
              </button>
            </div>
          </div>
        </div>

        {/* ── Table Card ────────────────────────────────────────────── */}
        <div className="card" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
          <div
            className="card-header"
            style={{
              padding: "14px 20px",
              background: "linear-gradient(to right, #f8fafc, #ffffff)",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div className="card-title" style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart3 size={17} color="#0d9488" />
              {REPORT_TYPES.find((r) => r.value === reportType)?.label} Data
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#475569", background: "#f1f5f9", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
                Showing {data.length} of {pagination.total} records
              </span>
            </div>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
                Loading operational report data…
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%", minWidth: "1000px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ width: 44, minWidth: 44, textAlign: "center", padding: "10px 14px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.03em", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>#</th>
                      {columns.map((col) => (
                        <th key={col.name} style={{ minWidth: col.minWidth, padding: "10px 14px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.03em", color: "#475569", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                          {hasActiveFilters ? "No results matching current filters" : "No records found in this report"}
                        </td>
                      </tr>
                    ) : (
                      data.map((item, idx) => renderRow(item, idx))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination Footer ─────────────────────────────────── */}
            <ITPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalRecords={pagination.total}
              limit={pagination.limit}
              onPageChange={(newPage) => updateQueryParams({ page: newPage })}
              onLimitChange={(newLimit) => updateQueryParams({ limit: newLimit, page: 1 })}
              limits={[10, 20, 50, 100]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
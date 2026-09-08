import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

  const [reportType, setReportType] = useState("assets");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [quickFilter, setQuickFilter] = useState("ALL");
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await itHelpdeskAPI[reportType].getAll();
      setData(res.data || []);
      setPage(1);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load ${reportType} report`);
    } finally {
      setLoading(false);
    }
  }, [reportType]);

  useEffect(() => {
    fetchReport();
    // Reset filters when tab changes
    setSearchTerm("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setFromDate("");
    setToDate("");
    setQuickFilter("ALL");
    setPage(1);
  }, [fetchReport, reportType]);

  const formatUser = (userVal) => {
    if (!userVal) return "—";
    if (typeof userVal === "object") {
      return userVal.username || userVal.first_name || userVal.name || userVal.email || "—";
    }
    return String(userVal);
  };

  // Derive unique categories dynamically for filtering dropdown
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    data.forEach((item) => {
      let val = null;
      if (reportType === "assets") val = item.asset_type;
      else if (reportType === "tickets") val = item.category;
      else if (reportType === "vendors") val = item.vendor_type || item.type;
      else if (reportType === "licenses") val = item.license_type;
      else if (reportType === "inventory") val = item.category;
      if (val) set.add(String(val).trim());
    });
    return Array.from(set).sort();
  }, [data, reportType]);

  // Derive unique statuses dynamically for filtering dropdown
  const uniqueStatuses = useMemo(() => {
    const set = new Set();
    data.forEach((item) => {
      let val = item.status;
      if (reportType === "inventory") val = item.inventory_type;
      if (val) set.add(String(val).trim());
    });
    return Array.from(set).sort();
  }, [data, reportType]);

  // Compute Metrics & KPI Statistics for current tab
  const metrics = useMemo(() => {
    const total = data.length;
    const now = new Date();

    if (reportType === "assets") {
      const available = data.filter((d) => d.status === "Available" || d.status === "In Stock").length;
      const assigned = data.filter((d) => d.status === "Assigned" || d.status === "In Use").length;
      const inRepair = data.filter((d) => d.status === "In Repair" || d.status === "Under Maintenance").length;
      const retired = data.filter((d) => d.status === "Retired" || d.status === "Scrapped" || d.status === "Lost").length;
      return [
        { label: "Total Assets", count: total, color: "#0f172a", bg: "#f8fafc", icon: Laptop },
        { label: "Assigned / In Use", count: assigned, color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
        { label: "Available in Stock", count: available, color: "#2563eb", bg: "#eff6ff", icon: BoxIcon },
        { label: "Under Repair", count: inRepair, color: "#d97706", bg: "#fffbeb", icon: AlertTriangle },
        { label: "Scrapped / Retired", count: retired, color: "#dc2626", bg: "#fef2f2", icon: ShieldAlert },
      ];
    }

    if (reportType === "tickets") {
      const openNew = data.filter((d) => d.status === "New" || d.status === "Open").length;
      const inProgress = data.filter((d) => d.status === "In Progress" || d.status === "Assigned").length;
      const pending = data.filter((d) => d.status === "Pending").length;
      const resolvedClosed = data.filter((d) => d.status === "Resolved" || d.status === "Closed").length;
      const criticalHigh = data.filter((d) => d.priority === "Critical" || d.priority === "High").length;
      return [
        { label: "Total Tickets", count: total, color: "#0f172a", bg: "#f8fafc", icon: Ticket },
        { label: "New & Open", count: openNew, color: "#2563eb", bg: "#eff6ff", icon: Clock },
        { label: "In Progress / Assigned", count: inProgress, color: "#7c3aed", bg: "#f5f3ff", icon: Filter },
        { label: "Resolved & Closed", count: resolvedClosed, color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
        { label: "High / Critical Priority", count: criticalHigh, color: "#dc2626", bg: "#fef2f2", icon: AlertTriangle },
      ];
    }

    if (reportType === "vendors") {
      const hardwareAmc = data.filter((d) => (d.vendor_type || d.type || "").toLowerCase().includes("hardware") || (d.vendor_type || d.type || "").toLowerCase().includes("amc")).length;
      const softwareSaas = data.filter((d) => (d.vendor_type || d.type || "").toLowerCase().includes("software") || (d.vendor_type || d.type || "").toLowerCase().includes("saas")).length;
      const active = data.filter((d) => !d.status || d.status === "Active").length;
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

      data.forEach((l) => {
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
        { label: "Active Licenses", count: total - expiring30Days, color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
      ];
    }

    if (reportType === "inventory") {
      const sparesCount = data.reduce((acc, item) => acc + Number(item.quantity || 1), 0);
      let warrantyExpired = 0;
      let validWarranty = 0;

      data.forEach((i) => {
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
  }, [data, reportType]);

  // Compute Category Distribution Breakdown
  const categoryBreakdown = useMemo(() => {
    if (!data.length) return [];
    const counts = {};
    data.forEach((item) => {
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
        percentage: Math.round((count / data.length) * 100),
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [data, reportType]);

  // Multi-dimensional Filtering Logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Text Search Term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesText = Object.values(item).some((v) => {
          if (v == null) return false;
          if (typeof v === "object") {
            const text = `${v.username || ""} ${v.first_name || ""} ${v.name || ""} ${v.email || ""}`.toLowerCase();
            return text.includes(term);
          }
          return String(v).toLowerCase().includes(term);
        });
        if (!matchesText) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "ALL") {
        const itemStatus = item.status || item.inventory_type || "";
        if (itemStatus.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      // 3. Category Filter
      if (categoryFilter !== "ALL") {
        let itemCat = "";
        if (reportType === "assets") itemCat = item.asset_type;
        else if (reportType === "tickets") itemCat = item.category;
        else if (reportType === "vendors") itemCat = item.vendor_type || item.type;
        else if (reportType === "licenses") itemCat = item.license_type;
        else if (reportType === "inventory") itemCat = item.category;

        if (String(itemCat || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      // 4. Quick Preset Filter
      if (quickFilter !== "ALL") {
        const now = new Date();
        if (quickFilter === "EXPIRING_SOON") {
          const dateVal = item.expiry_date || item.warranty_end_date || item.sla_due_date;
          if (!dateVal) return false;
          const targetDate = new Date(dateVal);
          const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
          if (diffDays < 0 || diffDays > 30) return false;
        } else if (quickFilter === "ACTION_REQUIRED") {
          const s = (item.status || "").toLowerCase();
          const p = (item.priority || "").toLowerCase();
          if (s !== "in repair" && s !== "pending" && s !== "new" && p !== "high" && p !== "critical") {
            return false;
          }
        }
      }

      // 5. Date Range Filter
      if (fromDate || toDate) {
        const dateVal = item.createdAt || item.purchase_date || item.expiry_date || item.warranty_end_date;
        if (!dateVal) return false;
        const itemDate = new Date(dateVal);
        if (fromDate && itemDate < new Date(fromDate)) return false;
        if (toDate) {
          const endOfDay = new Date(toDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (itemDate > endOfDay) return false;
        }
      }

      return true;
    });
  }, [data, searchTerm, statusFilter, categoryFilter, quickFilter, fromDate, toDate, reportType]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / limit));
  const displayedRows = filteredData.slice((page - 1) * limit, page * limit);

  const getColumns = () => {
    switch (reportType) {
      case "assets":
        return ["Asset Tag", "Asset Type", "Status", "Location", "Manufacturer / Model", "Warranty Status"];
      case "tickets":
        return ["Ticket ID", "Title / Issue", "Status", "Priority", "Department", "Assigned User"];
      case "vendors":
        return ["Company Name", "Vendor Type", "Contact Person", "Email Address", "Mobile"];
      case "licenses":
        return ["Software Product", "License Key", "License Type", "Vendor", "Expiry Date"];
      case "inventory":
        return ["Item ID", "Brand & Model", "Category", "Inventory Type", "Warranty Status"];
      default:
        return [];
    }
  };

  const resetAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setFromDate("");
    setToDate("");
    setQuickFilter("ALL");
    setPage(1);
    toast.success("Filters reset");
  };

  const exportToExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }
    try {
      const headers = getColumns();
      const wsData = [headers];

      filteredData.forEach((item) => {
        const row = [];
        switch (reportType) {
          case "assets":
            row.push(
              item.asset_tag || "",
              item.asset_type || "",
              item.status || "",
              (typeof item.location === "object" ? item.location?.name : item.location) || "—",
              `${item.manufacturer || ""} ${item.model || ""}`.trim() || "—",
              item.warranty_expiry ? (new Date(item.warranty_expiry) < new Date() ? "Expired" : "Active") : "—"
            );
            break;
          case "tickets":
            row.push(
              item.ticket_id || "",
              item.title || "",
              item.status || "",
              item.priority || "",
              item.department || "—",
              formatUser(item.assigned_to || item.assignee)
            );
            break;
          case "vendors":
            row.push(
              item.name || "",
              item.vendor_type || item.type || "",
              item.contact_person || "—",
              item.email || "—",
              item.mobile_number || "—"
            );
            break;
          case "licenses":
            row.push(
              item.software_name || item.license_name || "",
              item.license_code || "—",
              item.license_type || "",
              item.vendor?.name || item.vendor_name || "—",
              item.expiry_date ? new Date(item.expiry_date).toISOString().split("T")[0] : "—"
            );
            break;
          case "inventory":
            row.push(
              item.item_id || "",
              `${item.brand || ""} ${item.model || ""}`.trim() || "—",
              item.category || "",
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

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `IT_${reportName.replace(/\s+/g, "_")}_Filtered_${date}.xlsx`);
      toast.success(`${reportName} (${filteredData.length} records) exported to Excel`);
      logExportAudit({
        module: "Helpdesk",
        details: `Exported ${reportName} to Excel (${filteredData.length} records)`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Available":
      case "Active":
      case "Closed":
      case "Resolved":
        return <span className="score-badge badge-excellent">{status}</span>;
      case "Assigned":
      case "In Progress":
      case "In Use":
        return <span className="score-badge badge-good">{status}</span>;
      case "In Repair":
      case "Pending":
      case "Expiring Soon":
        return <span className="score-badge badge-warning">{status}</span>;
      case "Retired":
      case "Lost":
      case "Expired":
      case "New":
        return <span className="score-badge badge-danger">{status}</span>;
      default:
        return <span className="score-badge badge-secondary">{status || "—"}</span>;
    }
  };

  const getWarrantyBadge = (dateString) => {
    if (!dateString) return <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>;
    const exp = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecdd3" }}>
          Expired ({Math.abs(diffDays)}d ago)
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: "#fffbeb", color: "#d97706", border: "1px solid #fef08a" }}>
          Expires in {diffDays}d
        </span>
      );
    }
    return (
      <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
        Active ({exp.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})
      </span>
    );
  };

  const renderRow = (item, idx) => {
    switch (reportType) {
      case "assets":
        return (
          <tr key={item._id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{(page - 1) * limit + idx + 1}</td>
            <td className="fw-600" style={{ color: "#0f172a" }}>{item.asset_tag}</td>
            <td style={{ color: "#334155" }}>{item.asset_type}</td>
            <td>{getStatusBadge(item.status)}</td>
            <td style={{ color: "#475569" }}>{typeof item.location === "object" ? item.location?.name : item.location || "—"}</td>
            <td style={{ color: "#64748b" }}>{`${item.manufacturer || ""} ${item.model || ""}`.trim() || "—"}</td>
            <td>{getWarrantyBadge(item.warranty_expiry)}</td>
          </tr>
        );
      case "tickets":
        return (
          <tr key={item._id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{(page - 1) * limit + idx + 1}</td>
            <td className="fw-600" style={{ color: "#0f172a" }}>{item.ticket_id}</td>
            <td style={{ color: "#334155", maxWidth: "260px" }}>{item.title}</td>
            <td>{getStatusBadge(item.status)}</td>
            <td>
              <span className={`score-badge ${item.priority === "High" || item.priority === "Critical" ? "badge-danger" : item.priority === "Medium" ? "badge-warning" : "badge-good"}`}>
                {item.priority || "Medium"}
              </span>
            </td>
            <td style={{ color: "#475569" }}>{item.department || "—"}</td>
            <td style={{ color: "#64748b" }}>{formatUser(item.assigned_to || item.assignee)}</td>
          </tr>
        );
      case "vendors":
        return (
          <tr key={item._id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{(page - 1) * limit + idx + 1}</td>
            <td className="fw-600" style={{ color: "#0f172a" }}>{item.name}</td>
            <td>
              <span className="score-badge badge-primary">{item.vendor_type || item.type || "Supplier"}</span>
            </td>
            <td style={{ color: "#334155" }}>{item.contact_person || "—"}</td>
            <td style={{ color: "#64748b" }}>{item.email || "—"}</td>
            <td style={{ color: "#64748b" }}>{item.mobile_number || "—"}</td>
          </tr>
        );
      case "licenses":
        return (
          <tr key={item._id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{(page - 1) * limit + idx + 1}</td>
            <td className="fw-600" style={{ color: "#0f172a" }}>{item.software_name || item.license_name}</td>
            <td style={{ color: "#4f46e5", fontFamily: "monospace", fontSize: "12px" }}>{item.license_code || "—"}</td>
            <td style={{ color: "#334155", fontSize: "13px" }}>{item.license_type || "Standard"}</td>
            <td style={{ color: "#334155" }}>{item.vendor?.name || item.vendor_name || "—"}</td>
            <td>{getWarrantyBadge(item.expiry_date)}</td>
          </tr>
        );
      case "inventory":
        return (
          <tr key={item._id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{(page - 1) * limit + idx + 1}</td>
            <td className="fw-600" style={{ color: "#0f172a" }}>{item.item_id}</td>
            <td style={{ color: "#334155" }}>{`${item.brand || ""} ${item.model || ""}`.trim() || "—"}</td>
            <td style={{ color: "#334155", fontSize: "13px" }}>{item.category || "—"}</td>
            <td style={{ color: "#334155", fontSize: "13px" }}>{item.inventory_type || "Old"}</td>
            <td>{getWarrantyBadge(item.warranty_end_date)}</td>
          </tr>
        );
      default:
        return null;
    }
  };

  const hasActiveFilters = Boolean(
    searchTerm || statusFilter !== "ALL" || categoryFilter !== "ALL" || quickFilter !== "ALL" || fromDate || toDate
  );

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
            <Download size={15} /> <span>Export Excel ({filteredData.length})</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Category Selector Pills ───────────────────────────────── */}
        <div className="card mb-16" style={{ background: "#ffffff", borderRadius: "12px" }}>
          <div className="card-body" style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
              {REPORT_TYPES.map((r) => {
                const IconComp = r.icon;
                const isSelected = reportType === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReportType(r.value)}
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
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
              marginBottom: "16px",
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
                    padding: "16px",
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
          <div className="card mb-16" style={{ background: "#ffffff", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                <PieChart size={15} color="#2563eb" />
                Category Distribution Breakdown
              </div>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Top Categories</span>
            </div>

            {/* Progress Track */}
            <div style={{ display: "flex", height: "10px", borderRadius: "6px", overflow: "hidden", background: "#f1f5f9", marginBottom: "12px" }}>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
              {categoryBreakdown.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                  <strong>{item.name}:</strong>
                  <span>{item.count} ({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Multi-Dimensional Filters Card ─────────────────────────── */}
        <div className="card mb-16" style={{ background: "#ffffff", borderRadius: "12px", padding: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Top Filter Controls Row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              {/* Search Box */}
              <div style={{ position: "relative", minWidth: "240px", flex: 2 }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Search ${REPORT_TYPES.find((r) => r.value === reportType)?.label || "records"}…`}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  style={{ paddingLeft: "32px", width: "100%", height: "38px", fontSize: "13px" }}
                />
              </div>

              {/* Status Filter */}
              {uniqueStatuses.length > 0 && (
                <div style={{ minWidth: "160px", flex: 1 }}>
                  <select
                    className="form-input"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
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
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setPage(1);
                    }}
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
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>From:</span>
                <input
                  type="date"
                  className="form-input"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: "38px", fontSize: "12.5px" }}
                />
              </div>

              {/* Date To */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>To:</span>
                <input
                  type="date"
                  className="form-input"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
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

            {/* Quick Presets Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", pt: "4px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginRight: "4px" }}>Quick Presets:</span>
              <button
                type="button"
                onClick={() => { setQuickFilter("ALL"); setPage(1); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "16px",
                  border: quickFilter === "ALL" ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: quickFilter === "ALL" ? "#eff6ff" : "#ffffff",
                  color: quickFilter === "ALL" ? "#1d4ed8" : "#475569",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                All Records ({data.length})
              </button>

              <button
                type="button"
                onClick={() => { setQuickFilter("EXPIRING_SOON"); setPage(1); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "16px",
                  border: quickFilter === "EXPIRING_SOON" ? "1px solid #d97706" : "1px solid #e2e8f0",
                  background: quickFilter === "EXPIRING_SOON" ? "#fffbeb" : "#ffffff",
                  color: quickFilter === "EXPIRING_SOON" ? "#b45309" : "#475569",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ⚠️ Expiring Soon / Due (&lt; 30d)
              </button>

              <button
                type="button"
                onClick={() => { setQuickFilter("ACTION_REQUIRED"); setPage(1); }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "16px",
                  border: quickFilter === "ACTION_REQUIRED" ? "1px solid #dc2626" : "1px solid #e2e8f0",
                  background: quickFilter === "ACTION_REQUIRED" ? "#fef2f2" : "#ffffff",
                  color: quickFilter === "ACTION_REQUIRED" ? "#b91c1c" : "#475569",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🚨 Action Required / Repair Needed
              </button>
            </div>
          </div>
        </div>

        {/* ── Table Card ────────────────────────────────────────────── */}
        <div className="card" style={{ background: "#ffffff", borderRadius: "12px" }}>
          <div
            className="card-header"
            style={{
              padding: "12px 18px",
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
                Showing {displayedRows.length} of {filteredData.length} filtered (Total {data.length})
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
                <table style={{ width: "100%", minWidth: "1000px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ width: 44, minWidth: 44, textAlign: "center" }}>#</th>
                      {getColumns().map((col) => (
                        <th key={col} style={{ minWidth: 150 }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={getColumns().length + 1} style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                          {hasActiveFilters ? "No results matching current filters" : "No records found in this report"}
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((item, idx) => renderRow(item, idx))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination Footer ─────────────────────────────────── */}
            <ITPagination
              page={page}
              totalPages={totalPages}
              totalRecords={filteredData.length}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              limits={[10, 20, 50, 100]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
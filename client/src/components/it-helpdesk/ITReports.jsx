import React, { useState, useEffect, useCallback } from "react";
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
  ChevronRight,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
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
  const [searchTerm, setSearchTerm] = useState("");
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
  }, [fetchReport]);

  const getColumns = () => {
    switch (reportType) {
      case "assets":
        return ["Asset Tag", "Asset Type", "Status", "Location", "Manufacturer / Model"];
      case "tickets":
        return ["Ticket ID", "Title / Issue", "Status", "Priority", "Assigned User"];
      case "vendors":
        return ["Company Name", "Vendor Type", "Contact Person", "Email Address", "Mobile"];
      case "licenses":
        return ["Software Product", "License Key", "License Type", "Vendor", "Expiry Date"];
      case "inventory":
        return ["Item ID", "Brand & Model", "Category", "Inventory Type", "Warranty End"];
      default:
        return [];
    }
  };

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(item)
      .map((v) => String(v || "").toLowerCase())
      .some((v) => v.includes(term));
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / limit));
  const displayedRows = filteredData.slice((page - 1) * limit, page * limit);

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
              item.location || "—",
              `${item.manufacturer || ""} ${item.model || ""}`.trim() || "—"
            );
            break;
          case "tickets":
            row.push(
              item.ticket_id || "",
              item.title || "",
              item.status || "",
              item.priority || "",
              item.assigned_to || item.assignee || "—"
            );
            break;
          case "vendors":
            row.push(
              item.name || "",
              item.type || item.vendor_type || "",
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
              item.warranty_end_date ? new Date(item.warranty_end_date).toISOString().split("T")[0] : "—"
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
      XLSX.writeFile(wb, `IT_${reportName.replace(/\s+/g, "_")}_${date}.xlsx`);
      toast.success(`${reportName} exported to Excel`);
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

  const renderRow = (item, idx) => {
    switch (reportType) {
      case "assets":
        return (
          <tr key={item._id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{(page - 1) * limit + idx + 1}</td>
            <td className="fw-600" style={{ color: "#0f172a" }}>{item.asset_tag}</td>
            <td style={{ color: "#334155" }}>{item.asset_type}</td>
            <td>{getStatusBadge(item.status)}</td>
            <td style={{ color: "#475569" }}>{item.location || "—"}</td>
            <td style={{ color: "#64748b" }}>{`${item.manufacturer || ""} ${item.model || ""}`.trim() || "—"}</td>
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
              <span className={`score-badge ${item.priority === "High" ? "badge-danger" : item.priority === "Medium" ? "badge-warning" : "badge-good"}`}>
                {item.priority || "Medium"}
              </span>
            </td>
            <td style={{ color: "#64748b" }}>{item.assigned_to || item.assignee || "—"}</td>
          </tr>
        );
      case "vendors":
        return (
          <tr key={item._id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{(page - 1) * limit + idx + 1}</td>
            <td className="fw-600" style={{ color: "#0f172a" }}>{item.name}</td>
            <td>
              <span className="score-badge badge-primary">{item.type || item.vendor_type || "Other"}</span>
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
            <td>
              <span className="score-badge badge-primary">{item.license_type || "Standard"}</span>
            </td>
            <td style={{ color: "#334155" }}>{item.vendor?.name || item.vendor_name || "—"}</td>
            <td style={{ color: "#64748b" }}>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
          </tr>
        );
      case "inventory":
        return (
          <tr key={item._id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
            <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{(page - 1) * limit + idx + 1}</td>
            <td className="fw-600" style={{ color: "#0f172a" }}>{item.item_id}</td>
            <td style={{ color: "#334155" }}>{`${item.brand || ""} ${item.model || ""}`.trim() || "—"}</td>
            <td>
              <span className="score-badge badge-primary">{item.category || "Other"}</span>
            </td>
            <td>
              <span className={`score-badge ${item.inventory_type === "New" ? "badge-excellent" : "badge-secondary"}`}>
                {item.inventory_type || "Old"}
              </span>
            </td>
            <td style={{ color: "#64748b" }}>{item.warranty_end_date ? new Date(item.warranty_end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
          </tr>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="btn btn-icon"
            onClick={() => navigate("/it-helpdesk")}
            title="Back to IT Helpdesk"
            style={{
              border: "1px solid #e2e8f0",
              background: "white",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: "bold",
              color: "#334155",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              transition: "all 0.2s ease",
            }}
          >
            ←
          </button>
          <div>
            <div className="topbar-title">IT Operational Reports &amp; Exports</div>
            <div className="topbar-breadcrumb" style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Consolidated Reporting for Hardware Assets, Support Tickets, Vendors, Software Licenses &amp; Inventory
            </div>
          </div>
        </div>

        <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportToExcel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              padding: "7px 16px",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            <Download size={15} /> Export {filteredData.length > 0 ? `(${filteredData.length})` : ""}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Category Selector Pills ───────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              {REPORT_TYPES.map((r) => {
                const IconComp = r.icon;
                const isSelected = reportType === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      setReportType(r.value);
                      setSearchTerm("");
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      border: isSelected ? `1.5px solid ${r.color}` : "1px solid #e2e8f0",
                      background: isSelected ? r.bg : "#ffffff",
                      color: isSelected ? r.color : "#475569",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: "13px",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <IconComp size={16} color={r.color} />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Search & Filter Bar ───────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative", minWidth: "280px", flex: 1 }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder={`Search ${REPORT_TYPES.find((r) => r.value === reportType)?.label || "records"}…`}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    paddingLeft: "32px",
                    height: "38px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    fontSize: "13px",
                    width: "100%",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Showing <strong style={{ color: "#0f172a" }}>{displayedRows.length}</strong> of{" "}
                  <strong style={{ color: "#0f172a" }}>{filteredData.length}</strong> records
                </span>

                {searchTerm && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setSearchTerm("");
                      setPage(1);
                    }}
                    style={{ height: "36px", fontSize: "12px", fontWeight: 600, padding: "0 10px" }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Table Card ────────────────────────────────────────────── */}
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
            }}
          >
            <div className="card-title" style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart3 size={17} color="#0d9488" />
              {REPORT_TYPES.find((r) => r.value === reportType)?.label} Data
            </div>

            <span style={{ fontSize: "12px", color: "#64748b", background: "#f1f5f9", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
              {filteredData.length} Total Records
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                Loading report data...
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: "center" }}>#</th>
                      {getColumns().map((col) => (
                        <th key={col} style={{ minWidth: 120 }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={getColumns().length + 1} style={{ textAlign: "center", padding: "36px 16px", color: "#94a3b8" }}>
                          {searchTerm ? `No results matching "${searchTerm}"` : "No records found in this report"}
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
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                borderTop: "1px solid #e2e8f0",
                padding: "12px 16px",
                background: "#fafbfc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Show</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {[10, 20, 50, 100].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>entries per page</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    opacity: page <= 1 ? 0.5 : 1,
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ fontSize: "13px", color: "#475569", fontWeight: 600, padding: "0 8px" }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    opacity: page >= totalPages ? 0.5 : 1,
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
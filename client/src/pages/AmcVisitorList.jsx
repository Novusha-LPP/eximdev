import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  Edit2,
  Trash2,
  Download,
  Printer,
  QrCode,
  ClipboardList,
} from "lucide-react";
import { amcVisitorAPI } from "../api/amcVisitorAPI";
import * as XLSX from "xlsx";
import "../styles/scorecard.scss";

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const workStatusBadge = (ws) => {
  switch (ws) {
    case "Completed":
      return "badge-excellent";
    case "In Progress":
      return "badge-good";
    case "Pending":
      return "badge-warning";
    default:
      return "badge-secondary";
  }
};

export default function AmcVisitorList() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0); // 0: Visitor Logs, 1: QR Poster Print
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });
  const [qrBaseUrl, setQrBaseUrl] = useState(window.location.origin);

  // Statistics
  const [stats, setStats] = useState({
    totalLogs: 0,
    activeInside: 0,
    completedToday: 0,
  });

  // Modals state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchLogs = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setLoading(true);
      try {
        const data = await amcVisitorAPI.getLogs({
          status: filters.status,
          search: filters.search,
          page,
          limit,
        });
        if (data && data.success) {
          const list = data.data || [];
          const total = data.total || list.length;
          setLogs(list);
          setPagination({ total, page, limit });

          const activeCount = list.filter((l) => l.status === "Active").length;
          const completedCount = list.filter((l) => l.status === "Checked Out").length;
          setStats({
            totalLogs: total,
            activeInside: activeCount,
            completedToday: completedCount,
          });
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load visitor logs");
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  useEffect(() => {
    fetchLogs(1, pagination.limit);
  }, [filters]);

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    fetchLogs(1, newLimit);
  };

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
    if (newPage < 1 || newPage > totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
    fetchLogs(newPage, pagination.limit);
  };

  const totalPages = Math.max(1, Math.ceil(pagination.total / (pagination.limit || 10)));

  const getPageNumbers = () => {
    const total = totalPages;
    const current = pagination.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (logs.length === 0) {
      toast.error("No logs to export");
      return;
    }
    const formatted = logs.map((log, idx) => ({
      "Sr No": idx + 1,
      "Supplier Company": log.supplierCompany,
      "Technician Name": log.technicianName,
      "Mobile No": log.mobileNo,
      "Purpose": log.purpose,
      "AMC Category": log.amcCategory,
      "Department/Area": log.departmentArea,
      "Check-In Time": fmtDateTime(log.checkInTime),
      "Check-Out Time": log.checkOutTime ? fmtDateTime(log.checkOutTime) : "Still Inside",
      "Work Status": log.workStatus || "Pending",
      "Approval By": log.employeeApprovalName || "—",
      "Remarks": log.remarks || "",
      "Status": log.status,
    }));

    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AMC Visitors");
    XLSX.writeFile(wb, "AMC_Supplier_Visitor_Logs.xlsx");
    toast.success("Excel exported successfully!");
  };

  // View Record
  const handleOpenView = (log) => {
    setViewRecord(log);
    setShowViewModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (log) => {
    setEditingLog({
      ...log,
      mobileNo: log.mobileNo ? log.mobileNo.replace(/\D/g, "").slice(-10) : "",
    });
    setShowEditModal(true);
  };

  // Update Record
  const handleUpdateLog = async () => {
    if (!editingLog) return;
    if (editingLog.mobileNo && editingLog.mobileNo.trim().length > 0 && editingLog.mobileNo.trim().length !== 10) {
      toast.error("Mobile number must be exactly 10 digits");
      return;
    }

    setSaving(true);
    try {
      await amcVisitorAPI.updateLog(editingLog._id, editingLog);
      toast.success("Log updated successfully");
      setShowEditModal(false);
      fetchLogs(pagination.page);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update log");
    } finally {
      setSaving(false);
    }
  };

  // Delete Log
  const handleDeleteLog = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this visitor log?")) return;
    try {
      await amcVisitorAPI.deleteLog(id);
      toast.success("Log deleted successfully");
      fetchLogs(pagination.page);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete log");
    }
  };

  // QR URLs
  const checkInQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    qrBaseUrl + "/amc-entry?mode=checkin"
  )}`;
  const checkOutQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    qrBaseUrl + "/amc-entry?mode=checkout"
  )}`;

  const handlePrintPoster = () => {
    const printContent = document.getElementById("qr-poster-print-area")?.innerHTML;
    if (!printContent) return;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <>
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="btn btn-icon"
            onClick={() => navigate("/")}
            title="Back"
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
            }}
          >
            ←
          </button>
          <div>
            <div className="topbar-title">AMC Supplier Logs Dashboard</div>
          </div>
        </div>
        <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
            <button
              type="button"
              className={`btn ${tabValue === 0 ? "btn-primary" : ""}`}
              onClick={() => setTabValue(0)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "6px",
                boxShadow: tabValue === 0 ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                background: tabValue === 0 ? undefined : "transparent",
                border: tabValue === 0 ? undefined : "none",
                color: tabValue === 0 ? "white" : "#475569",
              }}
            >
              <ClipboardList size={15} /> Visitor History Logs
            </button>
            <button
              type="button"
              className={`btn ${tabValue === 1 ? "btn-primary" : ""}`}
              onClick={() => setTabValue(1)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "6px",
                boxShadow: tabValue === 1 ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                background: tabValue === 1 ? undefined : "transparent",
                border: tabValue === 1 ? undefined : "none",
                color: tabValue === 1 ? "white" : "#475569",
              }}
            >
              <QrCode size={15} /> QR Poster Print
            </button>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleExportExcel}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 16px", fontSize: "13px" }}
          >
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Stats Summary Cards ────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#0f766e" }}>
                  {stats.activeInside}
                </div>
                <div className="stat-lbl">Active Visits Today</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {stats.completedToday}
                </div>
                <div className="stat-lbl">Checked Out Today</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#4f46e5" }}>
                  {stats.totalLogs}
                </div>
                <div className="stat-lbl">Total Visitor Logs</div>
              </div>
            </div>
          </div>
        </div>

        {tabValue === 0 ? (
          <>
            {/* ── Filters Bar ────────────────────────────────────────────── */}
            <div className="card mb-16">
              <div className="card-body">
                <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <div className="form-field" style={{ flex: 2 }}>
                    <label>Search</label>
                    <input
                      type="text"
                      placeholder="Search supplier, technician, mobile…"
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active / Inside</option>
                      <option value="Checked Out">Checked Out / Exited</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label style={{ visibility: "hidden" }}>Action</label>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setFilters({ status: "", search: "" })}
                      style={{
                        height: "38px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                        color: "#0f172a",
                        fontWeight: 600,
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Table Card ─────────────────────────────────────────────── */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">📋 AMC Visitor History Logs</div>
              </div>
              <div className="table-wrap">
                {loading ? (
                  <div className="card-body text-muted">Loading…</div>
                ) : logs.length === 0 ? (
                  <div className="card-body text-muted text-center" style={{ padding: "40px 0" }}>
                    No AMC supplier logs found.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 44, textAlign: "center", whiteSpace: "nowrap" }}>Srno</th>
                        <th style={{ minWidth: 150, whiteSpace: "nowrap" }}>Supplier Company</th>
                        <th style={{ minWidth: 130, whiteSpace: "nowrap" }}>Technician</th>
                        <th style={{ whiteSpace: "nowrap" }}>Mobile No</th>
                        <th style={{ minWidth: 140, whiteSpace: "nowrap" }}>AMC Category</th>
                        <th style={{ minWidth: 140 }}>Dept / Area</th>
                        <th style={{ whiteSpace: "nowrap" }}>Check-In</th>
                        <th style={{ whiteSpace: "nowrap" }}>Check-Out</th>
                        <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Work Status</th>
                        <th style={{ minWidth: 130, whiteSpace: "nowrap" }}>Approval By</th>
                        <th style={{ width: 105, textAlign: "center", whiteSpace: "nowrap" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, idx) => (
                        <tr key={log._id}>
                          <td className="text-muted" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            {(pagination.page - 1) * pagination.limit + idx + 1}
                          </td>
                          <td className="fw-600" style={{ minWidth: 150 }}>
                            {log.supplierCompany}
                          </td>
                          <td style={{ minWidth: 130, whiteSpace: "nowrap" }}>
                            {log.technicianName}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {log.mobileNo || "—"}
                          </td>
                          <td style={{ minWidth: 140, whiteSpace: "nowrap" }}>
                            {log.amcCategory || "—"}
                          </td>
                          <td style={{ minWidth: 140 }}>
                            {log.departmentArea || "—"}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {fmtDateTime(log.checkInTime)}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {log.checkOutTime ? (
                              fmtDateTime(log.checkOutTime)
                            ) : (
                              <span className="score-badge badge-warning">Inside</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            <span className={`score-badge ${workStatusBadge(log.workStatus)}`}>
                              {log.workStatus || "Pending"}
                            </span>
                          </td>
                          <td style={{ minWidth: 130, whiteSpace: "nowrap" }}>
                            {log.employeeApprovalName || "—"}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
                              <button
                                type="button"
                                className="btn btn-icon btn-info"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenView(log);
                                }}
                                title="View Details"
                                style={{ width: "28px", height: "28px" }}
                              >
                                <Eye size={14} color="#0284c7" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-icon btn-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(log);
                                }}
                                title="Edit / Approval"
                                style={{ width: "28px", height: "28px" }}
                              >
                                <Edit2 size={14} color="#2563eb" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-icon btn-danger"
                                onClick={(e) => handleDeleteLog(e, log._id)}
                                title="Delete"
                                style={{ width: "28px", height: "28px" }}
                              >
                                <Trash2 size={14} color="#dc2626" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── Pagination Footer ───────────────────────────────────── */}
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
                {/* Left side: Rows per page selector + Showing entries count */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                      Show
                    </span>
                    <select
                      value={pagination.limit}
                      onChange={handleLimitChange}
                      style={{
                        padding: "4px 10px",
                        height: "32px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "white",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#1e293b",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      {[5, 10, 25, 50].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                      entries per page
                    </span>
                  </div>

                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    {pagination.total === 0 ? (
                      "Showing 0 entries"
                    ) : (
                      <>
                        Showing <b style={{ color: "#0f172a" }}>{(pagination.page - 1) * pagination.limit + 1}</b> to{" "}
                        <b style={{ color: "#0f172a" }}>
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </b>{" "}
                        of <b style={{ color: "#0f172a" }}>{pagination.total}</b> entries
                      </>
                    )}
                  </span>
                </div>

                {/* Right side: Page navigation */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={pagination.page <= 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                      style={{
                        height: "32px",
                        padding: "0 10px",
                        border: "1px solid #cbd5e1",
                        background: pagination.page <= 1 ? "#f1f5f9" : "white",
                        color: pagination.page <= 1 ? "#94a3b8" : "#334155",
                        cursor: pagination.page <= 1 ? "not-allowed" : "pointer",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "12.5px",
                      }}
                    >
                      ‹ Prev
                    </button>

                    {getPageNumbers().map((item, idx) =>
                      item === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          style={{ padding: "0 6px", color: "#94a3b8", fontWeight: 600, userSelect: "none" }}
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handlePageChange(item)}
                          style={{
                            minWidth: "32px",
                            height: "32px",
                            padding: "0 8px",
                            border: item === pagination.page ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                            background: item === pagination.page ? "#4f46e5" : "white",
                            color: item === pagination.page ? "white" : "#334155",
                            fontWeight: item === pagination.page ? 700 : 500,
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            boxShadow:
                              item === pagination.page ? "0 1px 3px rgba(79, 70, 229, 0.3)" : "none",
                          }}
                        >
                          {item}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={pagination.page >= totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                      style={{
                        height: "32px",
                        padding: "0 10px",
                        border: "1px solid #cbd5e1",
                        background: pagination.page >= totalPages ? "#f1f5f9" : "white",
                        color: pagination.page >= totalPages ? "#94a3b8" : "#334155",
                        cursor: pagination.page >= totalPages ? "not-allowed" : "pointer",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "12.5px",
                      }}
                    >
                      Next ›
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── QR CODE POSTER PRINT TAB ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <div
              className="card"
              style={{
                maxWidth: 800,
                width: "100%",
                padding: "20px",
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
              }}
            >
              <div style={{ fontWeight: 700, color: "#0f766e", marginBottom: "6px", fontSize: "15px" }}>
                ⚙️ Mobile Scan Setup (Local Wi-Fi Testing)
              </div>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 12px 0" }}>
                If you access this page via <strong>0.0.0.0</strong>, scanning the QR code with your mobile phone will fail. Please replace <strong>0.0.0.0</strong> in the URL below with your PC's actual local IP address (e.g. <code>http://192.168.1.5:3000</code>) so that your phone can connect:
              </p>
              <div className="form-field">
                <label>QR Code Base URL</label>
                <input
                  type="text"
                  value={qrBaseUrl}
                  onChange={(e) => setQrBaseUrl(e.target.value)}
                  placeholder="e.g. http://192.168.1.5:3000"
                />
                <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                  Note: Ensure both mobile and PC are on the same Wi-Fi network.
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrintPoster}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 24px" }}
            >
              <Printer size={18} /> Print QR Poster
            </button>

            {/* Printable Poster Container */}
            <div
              id="qr-poster-print-area"
              style={{
                width: "100%",
                maxWidth: "800px",
                padding: "36px",
                border: "4px double #0f766e",
                borderRadius: "16px",
                background: "#ffffff",
                color: "#0f172a",
                textAlign: "center",
                boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
              }}
            >
              <h1 style={{ color: "#0f766e", fontSize: "28px", fontWeight: 800, margin: "0 0 6px 0" }}>
                AMC SUPPLIER CHECK-IN / CHECK-OUT
              </h1>
              <div style={{ color: "#475569", fontSize: "14px", fontWeight: 600, letterSpacing: "1px", marginBottom: "24px" }}>
                VISITOR MANAGEMENT SYSTEM
              </div>

              <div style={{ height: "2px", background: "#0f766e", margin: "20px 0" }}></div>

              <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "24px", margin: "28px 0" }}>
                {/* Check-In QR */}
                <div style={{ flex: "1 1 280px", padding: "20px", border: "2px solid #e2e8f0", borderRadius: "12px" }}>
                  <h3 style={{ color: "#0f766e", fontSize: "18px", fontWeight: 700, margin: "0 0 14px 0" }}>
                    1. CHECK-IN (ENTRY)
                  </h3>
                  <img
                    src={checkInQRUrl}
                    alt="Check-In QR"
                    style={{ width: "200px", height: "200px", marginBottom: "12px" }}
                  />
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Scan before entering the premises
                  </div>
                </div>

                {/* Check-Out QR */}
                <div style={{ flex: "1 1 280px", padding: "20px", border: "2px solid #e2e8f0", borderRadius: "12px" }}>
                  <h3 style={{ color: "#b91c1c", fontSize: "18px", fontWeight: 700, margin: "0 0 14px 0" }}>
                    2. CHECK-OUT (EXIT)
                  </h3>
                  <img
                    src={checkOutQRUrl}
                    alt="Check-Out QR"
                    style={{ width: "200px", height: "200px", marginBottom: "12px" }}
                  />
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Scan before leaving the premises
                  </div>
                </div>
              </div>

              <div style={{ height: "1px", background: "#e2e8f0", margin: "24px 0" }}></div>

              <div
                style={{
                  textAlign: "left",
                  padding: "16px 20px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  borderLeft: "6px solid #0f766e",
                }}
              >
                <div style={{ fontWeight: 700, color: "#0f766e", fontSize: "15px", marginBottom: "8px" }}>
                  Important Instructions:
                </div>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#334155", fontSize: "13.5px", lineHeight: "1.6" }}>
                  <li><strong>Scan Check-In QR</strong> when you arrive and fill in all mandatory details.</li>
                  <li><strong>Scan Check-Out QR</strong> before leaving to record your exit, work status, and supervisor approval.</li>
                  <li>Unauthorized work or entry without check-in is strictly prohibited.</li>
                  <li>Please coordinate with security at the main gate for any assistance.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── View Details Modal ─────────────────────────────────────── */}
      {showViewModal && viewRecord && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowViewModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "95%",
              maxWidth: 700,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "linear-gradient(to right, #f8fafc, white)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Eye size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                  {viewRecord.supplierCompany} — Visitor Log Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px", maxHeight: "75vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Supplier Company</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>{viewRecord.supplierCompany}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Technician Name</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>{viewRecord.technicianName}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Mobile Number</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>{viewRecord.mobileNo || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>AMC Category</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>{viewRecord.amcCategory || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Department / Area</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>{viewRecord.departmentArea || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Work Status</div>
                  <div style={{ marginTop: "4px" }}>
                    <span className={`score-badge ${workStatusBadge(viewRecord.workStatus)}`}>
                      {viewRecord.workStatus || "Pending"}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Check-In Time</div>
                  <div style={{ fontSize: "14px", color: "#334155", marginTop: "2px" }}>{fmtDateTime(viewRecord.checkInTime)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Check-Out Time</div>
                  <div style={{ fontSize: "14px", color: "#334155", marginTop: "2px" }}>
                    {viewRecord.checkOutTime ? fmtDateTime(viewRecord.checkOutTime) : "Still Inside"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Approved By</div>
                  <div style={{ fontSize: "14px", color: "#334155", marginTop: "2px" }}>{viewRecord.employeeApprovalName || "—"}</div>
                </div>
              </div>

              <div style={{ marginTop: "16px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                  Purpose of Visit
                </div>
                <div style={{ fontSize: "13.5px", color: "#334155", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px" }}>
                  {viewRecord.purpose || "—"}
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                  Remarks / Work Details
                </div>
                <div style={{ fontSize: "13.5px", color: "#334155", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px" }}>
                  {viewRecord.remarks || "No remarks entered."}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "12px 24px",
                borderTop: "1px solid #f1f5f9",
                background: "#fafbfc",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button className="btn" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit / Approval Modal ──────────────────────────────────── */}
      {showEditModal && editingLog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "95%",
              maxWidth: 700,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "linear-gradient(to right, #f8fafc, white)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                Edit Visitor Log / Supervisor Approval
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <div style={{ padding: "20px 24px", maxHeight: "75vh", overflowY: "auto" }}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Supplier Company</label>
                  <input
                    type="text"
                    value={editingLog.supplierCompany}
                    onChange={(e) => setEditingLog({ ...editingLog, supplierCompany: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Technician Name</label>
                  <input
                    type="text"
                    value={editingLog.technicianName}
                    onChange={(e) => setEditingLog({ ...editingLog, technicianName: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Mobile No</span>
                    {editingLog.mobileNo && editingLog.mobileNo.length > 0 && editingLog.mobileNo.length < 10 && (
                      <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 500 }}>
                        {10 - editingLog.mobileNo.length} more digits
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={editingLog.mobileNo}
                    maxLength={10}
                    onChange={(e) =>
                      setEditingLog({
                        ...editingLog,
                        mobileNo: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    placeholder="10-digit mobile"
                  />
                </div>
                <div className="form-field">
                  <label>Work Status</label>
                  <select
                    value={editingLog.workStatus || "Pending"}
                    onChange={(e) => setEditingLog({ ...editingLog, workStatus: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Employee Approval Name</label>
                  <input
                    type="text"
                    value={editingLog.employeeApprovalName || ""}
                    onChange={(e) => setEditingLog({ ...editingLog, employeeApprovalName: e.target.value })}
                    placeholder="Name of supervisor who verified work"
                  />
                </div>
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Purpose of Visit</label>
                  <textarea
                    rows={2}
                    value={editingLog.purpose || ""}
                    onChange={(e) => setEditingLog({ ...editingLog, purpose: e.target.value })}
                  />
                </div>
                <div className="form-field" style={{ gridColumn: "span 2" }}>
                  <label>Remarks / Work Details</label>
                  <textarea
                    rows={3}
                    value={editingLog.remarks || ""}
                    onChange={(e) => setEditingLog({ ...editingLog, remarks: e.target.value })}
                    placeholder="Work details completed during visit..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #f1f5f9",
                background: "#fafbfc",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button className="btn" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpdateLog} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

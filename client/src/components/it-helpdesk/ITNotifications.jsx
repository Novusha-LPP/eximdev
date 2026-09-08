import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Bell,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import "../../styles/scorecard.scss";

function computeStatus(dateStr) {
  if (!dateStr) return { status: "Unknown", diffDays: 0, cls: "badge-secondary" };
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: "Expired", diffDays, cls: "badge-danger" };
  if (diffDays <= 30) return { status: "Expiring Soon", diffDays, cls: "badge-warning" };
  return { status: "Upcoming", diffDays, cls: "badge-excellent" };
}

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function ITNotifications() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, contractsRes, licensesRes] = await Promise.all([
        itHelpdeskAPI.assets.getAll(),
        itHelpdeskAPI.contracts.getAll(),
        itHelpdeskAPI.licenses.getAll(),
      ]);

      const warrantyAlerts = (assetsRes.data || [])
        .filter((a) => a.warranty_expiry)
        .map((a) => {
          const comp = computeStatus(a.warranty_expiry);
          return {
            type: "Warranty Expiry",
            item: a.asset_tag || a.asset_name || "Hardware Asset",
            details: `${a.asset_type || "Device"} - ${a.manufacturer || ""} ${a.model || ""}`.trim(),
            date: a.warranty_expiry,
            status: comp.status,
            diffDays: comp.diffDays,
            cls: comp.cls,
          };
        });

      const contractAlerts = (contractsRes.data || [])
        .filter((c) => c.end_date)
        .map((c) => {
          const comp = computeStatus(c.end_date);
          return {
            type: "Contract Renewal",
            item: c.contract_number || c.contract_name || "AMC Contract",
            details: c.vendor_name || c.vendor?.name || "Maintenance Partner",
            date: c.end_date,
            status: comp.status,
            diffDays: comp.diffDays,
            cls: comp.cls,
          };
        });

      const licenseAlerts = (licensesRes.data || [])
        .filter((l) => l.expiry_date)
        .map((l) => {
          const comp = computeStatus(l.expiry_date);
          return {
            type: "License Expiry",
            item: l.software_name || l.license_name || "Software License",
            details: `Key: ${l.license_code || "N/A"} - Assigned: ${l.assigned_to || "Unassigned"}`,
            date: l.expiry_date,
            status: comp.status,
            diffDays: comp.diffDays,
            cls: comp.cls,
          };
        });

      const allAlerts = [...warrantyAlerts, ...contractAlerts, ...licenseAlerts].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      setAlerts(allAlerts);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications & expiry alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter alerts by search term, status, and alert type
  const filteredAlerts = alerts.filter((a) => {
    const matchesStatus = !filterStatus || a.status === filterStatus;
    const matchesType = !filterType || a.type === filterType;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      a.item.toLowerCase().includes(term) ||
      a.type.toLowerCase().includes(term) ||
      (a.details || "").toLowerCase().includes(term);

    return matchesStatus && matchesType && matchesSearch;
  });

  // KPI counts
  const totalCount = alerts.length;
  const expiringCount = alerts.filter((a) => a.status === "Expiring Soon").length;
  const expiredCount = alerts.filter((a) => a.status === "Expired").length;
  const upcomingCount = alerts.filter((a) => a.status === "Upcoming").length;

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / limit));
  const displayedRows = filteredAlerts.slice((page - 1) * limit, page * limit);

  const exportToExcel = () => {
    if (!filteredAlerts || filteredAlerts.length === 0) {
      toast.error("No alerts to export");
      return;
    }
    try {
      const excelData = filteredAlerts.map((alert, index) => ({
        "Sr. No.": index + 1,
        "Alert Type": alert.type,
        "Item / Subject": alert.item,
        "Details": alert.details || "—",
        "Expiry / Renewal Date": new Date(alert.date).toLocaleDateString("en-IN"),
        "Days Remaining": alert.diffDays < 0 ? `${Math.abs(alert.diffDays)} days overdue` : `${alert.diffDays} days left`,
        "Status": alert.status,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, "Expiry Alerts");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `IT_Notifications_Alerts_${date}.xlsx`);
      toast.success("Expiry notifications exported to Excel");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel");
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "Warranty Expiry":
        return <span className="score-badge badge-primary">{type}</span>;
      case "Contract Renewal":
        return <span className="score-badge badge-warning">{type}</span>;
      case "License Expiry":
        return <span className="score-badge badge-good">{type}</span>;
      default:
        return <span className="score-badge badge-secondary">{type}</span>;
    }
  };

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
            <div className="topbar-title">Expiry Notifications &amp; System Alerts</div>
            <div className="topbar-breadcrumb" style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Proactive Monitoring of Hardware Warranties, AMC Renewals &amp; Software License Expirations
            </div>
          </div>
        </div>

        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportToExcel}
          >
            <Download size={15} /> <span>Export Excel</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── KPI Summary Cards ─────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#0f172a" }}>
                  {totalCount}
                </div>
                <div className="stat-lbl">Total Alerts</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#f59e0b" }}>
                  {expiringCount}
                </div>
                <div className="stat-lbl">Expiring in 30 Days</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#ef4444" }}>
                  {expiredCount}
                </div>
                <div className="stat-lbl">Overdue / Expired</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {upcomingCount}
                </div>
                <div className="stat-lbl">Upcoming Safe</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters Card ──────────────────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
              <div className="form-field">
                <label>Search Alerts</label>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search asset, contract, license…"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    style={{ paddingLeft: "32px" }}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Alert Category</label>
                <CustomSelect
                  value={filterType}
                  onChange={(val) => {
                    setFilterType(val);
                    setPage(1);
                  }}
                  options={[
                    { label: "All Categories", value: "" },
                    { label: "Hardware Warranty", value: "Warranty Expiry" },
                    { label: "AMC Contract Renewal", value: "Contract Renewal" },
                    { label: "Software License Expiry", value: "License Expiry" },
                  ]}
                  placeholder="All Categories"
                  width="100%"
                />
              </div>

              <div className="form-field">
                <label>Urgency Status</label>
                <CustomSelect
                  value={filterStatus}
                  onChange={(val) => {
                    setFilterStatus(val);
                    setPage(1);
                  }}
                  options={[
                    { label: "All Statuses", value: "" },
                    { label: "Expiring Soon (< 30 days)", value: "Expiring Soon" },
                    { label: "Expired / Overdue", value: "Expired" },
                    { label: "Upcoming", value: "Upcoming" },
                  ]}
                  placeholder="All Statuses"
                  width="100%"
                />
              </div>

              <div className="form-field">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterType("");
                    setFilterStatus("");
                    setPage(1);
                  }}
                  style={{
                    height: "38px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    fontWeight: 600,
                    padding: "0 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={14} />
                  Clear Filters
                </button>
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
              <Bell size={17} color="#ea580c" /> Active Expiry Queue
            </div>

            <span style={{ fontSize: "12px", color: "#64748b", background: "#f1f5f9", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
              Showing {displayedRows.length} of {filteredAlerts.length} items
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                Scanning warranties and renewals...
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%", minWidth: "1100px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: "center" }}>#</th>
                      <th style={{ minWidth: 140 }}>Alert Type</th>
                      <th style={{ minWidth: 160 }}>Item / Asset / Subject</th>
                      <th style={{ minWidth: 180 }}>Specification / Vendor Details</th>
                      <th style={{ minWidth: 120 }}>Expiry Date</th>
                      <th style={{ minWidth: 130 }}>Timeline</th>
                      <th style={{ minWidth: 110, textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "36px 16px", color: "#16a34a" }}>
                          🎉 No pending expiry alerts matching criteria!
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((alert, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
                          <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                            {(page - 1) * limit + idx + 1}
                          </td>
                          <td>{getTypeBadge(alert.type)}</td>
                          <td className="fw-600" style={{ color: "#0f172a" }}>
                            {alert.item}
                          </td>
                          <td style={{ color: "#475569", fontSize: "12.5px" }}>
                            {alert.details || "—"}
                          </td>
                          <td style={{ color: "#334155", fontSize: "13px" }}>
                            {fmtDate(alert.date)}
                          </td>
                          <td style={{ fontSize: "12.5px" }}>
                            {alert.diffDays < 0 ? (
                              <span style={{ color: "#dc2626", fontWeight: 600 }}>
                                {Math.abs(alert.diffDays)} days overdue
                              </span>
                            ) : alert.diffDays === 0 ? (
                              <span style={{ color: "#d97706", fontWeight: 700 }}>
                                Expires Today!
                              </span>
                            ) : (
                              <span style={{ color: alert.diffDays <= 30 ? "#d97706" : "#475569", fontWeight: alert.diffDays <= 30 ? 600 : 400 }}>
                                {alert.diffDays} days remaining
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`score-badge ${alert.cls}`}>
                              {alert.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination Footer ─────────────────────────────────── */}
            <ITPagination
              page={page}
              totalPages={totalPages}
              totalRecords={filteredAlerts.length}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

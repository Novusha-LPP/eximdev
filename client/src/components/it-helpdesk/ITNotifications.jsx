import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Download,
  Bell,
  ChevronLeft,
  RotateCcw,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import toast from "react-hot-toast";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import "../../styles/scorecard.scss";

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function ITNotifications() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const limitParam = parseInt(searchParams.get("limit") || "10", 10);
  const statusParam = searchParams.get("status") || "";
  const typeParam = searchParams.get("type") || searchParams.get("category") || "";
  const searchParam = searchParams.get("search") || "";

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [searchInput, setSearchInput] = useState(searchParam);
  const [stats, setStats] = useState({ total: 0, expiring: 0, expired: 0, upcoming: 0 });
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
      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params, { replace: true });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pageParam,
        limit: limitParam,
      };
      if (statusParam) params.status = statusParam;
      if (typeParam) params.type = typeParam;
      if (searchParam) params.search = searchParam;

      const res = await itHelpdeskAPI.notifications.getAll(params);

      setAlerts(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications & expiry alerts");
    } finally {
      setLoading(false);
    }
  }, [pageParam, limitParam, statusParam, typeParam, searchParam]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await itHelpdeskAPI.notifications.getStats();
      if (res && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Backend queries all notifications directly from DB and streams binary .xlsx
      const response = await itHelpdeskAPI.notifications.export();

      if (response.data && response.data.type === "application/json") {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || "Failed to generate notifications report");
      }

      let fileName = `IT_Expiry_Notifications_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

      toast.success("Expiry notifications exported to Excel");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export Excel");
    } finally {
      setExporting(false);
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
            disabled={exporting}
            style={{ opacity: exporting ? 0.7 : 1, cursor: exporting ? "not-allowed" : "pointer" }}
          >
            <Download size={15} /> <span>{exporting ? "Generating Excel..." : "Export Excel"}</span>
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
                  {stats.total}
                </div>
                <div className="stat-lbl">Total Alerts</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#f59e0b" }}>
                  {stats.expiring}
                </div>
                <div className="stat-lbl">Expiring in 30 Days</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#ef4444" }}>
                  {stats.expired}
                </div>
                <div className="stat-lbl">Overdue / Expired</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {stats.upcoming}
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
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      updateQueryParams({ search: e.target.value, page: 1 });
                    }}
                    style={{ paddingLeft: "32px" }}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Alert Category</label>
                <CustomSelect
                  value={typeParam}
                  onChange={(val) => {
                    updateQueryParams({ type: val, page: 1 });
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
                  value={statusParam}
                  onChange={(val) => {
                    updateQueryParams({ status: val, page: 1 });
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
                    setSearchInput("");
                    setSearchParams({}, { replace: true });
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
                    borderRadius: "8px",
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
              Showing {alerts.length} of {pagination.total} items
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
                    {alerts.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "36px 16px", color: "#16a34a" }}>
                          🎉 No pending expiry alerts matching criteria!
                        </td>
                      </tr>
                    ) : (
                      alerts.map((alert, idx) => (
                        <tr key={alert._id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd" }}>
                          <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>
                            {(pagination.page - 1) * pagination.limit + idx + 1}
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
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalRecords={pagination.total}
              limit={pagination.limit}
              onPageChange={(newPage) => updateQueryParams({ page: newPage })}
              onLimitChange={(newLimit) => updateQueryParams({ limit: newLimit, page: 1 })}
            />
          </div>
        </div>
      </div>
    </>
  );
}

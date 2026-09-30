import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const formatINR = (val) => {
  const num = Number(val || 0);
  return `₹ ${num.toLocaleString("en-IN")}`;
};

export default function TransportDashboard({
  activeUserId,
  onOpenDailyModal,
  onOpenUploadModal,
  onOpenShareModal
}) {
  const [filter, setFilter] = useState("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    period: {},
    kpi: {
      total_invoice_count: 0,
      total_invoice_amount: 0,
      total_pending_lrs: 0,
      direct_income_total: 0,
      total_sundry_debtors: 0
    },
    branches: [],
    branch_totals: { invoice_count: 0, invoice_amount: 0, pending_lrs: 0 },
    sundry_debtors: [],
    sundry_debtors_total: 0
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let url = `${process.env.REACT_APP_API_STRING}/transport-invoicing/dashboard?filter=${filter}`;
      if (filter === "day" || filter === "week" || filter === "month") {
        url += `&date=${selectedDate}`;
      } else if (filter === "custom") {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      if (activeUserId) {
        url += `&userId=${activeUserId}`;
      }

      const res = await axios.get(url, { withCredentials: true });
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      toast.error(err.response?.data?.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filter, selectedDate, startDate, endDate, activeUserId]);

  const maxBranchAmount = Math.max(
    ...((data.branches || []).map((b) => Number(b.invoice_amount || 0))),
    1
  );

  return (
    <div className="ti-dashboard">
      {/* 20.4 Dashboard Filters */}
      <div className="ti-filter-bar">
        <div className="ti-filter-group">
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
            PERIOD FILTER:
          </span>
          <div className="ti-pill-group">
            <button
              type="button"
              className={`ti-pill ${filter === "day" ? "active" : ""}`}
              onClick={() => setFilter("day")}
            >
              Day
            </button>
            <button
              type="button"
              className={`ti-pill ${filter === "week" ? "active" : ""}`}
              onClick={() => setFilter("week")}
            >
              Week
            </button>
            <button
              type="button"
              className={`ti-pill ${filter === "month" ? "active" : ""}`}
              onClick={() => setFilter("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={`ti-pill ${filter === "custom" ? "active" : ""}`}
              onClick={() => setFilter("custom")}
            >
              Custom Date
            </button>
          </div>

          {filter === "day" && (
            <input
              type="date"
              className="ti-input"
              style={{ width: "auto" }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}

          {filter === "week" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="date"
                className="ti-input"
                style={{ width: "auto" }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                (Week containing selected date)
              </span>
            </div>
          )}

          {filter === "month" && (
            <input
              type="month"
              className="ti-input"
              style={{ width: "auto" }}
              value={selectedDate ? selectedDate.slice(0, 7) : ""}
              onChange={(e) => setSelectedDate(`${e.target.value}-01`)}
            />
          )}

          {filter === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="date"
                className="ti-input"
                style={{ width: "auto" }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span style={{ color: "#94a3b8" }}>to</span>
              <input
                type="date"
                className="ti-input"
                style={{ width: "auto" }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="ti-filter-group">
          <button
            type="button"
            className="ti-btn ti-btn-secondary"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary"
            onClick={onOpenDailyModal}
          >
            + Add Daily Entry
          </button>
        </div>
      </div>

      {/* 20.1 Top Summary KPI Cards */}
      <div className="ti-kpi-grid">
        <div className="ti-kpi-card card-blue">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Total Invoice Count</span>
            <div className="ti-kpi-icon">📄</div>
          </div>
          <div className="ti-kpi-value">
            {Number(data.kpi?.total_invoice_count || 0).toLocaleString("en-IN")}
          </div>
          <div className="ti-kpi-sub">Across 7 Transport Branches</div>
        </div>

        <div className="ti-kpi-card card-emerald">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Total Invoice Amount</span>
            <div className="ti-kpi-icon">💰</div>
          </div>
          <div className="ti-kpi-value">
            {formatINR(data.kpi?.total_invoice_amount)}
          </div>
          <div className="ti-kpi-sub">Total billed in period</div>
        </div>

        <div className="ti-kpi-card card-amber">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Total Pending LRs</span>
            <div className="ti-kpi-icon">⏳</div>
          </div>
          <div className="ti-kpi-value">
            {Number(data.kpi?.total_pending_lrs || 0).toLocaleString("en-IN")}
          </div>
          <div className="ti-kpi-sub">Awaiting billing completion</div>
        </div>

        <div className="ti-kpi-card card-purple">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Direct Income Total</span>
            <div className="ti-kpi-icon">📈</div>
          </div>
          <div className="ti-kpi-value">
            {formatINR(data.kpi?.direct_income_total)}
          </div>
          <div className="ti-kpi-sub">Single total amount head</div>
        </div>

        <div className="ti-kpi-card card-indigo">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Total Sundry Debtors</span>
            <div className="ti-kpi-icon">👥</div>
          </div>
          <div className="ti-kpi-value">
            {formatINR(data.kpi?.total_sundry_debtors)}
          </div>
          <div className="ti-kpi-sub">3 debtor categories sum</div>
        </div>
      </div>

      {/* Main Grid: Branch-wise Invoicing & Sundry Debtors */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        {/* 20.2 Branch-wise Invoicing */}
        <div className="ti-card">
          <div className="ti-card-header">
            <h3 className="ti-card-title">
              <span>🏢</span> Branch-wise Invoicing
            </h3>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              Period: <strong>{data.period?.label || "Selected Period"}</strong>
            </span>
          </div>
          <div className="ti-card-body" style={{ padding: 0 }}>
            <div className="ti-table-responsive">
              <table className="ti-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th className="text-right">Invoice Count</th>
                    <th className="text-right">Invoice Amount (₹)</th>
                    <th className="text-right">Pending LRs</th>
                    <th style={{ width: "120px" }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.branches || []).map((b) => {
                    const pct = Math.round(
                      ((b.invoice_amount || 0) / maxBranchAmount) * 100
                    );
                    return (
                      <tr key={b.branch}>
                        <td style={{ fontWeight: 600 }}>{b.branch}</td>
                        <td className="text-right" style={{ fontFamily: "monospace", fontSize: "0.95rem" }}>
                          {b.invoice_count || 0}
                        </td>
                        <td className="text-right" style={{ fontWeight: 700, color: "#0f172a" }}>
                          {formatINR(b.invoice_amount)}
                        </td>
                        <td className="text-right" style={{ color: b.pending_lrs > 0 ? "#b45309" : "#64748b", fontWeight: b.pending_lrs > 0 ? 700 : 500 }}>
                          {b.pending_lrs || 0}
                        </td>
                        <td>
                          <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                background: "#4f46e5",
                                height: "100%",
                                borderRadius: "4px"
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>TOTAL (AUTO)</td>
                    <td className="text-right" style={{ fontFamily: "monospace", fontSize: "1.05rem" }}>
                      {data.branch_totals?.invoice_count || 0}
                    </td>
                    <td className="text-right" style={{ color: "#059669", fontSize: "1.05rem" }}>
                      {formatINR(data.branch_totals?.invoice_amount)}
                    </td>
                    <td className="text-right" style={{ color: "#d97706", fontSize: "1.05rem" }}>
                      {data.branch_totals?.pending_lrs || 0}
                    </td>
                    <td>—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* 20.3 Sundry Debtors Card */}
        <div>
          <div className="ti-card">
            <div className="ti-card-header">
              <h3 className="ti-card-title">
                <span>👥</span> Sundry Debtors
              </h3>
            </div>
            <div className="ti-card-body" style={{ padding: 0 }}>
              <div className="ti-table-responsive">
                <table className="ti-table">
                  <thead>
                    <tr>
                      <th>Sundry Debtor</th>
                      <th className="text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.sundry_debtors || []).map((sd) => (
                      <tr key={sd.particulars}>
                        <td style={{ fontWeight: 600 }}>{sd.particulars}</td>
                        <td className="text-right" style={{ fontWeight: 700, color: "#0f172a" }}>
                          {formatINR(sd.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>TOTAL SUNDRY DEBTORS</td>
                      <td className="text-right" style={{ color: "#4f46e5", fontSize: "1.05rem" }}>
                        {formatINR(data.sundry_debtors_total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Direct Income Display Card */}
          <div className="ti-card" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", borderColor: "#86efac" }}>
            <div className="ti-card-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                    Direct Income Total
                  </span>
                  <h4 style={{ margin: "4px 0 0", color: "#14532d", fontWeight: 800 }}>
                    {formatINR(data.kpi?.direct_income_total)}
                  </h4>
                </div>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
                  📈
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

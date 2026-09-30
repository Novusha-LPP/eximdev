import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const BRANCH_LIST = [
  "ICD Khodiyar",
  "ICD Sanand",
  "ICD Mundra",
  "ICD Airport",
  "ICD Hazira",
  "ICD Sachana",
  "ICD Baroda"
];

const formatINR = (val) => {
  const num = Number(val || 0);
  return `₹ ${num.toLocaleString("en-IN")}`;
};

export default function MonthlyReportTab({ activeUserId, onOpenShareModal }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState({
    month: "",
    days: [],
    branch_summary: {},
    grand_totals: {
      invoice_count: 0,
      invoice_amount: 0,
      pending_lrs: 0,
      sundry_debtors: 0,
      direct_income: 0,
      grand_total_revenue: 0
    }
  });

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      let url = `${process.env.REACT_APP_API_STRING}/transport-invoicing/monthly-report?month=${selectedMonth}`;
      if (activeUserId) url += `&userId=${activeUserId}`;

      const res = await axios.get(url, { withCredentials: true });
      if (res.data?.success) {
        setReport(res.data);
      }
    } catch (err) {
      console.error("Failed to load monthly report:", err);
      toast.error(err.response?.data?.message || "Failed to load monthly report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyReport();
  }, [selectedMonth, activeUserId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ti-monthly-report">
      {/* Top Filter and Actions */}
      <div className="ti-filter-bar">
        <div className="ti-filter-group">
          <span style={{ fontWeight: 700, color: "#334155" }}>Select Report Month:</span>
          <input
            type="month"
            className="ti-input"
            style={{ width: "auto", fontWeight: 700 }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <button
            type="button"
            className="ti-btn ti-btn-secondary"
            onClick={fetchMonthlyReport}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        <div className="ti-filter-group">
          <button
            type="button"
            className="ti-btn ti-btn-secondary"
            onClick={handlePrint}
          >
            🖨️ Print Report
          </button>
          <a
            href={`${process.env.REACT_APP_API_STRING}/transport-invoicing/template/master`}
            className="ti-btn ti-btn-secondary"
            download
            style={{ textDecoration: "none" }}
          >
            📥 Export Master Excel
          </a>
          <button
            type="button"
            className="ti-btn ti-btn-primary"
            onClick={onOpenShareModal}
          >
            🔗 Share Report
          </button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="ti-kpi-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="ti-kpi-card card-blue">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Month Invoices</span>
            <div className="ti-kpi-icon">📄</div>
          </div>
          <div className="ti-kpi-value">{report.grand_totals?.invoice_count || 0}</div>
          <div className="ti-kpi-sub">Total bills issued in {selectedMonth}</div>
        </div>

        <div className="ti-kpi-card card-emerald">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Total Invoiced Amount</span>
            <div className="ti-kpi-icon">💰</div>
          </div>
          <div className="ti-kpi-value">{formatINR(report.grand_totals?.invoice_amount)}</div>
          <div className="ti-kpi-sub">Across 7 transport branches</div>
        </div>

        <div className="ti-kpi-card card-amber">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Pending LRs</span>
            <div className="ti-kpi-icon">⏳</div>
          </div>
          <div className="ti-kpi-value">{report.grand_totals?.pending_lrs || 0}</div>
          <div className="ti-kpi-sub">Unbilled shipments remaining</div>
        </div>

        <div className="ti-kpi-card card-purple">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Direct Income Total</span>
            <div className="ti-kpi-icon">📈</div>
          </div>
          <div className="ti-kpi-value">{formatINR(report.grand_totals?.direct_income)}</div>
          <div className="ti-kpi-sub">Total direct income in month</div>
        </div>

        <div className="ti-kpi-card card-indigo">
          <div className="ti-kpi-top">
            <span className="ti-kpi-label">Total Sundry Debtors</span>
            <div className="ti-kpi-icon">👥</div>
          </div>
          <div className="ti-kpi-value">{formatINR(report.grand_totals?.sundry_debtors)}</div>
          <div className="ti-kpi-sub">Debtors balance for month</div>
        </div>
      </div>

      {/* Branch Aggregates Table */}
      <div className="ti-card">
        <div className="ti-card-header">
          <h3 className="ti-card-title">
            <span>🏢</span> Branch Performance Breakdown — {selectedMonth}
          </h3>
        </div>
        <div className="ti-card-body" style={{ padding: 0 }}>
          <div className="ti-table-responsive">
            <table className="ti-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th className="text-right">Total Invoices</th>
                  <th className="text-right">Total Invoiced Amount (₹)</th>
                  <th className="text-right">Pending LRs</th>
                  <th className="text-right">Revenue Contribution</th>
                </tr>
              </thead>
              <tbody>
                {BRANCH_LIST.map((bName) => {
                  const bData = report.branch_summary?.[bName] || { count: 0, amount: 0, pending: 0 };
                  const pct = report.grand_totals?.invoice_amount > 0
                    ? Math.round((bData.amount / report.grand_totals.invoice_amount) * 100)
                    : 0;
                  return (
                    <tr key={bName}>
                      <td style={{ fontWeight: 600 }}>{bName}</td>
                      <td className="text-right" style={{ fontFamily: "monospace" }}>{bData.count}</td>
                      <td className="text-right" style={{ fontWeight: 700 }}>{formatINR(bData.amount)}</td>
                      <td className="text-right" style={{ color: bData.pending > 0 ? "#b45309" : "#64748b", fontWeight: bData.pending > 0 ? 700 : 500 }}>
                        {bData.pending}
                      </td>
                      <td className="text-right" style={{ fontWeight: 600, color: "#4f46e5" }}>
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL (AUTO)</td>
                  <td className="text-right" style={{ fontFamily: "monospace", fontSize: "1.05rem" }}>
                    {report.grand_totals?.invoice_count || 0}
                  </td>
                  <td className="text-right" style={{ color: "#059669", fontSize: "1.05rem" }}>
                    {formatINR(report.grand_totals?.invoice_amount)}
                  </td>
                  <td className="text-right" style={{ color: "#d97706", fontSize: "1.05rem" }}>
                    {report.grand_totals?.pending_lrs || 0}
                  </td>
                  <td className="text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Day-by-Day Matrix */}
      <div className="ti-card" style={{ marginTop: "1.5rem" }}>
        <div className="ti-card-header">
          <h3 className="ti-card-title">
            <span>📅</span> Day-by-Day Daily Matrix — {selectedMonth}
          </h3>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Shows complete daily progression across the month
          </span>
        </div>
        <div className="ti-card-body" style={{ padding: 0 }}>
          <div className="ti-table-responsive" style={{ maxHeight: "450px" }}>
            <table className="ti-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th className="text-right">Invoices</th>
                  <th className="text-right">Branch Total (₹)</th>
                  <th className="text-right">Pending LRs</th>
                  <th className="text-right">Direct Income (₹)</th>
                  <th className="text-right">Sundry Debtors (₹)</th>
                  <th className="text-right">Day Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {report.days?.map((d) => (
                  <tr
                    key={d.date}
                    style={{
                      background: d.hasData ? "#ffffff" : "#fcfcfd",
                      opacity: d.hasData ? 1 : 0.65
                    }}
                  >
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{d.date}</td>
                    <td style={{ color: d.dayOfWeek === "Sun" ? "#dc2626" : "#64748b", fontWeight: d.dayOfWeek === "Sun" ? 700 : 500 }}>
                      {d.dayOfWeek}
                    </td>
                    <td className="text-right" style={{ fontFamily: "monospace" }}>{d.total_count}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>{formatINR(d.total_amount)}</td>
                    <td className="text-right" style={{ color: d.total_pending > 0 ? "#b45309" : "#64748b" }}>
                      {d.total_pending}
                    </td>
                    <td className="text-right" style={{ color: "#059669" }}>{formatINR(d.direct_income)}</td>
                    <td className="text-right" style={{ color: "#4f46e5" }}>{formatINR(d.sundry_total)}</td>
                    <td className="text-right" style={{ fontWeight: 700, color: "#0f172a" }}>
                      {formatINR(d.total_amount + d.direct_income)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

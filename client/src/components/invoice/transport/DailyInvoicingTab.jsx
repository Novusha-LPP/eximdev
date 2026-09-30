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

export default function DailyInvoicingTab({ activeUserId, onOpenDailyModal }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [branches, setBranches] = useState(() =>
    BRANCH_LIST.map((b) => ({ branch: b, invoice_count: 0, invoice_amount: 0, pending_lrs: 0 }))
  );
  const [sundryDebtors, setSundryDebtors] = useState([]);
  const [directIncome, setDirectIncome] = useState(0);

  // History list of previous days
  const [historyDocs, setHistoryDocs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadDailyData = async (dateStr) => {
    setLoading(true);
    try {
      let url = `${process.env.REACT_APP_API_STRING}/transport-invoicing/daily?date=${dateStr}`;
      if (activeUserId) url += `&userId=${activeUserId}`;
      const res = await axios.get(url, { withCredentials: true });

      if (res.data?.success) {
        setBranches(
          BRANCH_LIST.map((bName) => {
            const found = (res.data.branches || []).find((x) => x.branch === bName);
            return found
              ? {
                  branch: bName,
                  invoice_count: found.invoice_count || 0,
                  invoice_amount: found.invoice_amount || 0,
                  pending_lrs: found.pending_lrs || 0
                }
              : { branch: bName, invoice_count: 0, invoice_amount: 0, pending_lrs: 0 };
          })
        );
        setSundryDebtors(res.data.sundry_debtors || []);
        setDirectIncome(res.data.direct_income || 0);
      }
    } catch (err) {
      console.error("Failed to load date data:", err);
      toast.error(err.response?.data?.message || "Failed to load records for date");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      let url = `${process.env.REACT_APP_API_STRING}/transport-invoicing/branches?limit=100`;
      if (activeUserId) url += `&userId=${activeUserId}`;
      const res = await axios.get(url, { withCredentials: true });
      if (res.data?.success) {
        setHistoryDocs(res.data.docs || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadDailyData(selectedDate);
    loadHistory();
  }, [selectedDate, activeUserId]);

  const handleBranchChange = (index, field, value) => {
    const val = value === "" ? "" : Math.max(0, Number(value));
    setBranches((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const totalCount = branches.reduce((sum, b) => sum + Number(b.invoice_count || 0), 0);
  const totalAmount = branches.reduce((sum, b) => sum + Number(b.invoice_amount || 0), 0);
  const totalPending = branches.reduce((sum, b) => sum + Number(b.pending_lrs || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date: selectedDate,
        branches: branches.map((b) => ({
          branch: b.branch,
          invoice_count: Number(b.invoice_count || 0),
          invoice_amount: Number(b.invoice_amount || 0),
          pending_lrs: Number(b.pending_lrs || 0)
        })),
        sundry_debtors: sundryDebtors,
        direct_income: directIncome,
        userId: activeUserId
      };

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/transport-invoicing/daily`,
        payload,
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message || "Daily entries updated successfully!");
        loadDailyData(selectedDate);
        loadHistory();
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to update daily entries.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ti-daily-invoicing">
      {/* Date Header & Action Bar */}
      <div className="ti-filter-bar">
        <div className="ti-filter-group">
          <span style={{ fontWeight: 700, color: "#334155" }}>Select Entry Date:</span>
          <input
            type="date"
            className="ti-input"
            style={{ width: "auto", fontWeight: 700 }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {loading && (
            <span style={{ fontSize: "0.82rem", color: "#4f46e5", fontWeight: 600 }}>
              ⏳ Loading...
            </span>
          )}
        </div>

        <div className="ti-filter-group">
          <button
            type="button"
            className="ti-btn ti-btn-secondary"
            onClick={onOpenDailyModal}
          >
            ⚡ Open Full Entry Form
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>

      {/* 7 Branches Daily Table */}
      <div className="ti-card">
        <div className="ti-card-header">
          <h3 className="ti-card-title">
            <span>📅</span> Branch-wise Daily Invoicing for {selectedDate}
          </h3>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            All 7 Transport Branches are pre-listed. Edit counts or amounts directly.
          </span>
        </div>
        <div className="ti-card-body" style={{ padding: 0 }}>
          <div className="ti-table-responsive">
            <table className="ti-table">
              <thead>
                <tr>
                  <th style={{ width: "240px" }}>Branch</th>
                  <th style={{ width: "160px" }} className="text-right">
                    Invoice Count
                  </th>
                  <th style={{ width: "240px" }} className="text-right">
                    Invoice Amount (₹)
                  </th>
                  <th style={{ width: "160px" }} className="text-right">
                    Pending LRs
                  </th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b, idx) => (
                  <tr key={b.branch}>
                    <td style={{ fontWeight: 600, color: "#0f172a" }}>{b.branch}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="ti-input text-right"
                        value={b.invoice_count}
                        onChange={(e) => handleBranchChange(idx, "invoice_count", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="ti-input text-right"
                        value={b.invoice_amount}
                        onChange={(e) => handleBranchChange(idx, "invoice_amount", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="ti-input text-right"
                        value={b.pending_lrs}
                        onChange={(e) => handleBranchChange(idx, "pending_lrs", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>TOTAL (AUTO)</td>
                  <td className="text-right" style={{ fontFamily: "monospace", fontSize: "1.05rem" }}>
                    {totalCount}
                  </td>
                  <td className="text-right" style={{ color: "#059669", fontSize: "1.05rem" }}>
                    {formatINR(totalAmount)}
                  </td>
                  <td className="text-right" style={{ color: "#d97706", fontSize: "1.05rem" }}>
                    {totalPending}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Recent History Table */}
      <div className="ti-card" style={{ marginTop: "1.5rem" }}>
        <div className="ti-card-header">
          <h3 className="ti-card-title">
            <span>📜</span> Recent Branch Entries Log
          </h3>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Showing latest records entered in database
          </span>
        </div>
        <div className="ti-card-body" style={{ padding: 0 }}>
          <div className="ti-table-responsive" style={{ maxHeight: "360px", overflowY: "auto" }}>
            <table className="ti-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Branch</th>
                  <th className="text-right">Invoice Count</th>
                  <th className="text-right">Invoice Amount (₹)</th>
                  <th className="text-right">Pending LRs</th>
                  <th>Updated By</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
                      Loading entries...
                    </td>
                  </tr>
                ) : historyDocs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                      No entries found yet. Use the table above or full entry form to add daily entries.
                    </td>
                  </tr>
                ) : (
                  historyDocs.map((doc) => (
                    <tr key={doc._id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{doc.date}</td>
                      <td style={{ fontWeight: 600 }}>{doc.branch}</td>
                      <td className="text-right" style={{ fontFamily: "monospace" }}>{doc.invoice_count}</td>
                      <td className="text-right" style={{ fontWeight: 700 }}>{formatINR(doc.invoice_amount)}</td>
                      <td className="text-right" style={{ color: doc.pending_lrs > 0 ? "#b45309" : "#64748b", fontWeight: doc.pending_lrs > 0 ? 700 : 500 }}>
                        {doc.pending_lrs}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{doc.updated_by || doc.created_by || "Ayan"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

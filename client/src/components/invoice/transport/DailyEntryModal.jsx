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

const SUNDRY_LIST = [
  "Direct Party",
  "Suraj Forwarders Pvt. Ltd.",
  "Additional Transporter"
];

const formatINR = (val) => {
  const num = Number(val || 0);
  return `₹ ${num.toLocaleString("en-IN")}`;
};

export default function DailyEntryModal({
  isOpen,
  onClose,
  initialDate,
  activeUserId,
  onSuccess
}) {
  const [date, setDate] = useState(() => initialDate || new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [branches, setBranches] = useState(() =>
    BRANCH_LIST.map((b) => ({ branch: b, invoice_count: 0, invoice_amount: 0, pending_lrs: 0 }))
  );

  const [sundryDebtors, setSundryDebtors] = useState(() =>
    SUNDRY_LIST.map((s) => ({ particulars: s, amount: 0 }))
  );

  const [directIncome, setDirectIncome] = useState(0);

  // Load existing data for the selected date
  const loadDateData = async (targetDate) => {
    setLoading(true);
    try {
      let url = `${process.env.REACT_APP_API_STRING}/transport-invoicing/daily?date=${targetDate}`;
      if (activeUserId) url += `&userId=${activeUserId}`;

      const res = await axios.get(url, { withCredentials: true });
      if (res.data?.success) {
        if (res.data.branches?.length) {
          setBranches(
            BRANCH_LIST.map((bName) => {
              const found = res.data.branches.find((x) => x.branch === bName);
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
        }
        if (res.data.sundry_debtors?.length) {
          setSundryDebtors(
            SUNDRY_LIST.map((pName) => {
              const found = res.data.sundry_debtors.find((x) => x.particulars === pName);
              return found
                ? { particulars: pName, amount: found.amount || 0 }
                : { particulars: pName, amount: 0 };
            })
          );
        }
        setDirectIncome(res.data.direct_income || 0);
      }
    } catch (err) {
      console.error("Failed to load daily entry data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const d = initialDate || new Date().toISOString().split("T")[0];
      setDate(d);
      loadDateData(d);
    }
  }, [isOpen, initialDate, activeUserId]);

  const handleBranchChange = (index, field, value) => {
    const val = value === "" ? "" : Math.max(0, Number(value));
    setBranches((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSundryChange = (index, value) => {
    const val = value === "" ? "" : Math.max(0, Number(value));
    setSundryDebtors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], amount: val };
      return next;
    });
  };

  // Section 4: Daily Automatic Calculations
  const totalCount = branches.reduce((sum, b) => sum + Number(b.invoice_count || 0), 0);
  const totalAmount = branches.reduce((sum, b) => sum + Number(b.invoice_amount || 0), 0);
  const totalPending = branches.reduce((sum, b) => sum + Number(b.pending_lrs || 0), 0);
  const totalSundry = sundryDebtors.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      toast.error("Please select a date.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        branches: branches.map((b) => ({
          branch: b.branch,
          invoice_count: Number(b.invoice_count || 0),
          invoice_amount: Number(b.invoice_amount || 0),
          pending_lrs: Number(b.pending_lrs || 0)
        })),
        sundry_debtors: sundryDebtors.map((s) => ({
          particulars: s.particulars,
          amount: Number(s.amount || 0)
        })),
        direct_income: Number(directIncome || 0),
        userId: activeUserId
      };

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/transport-invoicing/daily`,
        payload,
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message || "Daily invoicing saved successfully!");
        if (onSuccess) onSuccess(date);
        onClose();
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save daily entry.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "850px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
              ⚡ Daily Transport Invoicing Entry
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
              Unified entry for 7 branches, Sundry Debtors & Direct Income
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#ffffff",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "1.5rem" }}>
          {/* Step 1: Select Date */}
          <div
            style={{
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <label style={{ fontWeight: 700, fontSize: "0.9rem", color: "#334155" }}>
                1. Entry Date:
              </label>
              <input
                type="date"
                className="ti-input"
                style={{ width: "180px", fontWeight: 700 }}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  loadDateData(e.target.value);
                }}
                required
              />
            </div>
            {loading && (
              <span style={{ fontSize: "0.82rem", color: "#4f46e5", fontWeight: 600 }}>
                ⏳ Loading saved records for date...
              </span>
            )}
          </div>

          {/* Step 2-4: 7 Branches Table */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h4
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              🏢 Branch-wise Invoicing (7 Transport Branches)
            </h4>
            <div className="ti-table-responsive" style={{ border: "1px solid #e2e8f0", borderRadius: "10px" }}>
              <table className="ti-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th style={{ width: "140px" }} className="text-right">
                      Invoice Count
                    </th>
                    <th style={{ width: "200px" }} className="text-right">
                      Invoice Amount (₹)
                    </th>
                    <th style={{ width: "140px" }} className="text-right">
                      Pending LRs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b, idx) => (
                    <tr key={b.branch}>
                      <td style={{ fontWeight: 600, color: "#1e293b" }}>{b.branch}</td>
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
                    <td className="text-right" style={{ fontFamily: "monospace", fontSize: "1rem" }}>
                      {totalCount}
                    </td>
                    <td className="text-right" style={{ color: "#059669", fontSize: "1rem" }}>
                      {formatINR(totalAmount)}
                    </td>
                    <td className="text-right" style={{ color: "#d97706", fontSize: "1rem" }}>
                      {totalPending}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Step 5 & 6: Sundry Debtors & Direct Income */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.25rem", marginBottom: "1rem" }}>
            {/* Sundry Debtors */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem", background: "#f8fafc" }}>
              <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.75rem" }}>
                👥 5. Sundry Debtors (3 Heads)
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {sundryDebtors.map((sd, idx) => (
                  <div key={sd.particulars} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                      {sd.particulars}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="ti-input text-right"
                      style={{ width: "160px" }}
                      value={sd.amount}
                      onChange={(e) => handleSundryChange(idx, e.target.value)}
                    />
                  </div>
                ))}
                <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span style={{ fontSize: "0.85rem", color: "#4f46e5" }}>TOTAL SUNDRY:</span>
                  <span style={{ color: "#4f46e5" }}>{formatINR(totalSundry)}</span>
                </div>
              </div>
            </div>

            {/* Direct Income */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem", background: "#f8fafc", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem" }}>
                  📈 6. Direct Income
                </h4>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 1rem" }}>
                  Single total amount for this date
                </p>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "0.35rem" }}>
                  Direct Income Total Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="ti-input text-right"
                  value={directIncome}
                  onChange={(e) => setDirectIncome(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                />
              </div>

              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "0.6rem 0.85rem", borderRadius: "8px", marginTop: "1rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>
                  Day Revenue Total
                </span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#047857" }}>
                  {formatINR(totalAmount + Number(directIncome || 0))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "0.75rem",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "1.25rem",
              marginTop: "1rem"
            }}
          >
            <button
              type="button"
              className="ti-btn ti-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ti-btn ti-btn-primary"
              disabled={saving}
              style={{ minWidth: "140px", justifyContent: "center" }}
            >
              {saving ? "Saving..." : "💾 Save Daily Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

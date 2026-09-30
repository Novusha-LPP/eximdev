import React, { useState } from "react";
import toast from "react-hot-toast";

const formatINR = (val) => {
  const num = Number(val || 0);
  return `₹ ${num.toLocaleString("en-IN")}`;
};

export default function ShareModal({
  isOpen,
  onClose,
  reportData,
  currentDate,
  username
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalInvoices = reportData?.kpi?.total_invoice_count || reportData?.grand_totals?.invoice_count || 0;
  const totalAmount = reportData?.kpi?.total_invoice_amount || reportData?.grand_totals?.invoice_amount || 0;
  const totalPending = reportData?.kpi?.total_pending_lrs || reportData?.grand_totals?.pending_lrs || 0;
  const directIncome = reportData?.kpi?.direct_income_total || reportData?.grand_totals?.direct_income || 0;
  const sundryTotal = reportData?.kpi?.total_sundry_debtors || reportData?.grand_totals?.sundry_debtors || 0;
  const branchList = reportData?.branches || [];

  const shareText = `🚚 *AlVision — Transport Invoicing Summary*
📅 *Period/Date:* ${currentDate || "Current Period"}
👤 *Reported By:* ${username || "Ayan"}

📊 *Key Performance Indicators:*
• *Total Invoices:* ${totalInvoices}
• *Total Invoiced Amount:* ${formatINR(totalAmount)}
• *Total Pending LRs:* ${totalPending}
• *Direct Income Total:* ${formatINR(directIncome)}
• *Total Sundry Debtors:* ${formatINR(sundryTotal)}
• *Total Revenue:* ${formatINR(totalAmount + directIncome)}

🏢 *Branch Breakdown:*
${branchList.map((b) => `• ${b.branch}: ${formatINR(b.invoice_amount)} (${b.invoice_count} inv, ${b.pending_lrs} pending LRs)`).join("\n")}

_Generated via AlVision Transport Invoicing Module_`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success("Summary copied to clipboard! Ready to paste into WhatsApp/Email.");
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
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
          maxWidth: "600px",
          maxHeight: "90vh",
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
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
              🔗 Share Transport Invoicing Report
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
              Quick copy for WhatsApp, Email, or Print
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
              fontSize: "1.1rem"
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "0.5rem" }}>
            WhatsApp / Email Formatted Preview:
          </label>
          <textarea
            readOnly
            value={shareText}
            style={{
              width: "100%",
              height: "260px",
              padding: "0.85rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              lineHeight: "1.5",
              color: "#1e293b",
              resize: "none"
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <button
            type="button"
            className="ti-btn ti-btn-secondary"
            onClick={handlePrint}
          >
            🖨️ Print
          </button>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              className="ti-btn ti-btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-primary"
              onClick={handleCopy}
            >
              {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

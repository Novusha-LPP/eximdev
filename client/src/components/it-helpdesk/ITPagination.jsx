import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ITPagination({
  page = 1,
  totalPages = 1,
  totalRecords,
  limit = 10,
  onPageChange,
  onLimitChange,
  limits = [10, 15, 25, 50],
}) {
  const calculatedTotalPages = Math.max(
    1,
    totalPages || (totalRecords ? Math.ceil(totalRecords / limit) : 1)
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: "1px solid #e2e8f0",
        padding: "10px 16px",
        background: "#fafbfc",
        userSelect: "none",
        flexWrap: "nowrap",
        gap: "16px",
        boxSizing: "border-box",
        width: "100%",
      }}
      className="it-pagination-container"
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          height: "32px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500, lineHeight: 1 }}>
          Show
        </span>
        <select
          value={limit}
          onChange={(e) => {
            if (onLimitChange) onLimitChange(Number(e.target.value));
          }}
          style={{
            height: "32px",
            padding: "0 8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            fontSize: "13px",
            fontWeight: 600,
            color: "#0f172a",
            cursor: "pointer",
            outline: "none",
            boxSizing: "border-box",
          }}
        >
          {limits.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500, lineHeight: 1 }}>
          entries per page
        </span>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          height: "32px",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          style={{
            height: "32px",
            padding: "0 12px",
            fontSize: "12.5px",
            fontWeight: 600,
            opacity: page <= 1 ? 0.45 : 1,
            cursor: page <= 1 ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: page <= 1 ? "#94a3b8" : "#334155",
            borderRadius: "6px",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
            outline: "none",
            boxSizing: "border-box",
            margin: 0,
            lineHeight: 1,
            verticalAlign: "middle",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (page > 1) {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.borderColor = "#94a3b8";
              e.currentTarget.style.color = "#0f172a";
            }
          }}
          onMouseLeave={(e) => {
            if (page > 1) {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.color = "#334155";
            }
          }}
        >
          <ChevronLeft size={14} style={{ display: "inline-block", flexShrink: 0 }} />
          <span style={{ lineHeight: 1 }}>Prev</span>
        </button>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "32px",
            fontSize: "13px",
            color: "#475569",
            fontWeight: 500,
            padding: "0 6px",
            margin: 0,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          Page{" "}
          <strong style={{ color: "#0f172a", fontWeight: 700, margin: "0 4px" }}>
            {page}
          </strong>{" "}
          of{" "}
          <strong style={{ color: "#0f172a", fontWeight: 700, margin: "0 4px" }}>
            {calculatedTotalPages}
          </strong>
        </span>

        <button
          type="button"
          onClick={() =>
            onPageChange && onPageChange(Math.min(calculatedTotalPages, page + 1))
          }
          disabled={page >= calculatedTotalPages}
          style={{
            height: "32px",
            padding: "0 12px",
            fontSize: "12.5px",
            fontWeight: 600,
            opacity: page >= calculatedTotalPages ? 0.45 : 1,
            cursor: page >= calculatedTotalPages ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: page >= calculatedTotalPages ? "#94a3b8" : "#334155",
            borderRadius: "6px",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
            outline: "none",
            boxSizing: "border-box",
            margin: 0,
            lineHeight: 1,
            verticalAlign: "middle",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (page < calculatedTotalPages) {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.borderColor = "#94a3b8";
              e.currentTarget.style.color = "#0f172a";
            }
          }}
          onMouseLeave={(e) => {
            if (page < calculatedTotalPages) {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.color = "#334155";
            }
          }}
        >
          <span style={{ lineHeight: 1 }}>Next</span>
          <ChevronRight size={14} style={{ display: "inline-block", flexShrink: 0 }} />
        </button>
      </div>
    </div>
  );
}

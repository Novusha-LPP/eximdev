import React from "react";
import {
  Box,
  Typography,
  Chip,
  Divider,
} from "@mui/material";
import PoLandscapePdfGenerator from "./PoLandscapePdfGenerator";

function Stage3FinanceApproval({ data, onChange, globalData, onGlobalChange }) {
  const isApproved =
    data.decision?.decision === "APPROVED" ||
    globalData?.status === "Finance Approved" ||
    globalData?.status === "Payment Done" ||
    globalData?.status === "Order Placed" ||
    globalData?.status === "GRN Done" ||
    globalData?.status === "Closed";

  const approvalDate = data.signOff?.dateOfApproval
    ? data.signOff.dateOfApproval.split("T")[0]
    : "";
  const approvalTime = data.signOff?.timeOfApproval || "";

  // Fetch all selected suppliers from Stage 2 (or fallback to Stage 3 / L1)
  const stage2Selected = globalData?.stage2?.selectedSuppliers;
  const selectedSuppliers =
    stage2Selected && stage2Selected.length > 0
      ? stage2Selected
      : [
          {
            selectedSupplier: data.selectedSupplierL1 || globalData?.stage2?.selectedSupplierL1 || "",
            priceQuoted: globalData?.stage2?.l1PriceQuoted || 0,
            totalOrderValue: data.totalOrderValue || globalData?.stage2?.totalOrderValue || 0,
            reasonForSelection: globalData?.stage2?.reasonForSelection || "",
          },
        ];

  const overallTotalOrderValue = selectedSuppliers.reduce(
    (acc, item) => acc + (Number(item.totalOrderValue) || 0),
    0
  );

  const handleToggleApproval = (checked) => {
    if (checked) {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const timeStr = now.toLocaleTimeString("en-GB", { hour12: false });

      onChange({
        ...data,
        selectedSupplierL1: selectedSuppliers[0]?.selectedSupplier || "",
        totalOrderValue: overallTotalOrderValue,
        decision: {
          ...(data.decision || {}),
          decision: "APPROVED",
        },
        signOff: {
          ...(data.signOff || {}),
          dateOfApproval: today,
          timeOfApproval: timeStr,
        },
      });

      if (onGlobalChange) {
        onGlobalChange("status", "Finance Approved");
      }
    } else {
      onChange({
        ...data,
        decision: {
          ...(data.decision || {}),
          decision: "Pending",
        },
        signOff: {
          ...(data.signOff || {}),
          dateOfApproval: "",
          timeOfApproval: "",
        },
      });

      if (onGlobalChange) {
        onGlobalChange("status", "Quotation Received");
      }
    }
  };

  return (
    <Box className="sop-container">
      {/* ─── A. Reference Information ─── */}
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography className="sop-card-title">Reference Details</Typography>
          <PoLandscapePdfGenerator globalData={globalData} stage3Data={data} />
        </Box>
        <Box className="sop-grid-4">
          <Box>
            <label className="sop-label">PO NUMBER</label>
            {(() => {
              const allPos = Array.from(
                new Set(
                  (selectedSuppliers || [])
                    .map((s) => s.poNumber)
                    .filter(Boolean)
                )
              );
              const poDisplay =
                allPos.length > 0
                  ? allPos.join(", ")
                  : (globalData?.poNumber || data.poNumber || "-");
              return (
                <input
                  type="text"
                  className="sop-input readonly"
                  readOnly
                  value={poDisplay}
                  style={{ fontWeight: 600, color: "#1d4ed8" }}
                />
              );
            })()}
          </Box>
          <Box>
            <label className="sop-label">PO DATE</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={
                data.poDate || globalData?.stage2?.poDate
                  ? new Date(data.poDate || globalData?.stage2?.poDate).toLocaleDateString("en-GB")
                  : "-"
              }
            />
          </Box>
          <Box>
            <label className="sop-label">PURCHASE OFFICER NAME</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={data.purchaseOfficerName || globalData?.stage2?.purchaseOfficerName || "-"}
            />
          </Box>
          <Box>
            <label className="sop-label">DATE RECEIVED BY FINANCE</label>
            <input
              type="text"
              className="sop-input readonly"
              readOnly
              value={
                data.dateReceivedByFinance || globalData?.stage2?.routingChecklist?.[0]?.date
                  ? new Date(data.dateReceivedByFinance || globalData?.stage2?.routingChecklist?.[0]?.date).toLocaleDateString("en-GB")
                  : "-"
              }
            />
          </Box>
        </Box>
      </Box>

      {/* ─── B. Awarded / Selected Supplier(s) Summary ─── */}
      <Box className="sop-card" sx={{ mb: 1.5 }}>
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Awarded / Selected Supplier(s) Summary
        </Typography>
        <Box className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "center" }}>#</th>
                <th>Selected Supplier</th>
                <th style={{ width: 140 }}>PO Number</th>
                <th style={{ textAlign: "right", width: 140 }}>Price Quoted (₹)</th>
                <th style={{ textAlign: "right", width: 160 }}>Total Order Value (₹)</th>
                <th>Reason for Selection</th>
                <th style={{ width: 120, textAlign: "center" }}>Download PO</th>
              </tr>
            </thead>
            <tbody>
              {selectedSuppliers.map((sup, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600, color: "#1d4ed8" }}>
                    {sup.selectedSupplier || "Not Specified"}
                  </td>
                  <td style={{ fontWeight: 600, color: "#047857" }}>
                    {sup.poNumber || globalData?.poNumber || "-"}
                  </td>
                  <td style={{ textAlign: "right" }}>₹{(Number(sup.priceQuoted) || 0).toLocaleString("en-IN")}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                    ₹{(Number(sup.totalOrderValue) || 0).toLocaleString("en-IN")}
                  </td>
                  <td>{sup.reasonForSelection || "N/A"}</td>
                  <td style={{ textAlign: "center" }}>
                    <PoLandscapePdfGenerator
                      globalData={globalData}
                      stage3Data={data}
                      targetSupplier={sup}
                      buttonLabel="PO PDF"
                      size="small"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        <Box className="sop-total-strip" sx={{ mt: 1 }}>
          <span>OVERALL TOTAL ORDER VALUE:</span>
          <strong>₹{overallTotalOrderValue.toLocaleString("en-IN")}</strong>
        </Box>
      </Box>

      {/* ─── C. Finance Approval Checklist ─── */}
      <Box className="sop-card">
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Finance Approval Checklist
        </Typography>
        <Box className="sop-table-container">
          <table className="sop-table">
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: "center" }}>Check</th>
                <th style={{ width: 80 }}>Step</th>
                <th>Action</th>
                <th style={{ width: 150 }}>Responsible</th>
                <th style={{ width: 130 }}>Date Completed</th>
                <th style={{ width: 120 }}>Time Completed</th>
                <th style={{ width: 110, textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isApproved}
                    onChange={(e) => handleToggleApproval(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#2563eb" }}
                  />
                </td>
                <td style={{ fontWeight: 600 }}>Step 1</td>
                <td style={{ fontWeight: 600, color: "#1e3a8a" }}>Approved by Finance Manager</td>
                <td>Finance Manager</td>
                <td>{approvalDate || "-"}</td>
                <td>{approvalTime || "-"}</td>
                <td style={{ textAlign: "center" }}>
                  <Chip
                    label={isApproved ? "Approved" : "Pending"}
                    color={isApproved ? "success" : "default"}
                    size="small"
                    sx={{ height: 20, fontSize: "10.5px", fontWeight: 700 }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </Box>
        <Typography variant="caption" sx={{ color: "#64748b", mt: 1, display: "block", fontSize: "11px" }}>
          * Checking the approval box automatically records approval date & time and forwards the entry to Stage 4 (Payment & UTR).
        </Typography>
      </Box>
    </Box>
  );
}

export default React.memo(Stage3FinanceApproval);

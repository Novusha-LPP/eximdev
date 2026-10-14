import React from "react";
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from "@mui/material";
import { CalendarToday } from "@mui/icons-material";

function Stage3FinanceApproval({ formData, handleChange }) {
  const expStr = formData.policyToDate || formData.newPolicyToDate;
  const expDate = expStr ? new Date(expStr) : null;
  const now = new Date();
  const diffDays = expDate ? Math.ceil((expDate - now) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = diffDays !== null && diffDays < 0;
  const isUrgent = diffDays !== null && diffDays >= 0 && diffDays <= 7;

  const totalPremium = Number(
    formData.newTotalPolicyPremium ||
    formData.newPremiumAmount ||
    formData.newPremium ||
    formData.totalPolicyPremium ||
    formData.premiumAmount ||
    0
  );

  return (
    <Box className="sop-container">
      {/* ─── HIGHLIGHTED EXPIRY DATE BANNER ─── */}
      <Box
        sx={{
          background: isExpired
            ? "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"
            : isUrgent
              ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
              : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
          border: isExpired
            ? "2px solid #dc2626"
            : isUrgent
              ? "2px solid #d97706"
              : "2px solid #2563eb",
          borderRadius: "10px",
          p: "12px 18px",
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          boxShadow: isExpired
            ? "0 4px 12px rgba(220, 38, 38, 0.15)"
            : "0 4px 12px rgba(37, 99, 235, 0.12)"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              bgcolor: isExpired ? "#dc2626" : isUrgent ? "#d97706" : "#2563eb",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
            }}
          >
            <CalendarToday sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: "11px",
                fontWeight: 900,
                color: isExpired ? "#991b1b" : isUrgent ? "#92400e" : "#1e40af",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              ⚠️ POLICY EXPIRY DATE (HIGHLIGHTED)
            </Typography>
            <Typography
              sx={{
                fontSize: "18px",
                fontWeight: 900,
                color: isExpired ? "#b91c1c" : isUrgent ? "#b45309" : "#1d4ed8",
                letterSpacing: "-0.01em"
              }}
            >
              {expDate ? expDate.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "Date Not Available"}
            </Typography>
          </Box>
        </Box>

        <Chip
          label={
            isExpired
              ? `⚠️ EXPIRED ${Math.abs(diffDays)} DAYS AGO`
              : diffDays === 0
                ? "🔥 EXPIRES TODAY!"
                : `⏳ EXPIRES IN ${diffDays} DAYS`
          }
          sx={{
            fontWeight: 800,
            fontSize: "12px",
            height: 32,
            px: 1.5,
            bgcolor: isExpired ? "#dc2626" : isUrgent ? "#ea580c" : "#2563eb",
            color: "#fff",
            borderRadius: "6px",
          }}
        />
      </Box>

      {/* ─── 3. PROPOSED RENEWED POLICY & PREMIUM BREAKDOWN TABLE ─── */}
      <Paper elevation={0} sx={{ borderRadius: "8px", border: "1px solid #cbd5e1", overflow: "hidden", mb: 2 }}>
        <Box sx={{
          bgcolor: "#f1f5f9",
          px: 2,
          py: 1.2,
          borderBottom: "1px solid #cbd5e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <Typography sx={{ fontWeight: 800, color: "#1e40af", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            3. Proposed Renewed Policy & Premium Breakdown
          </Typography>
          <Typography sx={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>
            Itemized breakdown for Finance Approval
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: "#0f172a" }}>
              <TableRow>
                <TableCell sx={{ color: "#ffffff !important", fontWeight: 700, fontSize: "11.5px", py: 1 }}>Component / Coverage Description</TableCell>
                <TableCell sx={{ color: "#ffffff !important", fontWeight: 700, fontSize: "11.5px", py: 1, textAlign: "right" }}>Proposed Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 600, color: "#334155", fontSize: "12px" }}>New Insurance Company</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#1e40af", fontSize: "12.5px", textAlign: "right" }}>
                  {formData.newInsuranceCompany || formData.insuranceCompany || "-"}
                </TableCell>
              </TableRow>
              <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: 600, color: "#334155", fontSize: "12px" }}>Proposed Renewal Period</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "12px", textAlign: "right" }}>
                  {formData.newPolicyFromDate ? new Date(formData.newPolicyFromDate).toLocaleDateString("en-IN") : "-"} to{" "}
                  <span style={{ color: "#dc2626", fontWeight: 800, background: "#fee2e2", padding: "1px 6px", borderRadius: "4px" }}>
                    {formData.newPolicyToDate ? new Date(formData.newPolicyToDate).toLocaleDateString("en-IN") : "-"}
                  </span>
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ fontWeight: 600, color: "#334155", fontSize: "12px" }}>New Basic IDV (₹)</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "12px", textAlign: "right" }}>
                  ₹ {Number(formData.newIdv || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: "12px" }}>New Total IDV (₹)</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#0f172a", fontSize: "12.5px", textAlign: "right" }}>
                  ₹ {Number(formData.newTotalIdv || formData.totalIdv || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              {/* Own Damage Breakdown */}
              <TableRow sx={{ bgcolor: "#eff6ff" }}>
                <TableCell colSpan={2} sx={{ fontWeight: 800, color: "#1e40af", fontSize: "11.5px", py: 0.6, textTransform: "uppercase" }}>
                  Own Damage (OD) Breakdown
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New OD Premium</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600 }}>
                  ₹ {Number(formData.newOdPremium || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New IMT 23</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600 }}>
                  ₹ {Number(formData.newImt23 || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New IMT 24</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600 }}>
                  ₹ {Number(formData.newImt24 || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New IMT 25</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600 }}>
                  ₹ {Number(formData.newImt25 || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New NCB Amount (₹)</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600, color: "#16a34a" }}>
                  - ₹ {Number(formData.newNcbAmount || formData.newNcb || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover sx={{ bgcolor: "#f1f5f9" }}>
                <TableCell sx={{ pl: 3, fontWeight: 700, fontSize: "12px", color: "#0f172a" }}>= New Total OD Premium</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: "12.5px", textAlign: "right", color: "#0f172a" }}>
                  ₹ {Number(formData.newTotalOdPremium || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>

              {/* Additional Covers */}
              <TableRow sx={{ bgcolor: "#eff6ff" }}>
                <TableCell colSpan={2} sx={{ fontWeight: 800, color: "#1e40af", fontSize: "11.5px", py: 0.6, textTransform: "uppercase" }}>
                  Additional Covers & Taxes
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New IMT 17</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600 }}>
                  ₹ {Number(formData.newImt17 || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New IMT 252</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600 }}>
                  ₹ {Number(formData.newImt252 || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New IMT 28 / IMT 29</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600 }}>
                  ₹ {Number(formData.newImt28 || formData.newImt29 || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New Liability Premium</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600 }}>
                  ₹ {Number(formData.newLiabilityPremium || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell sx={{ pl: 3, fontSize: "12px", color: "#475569" }}>• New GST 18%</TableCell>
                <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 600 }}>
                  ₹ {Number(formData.newTotalGst || 0).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>

              {/* Grand Total Row */}
              <TableRow sx={{ bgcolor: "#ecfdf5", borderTop: "2px solid #10b981" }}>
                <TableCell sx={{ fontWeight: 900, fontSize: "13px", color: "#065f46", py: 1.2 }}>
                  RENEWED TOTAL POLICY PREMIUM
                </TableCell>
                <TableCell sx={{ textAlign: "right", fontWeight: 900, fontSize: "16px", color: "#047857", py: 1.2 }}>
                  ₹ {totalPremium.toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Decision Card */}
      <Box className="sop-card">
        <Typography className="sop-card-title" sx={{ mb: 1 }}>
          Finance Manager Decision
        </Typography>
        <Box className="sop-grid-2">
          <Box>
            <label className="sop-label">APPROVAL STATUS</label>
            <select
              className="sop-select"
              value={formData.financialApprovalStatus === "Draft" || !formData.financialApprovalStatus ? "Pending" : formData.financialApprovalStatus}
              onChange={(e) => handleChange("financialApprovalStatus", e.target.value)}
              style={{
                fontWeight: 700,
                color: formData.financialApprovalStatus === "Approved" ? "#166534" : formData.financialApprovalStatus === "Rejected" ? "#dc2626" : "#b45309",
              }}
            >
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </Box>
          {formData.financialApprovalStatus === "Rejected" && (
            <Box>
              <label className="sop-label">REJECTION REASON</label>
              <input
                type="text"
                className="sop-input"
                placeholder="Reason for rejection..."
                value={formData.financialRejectionReason || ""}
                onChange={(e) => handleChange("financialRejectionReason", e.target.value)}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(Stage3FinanceApproval);

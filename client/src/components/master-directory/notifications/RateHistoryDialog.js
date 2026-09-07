import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Paper,
  Divider,
  TextField,
  Alert,
  CircularProgress
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import axios from "axios";

export default function RateHistoryDialog({ open, onClose, notification, section, onResolved }) {
  const [resolving, setResolving] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!notification) return null;

  const API_BASE = process.env.REACT_APP_API_STRING || "";
  const history = notification.rate_history || [];

  const handleResolve = async (actionType) => {
    setResolving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await axios.post(
        `${API_BASE}/notifications/${section}/resolve-variance/${notification._id}`,
        {
          action: actionType,
          remarks
        }
      );

      if (res.data.success) {
        setSuccessMsg("Variance successfully resolved and rate status verified.");
        if (onResolved) onResolved(res.data.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("Error resolving variance:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to resolve variance.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <HistoryIcon sx={{ color: "#2563eb", fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
              Rate History & Version Timeline
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              Notification: <strong>{notification.notn_no}</strong> (Sr: <strong>{notification.notn_sno}</strong>) | Head: <strong>{notification.duty_head}</strong>
            </Typography>
          </Box>
        </Box>
        <Chip
          label={notification.has_rate_variance ? "⚡ Variance Flagged" : "🟢 Verified / Stable"}
          color={notification.has_rate_variance ? "error" : "success"}
          size="small"
          sx={{ fontWeight: 700 }}
        />
      </DialogTitle>

      <DialogContent dividers sx={{ background: "#f8fafc" }}>
        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

        {/* Current Active Rate Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            border: "1.5px solid #3b82f6",
            borderRadius: 2,
            background: "#eff6ff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: "#1d4ed8", fontWeight: 700, textTransform: "uppercase" }}>
              Current Active Rate
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e3a8a", mt: 0.2 }}>
              {notification.current_rate}{notification.unit || "%"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
              Duty Flag: <strong>{notification.current_duty_flag || "Standard"}</strong> | CTH: <strong>{notification.cth_code || "ALL"}</strong>
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
              Used in <strong>{notification.usage_count || 0}</strong> Shipments
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
              Last Used: {notification.last_used_date ? new Date(notification.last_used_date).toLocaleDateString("en-IN") : "N/A"}
            </Typography>
          </Box>
        </Paper>

        {/* Timeline of Past Observed Rates */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#334155", mb: 1.5 }}>
          Chronological Evolution & Observations ({history.length} Record{history.length > 1 ? "s" : ""})
        </Typography>

        {history.length === 0 ? (
          <Typography variant="body2" sx={{ color: "#94a3b8", fontStyle: "italic", p: 2, textAlign: "center" }}>
            No historical records found for this notification.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {history.map((h, idx) => (
              <Paper
                key={idx}
                elevation={0}
                sx={{
                  p: 1.8,
                  border: "1px solid #e2e8f0",
                  borderRadius: 1.5,
                  background: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderLeft: `4px solid ${idx === history.length - 1 ? "#3b82f6" : "#94a3b8"}`
                }}
              >
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
                      {h.rate}{h.unit || "%"}
                    </Typography>
                    {h.duty_flag && (
                      <Chip label={`Flag: ${h.duty_flag}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "11px" }} />
                    )}
                    {idx === history.length - 1 && (
                      <Chip label="Latest Entry" size="small" color="primary" sx={{ height: 20, fontSize: "10px", fontWeight: 700 }} />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.5 }}>
                    Observed on: <strong>{new Date(h.observed_from || Date.now()).toLocaleDateString("en-IN")}</strong>
                    {h.source_job_no && ` • Job: ${h.source_job_no}`}
                    {h.source_boe_no && ` • BOE: ${h.source_boe_no}`}
                  </Typography>
                  {h.remarks && (
                    <Typography variant="caption" sx={{ color: "#0284c7", display: "block", mt: 0.2 }}>
                      Note: {h.remarks}
                    </Typography>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {/* Variance Resolution Section if flagged */}
        {notification.has_rate_variance && (
          <Box sx={{ mt: 3, p: 2, border: "1px dashed #f59e0b", borderRadius: 2, background: "#fffbeb" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <WarningAmberIcon sx={{ color: "#d97706" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#b45309" }}>
                Resolve Rate Variance / Update
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: "#92400e", mb: 1.5, fontSize: "12.5px" }}>
              Multiple different rates have been detected for this notification. If the latest rate ({notification.current_rate}{notification.unit || "%"}) is an official CBIC / Budget amendment, mark it as verified.
            </Typography>

            <TextField
              size="small"
              fullWidth
              label="Resolution Remarks / Gazette Notification Note"
              placeholder="e.g. Rate updated per Budget 2026 Notification 02/2026-Cus"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              sx={{ background: "#ffffff", mb: 1.5 }}
            />

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                variant="contained"
                size="small"
                color="primary"
                disabled={resolving}
                onClick={() => handleResolve("VERIFY_AMENDMENT")}
                startIcon={resolving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Approve & Mark as Verified Amendment
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                disabled={resolving}
                onClick={() => handleResolve("MARK_STABLE")}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Dismiss Variance
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { CheckCircle, HourglassEmpty, Cancel, Visibility, Refresh } from "@mui/icons-material";
import axios from "axios";

const STATUS_CONFIG = {
  Collected: { color: "success", icon: <CheckCircle fontSize="small" /> },
  "In Progress": { color: "warning", icon: <HourglassEmpty fontSize="small" /> },
  "Not Collected": { color: "error", icon: <Cancel fontSize="small" /> },
};

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Not Collected"];
  return (
    <Chip
      icon={cfg.icon}
      label={status}
      color={cfg.color}
      size="small"
      variant="filled"
      sx={{ fontWeight: 600, minWidth: 120 }}
    />
  );
}

/**
 * JobDocRequests – shows requests for a specific job_number
 * Used inside ViewJob's Tracking Tab
 */
function JobDocRequests({ jobNumber }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJobRequests = async () => {
    if (!jobNumber) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/document-requests/job/${jobNumber}`,
        { withCredentials: true }
      );
      setRequests(res.data);
    } catch (err) {
      setError("Failed to load document requests for this job.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobRequests();
    // eslint-disable-next-line
  }, [jobNumber]);

  if (!jobNumber) return null;

  return (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1a237e", display: "flex", alignItems: "center", gap: 1 }}>
          📋 Document Collection Requests
        </Typography>
        <IconButton size="small" onClick={fetchJobRequests} disabled={loading}>
          <Refresh fontSize="small" />
        </IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f5f7fa", borderBottom: "1px solid #e0e0e0" }}>
                {["Type", "Requested By", "Status", "Responsible", "Collected At", "Notes"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#455a64" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "16px", color: "#9e9e9e" }}>
                    No requests found for this job.
                  </td>
                </tr>
              ) : (
                requests.map((r, idx) => (
                  <tr key={r._id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "8px 10px" }}>
                       <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.request_type}</Typography>
                       <Typography variant="caption" color="text.secondary">
                         {new Date(r.requested_at).toLocaleDateString()}
                       </Typography>
                    </td>
                    <td style={{ padding: "8px 10px" }}>{r.requested_by_name || r.requested_by}</td>
                    <td style={{ padding: "8px 10px" }}><StatusChip status={r.status} /></td>
                    <td style={{ padding: "8px 10px" }}>{r.responsible_person || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      {r.collected_at ? new Date(r.collected_at).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {r.notes ? (
                        <Tooltip title={r.notes}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{r.notes}</Typography>
                        </Tooltip>
                      ) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Paper>
      )}
    </Box>
  );
}

export default JobDocRequests;

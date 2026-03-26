import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { CheckCircle, HourglassEmpty, Cancel, Visibility, Refresh } from "@mui/icons-material";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";

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
      sx={{ fontWeight: 600, minWidth: 130 }}
    />
  );
}

function ProofImagesDialog({ open, onClose, images }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Proof Images</DialogTitle>
      <DialogContent>
        {images && images.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, pt: 1 }}>
            {images.map((url, i) => (
              <Box key={i} sx={{ border: "1px solid #ddd", borderRadius: 2, overflow: "hidden" }}>
                <a href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt={`proof-${i}`}
                    style={{ maxWidth: 220, maxHeight: 180, objectFit: "contain", display: "block" }}
                  />
                </a>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary">No proof images uploaded yet.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * MyDocRequests – shown inside Import DSR module for requesters to track their document requests
 */
function MyDocRequests() {
  const { user } = useContext(UserContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proofDialog, setProofDialog] = useState({ open: false, images: [] });

  const fetchMyRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/document-requests/my-requests`,
        {
          withCredentials: true,
          headers: {
            "x-username": user?.username || "",
          },
        }
      );
      setRequests(res.data);
    } catch (err) {
      setError("Failed to load your document requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
    // eslint-disable-next-line
  }, []);

  const summary = {
    total: requests.length,
    collected: requests.filter((r) => r.status === "Collected").length,
    inProgress: requests.filter((r) => r.status === "In Progress").length,
    notCollected: requests.filter((r) => r.status === "Not Collected").length,
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a237e" }}>
          📋 My Document Requests
        </Typography>
        <Button
          startIcon={<Refresh />}
          variant="outlined"
          size="small"
          onClick={fetchMyRequests}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total", value: summary.total, bg: "#e8eaf6", color: "#3f51b5" },
          { label: "Collected", value: summary.collected, bg: "#e8f5e9", color: "#2e7d32" },
          { label: "In Progress", value: summary.inProgress, bg: "#fff3e0", color: "#e65100" },
          { label: "Not Collected", value: summary.notCollected, bg: "#ffebee", color: "#c62828" },
        ].map((s) => (
          <Paper
            key={s.label}
            elevation={0}
            sx={{
              background: s.bg,
              px: 3,
              py: 1.5,
              borderRadius: 2,
              minWidth: 120,
              textAlign: "center",
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, color: s.color }}>
              {s.value}
            </Typography>
            <Typography variant="caption" sx={{ color: s.color, fontWeight: 600 }}>
              {s.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#1a237e", color: "#fff" }}>
                  {[
                    "Sr No",
                    "Job No",
                    "BL No",
                    "Importer",
                    "Request Type",
                    "Requested On",
                    "Responsible Person",
                    "Status",
                    "Collected At",
                    "Proof",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "#888" }}>
                      No document requests found. Check a job in the Jobs tab to request documents.
                    </td>
                  </tr>
                ) : (
                  requests.map((r, idx) => (
                    <tr
                      key={r._id}
                      style={{
                        background: idx % 2 === 0 ? "#f9faff" : "#fff",
                        borderBottom: "1px solid #e8eaf6",
                      }}
                    >
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "#5c6bc0" }}>
                        {r.sr_no || idx + 1}
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.job_number}</td>
                      <td style={{ padding: "8px 12px" }}>{r.bl_no || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.importer_name || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Chip label={r.request_type} size="small" variant="outlined" />
                      </td>
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                        {r.requested_at ? new Date(r.requested_at).toLocaleString("en-IN") : "—"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>{r.responsible_person || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <StatusChip status={r.status} />
                      </td>
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                        {r.collected_at ? new Date(r.collected_at).toLocaleString("en-IN") : "—"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <Tooltip title="View Proof Images">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setProofDialog({ open: true, images: r.proof_image_urls || [] })
                            }
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Box>
        </Paper>
      )}

      <ProofImagesDialog
        open={proofDialog.open}
        onClose={() => setProofDialog({ open: false, images: [] })}
        images={proofDialog.images}
      />
    </Box>
  );
}

export default MyDocRequests;

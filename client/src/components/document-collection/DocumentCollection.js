import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Box,
  Tabs,
  Tab,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  Stack,
} from "@mui/material";
import {
  CheckCircle,
  HourglassEmpty,
  Cancel,
  UploadFile,
  Visibility,
  Refresh,
} from "@mui/icons-material";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";

const REQUEST_TYPES = ["Bank Document", "Submission of DO Document", "Others"];

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
          <Typography>No proof images uploaded yet.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function UpdateStatusDialog({ open, onClose, request, onSaved, fieldUsers }) {
  const { user } = useContext(UserContext);
  const [status, setStatus] = useState(request?.status || "Not Collected");
  const [responsible, setResponsible] = useState(request?.responsible_person || "");
  const [notes, setNotes] = useState(request?.notes || "");
  const [uploading, setUploading] = useState(false);
  const [proofUrls, setProofUrls] = useState(request?.proof_image_urls || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (request) {
      setStatus(request.status);
      setResponsible(request.responsible_person || "");
      setNotes(request.notes || "");
      setProofUrls(request.proof_image_urls || []);
    }
  }, [request]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("bucketPath", "document-collection-proof");
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/upload`,
        formData,
        { withCredentials: true, headers: { "Content-Type": "multipart/form-data" } }
      );
      setProofUrls((prev) => [...prev, ...(res.data.urls || [])]);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/document-requests/${request._id}/status`,
        { 
          status, 
          proof_image_urls: proofUrls, 
          responsible_person: responsible, 
          notes,
          updated_by_name: `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
        },
        { withCredentials: true }
      );
      onSaved();
      onClose();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Document Request Status</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <TextField
          label="Status"
          select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          size="small"
          fullWidth
        >
          {["Not Collected", "In Progress", "Collected"].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Responsible Person (Field Team)"
          select
          value={responsible}
          onChange={(e) => setResponsible(e.target.value)}
          size="small"
          fullWidth
        >
          <MenuItem value="">— Not Assigned —</MenuItem>
          {fieldUsers.map((u) => (
            <MenuItem key={u.username} value={`${u.first_name} ${u.last_name}`}>
              {u.first_name} {u.last_name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={2}
        />

        <Box>
          <Typography variant="caption" color="text.secondary">
            Upload Proof Images
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <Button
              variant="outlined"
              component="label"
              size="small"
              startIcon={<UploadFile />}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload Image(s)"}
              <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {proofUrls.length} file(s) uploaded
            </Typography>
          </Box>
          {proofUrls.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              {proofUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt={`proof-${i}`}
                    style={{ width: 60, height: 50, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                  />
                </a>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || uploading}>
          {saving ? <CircularProgress size={18} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RequestTable({ requests, onRefresh, fieldUsers }) {
  const [proofDialog, setProofDialog] = useState({ open: false, images: [] });
  const [updateDialog, setUpdateDialog] = useState({ open: false, request: null });

  const handleResponsibleChange = async (requestId, newValue) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/document-requests/${requestId}/status`,
        { responsible_person: newValue },
        { withCredentials: true }
      );
      onRefresh && onRefresh();
    } catch (err) {
      console.error("Error updating responsible person:", err);
    }
  };

  const headers = [
    "Sr No", "Job No", "BL No", "Importer", "Type", 
    "Requested By", "Requested On", "Responsible Person", 
    "Status", "Updated By", "Proof", "Action"
  ];

  return (
    <>
      <Box sx={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, background: "#fff" }}>
          <thead>
            <tr style={{ background: "#1a237e", color: "#fff" }}>
              {headers.map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: 32, color: "#888" }}>No requests found for the selected filters.</td>
              </tr>
            ) : (
              requests.map((r, idx) => (
                <tr
                  key={r._id}
                  style={{ background: idx % 2 === 0 ? "#f9faff" : "#fff", borderBottom: "1px solid #e8eaf6" }}
                >
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1a237e" }}>{r.sr_no || idx + 1}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.job_number}</td>
                  <td style={{ padding: "8px 12px" }}>{r.bl_no || "—"}</td>
                  <td style={{ padding: "8px 12px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <Tooltip title={r.importer_name}><Box component="span">{r.importer_name || "—"}</Box></Tooltip>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <Chip label={r.request_type} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
                  </td>
                  <td style={{ padding: "8px 12px" }}>{r.requested_by_name || r.requested_by}</td>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                    {r.requested_at ? new Date(r.requested_at).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td style={{ padding: "4px 8px", minWidth: 160 }}>
                    <TextField
                      select
                      value={r.responsible_person || ""}
                      onChange={(e) => handleResponsibleChange(r._id, e.target.value)}
                      size="small"
                      fullWidth
                      variant="standard"
                      sx={{ "& .MuiInput-input": { py: 0.5, fontSize: 12.5 } }}
                    >
                      <MenuItem value="">— Not Assigned —</MenuItem>
                      {fieldUsers.map((u) => (
                        <MenuItem key={u.username} value={`${u.first_name} ${u.last_name}`}>
                          {u.first_name} {u.last_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </td>
                  <td style={{ padding: "8px 12px" }}><StatusChip status={r.status} /></td>
                  <td style={{ padding: "8px 12px" }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
                      {r.updated_by_name || "—"}
                    </Typography>
                    {r.collected_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        {new Date(r.collected_at).toLocaleDateString("en-IN")}
                      </Typography>
                    )}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <IconButton size="small" onClick={() => setProofDialog({ open: true, images: r.proof_image_urls || [] })}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <Button size="small" variant="contained" onClick={() => setUpdateDialog({ open: true, request: r })} sx={{ fontSize: 10, py: 0.5 }}>
                      Update
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Box>

      <ProofImagesDialog open={proofDialog.open} onClose={() => setProofDialog({ open: false, images: [] })} images={proofDialog.images} />
      {updateDialog.request && (
        <UpdateStatusDialog
          open={updateDialog.open}
          onClose={() => setUpdateDialog({ open: false, request: null })}
          request={updateDialog.request}
          onSaved={onRefresh}
          fieldUsers={fieldUsers}
        />
      )}
    </>
  );
}

function Grid({ children, container, item, xs, sm, md, lg, spacing, sx, ...props }) {
  if (container) {
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", m: -(spacing || 1), ...sx }}>
        {children}
      </Box>
    );
  }
  const flexBasis = md ? `${(md / 12) * 100}%` : sm ? `${(sm / 12) * 100}%` : xs ? `${(xs / 12) * 100}%` : "auto";
  return (
    <Box sx={{ p: spacing || 1, flexBasis: flexBasis, maxWidth: flexBasis, flexGrow: 0, ...sx }}>
      {children}
    </Box>
  );
}

function DocumentCollectionTab({ statusValue, fieldUsers }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    request_type: "",
    responsible_person: "",
    startDate: "",
    endDate: "",
  });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: statusValue,
        ...filters
      };
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/document-requests`, { params, withCredentials: true });
      setRequests(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusValue, filters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e0e0e0", borderRadius: 2, background: "#f8f9fa" }}>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              select
              label="Document Type"
              value={filters.request_type}
              onChange={(e) => handleFilterChange("request_type", e.target.value)}
              size="small"
              fullWidth
              sx={{ background: "#fff" }}
            >
              <MenuItem value="">All Types</MenuItem>
              {REQUEST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              select
              label="Responsible Person"
              value={filters.responsible_person}
              onChange={(e) => handleFilterChange("responsible_person", e.target.value)}
              size="small"
              fullWidth
              sx={{ background: "#fff" }}
            >
              <MenuItem value="">All People</MenuItem>
              {fieldUsers.map(u => (
                <MenuItem key={u.username} value={`${u.first_name} ${u.last_name}`}>
                  {u.first_name} {u.last_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ background: "#fff" }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ background: "#fff" }}
            />
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Stack direction="row" spacing={1}>
              <Button 
                variant="contained" 
                startIcon={<Refresh />} 
                onClick={fetchRequests}
                fullWidth
              >
                Refresh
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setFilters({ request_type: "", responsible_person: "", startDate: "", endDate: "" })}
              >
                Reset
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : (
        <Paper elevation={0} sx={{ border: "1px solid #e8eaf6", borderRadius: 2, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <RequestTable requests={requests} onRefresh={fetchRequests} fieldUsers={fieldUsers} />
        </Paper>
      )}
    </Box>
  );
}

function DocumentCollection() {
  const [tabValue, setTabValue] = useState(0);
  const [fieldUsers, setFieldUsers] = useState([]);

  useEffect(() => {
    const fetchFieldUsers = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/document-requests/field-users`, { withCredentials: true });
        setFieldUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch field users:", err);
      }
    };
    fetchFieldUsers();
  }, []);

  const tabs = [
    { label: "Pending Issues", status: "Not Collected,In Progress" },
    { label: "Completed Collections", status: "Collected" },
  ];

  return (
    <Box sx={{ width: "100%", p: 1 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, color: "#1a237e", display: "flex", alignItems: "center", gap: 1.5 }}>
        📁 Document Collection Admin
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          sx={{
            "& .MuiTab-root": { fontWeight: 700, fontSize: "1rem", textTransform: "none" },
            "& .Mui-selected": { color: "#1a237e" },
            "& .MuiTabs-indicator": { backgroundColor: "#1a237e", height: 3 }
          }}
        >
          {tabs.map((t, i) => <Tab key={i} label={t.label} />)}
        </Tabs>
      </Box>

      <DocumentCollectionTab statusValue={tabs[tabValue].status} fieldUsers={fieldUsers} />
    </Box>
  );
}

export default DocumentCollection;

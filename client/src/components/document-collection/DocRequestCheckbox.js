import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Paper,
  Snackbar,
} from "@mui/material";
import { Send } from "@mui/icons-material";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";

const REQUEST_TYPES = [
  "Bank Document",
  "Submission of DO Document",
  "Others",
];

/**
 * DocRequestDialog - shown when a user clicks a checkbox on a job row
 * Props: open, onClose, job (job data), onRequested
 */
function DocRequestDialog({ open, onClose, job, onRequested }) {
  const { user } = useContext(UserContext);
  const [requestType, setRequestType] = useState("Bank Document");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!requestType) {
      setError("Please select a request type.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/document-requests`,
        {
          job_number: job?.job_number || job?.job_no || "",
          bl_no: job?.awb_bl_no || job?.bill_no || job?.bl_no || "",
          importer_name: job?.importer || job?.importer_name || "",
          year: job?.year || "",
          branch_code: job?.branch_code || "",
          request_type: requestType,
          requested_by_name: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
          notes,
        },
        { withCredentials: true }
      );
      onRequested && onRequested();
      onClose();
    } catch (err) {
      setError("Failed to submit document request. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: "#1a237e" }}>
        📋 Request Document Collection
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <Box sx={{ background: "#f5f7fa", borderRadius: 2, p: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Job Number:</strong> {job?.job_number || job?.job_no || "—"} &nbsp;|&nbsp;
            <strong>BL:</strong> {job?.awb_bl_no || job?.bill_no || job?.bl_no || "—"} &nbsp;|&nbsp;
            <strong>Importer:</strong> {job?.importer || job?.importer_name || "—"}
          </Typography>
        </Box>

        <TextField
          label="Request Type"
          select
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          size="small"
          fullWidth
          required
        >
          {REQUEST_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="Notes / Remarks (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={2}
        />

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : <Send />}
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * DocRequestCheckbox - renders a checkbox per job row in Import DSR
 */
function DocRequestCheckbox({ job }) {
  const [checked, setChecked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  const handleChange = (e) => {
    if (e.target.checked) {
      setDialogOpen(true);
    } else {
      setChecked(false);
    }
  };

  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={handleChange}
            size="small"
            color="primary"
          />
        }
        label={
          <Typography variant="caption" sx={{ fontWeight: 600, color: "#3f51b5" }}>
            Request Documents
          </Typography>
        }
        sx={{ m: 0 }}
      />
      <DocRequestDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setChecked(false);
        }}
        job={job}
        onRequested={() => {
          setChecked(true);
          setSnackbar(true);
        }}
      />
      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message="✅ Document request submitted successfully!"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      />
    </>
  );
}

export { DocRequestCheckbox, DocRequestDialog };
export default DocRequestCheckbox;

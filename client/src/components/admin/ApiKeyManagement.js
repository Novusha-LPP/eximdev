import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/api-keys`, {
        withCredentials: true
      });
      setApiKeys(response.data || []);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      showSnackbar("Failed to fetch API keys", "error");
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showSnackbar("Key Name is required", "warning");
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/admin/api-keys`,
        { name: newKeyName },
        { withCredentials: true }
      );
      setGeneratedKey(response.data);
      setSuccessDialogOpen(true);
      setNewKeyName("");
      fetchApiKeys();
    } catch (error) {
      showSnackbar(error.response?.data?.error || "Error generating API key", "error");
    }
  };

  const handleDeleteKey = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this API key?")) return;

    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/admin/api-keys/${id}`, {
        withCredentials: true
      });
      showSnackbar("API Key revoked successfully", "success");
      fetchApiKeys();
    } catch (error) {
      showSnackbar("Error revoking API key", "error");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSnackbar("Copied to clipboard!", "success");
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        API Key Management
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom color="primary">
          Generate New API Key
        </Typography>
        <form onSubmit={handleCreateKey}>
          <Box display="flex" alignItems="center" gap={2}>
            <TextField
              label="Key Name (e.g., Tally Integration)"
              variant="outlined"
              size="small"
              fullWidth
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" color="primary" sx={{ whiteSpace: 'nowrap' }}>
              Generate Key
            </Button>
          </Box>
        </form>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Active API Keys
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
            <TableRow>
              <TableCell><strong>Key Name</strong></TableCell>
              <TableCell><strong>Created By</strong></TableCell>
              <TableCell><strong>Created At</strong></TableCell>
              <TableCell><strong>Last Used</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key._id}>
                <TableCell>{key.name}</TableCell>
                <TableCell>{key.createdBy}</TableCell>
                <TableCell>{new Date(key.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never Used"}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Revoke Key">
                    <IconButton size="small" onClick={() => handleDeleteKey(key._id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {apiKeys.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No API keys found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New API Key Generated</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please copy and store this key securely. It will <strong>NOT</strong> be displayed again.
          </Alert>
          <Box
            p={2}
            bgcolor="#f0f0f0"
            borderRadius={1}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{ wordBreak: 'break-all' }}
          >
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {generatedKey?.key}
            </Typography>
            <IconButton onClick={() => copyToClipboard(generatedKey?.key)} color="primary">
              <ContentCopyIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained" color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ApiKeyManagement;

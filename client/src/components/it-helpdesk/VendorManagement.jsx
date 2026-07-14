import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  MenuItem,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert
} from "@mui/material";

import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// Import XLSX for Excel export
import * as XLSX from "xlsx";

// Constants
const VENDOR_TYPES = [
  "Transporter",
  "CHA",
  "Shipping Line",
  "Supplier",
  "Service Provider",
  "Other"
];

const STATUS_OPTIONS = ["Active", "Inactive"];

const EMPTY_FORM = {
  name: "",
  type: "Other",
  gst_number: "",
  pan_number: "",
  contact_person: "",
  mobile_number: "",
  email: "",
  status: "Active"
};

export default function VendorManagement() {
  const navigate = useNavigate();
  const { logCreate, logRead, logUpdate, logDelete } = useModuleAuditLogs("Vendor");

  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(15);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info"
  });

  // Memoized filtered data
  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(term) ||
      (item.gst_number || "").toLowerCase().includes(term) ||
      (item.pan_number || "").toLowerCase().includes(term) ||
      (item.contact_person || "").toLowerCase().includes(term) ||
      (item.mobile_number || "").toLowerCase().includes(term) ||
      (item.email || "").toLowerCase().includes(term)
    );
  });

  // Handlers
  const handleBack = useCallback(() => {
    navigate("/it-helpdesk");
  }, [navigate]);

  const handleNotification = useCallback((message, severity = "info") => {
    setNotification({ open: true, message, severity });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await itHelpdeskAPI.vendors.getAll();
      const vendors = res.data || res;
      setData(Array.isArray(vendors) ? vendors : []);
    } catch (err) {
      logCreate(err.message, "Vendor fetch failed");
      handleNotification("Failed to fetch vendors", "error");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [logCreate, handleNotification]);

  useEffect(() => {
    fetchData();
    return () => {
      // Cleanup if needed
    };
  }, [fetchData]);

  const handleOpen = useCallback((record = null) => {
    if (record) {
      setEditId(record._id);
      setForm({
        name: record.name || "",
        type: record.type || "Other",
        gst_number: record.gst_number || "",
        pan_number: record.pan_number || "",
        contact_person: record.contact_person || "",
        mobile_number: record.mobile_number || "",
        email: record.email || "",
        status: record.status || "Active"
      });
    } else {
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      logRead("vendor-creation-intent", "Opened vendor creation form", "info");
    }
    setShowModal(true);
  }, [logRead]);

  const handleSave = async () => {
    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !form.name.trim() ||
      !form.contact_person.trim() ||
      !form.mobile_number.trim() ||
      !form.email.trim() ||
      !emailRegex.test(form.email.trim())
    ) {
      handleNotification("Please fill all required fields with valid values", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        gst_number: form.gst_number?.trim() || "",
        pan_number: form.pan_number?.trim() || "",
        contact_person: form.contact_person.trim(),
        mobile_number: form.mobile_number.trim(),
        email: form.email.trim(),
        status: form.status || "Active"
      };

      if (editId) {
        await itHelpdeskAPI.vendors.update(editId, payload);
        logUpdate(`Updated vendor ${payload.name}`, editId);
        handleNotification("Vendor updated successfully", "success");
      } else {
        await itHelpdeskAPI.vendors.create(payload);
        logCreate(`Created vendor ${payload.name}`);
        handleNotification("Vendor created successfully", "success");
      }

      setShowModal(false);
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      fetchData();
    } catch (err) {
      console.error("Vendor save failed:", err.message);
      handleNotification("Failed to save vendor", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;

    try {
      await itHelpdeskAPI.vendors.remove(id);
      logDelete(`Deleted vendor with ID: ${id}`);
      handleNotification("Vendor deleted successfully", "success");
      fetchData();
    } catch (err) {
      console.error("Vendor delete failed:", err.message);
      handleNotification("Failed to delete vendor", "error");
    }
  };

  // --- Excel Export Functionality ---
  const handleExportAllToExcel = () => {
    try {
      // 1. Map data to a cleaner format for Excel
      const excelData = data.map((item, index) => ({
        "S.No": index + 1,
        "Company Name": item.name || "",
        "Type": item.type || "Other",
        "GST Number": item.gst_number || "",
        "PAN Number": item.pan_number || "",
        "Contact Person": item.contact_person || "",
        "Mobile Number": item.mobile_number || "",
        "Email": item.email || "",
        "Status": item.status || "Active"
      }));

      // 2. Create a new workbook
      const wb = XLSX.utils.book_new();

      // 3. Convert JSON data to a worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // 4. Append worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Vendors");

      // 5. Generate filename with current date
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `Vendors_Export_${date}.xlsx`;

      // 6. Write file and trigger download
      XLSX.writeFile(wb, fileName);

      handleNotification("Excel exported successfully", "success");
    } catch (error) {
      console.error("Export failed:", error);
      handleNotification("Failed to export Excel", "error");
    }
  };
  // ----------------------------------

  // Helper functions
  const statusColor = (s) => {
    return s === "Active" ? "success" : "default";
  };

  const typeColor = (t) => {
    switch (t) {
      case "Transporter": return "primary";
      case "CHA": return "info";
      case "Shipping Line": return "secondary";
      case "Supplier": return "success";
      case "Service Provider": return "warning";
      default: return "default";
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center">
          <Tooltip title="Back">
            <IconButton
              onClick={handleBack}
              sx={{
                mr: 1,
                bgcolor: "white",
                border: "1px solid",
                borderColor: "primary.main",
                color: "primary.main",
                "&:hover": { bgcolor: "primary.light", color: "primary.dark" }
              }}
            >
              <ArrowBackIcon sx={{ color: "primary.main" }} />
            </IconButton>
          </Tooltip>
          <Typography variant="h5" fontWeight={700}>
            Vendors & Suppliers
          </Typography>
        </Box>

        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Add Vendor
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportAllToExcel}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      {/* Search Input */}
      <Box mb={2} sx={{ maxWidth: 400 }}>
        <TextField
          label="Search Vendors"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Company Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>GST Number</TableCell>
                  <TableCell>PAN Number</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No vendor found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((v) => (
                      <TableRow key={v._id}>
                        <TableCell>{v.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={v.type || "Other"}
                            color={typeColor(v.type)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{v.gst_number || "-"}</TableCell>
                        <TableCell>{v.pan_number || "-"}</TableCell>
                        <TableCell>{v.contact_person || "-"}</TableCell>
                        <TableCell>{v.mobile_number || "-"}</TableCell>
                        <TableCell>{v.email || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            label={v.status}
                            color={statusColor(v.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton onClick={() => handleOpen(v)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              color="error"
                              onClick={(e) => handleDelete(e, v._id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredData.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[15]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
          />
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editId ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            label="Company Name *"
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Vendor Type</InputLabel>
            <Select
              value={form.type}
              label="Vendor Type"
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {VENDOR_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="GST Number"
            margin="normal"
            value={form.gst_number}
            onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
          />

          <TextField
            fullWidth
            size="small"
            label="PAN Number"
            margin="normal"
            value={form.pan_number}
            onChange={(e) => setForm({ ...form, pan_number: e.target.value })}
          />

          <TextField
            fullWidth
            size="small"
            label="Contact Person *"
            margin="normal"
            value={form.contact_person}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
          />

          <TextField
            fullWidth
            size="small"
            label="Mobile Number *"
            margin="normal"
            value={form.mobile_number}
            onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
          />

          <TextField
            fullWidth
            size="small"
            label="Email *"
            margin="normal"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)}
            helperText={form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "Invalid email format" : ""}
          />

          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={form.status}
              label="Status"
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

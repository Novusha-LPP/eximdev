import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  IconButton,
  Avatar,
  Stack,
  Divider,
} from "@mui/material";
import {
  Business,
  Clear,
  CloudUpload,
  FileDownload,
  Edit,
  Check,
  Close,
  Apartment,
  Email,
  Phone,
  CreditCard,
  Receipt,
  Add,
} from "@mui/icons-material";

export default function CompanyDirectoryModal({ open, onClose }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingCompanies, setUploadingCompanies] = useState(false);
  const [uploadingDepartments, setUploadingDepartments] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const companyFileInputRef = useRef(null);
  const deptFileInputRef = useRef(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/company-directory`);
      if (res.data?.success) {
        setCompanies(res.data.companies || []);
      }
    } catch (err) {
      console.error("Error fetching company directory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCompanies();
    }
  }, [open]);

  const handleStartEdit = (comp) => {
    setEditingId(comp._id);
    setEditForm({
      ...comp,
      email: comp.email || "purchase@surajgroupofcompanies.com",
      contactNumbers: comp.contactNumbers || "99980 27301 / 99243 01166",
    });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/tyre-procurement/company-directory`, editForm);
      if (res.data?.success) {
        setEditingId(null);
        fetchCompanies();
      }
    } catch (err) {
      console.error("Error saving company:", err);
      alert("Failed to save company: " + (err.response?.data?.message || err.message));
    }
  };

  const handleBulkImportCompanies = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCompanies(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rows = XLSX.utils.sheet_to_json(ws);

          if (!rows || rows.length === 0) {
            alert("The uploaded Excel file contains no data rows.");
            return;
          }

          const res = await axios.post(
            `${process.env.REACT_APP_API_STRING}/tyre-procurement/company-directory/bulk-import`,
            { companies: rows }
          );
          if (res.data?.success) {
            alert(`Successfully imported ${res.data.count || rows.length} companies from Excel!`);
            fetchCompanies();
          }
        } catch (err) {
          console.error("Error parsing/uploading companies excel:", err);
          alert("Import failed: " + (err.response?.data?.message || err.message));
        } finally {
          setUploadingCompanies(false);
          if (companyFileInputRef.current) companyFileInputRef.current.value = "";
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setUploadingCompanies(false);
      console.error("File read error:", err);
    }
  };

  const handleBulkImportDepartments = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDepartments(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rows = XLSX.utils.sheet_to_json(ws);

          if (!rows || rows.length === 0) {
            alert("The uploaded Excel file contains no data rows.");
            return;
          }

          const res = await axios.post(
            `${process.env.REACT_APP_API_STRING}/tyre-procurement/company-directory/import-departments`,
            { departments: rows }
          );
          if (res.data?.success) {
            alert("Successfully imported and updated company department lists!");
            fetchCompanies();
          }
        } catch (err) {
          console.error("Error parsing/uploading departments excel:", err);
          alert("Department import failed: " + (err.response?.data?.message || err.message));
        } finally {
          setUploadingDepartments(false);
          if (deptFileInputRef.current) deptFileInputRef.current.value = "";
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setUploadingDepartments(false);
      console.error("File read error:", err);
    }
  };

  const downloadCompanySampleExcel = () => {
    const sample = [
      {
        "Company Name": "SURAVIO CARGO CARRIERS PRIVATE LIMITED",
        "Short Name": "SRCC",
        "Bill To Address": "205/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
        "Ship To Address": "SRCC MAINTENANCE CENTER, GANDHINAGAR-382501, GUJARAT",
        "GSTIN": "24ABTCS5804P1ZK",
        "PAN": "ABTCS5804P",
        "Email ID": "purchase@surajgroupofcompanies.com",
        "Contact Numbers": "99980 27301 / 99243 01166",
      },
      {
        "Company Name": "SURAJ FORWARDERS PRIVATE LIMITED",
        "Short Name": "SFPL",
        "Bill To Address": "205/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
        "Ship To Address": "205/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
        "GSTIN": "24ABTCS5804P1ZK",
        "PAN": "ABTCS5804P",
        "Email ID": "purchase@surajgroupofcompanies.com",
        "Contact Numbers": "99980 27301 / 99243 01166",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Company Directory");
    XLSX.writeFile(wb, "Company_Directory_Template.xlsx");
  };

  const downloadDepartmentSampleExcel = () => {
    const sample = [
      { "Company Name": "SURAJ FORWARDERS PRIVATE LIMITED", "Department / Branch": "HO-AHMEDABAD" },
      { "Company Name": "SURAJ FORWARDERS PRIVATE LIMITED", "Department / Branch": "GANDHIDHAM" },
      { "Company Name": "SURAJ FORWARDERS PRIVATE LIMITED", "Department / Branch": "MUNDRA" },
      { "Company Name": "SURAVIO CARGO CARRIERS PRIVATE LIMITED", "Department / Branch": "MAINTENANCE CENTER" },
      { "Company Name": "SURAVIO CARGO CARRIERS PRIVATE LIMITED", "Department / Branch": "OPERATION" },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departments List");
    XLSX.writeFile(wb, "Company_Departments_Template.xlsx");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#0f172a",
          color: "#ffffff",
          py: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ bgcolor: "#2563eb", width: 36, height: 36 }}>
            <Business sx={{ fontSize: 20 }} />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#ffffff", letterSpacing: "0.2px" }}>
              Company Directory & Purchasing Entities Master
            </Typography>
            <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
              Company-wise directory with Bill To / Ship To addresses, GSTIN, PAN, and Departments
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}>
          <Clear sx={{ fontSize: 19 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
        {/* Bulk Import Action Bar */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: "8px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                Excel Bulk Import Options
              </Typography>
              <Typography sx={{ fontSize: "11.5px", color: "#64748b" }}>
                Upload Excel spreadsheets to update Company Directory or Department/Branch lists in bulk.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <input
                type="file"
                ref={companyFileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleBulkImportCompanies}
                style={{ display: "none" }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={uploadingCompanies ? <CircularProgress size={14} /> : <CloudUpload sx={{ fontSize: 16 }} />}
                onClick={() => companyFileInputRef.current && companyFileInputRef.current.click()}
                disabled={uploadingCompanies}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: "12px" }}
              >
                Import Companies (.xlsx)
              </Button>

              <input
                type="file"
                ref={deptFileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleBulkImportDepartments}
                style={{ display: "none" }}
              />
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                startIcon={uploadingDepartments ? <CircularProgress size={14} /> : <CloudUpload sx={{ fontSize: 16 }} />}
                onClick={() => deptFileInputRef.current && deptFileInputRef.current.click()}
                disabled={uploadingDepartments}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: "12px" }}
              >
                Import Departments (.xlsx)
              </Button>

              <Button
                size="small"
                startIcon={<FileDownload sx={{ fontSize: 15 }} />}
                onClick={downloadCompanySampleExcel}
                sx={{ textTransform: "none", fontSize: "11px", color: "#64748b" }}
              >
                Company Sample
              </Button>

              <Button
                size="small"
                startIcon={<FileDownload sx={{ fontSize: 15 }} />}
                onClick={downloadDepartmentSampleExcel}
                sx={{ textTransform: "none", fontSize: "11px", color: "#64748b" }}
              >
                Dept Sample
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* Companies List */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={30} />
          </Box>
        ) : (
          <Stack spacing={2}>
            {companies.map((comp) => {
              const isEditing = editingId === comp._id;
              return (
                <Paper
                  key={comp._id || comp.companyKey}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "8px",
                    border: "1.5px solid",
                    borderColor: isEditing ? "#3b82f6" : "#e2e8f0",
                    bgcolor: isEditing ? "#eff6ff" : "#ffffff",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isEditing ? (
                    // Inline Edit Form
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={8}>
                        <TextField
                          label="Company Name"
                          size="small"
                          fullWidth
                          value={editForm.companyName || ""}
                          onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Short Code (e.g. SFPL)"
                          size="small"
                          fullWidth
                          value={editForm.shortName || ""}
                          onChange={(e) => setEditForm({ ...editForm, shortName: e.target.value.toUpperCase() })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="GSTIN"
                          size="small"
                          fullWidth
                          value={editForm.gstin || ""}
                          onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="PAN"
                          size="small"
                          fullWidth
                          value={editForm.pan || ""}
                          onChange={(e) => setEditForm({ ...editForm, pan: e.target.value.toUpperCase() })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Default Email ID"
                          size="small"
                          fullWidth
                          value={editForm.email || ""}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Contact Numbers"
                          size="small"
                          fullWidth
                          value={editForm.contactNumbers || ""}
                          onChange={(e) => setEditForm({ ...editForm, contactNumbers: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Address - Bill To"
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          value={editForm.addressBillTo || ""}
                          onChange={(e) => setEditForm({ ...editForm, addressBillTo: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Address - Ship To"
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          value={editForm.addressShipTo || ""}
                          onChange={(e) => setEditForm({ ...editForm, addressShipTo: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" onClick={() => setEditingId(null)} sx={{ color: "#64748b" }}>
                            Cancel
                          </Button>
                          <Button size="small" variant="contained" onClick={handleSaveEdit} startIcon={<Check />}>
                            Save Changes
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  ) : (
                    // Display Card
                    <Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontSize: "14.5px", fontWeight: 800, color: "#1e3a8a" }}>
                            {comp.companyName}
                          </Typography>
                          <Chip
                            label={`Code: ${comp.shortName || comp.companyKey}`}
                            size="small"
                            sx={{ fontWeight: 800, fontSize: "11px", bgcolor: "#dbeafe", color: "#1d4ed8" }}
                          />
                        </Box>
                        <Button
                          size="small"
                          startIcon={<Edit sx={{ fontSize: 14 }} />}
                          onClick={() => handleStartEdit(comp)}
                          sx={{ fontSize: "11px", textTransform: "none" }}
                        >
                          Edit
                        </Button>
                      </Box>

                      <Grid container spacing={1.5} sx={{ fontSize: "12px", color: "#334155", mb: 1.5 }}>
                        <Grid item xs={12} sm={3}>
                          <strong>GSTIN:</strong>{" "}
                          <span style={{ fontFamily: "monospace", color: "#1e40af" }}>{comp.gstin || "N/A"}</span>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <strong>PAN:</strong>{" "}
                          <span style={{ fontFamily: "monospace", color: "#0f766e" }}>{comp.pan || "N/A"}</span>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <strong>Email:</strong> {comp.email || "purchase@surajgroupofcompanies.com"}
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <strong>Contact:</strong> {comp.contactNumbers || "99980 27301 / 99243 01166"}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <strong>Bill To:</strong> {comp.addressBillTo || "-"}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <strong>Ship To:</strong> {comp.addressShipTo || "-"}
                        </Grid>
                      </Grid>

                      {/* Departments / Branches */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap", pt: 1, borderTop: "1px dashed #e2e8f0" }}>
                        <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                          Predefined Branches:
                        </Typography>
                        {(comp.branches && comp.branches.length > 0 ? comp.branches : comp.departments || []).map((b, bIdx) => (
                          <Chip
                            key={bIdx}
                            label={b}
                            size="small"
                            sx={{ fontSize: "10.5px", height: "20px", bgcolor: "#f1f5f9", color: "#475569" }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

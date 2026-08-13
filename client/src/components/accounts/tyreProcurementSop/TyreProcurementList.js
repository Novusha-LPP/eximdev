import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  TablePagination,
  CircularProgress,
  Stack,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import { Edit, Delete, GetApp, Add, FileDownload, Visibility } from "@mui/icons-material";

const stageTabsList = [
  { label: "All PRs", value: "0" },
  { label: "1. Purchase Request", value: "1" },
  { label: "2. Supplier Quotation", value: "2" },
  { label: "3. Finance Approval", value: "3" },
  { label: "4. Payment & UTR", value: "4" },
  { label: "5. Order & Dispatch", value: "5" },
  { label: "6. Site GRN", value: "6" },
];

function TyreProcurementList({ onEdit, onView, onCreate }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [stageTab, setStageTab] = useState("0");
  const [loading, setLoading] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement`, {
        params: {
          search,
          stageTab,
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching Tyre SOP list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, rowsPerPage, search, stageTab]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this PR?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/tyre-procurement/${id}`);
      fetchRecords();
    } catch (err) {
      console.error("Error deleting PR:", err);
      alert("Failed to delete PR");
    }
  };

  const handleExport = async (id, prNumber) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/${id}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Tyre_Procurement_${prNumber}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting excel:", err);
      alert("Failed to export Excel");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/template/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Tyre_Procurement_SOP_Template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading template:", err);
      alert("Failed to download template");
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "#1a237e" }}>
            Tyre Procurement SOP
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<FileDownload />} onClick={handleDownloadTemplate}>
              Template
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={onCreate}>
              Create Tyre PR
            </Button>
          </Stack>
        </Stack>

        {/* ─── Stage Filter Tabs ─── */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs
            value={stageTab}
            onChange={(e, val) => {
              setStageTab(val);
              setPage(0);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {stageTabsList.map((tab) => (
              <Tab key={tab.value} label={tab.label} value={tab.value} sx={{ fontWeight: "bold" }} />
            ))}
          </Tabs>
        </Box>

        <TextField
          label="Search PR Number, PO, Prepared By, Supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
        />
      </Paper>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#1a237e" }}>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>PR Number</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>PO Number</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Prepared By</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>L1 Supplier</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Total Value (₹)</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Status</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Created At</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No records found in this stage tab.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      <Box
                        component="span"
                        onClick={() => onEdit(row)}
                        sx={{
                          cursor: "pointer",
                          color: "#1976d2",
                          textDecoration: "underline",
                          "&:hover": { color: "#115293" },
                        }}
                      >
                        {row.prNumber}
                      </Box>
                    </TableCell>
                    <TableCell>{row.poNumber || "-"}</TableCell>
                    <TableCell>{row.stage1?.preparedBy || "-"}</TableCell>
                    <TableCell>{row.stage2?.selectedSupplierL1 || "-"}</TableCell>
                    <TableCell>
                      {row.stage2?.totalOrderValue 
                        ? Number(row.stage2.totalOrderValue).toLocaleString("en-IN", { style: "currency", currency: "INR" })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.status || "Draft"}
                        size="small"
                        color={
                          row.status === "Closed" || row.status === "GRN Done"
                            ? "success"
                            : row.status === "PR Raised" || row.status === "Preparing for Quotation"
                            ? "primary"
                            : "info"
                        }
                      />
                    </TableCell>
                    <TableCell>{new Date(row.createdAt).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="info" onClick={() => onView(row)} title="View">
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="primary" onClick={() => onEdit(row)} title="Edit">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="secondary" onClick={() => handleExport(row._id, row.prNumber)}>
                        <GetApp fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(row._id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
}

export default React.memo(TyreProcurementList);

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Chip,
  Pagination,
} from "@mui/material";
import { Edit, Delete, Add, FileDownload, Search, Visibility } from "@mui/icons-material";

function RmProcurementList({ onEdit, onView, onCreate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/rm-procurement`, {
        params: { search, page, limit },
      });
      setItems(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching RM Procurement PRs:", err);
      alert("Failed to fetch PRs");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this PR?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/rm-procurement/${id}`);
      fetchItems();
    } catch (err) {
      console.error("Error deleting PR:", err);
      alert("Failed to delete PR");
    }
  };

  const handleExport = async (id, prNumber) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/rm-procurement/${id}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `RM_Procurement_${prNumber || id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting PR:", err);
      alert("Failed to export PR");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Closed":
        return "success";
      case "Draft":
        return "default";
      case "Rejected":
        return "error";
      default:
        return "primary";
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Raw Material Procurement SOP</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={onCreate}>
          New PR
        </Button>
      </Box>

      <Box component="form" onSubmit={handleSearch} sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search PR / Customer / Supplier"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button type="submit" variant="outlined" startIcon={<Search />}>
          Search
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>PR Number</TableCell>
                  <TableCell>SO Ref. No.</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Supplier (L1)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No PRs found.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => (
                  <TableRow key={item._id} hover>
                    <TableCell>{item.prNumber}</TableCell>
                    <TableCell>{item.salesOrderRefNo || "-"}</TableCell>
                    <TableCell>{item.stage1?.customerName || "-"}</TableCell>
                    <TableCell>{item.stage3?.selectedSupplierL1 || item.stage6?.supplierName || "-"}</TableCell>
                    <TableCell>
                      <Chip label={item.status} color={getStatusColor(item.status)} size="small" />
                    </TableCell>
                    <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "-"}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="info" onClick={() => onView(item)} title="View">
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="primary" onClick={() => onEdit(item)} title="Edit">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleExport(item._id, item.prNumber)} title="Export Excel">
                        <FileDownload fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(item._id)} title="Delete" color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={Math.ceil(total / limit)}
              page={page}
              onChange={(e, v) => setPage(v)}
              color="primary"
            />
          </Box>
        </>
      )}
    </Box>
  );
}

export default React.memo(RmProcurementList);

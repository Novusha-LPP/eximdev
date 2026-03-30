import React, { useState, useEffect } from "react";
import { 
  Table, TextField, InputAdornment, Box, Paper, Typography, 
  Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Snackbar, Alert, CircularProgress, IconButton,
  TableBody, TableCell, TableHead, TableRow, Grid
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const SupplierDirectory = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    branches: [{ 
        branch_no: "0", 
        branch_name: "", 
        address: "", 
        city: "", 
        country: "", 
        postal_code: "", 
        gst: "", 
        pan: "",
        accounts: [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }]
    }],
    active: "Yes",
    tds_percent: 0
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });

  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-suppliers`);
      setSuppliers(res.data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      handleSnackbar("Failed to fetch suppliers", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      handleSnackbar("Name is required", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-supplier/${editingId}`, formData);
        handleSnackbar("Supplier updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-supplier`, formData);
        handleSnackbar("Supplier added successfully", "success");
      }
      handleClose();
      fetchSuppliers();
    } catch (error) {
      handleSnackbar(error.response?.data?.message || "Failed to save supplier", "error");
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      open: true,
      title: "Delete Supplier",
      message: "Are you sure you want to delete this supplier? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-supplier/${id}`);
          handleSnackbar("Supplier deleted successfully", "success");
          fetchSuppliers();
        } catch (error) {
          handleSnackbar("Failed to delete supplier", "error");
        }
      }
    });
  };

  const handleEdit = (supplier) => {
    setEditingId(supplier._id);
    setFormData({
      name: supplier.name,
      branches: (supplier.branches || []).map(b => ({
        ...b,
        accounts: b.accounts && b.accounts.length > 0 
          ? b.accounts 
          : [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }]
      })),
      active: supplier.active || "Yes",
      tds_percent: supplier.tds_percent || 0
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      branches: [{ 
        branch_no: "0", 
        branch_name: "", 
        address: "", 
        city: "", 
        country: "", 
        postal_code: "", 
        gst: "", 
        pan: "",
        accounts: [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }]
      }],
      active: "Yes",
      tds_percent: 0
    });
  };

  const addBranch = () => {
    setFormData({
      ...formData,
      branches: [...formData.branches, { 
        branch_no: "", 
        branch_name: "", 
        address: "", 
        city: "", 
        country: "", 
        postal_code: "", 
        gst: "", 
        pan: "",
        accounts: [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }]
      }]
    });
  };

  const removeBranch = (index) => {
    const branch = formData.branches[index];
    setConfirmDialog({
      open: true,
      title: "Delete Branch",
      message: branch._id 
        ? "Are you sure you want to delete this branch? This will be immediately removed from the database." 
        : "Are you sure you want to delete this branch?",
      onConfirm: async () => {
        if (branch._id && editingId) {
          try {
            await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-supplier/${editingId}/branch/${branch._id}`);
            handleSnackbar("Branch deleted from database successfully", "success");
            fetchSuppliers(); // Refresh the main list
            
            // Also update local state to reflect change immediately in Dialog
            const newBranches = formData.branches.filter((_, i) => i !== index);
            setFormData({ 
                ...formData, 
                branches: newBranches.length > 0 
                    ? newBranches 
                    : [{ branch_no: "0", branch_name: "", address: "", city: "", country: "", postal_code: "", gst: "", pan: "", accounts: [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }] }] 
            });
          } catch (error) {
            handleSnackbar("Failed to delete branch from database", "error");
          }
        } else {
          // New branch not yet in DB, just remove locally
          const newBranches = formData.branches.filter((_, i) => i !== index);
          setFormData({ 
              ...formData, 
              branches: newBranches.length > 0 
                  ? newBranches 
                  : [{ branch_no: "0", branch_name: "", address: "", city: "", country: "", postal_code: "", gst: "", pan: "", accounts: [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }] }] 
          });
        }
      }
    });
  };

  const handleBranchChange = (index, field, value) => {
    const newBranches = [...formData.branches];
    const processedValue = typeof value === 'string' ? value.toUpperCase() : value;
    newBranches[index][field] = processedValue;
    setFormData({ ...formData, branches: newBranches });
  };

  const handleAccountChange = (branchIndex, accountIndex, field, value) => {
    const newBranches = [...formData.branches];
    newBranches[branchIndex].accounts[accountIndex][field] = value.toUpperCase();
    setFormData({ ...formData, branches: newBranches });
  };

  const addAccount = (branchIndex) => {
    const newBranches = [...formData.branches];
    newBranches[branchIndex].accounts = [
      ...(newBranches[branchIndex].accounts || []),
      { bankName: "", accountNo: "", ifsc: "", adCode: "" }
    ];
    setFormData({ ...formData, branches: newBranches });
  };

  const removeAccount = (branchIndex, accountIndex) => {
    const branch = formData.branches[branchIndex];
    const account = branch.accounts[accountIndex];
    
    setConfirmDialog({
      open: true,
      title: "Delete Bank Account",
      message: account._id && branch._id 
        ? "Are you sure you want to delete this bank account? This will be immediately removed from the database." 
        : "Are you sure you want to delete this bank account?",
      onConfirm: async () => {
        if (account._id && branch._id && editingId) {
          try {
            await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-supplier/${editingId}/branch/${branch._id}/account/${account._id}`);
            handleSnackbar("Bank account deleted from database successfully", "success");
            fetchSuppliers();
            
            // Update local state
            const newBranches = [...formData.branches];
            newBranches[branchIndex].accounts.splice(accountIndex, 1);
            setFormData({ ...formData, branches: newBranches });
          } catch (error) {
            handleSnackbar("Failed to delete bank account from database", "error");
          }
        } else {
          // New account or branch, remove locally
          const newBranches = [...formData.branches];
          newBranches[branchIndex].accounts.splice(accountIndex, 1);
          setFormData({ ...formData, branches: newBranches });
        }
      }
    });
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.branches && s.branches.some(b => 
      (b.branch_name && b.branch_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.address && b.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.city && b.city.toLowerCase().includes(searchTerm.toLowerCase()))
    ))
  );

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link 
          underline="hover" 
          color="inherit" 
          href="#" 
          onClick={(e) => { e.preventDefault(); navigate("/master-directory"); }}
        >
          Master Directory
        </Link>
        <Typography color="text.primary">Suppliers Directory</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Suppliers Directory</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add Supplier
        </Button>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name or address..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3, maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Paper sx={{ width: "100%", overflow: "auto" }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table stickyHeader sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Supplier Name</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Branches</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Main Branch (GST/PAN)</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Address (First Branch)</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Active</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>TDS %</TableCell>
                <TableCell align="center" sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSuppliers.map((supplier, index) => (
                <TableRow key={index} hover>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>
                    {supplier.branches?.length || 0} Branch(es)
                    <Typography variant="caption" display="block" color="textSecondary">
                      {supplier.branches?.map(b => `${b.branch_no || ""}: ${b.branch_name}`).join(", ")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">GST: {supplier.branches?.[0]?.gst || "N/A"}</Typography>
                    <Typography variant="caption" display="block">PAN: {supplier.branches?.[0]?.pan || "N/A"}</Typography>
                  </TableCell>
                  <TableCell>
                    {supplier.branches?.[0]?.address || "N/A"}
                    {supplier.branches?.[0]?.city && `, ${supplier.branches[0].city}`}
                  </TableCell>
                  <TableCell>{supplier.active}</TableCell>
                  <TableCell>{supplier.tds_percent || 0}%</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit(supplier)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(supplier._id)} color="error">
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSuppliers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ p: 4 }}>
                      No suppliers found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
            />
            
            <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Branches</Typography>
              <Button startIcon={<AddCircleOutlineIcon />} onClick={addBranch} size="small">
                Add Branch
              </Button>
            </Box>

            {formData.branches.map((branch, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2, position: 'relative', bgcolor: '#fafafa' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="primary">Branch #{index + 1}</Typography>
                    {formData.branches.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => removeBranch(index)}>
                        <RemoveCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Branch No"
                        value={branch.branch_no}
                        onChange={(e) => handleBranchChange(index, 'branch_no', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={8}>
                      <TextField
                        fullWidth
                        label="Branch Name"
                        value={branch.branch_name}
                        onChange={(e) => handleBranchChange(index, 'branch_name', e.target.value)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    value={branch.address}
                    onChange={(e) => handleBranchChange(index, 'address', e.target.value)}
                    size="small"
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="City"
                        value={branch.city}
                        onChange={(e) => handleBranchChange(index, 'city', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Postal Code"
                        value={branch.postal_code}
                        onChange={(e) => handleBranchChange(index, 'postal_code', e.target.value)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="GST Number"
                        value={branch.gst}
                        onChange={(e) => handleBranchChange(index, 'gst', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="PAN Card"
                        value={branch.pan}
                        onChange={(e) => handleBranchChange(index, 'pan', e.target.value)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    fullWidth
                    label="Country"
                    value={branch.country}
                    onChange={(e) => handleBranchChange(index, 'country', e.target.value)}
                    size="small"
                  />

                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" color="primary">Account Details</Typography>
                        <Button size="small" variant="text" startIcon={<AddCircleOutlineIcon />} onClick={() => addAccount(index)}>Add Account</Button>
                    </Box>
                    {branch.accounts?.map((account, accIdx) => (
                        <Box key={accIdx} sx={{ 
                            p: 2, 
                            mb: 2, 
                            border: '1px dashed #ccc', 
                            borderRadius: 1, 
                            position: 'relative',
                            bgcolor: '#fff' 
                        }}>
                             {branch.accounts.length > 1 && (
                                <IconButton 
                                    size="small" 
                                    color="error" 
                                    sx={{ position: 'absolute', right: 0, top: 0 }} 
                                    onClick={() => removeAccount(index, accIdx)}
                                >
                                    <RemoveCircleOutlineIcon fontSize="small" />
                                </IconButton>
                            )}
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Bank Name"
                                        size="small"
                                        value={account.bankName}
                                        onChange={(e) => handleAccountChange(index, accIdx, 'bankName', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Account No"
                                        size="small"
                                        value={account.accountNo}
                                        onChange={(e) => handleAccountChange(index, accIdx, 'accountNo', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="IFSC Code"
                                        size="small"
                                        value={account.ifsc}
                                        onChange={(e) => handleAccountChange(index, accIdx, 'ifsc', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="AD Code"
                                        size="small"
                                        value={account.adCode}
                                        onChange={(e) => handleAccountChange(index, accIdx, 'adCode', e.target.value)}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    ))}
                  </Box>
                </Box>
              </Paper>
            ))}

            <TextField
              select
              label="Active"
              SelectProps={{ native: true }}
              value={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.value })}
              sx={{ mt: 1 }}
            >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </TextField>
            <TextField
              fullWidth
              label="TDS %"
              type="number"
              value={formData.tds_percent}
              onChange={(e) => setFormData({ ...formData, tds_percent: parseFloat(e.target.value) || 0 })}
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">{editingId ? "Update" : "Add"}</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancel</Button>
          <Button 
            onClick={() => {
              confirmDialog.onConfirm();
              setConfirmDialog({ ...confirmDialog, open: false });
            }} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SupplierDirectory;

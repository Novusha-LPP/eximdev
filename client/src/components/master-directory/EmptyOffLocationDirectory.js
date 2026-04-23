import React, { useState, useEffect } from "react";
import { 
  Table, TextField, InputAdornment, Box, Paper, Typography, 
  Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Snackbar, Alert, CircularProgress, IconButton,
  TableBody, TableCell, TableHead, TableRow, Accordion,
  AccordionSummary, AccordionDetails, Divider, Chip, OutlinedInput,
  Select, MenuItem, FormControl, InputLabel, Checkbox, ListItemText
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const EmptyOffLocationDirectory = () => {
  const [locations, setLocations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    active: "YES",
    assigned_branches: [],
    tds_percent: 0,
    contacts: [],
    credit_terms: "",
    cin: "",
    branches: []
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });

  const navigate = useNavigate();

  useEffect(() => {
    fetchLocations();
    fetchBranches();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-empty-off-locations`);
      setLocations(res.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      handleSnackbar("Failed to fetch locations", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/get-branches`);
      // Filter unique branch codes
      const uniqueBranches = Array.from(new Set(res.data.map(b => b.branch_code)))
        .map(code => {
          return res.data.find(b => b.branch_code === code);
        });
      setBranches(uniqueBranches);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const addBranch = () => {
    setFormData({
      ...formData,
      branches: [
        ...formData.branches,
        {
          branch_no: formData.branches.length === 0 ? "0" : "",
          branchName: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
          country: "",
          gst: "",
          pan: "",
          accounts: [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }]
        }
      ]
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
            await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-empty-off-location/${editingId}/branch/${branch._id}`);
            handleSnackbar("Branch deleted from database successfully", "success");
            fetchLocations(); // Refresh the main list
            
            // Also update local state to reflect change immediately in Dialog
            const updatedBranches = [...formData.branches];
            updatedBranches.splice(index, 1);
            setFormData({ ...formData, branches: updatedBranches });
          } catch (error) {
            handleSnackbar("Failed to delete branch from database", "error");
          }
        } else {
          // New branch not yet in DB, just remove locally
          const updatedBranches = [...formData.branches];
          updatedBranches.splice(index, 1);
          setFormData({ ...formData, branches: updatedBranches });
        }
      }
    });
  };

  const handleBranchChange = (index, field, value) => {
    const updatedBranches = [...formData.branches];
    updatedBranches[index][field] = value.toUpperCase();
    setFormData({ ...formData, branches: updatedBranches });
  };

  const addAccount = (branchIndex) => {
    const updatedBranches = [...formData.branches];
    updatedBranches[branchIndex].accounts.push({ bankName: "", accountNo: "", ifsc: "", adCode: "" });
    setFormData({ ...formData, branches: updatedBranches });
  };

  const removeAccount = (branchIndex, accountIndex) => {
    const branch = formData.branches[branchIndex];
    const account = branch.accounts[accountIndex];
    
    setConfirmDialog({
      open: true,
      title: "Delete Bank Account",
      message: account._id 
        ? "Are you sure you want to delete this bank account? This will be immediately removed from the database." 
        : "Are you sure you want to delete this bank account?",
      onConfirm: async () => {
        if (account._id && editingId && branch._id) {
          try {
            await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-empty-off-location/${editingId}/branch/${branch._id}/account/${account._id}`);
            handleSnackbar("Bank account deleted from database successfully", "success");
            fetchLocations();
            
            const updatedBranches = [...formData.branches];
            updatedBranches[branchIndex].accounts.splice(accountIndex, 1);
            setFormData({ ...formData, branches: updatedBranches });
          } catch (error) {
            handleSnackbar("Failed to delete bank account", "error");
          }
        } else {
          const updatedBranches = [...formData.branches];
          updatedBranches[branchIndex].accounts.splice(accountIndex, 1);
          setFormData({ ...formData, branches: updatedBranches });
        }
      }
    });
  };

  const handleAccountChange = (branchIndex, accountIndex, field, value) => {
    const updatedBranches = [...formData.branches];
    updatedBranches[branchIndex].accounts[accountIndex][field] = value.toUpperCase();
    setFormData({ ...formData, branches: updatedBranches });
  };

  const addContact = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: "", email: "", phone: "" }]
    });
  };

  const removeContact = (index) => {
    const updatedContacts = [...formData.contacts];
    updatedContacts.splice(index, 1);
    setFormData({ ...formData, contacts: updatedContacts });
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...formData.contacts];
    updatedContacts[index][field] = field === 'email' ? value.toLowerCase() : value.toUpperCase();
    setFormData({ ...formData, contacts: updatedContacts });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      active: "YES",
      assigned_branches: [],
      tds_percent: 0,
      contacts: [],
      credit_terms: "",
      cin: "",
      branches: []
    });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      handleSnackbar("Location name is required", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-empty-off-location/${editingId}`, formData);
        handleSnackbar("Location updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-empty-off-location`, formData);
        handleSnackbar("Location added successfully", "success");
      }
      handleClose();
      fetchLocations();
    } catch (error) {
      handleSnackbar(error.response?.data?.message || "Failed to save location", "error");
    }
  };

  const handleEdit = (loc) => {
    setEditingId(loc._id);
    setFormData({
      name: loc.name,
      active: loc.active || "YES",
      assigned_branches: loc.assigned_branches || [],
      tds_percent: loc.tds_percent || 0,
      contacts: loc.contacts || [],
      credit_terms: loc.credit_terms || "",
      cin: loc.cin || "",
      branches: loc.branches || []
    });
    setOpen(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      open: true,
      title: "Delete Empty Off Location",
      message: "Are you sure you want to delete this location? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-empty-off-location/${id}`);
          handleSnackbar("Location deleted successfully", "success");
          fetchLocations();
        } catch (error) {
          handleSnackbar("Failed to delete location", "error");
        }
      }
    });
  };

  const handleAssignedBranchChange = (event) => {
    const {
      target: { value },
    } = event;
    setFormData({
      ...formData,
      assigned_branches: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.assigned_branches?.some(b => b.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <Typography color="text.primary">Empty Off Locations</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Empty Off Location Directory</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add Location
        </Button>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name or branch..."
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
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Location Name</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Assigned Branches (DO)</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="center" sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLocations.map((loc, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{loc.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {loc.assigned_branches?.map((branch) => (
                        <Chip key={branch} label={branch} size="small" color="primary" variant="outlined" />
                      ))}
                      {(!loc.assigned_branches || loc.assigned_branches.length === 0) && "None"}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={loc.active} 
                      color={loc.active?.toUpperCase() === "YES" ? "success" : "default"} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit(loc)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(loc._id)} color="error">
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLocations.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ p: 4 }}>
                      No locations found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Main Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? "Edit Empty Off Location" : "Add Empty Off Location"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            
            {/* Basic Info */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Basic Information</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Location Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                />
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    select
                    fullWidth
                    label="Active"
                    SelectProps={{ native: true }}
                    value={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value })}
                  >
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                  </TextField>

                  <TextField
                    fullWidth
                    label="TDS Percent (%)"
                    type="number"
                    value={formData.tds_percent}
                    onChange={(e) => setFormData({ ...formData, tds_percent: e.target.value })}
                  />
                </Box>

                <FormControl fullWidth>
                  <InputLabel id="assigned-branches-label">Assigned Branches (For DO List)</InputLabel>
                  <Select
                    labelId="assigned-branches-label"
                    multiple
                    value={formData.assigned_branches}
                    onChange={handleAssignedBranchChange}
                    input={<OutlinedInput label="Assigned Branches (For DO List)" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                    MenuProps={MenuProps}
                  >
                    {branches.map((branch) => (
                      <MenuItem key={branch.branch_code} value={branch.branch_code}>
                        <Checkbox checked={formData.assigned_branches.indexOf(branch.branch_code) > -1} />
                        <ListItemText primary={`${branch.branch_name} (${branch.branch_code})`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Credit Terms"
                  value={formData.credit_terms}
                  onChange={(e) => setFormData({ ...formData, credit_terms: e.target.value.toUpperCase() })}
                />

                <TextField
                  fullWidth
                  label="CIN"
                  value={formData.cin}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                />
              </Box>
            </Paper>

            {/* Contacts Section */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Contacts</Typography>
                <Button startIcon={<AddIcon />} size="small" onClick={addContact}>Add Contact</Button>
              </Box>
              {formData.contacts.map((contact, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                  <TextField
                    label="Name"
                    size="small"
                    value={contact.name}
                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                  />
                  <TextField
                    label="Email"
                    size="small"
                    value={contact.email}
                    onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                  />
                  <TextField
                    label="Phone"
                    size="small"
                    value={contact.phone}
                    onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                  />
                  <IconButton color="error" size="small" onClick={() => removeContact(index)}>
                    <RemoveCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              {formData.contacts.length === 0 && <Typography variant="body2" color="text.secondary">No contacts added.</Typography>}
            </Paper>

            {/* Branches Section */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Typography variant="h6">Branch Locations & Bank Details</Typography>
                <Button variant="outlined" startIcon={<AddIcon />} size="small" onClick={addBranch}>Add Branch Info</Button>
              </Box>
              
              {formData.branches.map((branch, bIndex) => (
                <Accordion key={bIndex} sx={{ mb: 1 }} defaultExpanded={formData.branches.length === 1}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 2 }}>
                      <BusinessIcon color="action" />
                      <Typography sx={{ flexGrow: 1 }}>{branch.branchName || `Branch ${bIndex + 1}`}</Typography>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => { e.stopPropagation(); removeBranch(bIndex); }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                      <TextField label="Branch No" size="small" value={branch.branch_no} onChange={(e) => handleBranchChange(bIndex, 'branch_no', e.target.value)} />
                      <TextField label="Branch Name" size="small" value={branch.branchName} onChange={(e) => handleBranchChange(bIndex, 'branchName', e.target.value)} />
                      <TextField label="Address" size="small" fullWidth sx={{ gridColumn: 'span 2' }} value={branch.address} onChange={(e) => handleBranchChange(bIndex, 'address', e.target.value)} />
                      <TextField label="City" size="small" value={branch.city} onChange={(e) => handleBranchChange(bIndex, 'city', e.target.value)} />
                      <TextField label="State" size="small" value={branch.state} onChange={(e) => handleBranchChange(bIndex, 'state', e.target.value)} />
                      <TextField label="Pincode" size="small" value={branch.pincode} onChange={(e) => handleBranchChange(bIndex, 'pincode', e.target.value)} />
                      <TextField label="Country" size="small" value={branch.country} onChange={(e) => handleBranchChange(bIndex, 'country', e.target.value)} />
                      <TextField label="GST" size="small" value={branch.gst} onChange={(e) => handleBranchChange(bIndex, 'gst', e.target.value)} />
                      <TextField label="PAN" size="small" value={branch.pan} onChange={(e) => handleBranchChange(bIndex, 'pan', e.target.value)} />
                    </Box>

                    <Divider sx={{ mb: 2 }}>Bank Accounts</Divider>
                    
                    <Box sx={{ pl: 2 }}>
                      {branch.accounts.map((acc, aIndex) => (
                        <Box key={aIndex} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 1, mb: 2, alignItems: 'center' }}>
                          <TextField label="Bank Name" size="small" value={acc.bankName} onChange={(e) => handleAccountChange(bIndex, aIndex, 'bankName', e.target.value)} />
                          <TextField label="Account No" size="small" value={acc.accountNo} onChange={(e) => handleAccountChange(bIndex, aIndex, 'accountNo', e.target.value)} />
                          <TextField label="IFSC" size="small" value={acc.ifsc} onChange={(e) => handleAccountChange(bIndex, aIndex, 'ifsc', e.target.value)} />
                          <TextField label="AD Code" size="small" value={acc.adCode} onChange={(e) => handleAccountChange(bIndex, aIndex, 'adCode', e.target.value)} />
                          <IconButton color="error" size="small" onClick={() => removeAccount(bIndex, aIndex)}>
                            <RemoveCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                      <Button size="small" startIcon={<AddIcon />} onClick={() => addAccount(bIndex)}>Add Account</Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" size="large">{editingId ? "Update Location" : "Add Location"}</Button>
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

export default EmptyOffLocationDirectory;

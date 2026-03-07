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
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Switch,
    FormControlLabel,
    Grid,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

function BranchManagement() {
    const [branches, setBranches] = useState([]);

    // Form states for Branch
    const [branchName, setBranchName] = useState("");
    const [branchCode, setBranchCode] = useState("");
    const [branchCategory, setBranchCategory] = useState("SEA");
    const [branchIsActive, setBranchIsActive] = useState(true);

    // Edit states
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [editBranchName, setEditBranchName] = useState("");
    const [editBranchIsActive, setEditBranchIsActive] = useState(true);

    // Form states for adding Port to a Branch
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [portName, setPortName] = useState("");
    const [portCode, setPortCode] = useState("");

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/get-branches`, {
                withCredentials: true
            });
            setBranches(response.data || []);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleAddBranch = async (e) => {
        e.preventDefault();
        if (branchCode.length < 3 || branchCode.length > 5) {
            showSnackbar("Branch Code must be 3-5 characters", "error");
            return;
        }

        try {
            await axios.post(
                `${process.env.REACT_APP_API_STRING}/admin/add-branch`,
                {
                    branch_name: branchName,
                    branch_code: branchCode,
                    category: branchCategory,
                    is_active: branchIsActive
                },
                { withCredentials: true }
            );
            showSnackbar("Branch created successfully!", "success");
            setBranchName("");
            setBranchCode("");
            setBranchCategory("SEA");
            setBranchIsActive(true);
            fetchBranches();
        } catch (error) {
            showSnackbar(error.response?.data?.error || "Error adding branch", "error");
        }
    };

    const handleOpenEdit = (branch) => {
        setEditingBranch(branch);
        setEditBranchName(branch.branch_name);
        setEditBranchIsActive(branch.is_active);
        setEditDialogOpen(true);
    };

    const handleCloseEdit = () => {
        setEditDialogOpen(false);
        setEditingBranch(null);
    };

    const handleUpdateBranch = async () => {
        try {
            await axios.put(
                `${process.env.REACT_APP_API_STRING}/admin/update-branch/${editingBranch._id}`,
                {
                    branch_name: editBranchName,
                    is_active: editBranchIsActive
                },
                { withCredentials: true }
            );
            showSnackbar("Branch updated successfully!", "success");
            handleCloseEdit();
            fetchBranches();
        } catch (error) {
            showSnackbar(error.response?.data?.error || "Error updating branch", "error");
        }
    };

    const handleAddPortToBranch = async (e) => {
        e.preventDefault();
        if (!selectedBranchId) {
            showSnackbar("Please select a Branch first", "warning");
            return;
        }

        try {
            await axios.post(
                `${process.env.REACT_APP_API_STRING}/admin/add-branch-port`,
                {
                    branch_id: selectedBranchId,
                    port_name: portName,
                    port_code: portCode
                },
                { withCredentials: true }
            );
            showSnackbar("Port added to Branch successfully!", "success");
            setPortName("");
            setPortCode("");
            fetchBranches(); // refresh the list to show the newly added port
        } catch (error) {
            showSnackbar(error.response?.data?.error || "Error adding port to branch", "error");
        }
    };

    // Find the selected branch to display its ports
    const selectedBranchData = branches.find(b => b._id === selectedBranchId);

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                Branch & Port Management
            </Typography>

            <Grid container spacing={4}>
                {/* BRANCH CREATION SECTION */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, mb: 4 }}>
                        <Typography variant="h6" gutterBottom color="primary">
                            1. Create New Branch
                        </Typography>
                        <form onSubmit={handleAddBranch}>
                            <Box display="flex" flexDirection="column" gap={2}>
                                <TextField
                                    label="Branch Name"
                                    variant="outlined"
                                    size="small"
                                    value={branchName}
                                    onChange={(e) => setBranchName(e.target.value)}
                                    required
                                />
                                <TextField
                                    label="Branch Code (3-5 chars)"
                                    variant="outlined"
                                    size="small"
                                    value={branchCode}
                                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                                    required
                                    inputProps={{ minLength: 3, maxLength: 5 }}
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={branchIsActive}
                                            onChange={(e) => setBranchIsActive(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="Is Active"
                                />

                                <Button type="submit" variant="contained" color="primary">
                                    Create Branch (SEA & AIR)
                                </Button>
                            </Box>
                        </form>
                    </Paper>
                </Grid>

                {/* PORT CREATION SECTION */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, mb: 4 }}>
                        <Typography variant="h6" gutterBottom color="secondary">
                            2. Add Port to Branch
                        </Typography>
                        <form onSubmit={handleAddPortToBranch}>
                            <Box display="flex" flexDirection="column" gap={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Select Target Branch</InputLabel>
                                    <Select
                                        value={selectedBranchId}
                                        label="Select Target Branch"
                                        onChange={(e) => setSelectedBranchId(e.target.value)}
                                        required
                                    >
                                        {branches.map(b => (
                                            <MenuItem key={b._id} value={b._id}>
                                                {b.branch_name} ({b.branch_code}) - {b.category}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Port Name"
                                    variant="outlined"
                                    size="small"
                                    value={portName}
                                    onChange={(e) => setPortName(e.target.value)}
                                    required
                                    disabled={!selectedBranchId}
                                />
                                <TextField
                                    label="Port Code"
                                    variant="outlined"
                                    size="small"
                                    value={portCode}
                                    onChange={(e) => setPortCode(e.target.value.toUpperCase())}
                                    required
                                    disabled={!selectedBranchId}
                                />

                                <Button type="submit" variant="contained" color="secondary" disabled={!selectedBranchId}>
                                    Add Port to Selected Branch
                                </Button>
                            </Box>
                        </form>

                        <Box mt={2} p={1} bgcolor="#f8f9fa" borderRadius={1}>
                            <Typography variant="subtitle2" color="textSecondary">
                                Quick View: Ports in selected branch
                            </Typography>
                            {selectedBranchData ? (
                                selectedBranchData.ports && selectedBranchData.ports.length > 0 ? (
                                    <ul style={{ margin: "5px 0", paddingLeft: "20px", fontSize: "0.85rem" }}>
                                        {selectedBranchData.ports.map(p => (
                                            <li key={p._id}>{p.port_name} ({p.port_code})</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                        No ports added yet.
                                    </Typography>
                                )
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                    Select a branch to view its ports.
                                </Typography>
                            )}
                        </Box>

                    </Paper>
                </Grid>
            </Grid>

            {/* VIEW ALL BRANCHES SECTION */}
            <Typography variant="h6" gutterBottom>
                3. All Branches Overview
            </Typography>
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                        <TableRow>
                            <TableCell><strong>Branch Code</strong></TableCell>
                            <TableCell><strong>Branch Name</strong></TableCell>
                            <TableCell><strong>Category</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Linked Ports</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {branches.map((b) => (
                            <TableRow key={b._id}>
                                <TableCell>{b.branch_code}</TableCell>
                                <TableCell>{b.branch_name}</TableCell>
                                <TableCell>{b.category}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" color={b.is_active ? "green" : "red"}>
                                        {b.is_active ? "Active" : "Inactive"}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {b.ports && b.ports.length > 0 ? (
                                        b.ports.map(p => `${p.port_name} (${p.port_code})`).join(", ")
                                    ) : (
                                        <Typography variant="caption" color="textSecondary">
                                            No ports assigned
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleOpenEdit(b)} color="primary">
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {branches.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">No branches found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Edit Branch Dialog */}
            <Dialog open={editDialogOpen} onClose={handleCloseEdit} fullWidth maxWidth="xs">
                <DialogTitle>Edit Branch</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Branch Name"
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={editBranchName}
                            onChange={(e) => setEditBranchName(e.target.value)}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={editBranchIsActive}
                                    onChange={(e) => setEditBranchIsActive(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Is Active"
                        />
                        <Typography variant="caption" color="textSecondary">
                            Note: Changes will apply to both SEA and AIR versions of this branch.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEdit}>Cancel</Button>
                    <Button onClick={handleUpdateBranch} variant="contained" color="primary">
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default BranchManagement;

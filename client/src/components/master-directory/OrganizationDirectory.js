import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import { Row, Col } from "react-bootstrap";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  Chip,
  Typography,
  Button,
  Box,
  Paper
} from "@mui/material";
import { 
  Edit, 
  Delete, 
  Add,
  Business,
  Search
} from "@mui/icons-material";

const OrganizationDirectory = () => {
  const [organizations, setOrganizations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin";
  
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch all organizations
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/organization`);
      setOrganizations(res.data.organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  const handleEdit = (id) => {
    navigate(`/edit-organization/${id}`);
  };

  const handleAdd = () => {
    navigate("/add-organization");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Sent for revision': return 'error';
      default: return 'default';
    }
  };

  const filteredOrganizations = organizations.filter(org => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.iec_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.pan_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const displayedOrganizations = filteredOrganizations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <div style={{ padding: '20px' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2d3748' }}>
            <Business sx={{ mr: 2, fontSize: '32px', verticalAlign: 'middle' }} />
            Organization Master Directory
            <Chip 
              label={`${organizations.length} Total`} 
              size="small" 
              color="primary" 
              sx={{ ml: 2, verticalAlign: 'middle', fontWeight: 'bold' }} 
            />
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage your customer KYC records and organization profiles in one place.
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <TextField
            placeholder="Search by name, IE Code, or PAN..."
            size="small"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: '350px', background: '#fff', borderRadius: '8px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Add />} 
            onClick={handleAdd}
            sx={{ borderRadius: '8px', px: 3, py: 1, fontWeight: 'bold' }}
          >
            Add Organization
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ p: 4, borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff' }}>
        <Table>
          <TableHead sx={{ background: '#f8fafc' }}>
            <TableRow>
              <TableCell><strong>Organization Name & Category</strong></TableCell>
              <TableCell><strong>Contact Details</strong></TableCell>
              <TableCell><strong>IE Code & PAN</strong></TableCell>
              <TableCell><strong>Location</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedOrganizations.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No records found {searchTerm && `matching "${searchTerm}"`}.</TableCell></TableRow>
            ) : (
              displayedOrganizations.map((org) => (
                <TableRow key={org._id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{org.name}</Typography>
                    <Chip label={org.category} size="small" variant="outlined" sx={{ mt: 0.5, fontSize: '10px' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{org.contact}</Typography>
                    <Typography variant="caption" color="textSecondary">{org.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">IE: {org.iec_no || 'N/A'}</Typography>
                    <Typography variant="caption" color="textSecondary">PAN: {org.pan_no || 'N/A'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{org.addressDetails?.city}, {org.addressDetails?.state}</Typography>
                    <Typography variant="caption" color="textSecondary">{org.addressDetails?.pinCode}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={org.approval || 'Pending'} color={getStatusColor(org.approval)} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" size="small" onClick={() => handleEdit(org._id)}><Edit fontSize="small" /></IconButton>
                    {isAdmin && (
                      <IconButton color="error" size="small" onClick={() => { setSelectedOrgId(org._id); setOpenDeleteDialog(true); }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredOrganizations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ mt: 2 }}
        />
      </Paper>

      {/* Delete Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent><DialogContentText>Remove this organization from KYC records?</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={async () => {
            try {
              await axios.delete(`${process.env.REACT_APP_API_STRING}/organization/${selectedOrgId}`);
              setOrganizations(organizations.filter(o => o._id !== selectedOrgId));
              setSnackbar({ open: true, message: "Deleted successfully!", severity: "success" });
              setOpenDeleteDialog(false);
            } catch (e) { setSnackbar({ open: true, message: "Delete failed.", severity: "error" }); }
          }} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default OrganizationDirectory;

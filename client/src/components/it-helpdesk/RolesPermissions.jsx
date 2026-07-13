import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  Chip,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SecurityIcon from "@mui/icons-material/Security";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { toast } from "react-hot-toast";

// Permission categories for IT Helpdesk
const PERMISSION_CATEGORIES = [
  {
    id: "asset",
    name: "Asset Management",
    permissions: [
      { id: "asset_view", name: "View Assets", description: "View asset details and lists" },
      { id: "asset_create", name: "Create Assets", description: "Create new assets" },
      { id: "asset_edit", name: "Edit Assets", description: "Modify existing assets" },
      { id: "asset_delete", name: "Delete Assets", description: "Delete assets" },
      { id: "asset_assign", name: "Assign Assets", description: "Assign assets to users" },
      { id: "asset_return", name: "Return Assets", description: "Process asset returns" },
    ]
  },
  {
    id: "ticket",
    name: "Ticket Management",
    permissions: [
      { id: "ticket_view", name: "View Tickets", description: "View ticket details and lists" },
      { id: "ticket_create", name: "Create Tickets", description: "Create new tickets" },
      { id: "ticket_edit", name: "Edit Tickets", description: "Modify existing tickets" },
      { id: "ticket_delete", name: "Delete Tickets", description: "Delete tickets" },
      { id: "ticket_assign", name: "Assign Tickets", description: "Assign tickets to team members" },
      { id: "ticket_escalate", name: "Escalate Tickets", description: "Escalate ticket priority" },
      { id: "ticket_close", name: "Close Tickets", description: "Close/resolve tickets" },
    ]
  },
  {
    id: "user",
    name: "User Management",
    permissions: [
      { id: "user_view", name: "View Users", description: "View user details and lists" },
      { id: "user_create", name: "Create Users", description: "Create new user accounts" },
      { id: "user_edit", name: "Edit Users", description: "Modify user accounts" },
      { id: "user_delete", name: "Delete Users", description: "Delete user accounts" },
      { id: "user_role", name: "Manage Roles", description: "Assign roles to users" },
      { id: "user_group", name: "Manage Groups", description: "Add/remove users from groups" },
    ]
  },
  {
    id: "admin",
    name: "Administration",
    permissions: [
      { id: "admin_settings", name: "System Settings", description: "Configure system settings" },
      { id: "admin_audit", name: "View Audit Logs", description: "Access audit trail logs" },
      { id: "admin_backup", name: "System Backup", description: "Perform system backups" },
      { id: "admin_restore", name: "System Restore", description: "Restore from backups" },
      { id: "admin_notifications", name: "Notification Settings", description: "Configure notifications" },
    ]
  },
  {
    id: "report",
    name: "Reporting",
    permissions: [
      { id: "report_view", name: "View Reports", description: "Access reporting dashboard" },
      { id: "report_generate", name: "Generate Reports", description: "Create new reports" },
      { id: "report_export", name: "Export Reports", description: "Export reports to various formats" },
      { id: "report_custom", name: "Custom Reports", description: "Create custom report queries" },
    ]
  },
];

// Predefined roles with their permissions
const PREDEFINED_ROLES = [
  {
    id: 1,
    name: "Administrator",
    description: "Full system access with all permissions",
    is_predefined: true,
    permissions: PERMISSION_CATEGORIES.flatMap(cat => cat.permissions.map(p => p.id))
  },
  {
    id: 2,
    name: "IT Manager",
    description: "IT department management access",
    is_predefined: true,
    permissions: [
      "asset_view", "asset_create", "asset_edit", "asset_delete", "asset_assign", "asset_return",
      "ticket_view", "ticket_create", "ticket_edit", "ticket_delete", "ticket_assign", "ticket_escalate", "ticket_close",
      "user_view", "user_create", "user_edit", "user_role", "user_group",
      "report_view", "report_generate", "report_export"
    ]
  },
  {
    id: 3,
    name: "IT Technician",
    description: "IT support team member",
    is_predefined: true,
    permissions: [
      "asset_view", "asset_assign", "asset_return",
      "ticket_view", "ticket_create", "ticket_edit", "ticket_close",
      "report_view"
    ]
  },
  {
    id: 4,
    name: "Employee",
    description: "Regular employee access",
    is_predefined: true,
    permissions: [
      "asset_view",
      "ticket_view", "ticket_create",
      "report_view"
    ]
  },
];

export default function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: []
  });
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRoles = roles.filter(role => {
    const term = searchTerm.toLowerCase();
    return (
      (role.name || "").toLowerCase().includes(term) ||
      (role.description || "").toLowerCase().includes(term)
    );
  });

  // Fetch data
  const fetchData = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Start with predefined roles and add custom ones
      const mockRoles = [
        ...PREDEFINED_ROLES,
        {
          id: 5,
          name: "Helpdesk Manager",
          description: "Custom role for helpdesk team leads",
          is_predefined: false,
          permissions: [
            "asset_view", "asset_create", "asset_edit", "asset_assign",
            "ticket_view", "ticket_create", "ticket_edit", "ticket_delete", "ticket_assign", "ticket_escalate", "ticket_close",
            "user_view",
            "report_view", "report_generate", "report_export"
          ],
          created_date: "2023-05-10",
          user_count: 3
        },
        {
          id: 6,
          name: "Auditor",
          description: "Audit and compliance role",
          is_predefined: false,
          permissions: [
            "asset_view",
            "ticket_view",
            "user_view",
            "admin_audit",
            "report_view", "report_export"
          ],
          created_date: "2023-06-15",
          user_count: 2
        }
      ];

      setRoles(mockRoles);
      setLoading(false);
    }, 500);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle permission selection
  const handlePermissionSelection = (permissionId, checked) => {
    setSelectedPermissions(prev => {
      if (checked) {
        return [...prev, permissionId];
      } else {
        return prev.filter(id => id !== permissionId);
      }
    });
  };

  // Select all permissions in a category
  const handleSelectAllCategory = (categoryId, select) => {
    const category = PERMISSION_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) return;

    setSelectedPermissions(prev => {
      const categoryPermissionIds = category.permissions.map(p => p.id);
      if (select) {
        // Add all category permissions
        const newPermissions = [...prev];
        categoryPermissionIds.forEach(id => {
          if (!newPermissions.includes(id)) {
            newPermissions.push(id);
          }
        });
        return newPermissions;
      } else {
        // Remove all category permissions
        return prev.filter(id => !categoryPermissionIds.includes(id));
      }
    });
  };

  // Open modal for adding/editing role
  const handleOpenModal = (role = null) => {
    if (role) {
      setEditId(role.id);
      setForm({
        name: role.name,
        description: role.description,
        permissions: role.permissions
      });
      setSelectedPermissions(role.permissions);
    } else {
      setEditId(null);
      setForm({
        name: "",
        description: "",
        permissions: []
      });
      setSelectedPermissions([]);
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  // Save role
  const handleSaveRole = () => {
    if (!form.name) {
      toast.error("Role name is required");
      return;
    }

    const updatedForm = {
      ...form,
      permissions: selectedPermissions
    };

    if (editId) {
      // Update existing role
      setRoles(prev => prev.map(role => 
        role.id === editId ? { 
          ...role, 
          ...updatedForm,
          is_predefined: role.is_predefined || false,
          user_count: role.user_count || 0
        } : role
      ));
      toast.success("Role updated successfully");
    } else {
      // Add new role
      const newRole = {
        id: Date.now(),
        ...updatedForm,
        is_predefined: false,
        created_date: new Date().toISOString().split('T')[0],
        user_count: 0
      };
      setRoles(prev => [...prev, newRole]);
      toast.success("Role created successfully");
    }

    handleCloseModal();
  };

  // Delete role
  const handleDeleteRole = (id) => {
    const role = roles.find(r => r.id === id);
    if (role?.is_predefined) {
      toast.error("Predefined roles cannot be deleted");
      return;
    }

    if (window.confirm("Are you sure you want to delete this role?")) {
      setRoles(prev => prev.filter(role => role.id !== id));
      toast.success("Role deleted successfully");
    }
  };

  // Get permission count by category
  const getPermissionCount = (roleId, categoryId) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return 0;

    const category = PERMISSION_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) return 0;

    const categoryPermissions = category.permissions.map(p => p.id);
    return role.permissions.filter(p => categoryPermissions.includes(p)).length;
  };

  // Check if all permissions in category are selected for a role
  const isCategoryFullySelected = (rolePermissions, categoryId) => {
    const category = PERMISSION_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) return false;

    const categoryPermissionIds = category.permissions.map(p => p.id);
    return categoryPermissionIds.every(id => rolePermissions.includes(id));
  };

  // Initialize data
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <SecurityIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Roles & Permissions
          </Typography>
        </Box>
        <Box sx={{ maxWidth: 320, width: "100%" }}>
          <TextField
            label="Search Roles"
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
      </Box>

      {/* Roles Grid */}
      <Box mb={2}>
        <Grid container spacing={2}>
          {filteredRoles.map(role => (
            <Grid item xs={12} md={6} lg={4} key={role.id}>
              <Card sx={{ 
                height: "100%",
                border: "1px solid #e0e0e0",
                position: "relative"
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {role.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {role.description}
                      </Typography>
                    </Box>
                    {role.is_predefined && (
                      <Chip 
                        label="Predefined" 
                        color="primary" 
                        size="small" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Box mt={2}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Permissions by Category:</strong>
                    </Typography>
                    {PERMISSION_CATEGORIES.map(category => {
                      const count = getPermissionCount(role.id, category.id);
                      const total = category.permissions.length;
                      if (count === 0) return null;
                      
                      return (
                        <Box key={category.id} display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {category.name}:
                          </Typography>
                          <Typography variant="body2">
                            {count}/{total}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Users: <strong>{role.user_count || 0}</strong>
                    </Typography>
                    {role.created_date && (
                      <Typography variant="body2" color="text.secondary">
                        Created: {role.created_date}
                      </Typography>
                    )}
                  </Box>

                  <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenModal(role)}
                        disabled={role.is_predefined}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteRole(role.id)}
                        disabled={role.is_predefined}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Add New Role Button */}
      <Box display="flex" justifyContent="center" mt={2}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpenModal()}
          sx={{ minWidth: 200 }}
        >
          Create New Role
        </Button>
      </Box>

      {/* Add/Edit Role Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="lg" fullWidth>
        <DialogTitle>{editId ? "Edit Role" : "Create New Role"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Role Name"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="e.g., Helpdesk Supervisor"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                placeholder="Enter role description"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Select Permissions ({selectedPermissions.length} selected)
              </Typography>
              
              {PERMISSION_CATEGORIES.map(category => {
                const categorySelectedCount = category.permissions.filter(p => 
                  selectedPermissions.includes(p.id)
                ).length;
                const allSelected = categorySelectedCount === category.permissions.length;
                
                return (
                  <Accordion key={category.id} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                        <Typography>{category.name}</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" color="text.secondary">
                            {categorySelectedCount}/{category.permissions.length} selected
                          </Typography>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={allSelected}
                                onChange={(e) => handleSelectAllCategory(category.id, e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                size="small"
                              />
                            }
                            label="Select All"
                            sx={{ mr: 0 }}
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={1}>
                        {category.permissions.map(permission => (
                          <Grid item xs={12} sm={6} key={permission.id}>
                            <Card
                              sx={{
                                border: selectedPermissions.includes(permission.id) 
                                  ? "2px solid #1976d2" 
                                  : "1px solid #e0e0e0",
                                backgroundColor: selectedPermissions.includes(permission.id) 
                                  ? "rgba(25, 118, 210, 0.08)" 
                                  : "white",
                              }}
                            >
                              <CardContent sx={{ p: 1.5 }}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={selectedPermissions.includes(permission.id)}
                                      onChange={(e) => handlePermissionSelection(permission.id, e.target.checked)}
                                      size="small"
                                    />
                                  }
                                  label={
                                    <Box>
                                      <Typography variant="body2">{permission.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {permission.description}
                                      </Typography>
                                    </Box>
                                  }
                                  sx={{ width: "100%" }}
                                />
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRole}>
            {editId ? "Update Role" : "Create Role"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
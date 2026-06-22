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
  Avatar,
  AvatarGroup,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import { toast } from "react-hot-toast";

// Available user options for adding to groups
const AVAILABLE_USERS = [
  { id: 1, name: "John Doe", email: "john.doe@company.com" },
  { id: 2, name: "Jane Smith", email: "jane.smith@company.com" },
  { id: 3, name: "Robert Johnson", email: "robert.johnson@company.com" },
  { id: 4, name: "Sarah Williams", email: "sarah.williams@company.com" },
  { id: 5, name: "Michael Brown", email: "michael.brown@company.com" },
  { id: 6, name: "Emily Davis", email: "emily.davis@company.com" },
  { id: 7, name: "David Wilson", email: "david.wilson@company.com" },
  { id: 8, name: "Lisa Miller", email: "lisa.miller@company.com" },
];

export default function GroupManagement() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    members: []
  });
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Fetch data
  const fetchData = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for IT Helpdesk groups
      const mockGroups = [
        {
          id: 1,
          name: "IT Department",
          description: "Information Technology department users",
          members: [1, 2, 6],
          created_date: "2023-01-15",
          status: "Active"
        },
        {
          id: 2,
          name: "Finance Team",
          description: "Finance and accounting department",
          members: [3, 7],
          created_date: "2023-02-20",
          status: "Active"
        },
        {
          id: 3,
          name: "Customer Support",
          description: "Customer service and support team",
          members: [4, 5, 8],
          created_date: "2023-03-10",
          status: "Active"
        },
        {
          id: 4,
          name: "Operations Team",
          description: "Operations and logistics team",
          members: [1, 4, 6],
          created_date: "2023-04-05",
          status: "Inactive"
        }
      ];

      setGroups(mockGroups);
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

  // Handle user selection for group members
  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Open modal for adding/editing group
  const handleOpenModal = (group = null) => {
    if (group) {
      setEditId(group.id);
      setForm({
        name: group.name,
        description: group.description,
        members: group.members
      });
      setSelectedUsers(group.members);
    } else {
      setEditId(null);
      setForm({
        name: "",
        description: "",
        members: []
      });
      setSelectedUsers([]);
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  // Save group
  const handleSaveGroup = () => {
    if (!form.name) {
      toast.error("Group name is required");
      return;
    }

    const updatedForm = {
      ...form,
      members: selectedUsers
    };

    if (editId) {
      // Update existing group
      setGroups(prev => prev.map(group => 
        group.id === editId ? { 
          ...group, 
          ...updatedForm,
          status: group.status || "Active",
          created_date: group.created_date || new Date().toISOString().split('T')[0]
        } : group
      ));
      toast.success("Group updated successfully");
    } else {
      // Add new group
      const newGroup = {
        id: Date.now(),
        ...updatedForm,
        status: "Active",
        created_date: new Date().toISOString().split('T')[0]
      };
      setGroups(prev => [...prev, newGroup]);
      toast.success("Group created successfully");
    }

    handleCloseModal();
  };

  // Delete group
  const handleDeleteGroup = (id) => {
    if (window.confirm("Are you sure you want to delete this group?")) {
      setGroups(prev => prev.filter(group => group.id !== id));
      toast.success("Group deleted successfully");
    }
  };

  // Toggle group status
  const handleToggleStatus = (id) => {
    setGroups(prev => prev.map(group => 
      group.id === id ? { 
        ...group, 
        status: group.status === "Active" ? "Inactive" : "Active" 
      } : group
    ));
    toast.success("Group status updated");
  };

  // Get user name by ID
  const getUserNameById = (userId) => {
    const user = AVAILABLE_USERS.find(u => u.id === userId);
    return user ? user.name : "Unknown User";
  };

  // Get user initials for avatar
  const getUserInitials = (userId) => {
    const user = AVAILABLE_USERS.find(u => u.id === userId);
    if (!user) return "??";
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Initialize data
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <GroupIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Group Management
        </Typography>
      </Box>

      {/* Groups Grid */}
      <Box mb={2}>
        <Grid container spacing={2}>
          {groups.map(group => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={group.id}>
              <Card sx={{ 
                height: "100%",
                border: "1px solid #e0e0e0",
                position: "relative"
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {group.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {group.description}
                      </Typography>
                    </Box>
                    <Chip 
                      label={group.status} 
                      color={group.status === "Active" ? "success" : "error"} 
                      size="small" 
                      onClick={() => handleToggleStatus(group.id)}
                      sx={{ cursor: "pointer" }}
                    />
                  </Box>
                  
                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Members ({group.members.length})
                    </Typography>
                    <AvatarGroup max={4}>
                      {group.members.map(memberId => (
                        <Avatar 
                          key={memberId}
                          sx={{ width: 32, height: 32 }}
                          alt={getUserNameById(memberId)}
                        >
                          {getUserInitials(memberId)}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                  </Box>

                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary">
                      Created: {group.created_date}
                    </Typography>
                  </Box>

                  <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenModal(group)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDeleteGroup(group.id)}>
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

      {/* Add New Group Button */}
      <Box display="flex" justifyContent="center" mt={2}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpenModal()}
          sx={{ minWidth: 200 }}
        >
          Add New Group
        </Button>
      </Box>

      {/* Add/Edit Group Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Group" : "Add New Group"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Group Name"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="e.g., IT Department"
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
                rows={3}
                placeholder="Enter group description"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Select Group Members ({selectedUsers.length} selected)
              </Typography>
              <Grid container spacing={1}>
                {AVAILABLE_USERS.map(user => (
                  <Grid item xs={12} sm={6} key={user.id}>
                    <Card
                      sx={{
                        cursor: "pointer",
                        border: selectedUsers.includes(user.id) 
                          ? "2px solid #1976d2" 
                          : "1px solid #e0e0e0",
                        backgroundColor: selectedUsers.includes(user.id) 
                          ? "rgba(25, 118, 210, 0.08)" 
                          : "white",
                        transition: "all 0.2s",
                        '&:hover': {
                          backgroundColor: selectedUsers.includes(user.id) 
                            ? "rgba(25, 118, 210, 0.12)" 
                            : "rgba(0, 0, 0, 0.04)",
                        }
                      }}
                      onClick={() => handleUserSelection(user.id)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ width: 40, height: 40 }}>
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body1">{user.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                          {selectedUsers.includes(user.id) && (
                            <PersonIcon color="primary" sx={{ ml: 'auto' }} />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveGroup}>
            {editId ? "Update Group" : "Create Group"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Button,
  List,
  ListItem,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Divider,
  Alert,
  Chip,
  CircularProgress,
  ListItemIcon,
} from "@mui/material";
import { Delete as DeleteIcon, Group as GroupIcon } from "@mui/icons-material";

// Predefined module list - ensure this matches your backend/other components
const MODULES = [
  "Import DSR",
  "Import Operations",
  "Import DO",
  "E-Sanchit",
  "Employee Onboarding",
  "Employee KYC",
  "Inward Register",
  "Outward Register",
  "Exit Interview",
  "Submission",
  "Accounts",
  "Documentation",
  "Report",
  "Open Points",
  "Project Nucleus",
];

function ModuleUserList() {
  const [selectedModule, setSelectedModule] = useState("");
  const [moduleUsers, setModuleUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsersToRemove, setSelectedUsersToRemove] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Fetch users whenever a module is selected
  useEffect(() => {
    if (selectedModule) {
      fetchUsersInModule(selectedModule);
    } else {
      setModuleUsers([]);
    }
  }, [selectedModule]);

  const fetchUsersInModule = async (moduleName) => {
    setLoading(true);
    try {
      // Re-using get-all-users and filtering client-side for simplicity,
      // or you could create a specific endpoint like /api/get-users-by-module
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-all-users`
      );

      const filtered = res.data.filter(
        (user) => user.modules && user.modules.includes(moduleName)
      );

      setModuleUsers(filtered);
      setSelectedUsersToRemove([]); // Reset selection on module change
      setMessage({ type: "", text: "" });
    } catch (error) {
      console.error("Error fetching users:", error);
      setMessage({ type: "error", text: "Failed to load users." });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectUser = (userId) => {
    const currentIndex = selectedUsersToRemove.indexOf(userId);
    const newChecked = [...selectedUsersToRemove];

    if (currentIndex === -1) {
      newChecked.push(userId);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setSelectedUsersToRemove(newChecked);
  };

  const handleRemoveUsers = async () => {
    if (selectedUsersToRemove.length === 0) return;

    // Confirm dialog
    if (
      !window.confirm(
        `Are you sure you want to remove ${selectedUsersToRemove.length} user(s) from ${selectedModule}?`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/unassign-users-from-module`,
        {
          moduleName: selectedModule,
          userIds: selectedUsersToRemove,
        }
      );

      setMessage({
        type: "success",
        text: `Successfully removed ${selectedUsersToRemove.length} user(s).`,
      });

      // Refresh list
      fetchUsersInModule(selectedModule);
    } catch (error) {
      console.error("Error removing users:", error);
      setMessage({
        type: "error",
        text: "Failed to remove users. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSingleUser = (userId) => {
    setSelectedUsersToRemove([userId]);
    // Use zero timeout to let state update then call function - simpler to just verify straight logic
    // But for better UX, let's just trigger the API directly for single remove
    if (window.confirm("Remove this user from the module?")) {
      // Direct call
      removeDirectly([userId]);
    }
  };

  const removeDirectly = async (ids) => {
    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/unassign-users-from-module`,
        {
          moduleName: selectedModule,
          userIds: ids,
        }
      );
      setMessage({ type: "success", text: "User removed successfully." });
      fetchUsersInModule(selectedModule);
    } catch (e) {
      setMessage({ type: "error", text: "Failed to remove user." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography
        variant="h6"
        gutterBottom
        fontWeight={600}
        color="text.primary"
      >
        Review Module Assignments
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select a module to view all assigned users. You can then remove multiple
        users at once.
      </Typography>

      {/* Module Selector */}
      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <Select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          displayEmpty
          renderValue={(selected) => {
            if (!selected) {
              return (
                <Typography color="text.secondary">
                  Select a Module...
                </Typography>
              );
            }
            return selected;
          }}
          sx={{ bgcolor: "#fff" }}
        >
          {MODULES.map((mod) => (
            <MenuItem key={mod} value={mod}>
              {mod}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {message.text && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage({ type: "", text: "" })}
        >
          {message.text}
        </Alert>
      )}

      {selectedModule && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box
            sx={{
              p: 2,
              bgcolor: "#f8f9fa",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <GroupIcon color="action" />
              <Typography variant="subtitle2" fontWeight={600}>
                Users in "{selectedModule}" ({moduleUsers.length})
              </Typography>
            </Box>
            {selectedUsersToRemove.length > 0 && (
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleRemoveUsers}
                disabled={loading}
              >
                Remove ({selectedUsersToRemove.length})
              </Button>
            )}
          </Box>

          {loading ? (
            <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : moduleUsers.length > 0 ? (
            <List sx={{ maxHeight: 400, overflowY: "auto", p: 0 }}>
              {moduleUsers.map((user) => {
                const labelId = `checkbox-list-label-${user._id}`;
                const fullName =
                  [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                  user.username;

                return (
                  <React.Fragment key={user._id}>
                    <ListItem
                      role={undefined}
                      dense
                      button
                      onClick={() => handleToggleSelectUser(user._id)}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={
                            selectedUsersToRemove.indexOf(user._id) !== -1
                          }
                          tabIndex={-1}
                          disableRipple
                          inputProps={{ "aria-labelledby": labelId }}
                          color="error"
                        />
                      </ListItemIcon>
                      <ListItemText
                        id={labelId}
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight={500}>
                              {fullName}
                            </Typography>
                            <Chip
                              label={user.username}
                              size="small"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          size="small"
                          onClick={() => handleRemoveSingleUser(user._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                );
              })}
            </List>
          ) : (
            <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body2">
                No users assigned to this module.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default React.memo(ModuleUserList);

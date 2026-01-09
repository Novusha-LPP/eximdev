import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Grid,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  InputAdornment,
  Avatar,
  Divider,
} from "@mui/material";
import {
  ViewModule as ViewModuleIcon,
  Security as SecurityIcon,
  LockReset as LockResetIcon,
  LocationCity as LocationCityIcon,
  Business as BusinessIcon,
  SmartToy as SmartToyIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Circle as CircleIcon,
} from "@mui/icons-material";

// Sub-components
import AssignModule from "./AssignModule";
import AssignRole from "./AssignRole/AssignRole";
import ChangePasswordByAdmin from "./AssignRole/ChangePasswordByAdmin";
import SelectIcdCode from "./AssignRole/SelectIcdCode";
import AssignImporters from "./AssignImporters";
import AssignEximBot from "./AssignEximBot/AssignEximBot";
import ModuleUserList from "./ModuleUserList";
import { Group as GroupIcon } from "@mui/icons-material";

// Theme constants
const THEME = {
  bg: "#f8f9fa", // Very light grey background
  cardBg: "#ffffff",
  border: "1px solid #e9ecef",
  activeColor: "#00796b", // Teal accent
  activeBg: "#e0f2f1", // Light teal background for active states
  textPrimary: "#212529",
  textSecondary: "#6c757d",
};

function Assign() {
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Assign Module");
  const [userListTab, setUserListTab] = useState(0); // 0: Active, 1: Deactivated
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function getUsers() {
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-all-users`
        );
        setUserList(res.data);
      } catch (error) {
        console.error("Error fetching user list:", error);
      }
    }
    getUsers();
  }, []);

  const handleToggleStatus = async () => {
    if (!selectedUser) return;

    try {
      const newStatus = !selectedUser.isActive;
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/toggle-user-status`,
        {
          username: selectedUser.username,
          isActive: newStatus,
        }
      );

      // Update local state using the fresh data from server
      const updatedUser = res.data.user;
      setSelectedUser(updatedUser);
      setUserList((prev) =>
        prev.map((u) =>
          u.username === selectedUser.username ? updatedUser : u
        )
      );
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Failed to update user status");
    }
  };

  const menuItems = [
    {
      label: "Assign Module",
      icon: <ViewModuleIcon />,
      component: <AssignModule selectedUser={selectedUser?.username} />,
    },
    {
      label: "Assign Role",
      icon: <SecurityIcon />,
      component: <AssignRole selectedUser={selectedUser?.username} />,
    },
    {
      label: "Change Password",
      icon: <LockResetIcon />,
      component: (
        <ChangePasswordByAdmin selectedUser={selectedUser?.username} />
      ),
    },
    {
      label: "Assign ICD Code",
      icon: <LocationCityIcon />,
      component: <SelectIcdCode selectedUser={selectedUser?.username} />,
    },
    {
      label: "Assign Importers",
      icon: <BusinessIcon />,
      component: <AssignImporters selectedUser={selectedUser?.username} />,
    },
    {
      label: "Assign Exim Bot",
      icon: <SmartToyIcon />,
      component: <AssignEximBot selectedUser={selectedUser?.username} />,
    },
    {
      label: "Review Module Users",
      icon: <GroupIcon />, // You'll need to import this icon
      component: <ModuleUserList />,
    },
  ];

  const activeComponent = menuItems.find(
    (item) => item.label === activeTab
  )?.component;

  // Filter users based on tab and search
  const filteredUsers = useMemo(() => {
    let users = userList;

    // Filter by Active/Inactive status
    if (userListTab === 0) {
      users = users.filter((u) => u.isActive !== false);
    } else {
      users = users.filter((u) => u.isActive === false);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(
        (u) =>
          (u.first_name && u.first_name.toLowerCase().includes(term)) ||
          (u.last_name && u.last_name.toLowerCase().includes(term)) ||
          u.username.toLowerCase().includes(term)
      );
    }

    return users;
  }, [userList, userListTab, searchTerm]);

  return (
    <Box
      sx={{
        display: "flex",
        height: "calc(100vh - 64px)",
        bgcolor: THEME.bg,
        overflow: "hidden",
        fontFamily: "'Inter', 'Roboto', sans-serif",
      }}
    >
      {/* Left Sidebar: User List */}
      <Paper
        elevation={0}
        sx={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          borderRight: THEME.border,
          borderRadius: 0,
          zIndex: 1,
          bgcolor: "#fff",
        }}
      >
        {userListTab !== 2 && (
          <Box sx={{ p: 2, borderBottom: THEME.border }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search Users"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{ color: THEME.textSecondary }}
                      fontSize="small"
                    />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 1,
                  bgcolor: THEME.bg,
                  fontSize: "0.9rem",
                  "& fieldset": { borderColor: "transparent" },
                  "&:hover fieldset": { borderColor: "#ced4da" },
                  "&.Mui-focused fieldset": { borderColor: THEME.activeColor },
                },
              }}
            />
          </Box>
        )}
        <Tabs
          value={userListTab}
          onChange={(e, v) => {
            setUserListTab(v);
            if (v === 2) setSelectedUser(null);
          }}
          TabIndicatorProps={{ sx: { bgcolor: THEME.activeColor } }}
          textColor="inherit"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: THEME.border,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              color: THEME.textSecondary,
              minHeight: 48,
              fontSize: "0.85rem",
              px: 2,
            },
            "& .Mui-selected": {
              color: THEME.activeColor,
            },
          }}
        >
          <Tab
            label={`Active (${
              userList.filter((u) => u.isActive !== false).length
            })`}
          />
          <Tab
            label={`Inactive (${
              userList.filter((u) => u.isActive === false).length
            })`}
          />
          <Tab
            label="Bulk Manage"
            icon={<GroupIcon fontSize="small" />}
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
        </Tabs>

        {userListTab !== 2 ? (
          <List sx={{ flex: 1, overflowY: "auto", p: 1 }}>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const fullName =
                  [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                  user.username ||
                  "?";
                return (
                  <ListItemButton
                    key={user._id || user.username}
                    selected={selectedUser?.username === user.username}
                    onClick={() => setSelectedUser(user)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      color: THEME.textPrimary,
                      "&.Mui-selected": {
                        bgcolor: THEME.activeBg,
                        color: THEME.activeColor,
                        "&:hover": { bgcolor: "#b2dfdb" },
                        borderLeft: `3px solid ${THEME.activeColor}`,
                      },
                      "&:hover": { bgcolor: "#f1f3f5" },
                      py: 1,
                      px: 1.5,
                      borderLeft: "3px solid transparent",
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: "0.75rem",
                          bgcolor:
                            selectedUser?.username === user.username
                              ? THEME.activeColor
                              : "#eceff1",
                          color:
                            selectedUser?.username === user.username
                              ? "#fff"
                              : THEME.textSecondary,
                          fontWeight: 600,
                        }}
                      >
                        {fullName.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={fullName}
                      secondary={user.username}
                      primaryTypographyProps={{
                        variant: "body2",
                        fontWeight:
                          selectedUser?.username === user.username ? 600 : 500,
                        color: "inherit",
                      }}
                      secondaryTypographyProps={{
                        variant: "caption",
                        color: THEME.textSecondary,
                      }}
                    />
                    <CircleIcon
                      sx={{
                        width: 8,
                        height: 8,
                        color: user.isActive !== false ? "#4caf50" : "#bdbdbd",
                        ml: 1,
                        opacity: 0.7,
                      }}
                    />
                  </ListItemButton>
                );
              })
            ) : (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No users found.
                </Typography>
              </Box>
            )}
          </List>
        ) : (
          <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
            <Typography variant="body2">
              Manage users by module. Select a module on the right to view and
              remove users in bulk.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 4 }}>
        {userListTab === 2 ? (
          <Paper
            elevation={0}
            sx={{ p: 4, borderRadius: 2, border: THEME.border }}
          >
            <ModuleUserList />
          </Paper>
        ) : selectedUser ? (
          <Grid container spacing={3}>
            {/* Header Card */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 1,
                  borderRadius: 2,
                  border: THEME.border,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  bgcolor: "#fff",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: THEME.activeColor,
                      fontSize: "1.5rem",
                    }}
                  >
                    {(selectedUser.first_name || selectedUser.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      color={THEME.textPrimary}
                    >
                      {[selectedUser.first_name, selectedUser.last_name]
                        .filter(Boolean)
                        .join(" ") || selectedUser.username}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mt: 0.5,
                      }}
                    >
                      <Typography variant="body2" color={THEME.textSecondary}>
                        {selectedUser.username}
                      </Typography>
                      <Divider
                        orientation="vertical"
                        flexItem
                        sx={{ height: 16 }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: THEME.textPrimary,
                          border: `1px solid ${THEME.border}`,
                          px: 0.5,
                          borderRadius: 0.5,
                        }}
                      >
                        {selectedUser.role || "User"}
                      </Typography>

                      {/* Status Badge */}
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          px: 1,
                          py: 0.25,
                          bgcolor:
                            selectedUser.isActive !== false
                              ? "#e8f5e9"
                              : "#fafafa",
                          borderRadius: 4,
                          border: `1px solid ${
                            selectedUser.isActive !== false
                              ? "#c8e6c9"
                              : "#e0e0e0"
                          }`,
                        }}
                      >
                        <CircleIcon
                          sx={{
                            width: 6,
                            height: 6,
                            mr: 0.5,
                            color:
                              selectedUser.isActive !== false
                                ? "#4caf50"
                                : "#bdbdbd",
                          }}
                        />
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          color={
                            selectedUser.isActive !== false
                              ? "#2e7d32"
                              : "#757575"
                          }
                        >
                          {selectedUser.isActive !== false
                            ? "Active"
                            : `Deactivated ${
                                selectedUser.deactivatedAt
                                  ? `(${new Date(
                                      selectedUser.deactivatedAt
                                    ).toLocaleDateString()})`
                                  : ""
                              }`}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedUser.isActive !== false}
                        onChange={handleToggleStatus}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: THEME.activeColor,
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                            {
                              backgroundColor: THEME.activeColor,
                            },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" color="text.secondary">
                        {selectedUser.isActive !== false
                          ? "Deactivate User"
                          : "Activate User"}
                      </Typography>
                    }
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Content Split: Navigation & Detail */}
            <Grid item xs={12} md={3} lg={2.5}>
              <Paper
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                  border: THEME.border,
                }}
                elevation={0}
              >
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "#fafafa",
                    borderBottom: THEME.border,
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}
                  >
                    Assignments
                  </Typography>
                </Box>
                <List component="nav" sx={{ p: 1 }}>
                  {menuItems.map((item) => (
                    <ListItemButton
                      key={item.label}
                      selected={activeTab === item.label}
                      onClick={() => setActiveTab(item.label)}
                      sx={{
                        borderRadius: 1,
                        mb: 0.25,
                        px: 1.5,
                        py: 1,
                        color: THEME.textPrimary,
                        "&.Mui-selected": {
                          bgcolor: THEME.activeBg,
                          color: THEME.activeColor,
                          fontWeight: 600,
                          "& .MuiListItemIcon-root": {
                            color: THEME.activeColor,
                          },
                          "&:hover": { bgcolor: "#b2dfdb" },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{ minWidth: 32, color: "text.secondary" }}
                      >
                        {React.cloneElement(item.icon, { fontSize: "small" })}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          variant: "body2",
                          fontWeight: activeTab === item.label ? 600 : 400,
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={9} lg={9.5}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  minHeight: 500,
                  border: THEME.border,
                }}
              >
                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    borderBottom: THEME.border,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  {React.cloneElement(
                    menuItems.find((i) => i.label === activeTab)?.icon,
                    { color: "action" }
                  )}
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color={THEME.textPrimary}
                  >
                    {activeTab}
                  </Typography>
                </Box>
                <Box sx={{ p: 0 }}>
                  {/* The components rendered here are responsible for their own internal padding usually, 
                        but we can wrapper them if needed. Providing a container. */}
                  <Box sx={{ p: 3 }}>{activeComponent}</Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              color: THEME.textSecondary,
              opacity: 0.6,
            }}
          >
            <PersonIcon sx={{ fontSize: 64, mb: 2, color: "#e0e0e0" }} />
            <Typography variant="h6" fontWeight={600}>
              No Selection
            </Typography>
            <Typography variant="body2">
              Select a user from the sidebar to manage assignments.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default React.memo(Assign);

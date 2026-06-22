import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import GroupIcon from "@mui/icons-material/Group";
import SecurityIcon from "@mui/icons-material/Security";
import HistoryIcon from "@mui/icons-material/History";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EmailIcon from "@mui/icons-material/Email";
import SettingsIcon from "@mui/icons-material/Settings";

export default function HelpdeskAdministration() {
  const navigate = useNavigate();

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Administration</Typography>
          <Typography variant="body2" color="text.secondary">Manage users, groups, roles, permissions, audit logs, notifications, email configuration, and system settings.</Typography>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<PersonIcon />}
                onClick={() => navigate("/admin")}
              >
                User Management
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<GroupIcon />}
                onClick={() => navigate("/admin/groups")}
              >
                Groups
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<SecurityIcon />}
                onClick={() => navigate("/admin/roles")}
              >
                Roles & Permissions
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<HistoryIcon />}
                onClick={() => navigate("/admin/audit")}
              >
                Audit Logs
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<NotificationsIcon />}
                onClick={() => navigate("/admin/notifications")}
              >
                Notifications
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<EmailIcon />}
                onClick={() => navigate("/admin/email")}
              >
                Email Configuration
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<SettingsIcon />}
                onClick={() => navigate("/admin/settings")}
              >
                System Settings
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

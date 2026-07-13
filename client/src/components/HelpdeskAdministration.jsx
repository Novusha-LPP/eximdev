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
import BusinessIcon from "@mui/icons-material/Business";
import InventoryIcon from "@mui/icons-material/Inventory";
import DescriptionIcon from "@mui/icons-material/Description";
import AssessmentIcon from "@mui/icons-material/Assessment";
import DevicesIcon from "@mui/icons-material/Devices";

export default function HelpdeskAdministration() {
  const navigate = useNavigate();

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Administration</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage assets, vendors, inventory, licenses, reports, notifications, and audit logs.
          </Typography>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<DevicesIcon />}
                onClick={() => navigate("/admin/assets")}
              >
                Assets
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<BusinessIcon />}
                onClick={() => navigate("/admin/vendors")}
              >
                Vendors
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<InventoryIcon />}
                onClick={() => navigate("/admin/inventory")}
              >
                Inventory
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<DescriptionIcon />}
                onClick={() => navigate("/admin/licenses")}
              >
                Licenses
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AssessmentIcon />}
                onClick={() => navigate("/admin/reports")}
              >
                Reports
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
                startIcon={<HistoryIcon />}
                onClick={() => navigate("/admin/audit")}
              >
                Audit Logs
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

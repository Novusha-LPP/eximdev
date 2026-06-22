import React, { useState } from "react";
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

const SETTINGS = [
  { key: "ticket_prefix", label: "Ticket ID Prefix", value: "TK-" },
  { key: "default_sla_days", label: "Default SLA Days", value: "5" },
  { key: "renewal_reminder_days", label: "Renewal Reminder Days", value: "30" },
  { key: "license_warning_days", label: "License Expiry Warning Days", value: "30" }
];

export default function ITAdmin() {
  const [settings, setSettings] = useState(SETTINGS);
  const [showModal, setShowModal] = useState(false);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Administration
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                System Settings
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Setting</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settings.map((s) => (
                      <TableRow key={s.key}>
                        <TableCell>{s.label}</TableCell>
                        <TableCell>{s.value}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setShowModal(true)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                User Roles & Permissions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                IT Helpdesk uses global user roles (Admin, IT Team, Manager, Employee).
                Contact administrator to modify permissions.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
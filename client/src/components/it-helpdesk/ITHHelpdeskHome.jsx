import React, { useEffect, useState } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import { Link } from "react-router-dom";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import RefreshIcon from "@mui/icons-material/Refresh";
import BarChartIcon from "@mui/icons-material/BarChart";
import BuildIcon from "@mui/icons-material/Build";
import StorageIcon from "@mui/icons-material/Storage";
import PeopleIcon from "@mui/icons-material/People";
import CategoryIcon from "@mui/icons-material/Category";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";
import GroupIcon from "@mui/icons-material/Group";
import SecurityIcon from "@mui/icons-material/Security";
import HistoryIcon from "@mui/icons-material/History";
import EmailIcon from "@mui/icons-material/Email";
import SettingsIcon from "@mui/icons-material/Settings";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";

const StatCard = ({ title, value, icon, color, sub, to }) => (
  <Card
    sx={{
      height: "100%",
      borderLeft: `4px solid ${color}`,
      transition: "transform 0.18s ease-in-out, box-shadow 0.18s ease-in-out",
      "&:hover": { transform: "translateY(-3px)", boxShadow: 6 },
    }}
  >
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            backgroundColor: `${color}22`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
        {to && (
          <IconButton component={Link} to={to} size="small">
            <BarChartIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Typography sx={{ mt: 1.5 }} variant="h4" fontWeight={700} color="text.primary">
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const BigCard = ({ title, value, icon, color, sub, children, action }) => (
  <Card sx={{ height: "100%", borderTop: `3px solid ${color}` }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        {action}
      </Box>
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: `${color}22`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700} lineHeight={1.1}>
            {value}
          </Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
      </Box>
      <Divider sx={{ mb: 1.5 }} />
      <Box maxHeight={320} sx={{ overflowY: "auto" }}>
        {children}
      </Box>
    </CardContent>
  </Card>
);

const ChipColor = { Available: "success", Assigned: "info", "In Repair": "warning", Retired: "default", Lost: "error" };

const rowLink = (id, label) => (
  <Tooltip title={label} arrow>
    <Typography
      component={Link}
      to="/it-helpdesk"
      sx={{
        color: "primary.main",
        textDecoration: "none",
        fontWeight: 500,
        "&:hover": { textDecoration: "underline" },
      }}
    >
      {label}
    </Typography>
  </Tooltip>
);

export default function ITHelpdeskHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, pending: 0, assigned: 0, available: 0, inRepair: 0 });
  const [recentAssets, setRecentAssets] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [assetsRes, ticketsRes, ticketStatsRes, assetStatsRes] = await Promise.all([
        itHelpdeskAPI.assets.getAll({ limit: 5 }),
        itHelpdeskAPI.tickets.getAll({ limit: 5 }),
        itHelpdeskAPI.tickets.getStats(),
        itHelpdeskAPI.assets.getStats(),
      ]);

      setRecentAssets(assetsRes.data || []);
      setRecentTickets(ticketsRes.data || []);
      setStats({
        total: assetStatsRes?.data?.total || 0,
        available: assetStatsRes?.data?.available || 0,
        assigned: assetStatsRes?.data?.assigned || 0,
        inRepair: assetStatsRes?.data?.inRepair || 0,
        open: (ticketStatsRes?.data?.newCount || 0) + (ticketStatsRes?.data?.assigned || 0) + (ticketStatsRes?.data?.inProgress || 0),
        closed: ticketStatsRes?.data?.closed || 0,
        pending: ticketStatsRes?.data?.resolved || 0,
      });
    } catch (e) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          IT Asset & Helpdesk Dashboard
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Top Stat Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Assets" value={stats.total} icon={<Inventory2Icon />} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Open Tickets" value={stats.open} icon={<AssignmentIcon />} color="#1565c0" sub="New + Assigned + In Progress" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Closed Tickets" value={stats.closed} icon={<CheckCircleIcon />} color="#6a1b9a" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Pending Requests" value={stats.pending} icon={<PendingIcon />} color="#ef6c00" sub="Resolved" />
        </Grid>
      </Grid>

      {/* Asset Status Summary */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Asset Status Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Available</Typography>
                  <Chip label={stats.available} color="success" size="small" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Assigned</Typography>
                  <Chip label={stats.assigned} color="info" size="small" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">In Repair</Typography>
                  <Chip label={stats.inRepair} color="warning" size="small" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Retired / Lost</Typography>
                  <Chip label={Math.max(stats.total - stats.available - stats.assigned - stats.inRepair, 0)} color="default" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Assets */}
        <Grid item xs={12} md={4}>
          <BigCard
            title="Recent Assets"
            value={stats.total}
            icon={<Inventory2Icon />}
            color="#2e7d32"
            sub="Total"
            action={<IconButton component={Link} to="/it-helpdesk" size="small"><BarChartIcon fontSize="small" /></IconButton>}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Asset Tag</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" size="small">
                        <Typography variant="body2" color="text.secondary">No assets yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentAssets.map((a) => (
                      <TableRow key={a._id} hover>
                        <TableCell>{rowLink(a.asset_tag, a.asset_tag)}</TableCell>
                        <TableCell>{a.asset_type}</TableCell>
                        <TableCell>
                          <Chip label={a.status} color={ChipColor[a.status] || "default"} size="small" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </BigCard>
        </Grid>

        {/* Recent Tickets */}
        <Grid item xs={12} md={4}>
          <BigCard
            title="Recent Tickets"
            value={stats.open + stats.closed}
            icon={<AssignmentIcon />}
            color="#1565c0"
            sub="Total"
            action={<IconButton component={Link} to="/it-helpdesk" size="small"><BarChartIcon fontSize="small" /></IconButton>}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket ID</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" size="small">
                        <Typography variant="body2" color="text.secondary">No tickets yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTickets.map((t) => (
                      <TableRow key={t._id} hover>
                        <TableCell>{rowLink(t._id, t.ticket_id)}</TableCell>
                        <TableCell>{t.priority}</TableCell>
                        <TableCell>
                          <Chip label={t.status} color={t.status === "Closed" ? "success" : t.status === "Resolved" ? "info" : t.status === "New" ? "error" : "default"} size="small" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </BigCard>
        </Grid>
      </Grid>

      {/* Analytics & Link Cards */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Modules
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/assets" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <Inventory2Icon sx={{ fontSize: 36, color: "#2e7d32", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Asset Management</Typography>
              <Typography variant="caption" color="text.secondary">Computers · Laptops · Printers · More</Typography>
            </CardContent>
          </Card>
        </Grid>
<Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/tickets" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <BuildIcon sx={{ fontSize: 36, color: "#1565c0", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Helpdesk</Typography>
              <Typography variant="caption" color="text.secondary">Raise / Assign / Track Tickets</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/vendors" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <PeopleIcon sx={{ fontSize: 36, color: "#6a1b9a", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Vendors</Typography>
              <Typography variant="caption" color="text.secondary">Supplier & AMC Tracking</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/contracts" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <CategoryIcon sx={{ fontSize: 36, color: "#ef6c00", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Contracts</Typography>
              <Typography variant="caption" color="text.secondary">AMC & Warranty</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/inventory" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <StorageIcon sx={{ fontSize: 36, color: "#ad1457", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Inventory</Typography>
              <Typography variant="caption" color="text.secondary">Stock Management</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/licenses" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <BarChartIcon sx={{ fontSize: 36, color: "#0277bd", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Licenses</Typography>
              <Typography variant="caption" color="text.secondary">Software Licenses</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/reports" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <BarChartIcon sx={{ fontSize: 36, color: "#0891b2", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Reports</Typography>
              <Typography variant="caption" color="text.secondary">Asset & Ticket Reports</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/notifications" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <NotificationsIcon sx={{ fontSize: 36, color: "#ea580c", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Notifications</Typography>
              <Typography variant="caption" color="text.secondary">Expiry Alerts</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/users" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <PeopleIcon sx={{ fontSize: 36, color: "#4f46e5", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Users</Typography>
              <Typography variant="caption" color="text.secondary">User Management</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Administration Module Cards */}
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight={600} gutterBottom mt={3}>
            Administration
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/administration/users" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <PersonIcon sx={{ fontSize: 36, color: "#1976d2", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>User Management</Typography>
              <Typography variant="caption" color="text.secondary">Manage system users</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/administration/groups" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <GroupIcon sx={{ fontSize: 36, color: "#7b1fa2", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Groups</Typography>
              <Typography variant="caption" color="text.secondary">User group management</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/administration/roles" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <SecurityIcon sx={{ fontSize: 36, color: "#d32f2f", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Roles & Permissions</Typography>
              <Typography variant="caption" color="text.secondary">Access control management</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/administration/audit" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <HistoryIcon sx={{ fontSize: 36, color: "#f57c00", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Audit Logs</Typography>
              <Typography variant="caption" color="text.secondary">System activity tracking</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/administration/notifications" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <NotificationsIcon sx={{ fontSize: 36, color: "#0288d1", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Notifications</Typography>
              <Typography variant="caption" color="text.secondary">Notification templates</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/administration/email" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <EmailIcon sx={{ fontSize: 36, color: "#388e3c", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>Email Configuration</Typography>
              <Typography variant="caption" color="text.secondary">SMTP & email settings</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card component={Link} to="/it-helpdesk/administration/settings" sx={{ height: "100%", textDecoration: "none", transition: "0.2s", "&:hover": { boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: "center" }}>
              <SettingsIcon sx={{ fontSize: 36, color: "#5d4037", mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>System Settings</Typography>
              <Typography variant="caption" color="text.secondary">System configuration</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

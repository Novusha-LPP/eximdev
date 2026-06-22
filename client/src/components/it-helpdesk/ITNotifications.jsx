import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert
} from "@mui/material";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EventIcon from "@mui/icons-material/Event";
import WarningIcon from "@mui/icons-material/Warning";

export default function ITNotifications() {
  const [assets, setAssets] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assetsRes, contractsRes, licensesRes] = await Promise.all([
          itHelpdeskAPI.assets.getAll(),
          itHelpdeskAPI.contracts.getAll(),
          itHelpdeskAPI.licenses.getAll()
        ]);

   const warrantyAlerts = (assetsRes.data || [])
.map(a => ({
  type: "Warranty Expiry",
  item: a.asset_tag || a.asset_name,
  date: a.warranty_expiry,
  status: "Active"
}))
.filter(x => x.date);


const contractAlerts = (contractsRes.data || [])
.map(c => ({
  type: "Contract Renewal",
  item: c.contract_number || c.contract_name,
  date: c.end_date,
  status: "Active"
}))
.filter(x => x.date);


const licenseAlerts = (licensesRes.data || [])
.map(l => ({
  type: "License Expiry",
  item: l.software_name || l.license_name,
  date: l.expiry_date,
  status: "Active"
}))
.filter(x => x.date);


setAlerts([
 ...warrantyAlerts,
 ...contractAlerts,
 ...licenseAlerts
]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <NotificationsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Notifications & Alerts</Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : alerts.length === 0 ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          No upcoming expiries or alerts
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Alert Type</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Chip icon={<EventIcon />} label={a.type} size="small" color="warning" />
                      </TableCell>
                      <TableCell>{a.item}</TableCell>
                      <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip icon={<WarningIcon />} label={a.status} size="small" color="error" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
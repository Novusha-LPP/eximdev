import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  FormControlLabel,
  Checkbox,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Stack,
} from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TireRepairIcon from "@mui/icons-material/TireRepair";
import axios from "axios";

const TYRE_PROC_TABS = [
  "1. Purchase Request",
  "2. Supplier Quotation",
  "3. Finance Approval",
  "4. Payment & UTR",
  "5. Order & Dispatch",
  "6. Site GRN",
  "7. Completed",
];

const FLEET_INSURANCE_TABS = [
  {
    key: "Vehicle Records",
    label: "Vehicle Records",
    description: "Includes Policy History & Dashboard automatically",
  },
  {
    key: "Approval",
    label: "Approval",
    description: "Access to the Finance Approval stage tab",
  },
  {
    key: "Payment & UTR",
    label: "Payment & UTR",
    description: "Access to the Payment & UTR submission tab",
  },
];

function AssignProcurementTabs({ selectedUser }) {
  // Tyre Procurement state
  const [tyreTabPermissions, setTyreTabPermissions] = useState([]);
  const [loadingTyre, setLoadingTyre] = useState(false);
  const [savingTyre, setSavingTyre] = useState(false);
  const [tyreMessage, setTyreMessage] = useState(null);

  // Fleet Insurance state
  const [fleetTabPermissions, setFleetTabPermissions] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [savingFleet, setSavingFleet] = useState(false);
  const [fleetMessage, setFleetMessage] = useState(null);

  useEffect(() => {
    async function fetchPermissions() {
      if (!selectedUser) {
        setTyreTabPermissions([]);
        setFleetTabPermissions([]);
        return;
      }

      setLoadingTyre(true);
      setLoadingFleet(true);
      setTyreMessage(null);
      setFleetMessage(null);

      try {
        const [tyreRes, fleetRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/user-tabs/${selectedUser}`),
          axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/user-tabs/${selectedUser}`),
        ]);

        if (tyreRes.data?.success) {
          setTyreTabPermissions(tyreRes.data.allowed_tabs || []);
        }
        if (fleetRes.data?.success) {
          setFleetTabPermissions(fleetRes.data.allowed_tabs || []);
        }
      } catch (err) {
        console.error("Error fetching user procurement tab permissions:", err);
      } finally {
        setLoadingTyre(false);
        setLoadingFleet(false);
      }
    }
    fetchPermissions();
  }, [selectedUser]);

  // Handlers for Tyre
  const handleToggleTyreTab = (tabName) => {
    setTyreTabPermissions((prev) =>
      prev.includes(tabName) ? prev.filter((t) => t !== tabName) : [...prev, tabName]
    );
  };

  const handleSaveTyre = async () => {
    if (!selectedUser) return;
    setSavingTyre(true);
    setTyreMessage(null);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/tyre-procurement/assign-user-tabs`,
        {
          username: selectedUser,
          allowed_tabs: tyreTabPermissions,
        }
      );
      if (res.data?.success) {
        setTyreMessage({
          type: "success",
          text: `Successfully updated Tyre Procurement tab permissions for "${selectedUser}".`,
        });
      }
    } catch (err) {
      console.error("Error saving tyre tab permissions:", err);
      setTyreMessage({
        type: "error",
        text: "Failed to update Tyre Procurement tab permissions.",
      });
    } finally {
      setSavingTyre(false);
    }
  };

  // Handlers for Fleet Insurance
  const handleToggleFleetTab = (tabKey) => {
    setFleetTabPermissions((prev) =>
      prev.includes(tabKey) ? prev.filter((t) => t !== tabKey) : [...prev, tabKey]
    );
  };

  const handleSaveFleet = async () => {
    if (!selectedUser) return;
    setSavingFleet(true);
    setFleetMessage(null);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/assign-user-tabs`,
        {
          username: selectedUser,
          allowed_tabs: fleetTabPermissions,
        }
      );
      if (res.data?.success) {
        setFleetMessage({
          type: "success",
          text: `Successfully updated Fleet Insurance tab permissions for "${selectedUser}".`,
        });
      }
    } catch (err) {
      console.error("Error saving fleet insurance tab permissions:", err);
      setFleetMessage({
        type: "error",
        text: "Failed to update Fleet Insurance tab permissions.",
      });
    } finally {
      setSavingFleet(false);
    }
  };

  if (!selectedUser) {
    return (
      <Box p={3} textAlign="center" color="text.secondary">
        <Typography variant="body1">Select a user to assign Procurement tab permissions.</Typography>
      </Box>
    );
  }

  return (
    <Box p={2} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* ─── SECTION 1: FLEET INSURANCE SOP TAB PERMISSIONS ─── */}
      <Card sx={{ p: 3, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderRadius: "10px" }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
          <DirectionsCarIcon sx={{ color: "#2563eb", fontSize: 26 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
            Fleet Insurance SOP Tab Permissions
          </Typography>
          <Chip label="3 Options" size="small" sx={{ bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "0.75rem" }} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Configure which Fleet Insurance tabs user <strong>{selectedUser}</strong> can access.
          Selecting <em>Vehicle Records</em> automatically grants access to <em>Policy History & Dashboard</em>.
          Leave all unchecked to grant unrestricted access to all tabs.
        </Typography>

        {fleetMessage && (
          <Alert severity={fleetMessage.type} sx={{ mb: 2.5 }} onClose={() => setFleetMessage(null)}>
            {fleetMessage.text}
          </Alert>
        )}

        {loadingFleet ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              {FLEET_INSURANCE_TABS.map((item) => {
                const isChecked = fleetTabPermissions.includes(item.key);
                return (
                  <Grid item xs={12} sm={4} key={item.key}>
                    <Card
                      variant="outlined"
                      onClick={() => handleToggleFleetTab(item.key)}
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        borderColor: isChecked ? "#2563eb" : "#e2e8f0",
                        backgroundColor: isChecked ? "#f0f7ff" : "#ffffff",
                        borderWidth: isChecked ? "2px" : "1px",
                        borderRadius: "8px",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: "#3b82f6",
                          backgroundColor: isChecked ? "#e8f2ff" : "#f8fafc",
                        },
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isChecked}
                            onChange={() => handleToggleFleetTab(item.key)}
                            size="small"
                            color="primary"
                            sx={{ p: 0.5, mr: 0.5 }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                              {item.label}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.2 }}>
                              {item.description}
                            </Typography>
                          </Box>
                        }
                        sx={{ width: "100%", m: 0, alignItems: "flex-start" }}
                      />
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Box sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={handleSaveFleet}
                disabled={savingFleet}
                sx={{
                  px: 3,
                  py: 0.8,
                  fontWeight: 700,
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                }}
              >
                {savingFleet ? "Saving..." : "Save Fleet Insurance Tabs"}
              </Button>
            </Box>
          </>
        )}
      </Card>

      <Divider />

      {/* ─── SECTION 2: TYRE PROCUREMENT SOP TAB PERMISSIONS ─── */}
      <Card sx={{ p: 3, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderRadius: "10px" }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
          <TireRepairIcon sx={{ color: "#d97706", fontSize: 26 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
            Tyre Procurement SOP Tab Permissions
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Configuring tab access permissions for user: <strong>{selectedUser}</strong>.
          Check specific tabs to restrict access (e.g. Finance Approval for Mohit Sir, Payment & UTR for Geetanjali Mam). Uncheck all tabs to allow full access.
        </Typography>

        {tyreMessage && (
          <Alert severity={tyreMessage.type} sx={{ mb: 2.5 }} onClose={() => setTyreMessage(null)}>
            {tyreMessage.text}
          </Alert>
        )}

        {loadingTyre ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Grid container spacing={1.5}>
              {TYRE_PROC_TABS.map((tabName) => {
                const isChecked = tyreTabPermissions.includes(tabName);
                return (
                  <Grid item xs={12} sm={6} md={4} key={tabName}>
                    <Card
                      variant="outlined"
                      onClick={() => handleToggleTyreTab(tabName)}
                      sx={{
                        p: 1.5,
                        cursor: "pointer",
                        borderColor: isChecked ? "#3b82f6" : "#e2e8f0",
                        backgroundColor: isChecked ? "#eff6ff" : "#ffffff",
                        borderWidth: isChecked ? "2px" : "1px",
                        borderRadius: "8px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isChecked}
                            onChange={() => handleToggleTyreTab(tabName)}
                            size="small"
                            color="primary"
                            sx={{ p: 0.5 }}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b" }}>
                            {tabName}
                          </Typography>
                        }
                        sx={{ width: "100%", m: 0 }}
                      />
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Box sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={handleSaveTyre}
                disabled={savingTyre}
                sx={{
                  px: 3,
                  py: 0.8,
                  fontWeight: 700,
                  borderRadius: "6px",
                  bgcolor: "#1e293b",
                  "&:hover": { bgcolor: "#0f172a" },
                }}
              >
                {savingTyre ? "Saving..." : "Save Tyre Permissions"}
              </Button>
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
}

export default AssignProcurementTabs;

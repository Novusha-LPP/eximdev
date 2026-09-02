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
} from "@mui/material";
import axios from "axios";

const PROC_TABS = [
  "1. Purchase Request",
  "2. Supplier Quotation",
  "3. Finance Approval",
  "4. Payment & UTR",
  "5. Order & Dispatch",
  "6. Site GRN",
  "7. Completed",
];

function AssignProcurementTabs({ selectedUser }) {
  const [userTabPermissions, setUserTabPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function fetchUserTabs() {
      if (selectedUser) {
        setLoading(true);
        setMessage(null);
        try {
          const res = await axios.get(
            `/api/tyre-procurement/user-tabs/${selectedUser}`
          );
          if (res.data?.success) {
            setUserTabPermissions(res.data.allowed_tabs || []);
          }
        } catch (err) {
          console.error("Error fetching user procurement tabs:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setUserTabPermissions([]);
      }
    }
    fetchUserTabs();
  }, [selectedUser]);

  const handleToggleTab = (tabName) => {
    setUserTabPermissions((prev) =>
      prev.includes(tabName)
        ? prev.filter((t) => t !== tabName)
        : [...prev, tabName]
    );
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await axios.post("/api/tyre-procurement/assign-user-tabs", {
        username: selectedUser,
        allowed_tabs: userTabPermissions,
      });
      if (res.data?.success) {
        setMessage({
          type: "success",
          text: `Successfully updated Tyre Procurement tab permissions for "${selectedUser}".`,
        });
      }
    } catch (err) {
      console.error("Error saving tab permissions:", err);
      setMessage({
        type: "error",
        text: "Failed to update Tyre Procurement tab permissions.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!selectedUser) {
    return (
      <Box p={3} textAlign="center" color="text.secondary">
        <Typography variant="body1">Select a user to assign Tyre Procurement tab permissions.</Typography>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Card sx={{ p: 3, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}>
          Tyre Procurement SOP Tab Permissions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configuring tab access permissions for user: <strong>{selectedUser}</strong>.
          Check specific tabs to restrict access (e.g. Finance Approval for Mohit Sir, Payment & UTR for Geetanjali Mam). Uncheck all tabs to allow full access.
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              {PROC_TABS.map((tabName) => (
                <Grid item xs={12} sm={6} md={4} key={tabName}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderColor: userTabPermissions.includes(tabName) ? "#3b82f6" : "#e2e8f0",
                      backgroundColor: userTabPermissions.includes(tabName) ? "#eff6ff" : "#ffffff",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={userTabPermissions.includes(tabName)}
                          onChange={() => handleToggleTab(tabName)}
                          size="small"
                          color="primary"
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
              ))}
            </Grid>

            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
                sx={{ px: 3, py: 1, fontWeight: 700, borderRadius: "6px" }}
              >
                {saving ? "Saving..." : "Save Tab Permissions"}
              </Button>
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
}

export default AssignProcurementTabs;

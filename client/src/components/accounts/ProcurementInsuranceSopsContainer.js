import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Tab, Tabs, Typography, Container, Paper, Badge } from "@mui/material";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RmProcurementSop from "./rmProcurementSop/RmProcurementSop";
import TyreProcurementSop from "./tyreProcurementSop/TyreProcurementSop";
import FleetInsuranceSop from "./fleetInsuranceSop/FleetInsuranceSop";

const tabStatusMap = {
  "1. Purchase Request": ["Draft"],
  "2. Supplier Quotation": ["PR Raised", "Preparing for Quotation", "HoD Validated"],
  "3. Finance Approval": ["Quotation Received", "Quotation Updated"],
  "4. Payment & UTR": ["Finance Approved", "Finance Review"],
  "5. Order & Dispatch": ["Payment Done", "Advance Paid", "Order Placed", "Dispatched"],
  "6. Site GRN": ["Dispatched / Site GRN Ready", "GRN Ready", "In Transit", "GRN Received"],
  "7. Completed": ["GRN Done", "GRN Completed", "Closed"],
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sop-tabpanel-${index}`}
      aria-labelledby={`sop-tab-${index}`}
      {...other}
      style={{ width: "100%", height: "100%" }}
    >
      {value === index && <Box sx={{ pt: 2, height: "100%" }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `sop-tab-${index}`,
    "aria-controls": `sop-tabpanel-${index}`,
  };
}

export default function ProcurementInsuranceSopsContainer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const userRole = (user?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  const getInitialTab = () => {
    const path = window.location.pathname;
    if (path.includes("tyre")) return 2;
    if (path.includes("rm")) return 1;
    if (path.includes("fleet")) return 0;
    const savedTab = localStorage.getItem("procurement_sop_active_tab");
    if (savedTab !== null) {
      const tabNum = parseInt(savedTab, 10);
      if (!isNaN(tabNum) && tabNum >= 0 && tabNum <= 2) return tabNum;
    }
    return 0;
  };

  const [value, setValue] = useState(getInitialTab);
  const [badgeCounts, setBadgeCounts] = useState({ fleet: 0, rm: 0, tyre: 0 });

  useEffect(() => {
    async function fetchNotificationCounts() {
      try {
        let userTabs = [];
        if (user?.username && !isAdmin) {
          try {
            const tabsRes = await axios.get(
              `${process.env.REACT_APP_API_STRING}/tyre-procurement/user-tabs/${user.username}`
            );
            if (tabsRes.data?.success && tabsRes.data.allowed_tabs?.length > 0) {
              userTabs = tabsRes.data.allowed_tabs;
            }
          } catch (e) {
            console.error("Error fetching user tabs for container count:", e);
          }
        }

        const [fleetAppRes, fleetPayRes, rmRes, tyreRes] = await Promise.allSettled([
          axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/approvals/list`),
          axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/payment-utr/list`),
          axios.get(`${process.env.REACT_APP_API_STRING}/rm-procurement`),
          axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement`),
        ]);

        let fleetCount = 0;
        const appRecords = fleetAppRes.status === "fulfilled"
          ? (Array.isArray(fleetAppRes.value.data) ? fleetAppRes.value.data : fleetAppRes.value.data?.data || [])
          : [];
        const payRecords = fleetPayRes.status === "fulfilled"
          ? (Array.isArray(fleetPayRes.value.data) ? fleetPayRes.value.data : fleetPayRes.value.data?.data || [])
          : [];

        const pendingApprovalCount = appRecords.length;
        const pendingPaymentUtrCount = payRecords.filter((r) => !r.paymentUtr).length;

        if (!isAdmin && userTabs.length > 0) {
          if (userTabs.includes("Approval")) {
            fleetCount += pendingApprovalCount;
          }
          if (userTabs.includes("Payment & UTR")) {
            fleetCount += pendingPaymentUtrCount;
          }
        } else {
          fleetCount = pendingApprovalCount + pendingPaymentUtrCount;
        }

        let rmCount = 0;
        if (rmRes.status === "fulfilled" && rmRes.value.data?.data) {
          if (!isAdmin && userTabs.length > 0) {
            const allowedStatuses = userTabs.flatMap((t) => tabStatusMap[t] || []);
            rmCount = rmRes.value.data.data.filter((d) => allowedStatuses.includes(d.status)).length;
          } else {
            rmCount = rmRes.value.data.data.filter((d) => d.status && d.status !== "Closed" && d.status !== "GRN Done").length;
          }
        }

        let tyreCount = 0;
        if (tyreRes.status === "fulfilled" && tyreRes.value.data?.data) {
          if (!isAdmin && userTabs.length > 0) {
            const allowedStatuses = userTabs.flatMap((t) => tabStatusMap[t] || []);
            tyreCount = tyreRes.value.data.data.filter((d) => allowedStatuses.includes(d.status)).length;
          } else {
            tyreCount = tyreRes.value.data.data.filter((d) => d.status && d.status !== "Closed" && d.status !== "GRN Done").length;
          }
        }

        setBadgeCounts({ fleet: fleetCount, rm: rmCount, tyre: tyreCount });
      } catch (err) {
        console.error("Error fetching notification counts:", err);
      }
    }

    fetchNotificationCounts();
    const interval = setInterval(fetchNotificationCounts, 30000);
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("tyre")) {
      setValue(2);
      localStorage.setItem("procurement_sop_active_tab", "2");
    } else if (path.includes("rm")) {
      setValue(1);
      localStorage.setItem("procurement_sop_active_tab", "1");
    } else if (path.includes("fleet")) {
      setValue(0);
      localStorage.setItem("procurement_sop_active_tab", "0");
    } else {
      const savedTab = localStorage.getItem("procurement_sop_active_tab");
      if (savedTab !== null) {
        const tabNum = parseInt(savedTab, 10);
        if (!isNaN(tabNum) && tabNum >= 0 && tabNum <= 2) {
          setValue(tabNum);
        }
      }
    }
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    localStorage.setItem("procurement_sop_active_tab", String(newValue));
    if (newValue === 2) {
      navigate("/procurement-insurance-sops/tyre");
    } else if (newValue === 1) {
      navigate("/procurement-insurance-sops/rm");
    } else {
      navigate("/procurement-insurance-sops/fleet");
    }
  };

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", bgcolor: "#f8fafc" }}>
      {/* Executive Main Navigation Bar */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          backgroundColor: "#ffffff",
          px: { xs: 2, md: 3 },
          pt: 1.5,
          pb: 0,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="Procurement SOPs tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
              backgroundColor: "#2563eb",
            },
          }}
        >
          <Tab
            icon={<DirectionsCarIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Fleet Insurance</span>
                {badgeCounts.fleet > 0 && (
                  <Badge
                    badgeContent={badgeCounts.fleet}
                    color="error"
                    sx={{
                      ml: 0.5,
                      "& .MuiBadge-badge": {
                        fontSize: "10px",
                        height: "18px",
                        minWidth: "18px",
                        fontWeight: 700,
                        boxShadow: "0 0 0 2px #fff",
                      },
                    }}
                  />
                )}
              </Box>
            }
            {...a11yProps(0)}
            sx={{
              fontWeight: 600,
              fontSize: "0.95rem",
              textTransform: "none",
              letterSpacing: "0.2px",
              color: "#64748b",
              px: 3,
              py: 1,
              borderRadius: "8px 8px 0 0",
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                color: "#1e40af",
                fontWeight: 700,
                backgroundColor: "rgba(37, 99, 235, 0.04)",
              },
              "&:hover": {
                color: "#1e293b",
              },
            }}
          />
          <Tab
            icon={<Inventory2Icon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>RM Procurement</span>
                {badgeCounts.rm > 0 && (
                  <Badge
                    badgeContent={badgeCounts.rm}
                    color="error"
                    sx={{
                      ml: 0.5,
                      "& .MuiBadge-badge": {
                        fontSize: "10px",
                        height: "18px",
                        minWidth: "18px",
                        fontWeight: 700,
                        boxShadow: "0 0 0 2px #fff",
                      },
                    }}
                  />
                )}
              </Box>
            }
            {...a11yProps(1)}
            sx={{
              fontWeight: 600,
              fontSize: "0.95rem",
              textTransform: "none",
              letterSpacing: "0.2px",
              color: "#64748b",
              px: 3,
              py: 1,
              borderRadius: "8px 8px 0 0",
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                color: "#1e40af",
                fontWeight: 700,
                backgroundColor: "rgba(37, 99, 235, 0.04)",
              },
              "&:hover": {
                color: "#1e293b",
              },
            }}
          />
          <Tab
            icon={<ShoppingCartIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Procurement</span>
                {badgeCounts.tyre > 0 && (
                  <Badge
                    badgeContent={badgeCounts.tyre}
                    color="error"
                    sx={{
                      ml: 0.5,
                      "& .MuiBadge-badge": {
                        fontSize: "10px",
                        height: "18px",
                        minWidth: "18px",
                        fontWeight: 700,
                        boxShadow: "0 0 0 2px #fff",
                      },
                    }}
                  />
                )}
              </Box>
            }
            {...a11yProps(2)}
            sx={{
              fontWeight: 600,
              fontSize: "0.95rem",
              textTransform: "none",
              letterSpacing: "0.2px",
              color: "#64748b",
              px: 3,
              py: 1,
              borderRadius: "8px 8px 0 0",
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                color: "#1e40af",
                fontWeight: 700,
                backgroundColor: "rgba(37, 99, 235, 0.04)",
              },
              "&:hover": {
                color: "#1e293b",
              },
            }}
          />
        </Tabs>
      </Paper>

      {/* Main Tab Content Area */}
      <Box sx={{ flexGrow: 1, backgroundColor: "#f8fafc", p: { xs: 1.5, md: 2.5 } }}>
        <TabPanel value={value} index={0}>
          <FleetInsuranceSop />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <RmProcurementSop />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <TyreProcurementSop />
        </TabPanel>
      </Box>
    </Box>
  );
}


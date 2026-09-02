import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Tab, Tabs, Typography, Container, Paper } from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import TireRepairIcon from "@mui/icons-material/TireRepair";
import RmProcurementSop from "./rmProcurementSop/RmProcurementSop";
import TyreProcurementSop from "./tyreProcurementSop/TyreProcurementSop";
import FleetInsuranceSop from "./fleetInsuranceSop/FleetInsuranceSop";

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
            label="Fleet Insurance"
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
            label="RM Procurement"
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
            icon={<TireRepairIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="Tyre Procurement"
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


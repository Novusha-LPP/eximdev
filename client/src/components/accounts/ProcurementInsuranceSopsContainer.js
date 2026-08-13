import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Tab, Tabs } from "@mui/material";
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
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", backgroundColor: "white", px: 2 }}>
        <Tabs 
          value={value} 
          onChange={handleChange} 
          aria-label="sops tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Fleet Insurance" {...a11yProps(0)} />
          <Tab label="RM Procurement" {...a11yProps(1)} />
          <Tab label="Tyre Procurement" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <Box sx={{ flexGrow: 1, backgroundColor: "#f8f9fa" }}>
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

import React, { useState } from "react";
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
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
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

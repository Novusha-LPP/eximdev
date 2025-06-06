import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import useTabs from "../../customHooks/useTabs";
import FullTruckLoad from "./fullTruckLoad/FullTruckLoad";
import LessThanTruckLoad from "./lessThanTruckLoad/LessThanTruckLoad";
import DSR from "./DSR";
import LrRegister from "./LrRegister.js";
import PrRegister from "./PrRegister.js";

function LrReport() {
  const [value, setValue] = React.useState(0);
  const { a11yProps, CustomTabPanel } = useTabs();
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const tabsConfig = [
    { label: "Full Truck Load", component: <FullTruckLoad /> },
    { label: "Less Than Truck Load", component: <LessThanTruckLoad /> },
    { label: "Tracking", component: <DSR /> },
    { label: "PR Register", component: <PrRegister /> },
    { label: "LR Register", component: <LrRegister /> },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          {tabsConfig.map((tab, index) => (
            <Tab label={tab.label} {...a11yProps(index)} key={index} />
          ))}
        </Tabs>
      </Box>
      <Box>
        {tabsConfig.map((tab, index) => (
          <CustomTabPanel value={value} index={index} key={index}>
            {tab.component}
          </CustomTabPanel>
        ))}
      </Box>
    </Box>
  );
}

export default React.memo(LrReport);

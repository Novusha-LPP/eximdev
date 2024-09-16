import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import useTabs from "../../customHooks/useTabs";
import FullTruckLoad from "./fullTruckLoad/FullTruckLoad";
import LessThanTruckLoad from "./lessThanTruckLoad/LessThanTruckLoad";
import DSR from "./DSR";

function SRCC() {
  const [value, setValue] = React.useState(0);
  const { a11yProps, CustomTabPanel } = useTabs();
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            <Tab label="Full Truck Load" {...a11yProps(0)} key={0} />,
            <Tab label="Less Than Truck Load" {...a11yProps(1)} key={1} />,
            <Tab label="DSR" {...a11yProps(2)} key={2} />,
          </Tabs>
        </Box>
        <Box>
          <CustomTabPanel value={value} index={0}>
            <FullTruckLoad />
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            <LessThanTruckLoad />
          </CustomTabPanel>
          <CustomTabPanel value={value} index={2}>
            <DSR />
          </CustomTabPanel>
        </Box>
      </>
    </Box>
  );
}

export default React.memo(SRCC);

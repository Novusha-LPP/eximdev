import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import OutwardRegisterForm from "../../forms/OutwardRegisterForm";
import ViewOutwardRegisters from "./ViewOutwardRegisters";
import useTabs from "../../customHooks/useTabs";

function OutwardRegister() {
  const [value, setValue] = React.useState(0);
  const { a11yProps, CustomTabPanel } = useTabs();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          [
          <Tab label="Outward Register Form" {...a11yProps(0)} key={0} />,
          <Tab label="View Outward Registers" {...a11yProps(1)} key={1} />, ]
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <OutwardRegisterForm />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <ViewOutwardRegisters />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(OutwardRegister);

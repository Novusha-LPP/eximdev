import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import InwardRegisterForm from "../../forms/InwardRegisterForm";
import ViewInwardRegisters from "./ViewInwardRegisters";
import useTabs from "../../customHooks/useTabs";

function InwardRegister() {
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
          <Tab label="Inward Register Form" {...a11yProps(0)} key={0} />,
          <Tab label="View Inward Registers" {...a11yProps(1)} key={1} />, ]
        </Tabs>
      </Box>

      <CustomTabPanel value={value} index={0}>
        <InwardRegisterForm />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <ViewInwardRegisters />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(InwardRegister);

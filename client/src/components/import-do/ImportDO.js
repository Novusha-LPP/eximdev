import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import "../../styles/import-dsr.scss";
import List from "./List";
import DoPlanning from "./DoPlanning";
import BillingSheet from "./BillingSheet";
import useTabs from "../../customHooks/useTabs";
import KycDetails from "./KycDetails";

function ImportDO() {
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
          <Tab label="List" {...a11yProps(0)} key={0} />,
          <Tab label="DO Planning" {...a11yProps(1)} key={1} />,
          <Tab label="Billing Sheet" {...a11yProps(2)} key={2} />,
          <Tab label="KYC Details" {...a11yProps(2)} key={3} />, ]
        </Tabs>
      </Box>

      <CustomTabPanel value={value} index={0}>
        <List />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <DoPlanning />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <BillingSheet />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={3}>
        <KycDetails />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(ImportDO);

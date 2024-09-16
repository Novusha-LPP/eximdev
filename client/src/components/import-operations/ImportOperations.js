import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import OperationsList from "./OperationsList";
import ExaminationPlanning from "./ExaminationPlanning";
import useTabs from "../../customHooks/useTabs";

function ImportOperations() {
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
          <Tab label="Examination Planning" {...a11yProps(1)} key={1} />, ]
        </Tabs>
      </Box>

      <CustomTabPanel value={value} index={0}>
        <OperationsList />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <ExaminationPlanning />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(ImportOperations);

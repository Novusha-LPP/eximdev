import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import JobList from "./JobList";

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

function JobTabs() {
  const [value, setValue] = React.useState(0);

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
          <Tab label="Pending" {...a11yProps(0)} key={0} />,
          <Tab label="Completed" {...a11yProps(1)} key={1} />,
          <Tab label="Cancelled" {...a11yProps(2)} key={2} />
          ,]
        </Tabs>
      </Box>

      <CustomTabPanel value={value} index={0}>
        <JobList status="Pending" />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <JobList status="Completed" />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <JobList status="Cancelled" />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(JobTabs);

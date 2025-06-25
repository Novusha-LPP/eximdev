import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import PortPenalty from "./PortPenalty";
import Interest from "./Interest";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { useLocation } from "react-router-dom";

export const TabContext = React.createContext({
  currentTab: 0,
  setCurrentTab: () => {},
  navigate: () => {},
});

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`penalty-interest-tabpanel-${index}`}
      aria-labelledby={`penalty-interest-tab-${index}`}
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
    id: `penalty-interest-tab-${index}`,
    "aria-controls": `penalty-interest-tabpanel-${index}`,
  };
}

function reportTabs() {
  const [value, setValue] = React.useState(0);
  const location = useLocation();
  const { 
    setSearchQuery,
    setDetailedStatus,
    setSelectedICD,
    setSelectedImporter 
  } = useSearchQuery();

  // Handle tab restoration when returning from job details
  React.useEffect(() => {
    if (location.state?.fromJobDetails && location.state?.tabIndex !== undefined) {
      setValue(location.state.tabIndex);
      // Clear the state from history so it doesn't persist
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleChange = (event, newValue) => {
    // Clear search parameters when switching tabs
    setSearchQuery("");
    setDetailedStatus("all");
    setSelectedICD("all");
    setSelectedImporter("");
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: "divider",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="penalty interest tabs"
        >
          <Tab label="Port Penalty" {...a11yProps(0)} />
          <Tab label="Interest" {...a11yProps(1)} />
        </Tabs>
      </Box>

      <CustomTabPanel value={value} index={0}>
        <PortPenalty />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <Interest />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(reportTabs);

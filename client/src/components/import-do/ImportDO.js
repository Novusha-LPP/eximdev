import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import "../../styles/import-dsr.scss";
import List from "./List";
import DoPlanning from "./DoPlanning";
import DoCompleted from "./DoCompleted.js";
import BillingSheet from "./BillingSheet";
import useTabs from "../../customHooks/useTabs";
import KycDetails from "./KycDetails";
import FreeDaysConf from "./FreeDaysConf";
import { useLocation, useNavigate } from "react-router-dom";
// Create a context to share tab state between components
export const TabContext = React.createContext({
  currentTab: 0, // Default to the first tab
  setCurrentTab: () => {}, // Placeholder for the set function
  navigate: () => {}, // Placeholder for navigation
});

function ImportDO() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get initial tab value from URL or default to 0
  const initialTab = location.state?.tabIndex ?? 0; // Explicit handling for null/undefined
  const [value, setValue] = React.useState(initialTab);

  const { a11yProps, CustomTabPanel } = useTabs();

  const handleChange = (event, newValue) => {
    setValue(newValue);
    // Update URL with new tab index
    navigate(".", { state: { tabIndex: newValue }, replace: true });
  };

  // Create context value with tab state and navigation
  const contextValue = React.useMemo(
    () => ({
      currentTab: value,
      setCurrentTab: setValue,
      navigate,
    }),
    [value, navigate]
  );

  // Debugging context value

  return (
    <TabContext.Provider value={contextValue}>
      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            <Tab label="Free Days Conf." {...a11yProps(0)} />
            <Tab label="List" {...a11yProps(1)} />
            <Tab label="DO Planning" {...a11yProps(2)} />
            <Tab label="DO Completed" {...a11yProps(3)} />
            <Tab label="Billing Sheet" {...a11yProps(4)} />
            <Tab label="KYC Details" {...a11yProps(5)} />
          </Tabs>
        </Box>
        <CustomTabPanel value={value} index={0}>
          <FreeDaysConf />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <List />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <DoPlanning />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={3}>
          <DoCompleted />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={4}>
          <BillingSheet />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={5}>
          <KycDetails />
        </CustomTabPanel>
      </Box>
    </TabContext.Provider>
  );
}

export default React.memo(ImportDO);

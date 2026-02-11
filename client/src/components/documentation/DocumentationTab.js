import * as React from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import DocumentationCompleted from "./DocumentationCompleted.js";
import Documentation from "./Documentation.js";
import useTabs from "../../customHooks/useTabs";

// Create a context to share tab state between components
export const TabContext = React.createContext({
  currentTab: 0,
  setCurrentTab: () => {},
  navigate: () => {},
});

function DocumentationTab() {
  const location = useLocation();
  const navigate = useNavigate();
  const { a11yProps, CustomTabPanel } = useTabs();

  // Get initial tab value from URL state or default to 0
  const initialTab = location.state?.tabIndex ?? 0;
  const [value, setValue] = React.useState(initialTab);

  // Sync tab state when the component mounts (to prevent mismatches)
  React.useEffect(() => {
    if (value !== initialTab) {
      setValue(initialTab);
    }
  }, [initialTab]);

  // Optimized handleChange function using useCallback
  const handleChange = React.useCallback(
    (event, newValue) => {
      setValue(newValue);
      navigate(".", { state: { tabIndex: newValue }, replace: true });
    },
    [navigate]
  );

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(
    () => ({
      currentTab: value,
      setCurrentTab: setValue,
      navigate,
    }),
    [value, navigate]
    );

  return (
    <TabContext.Provider value={contextValue}>
      <Box sx={{ width: "100%" }}>
        {/* Tabs Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="Documentation Tabs"
          >
            <Tab label="Documentation" {...a11yProps(0)} />
            <Tab label="Documentation Completed" {...a11yProps(1)} />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <CustomTabPanel value={value} index={0}>
          <Documentation />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <DocumentationCompleted />
        </CustomTabPanel>
      </Box>
    </TabContext.Provider>
  );
}

// Memoized for performance optimization
export default React.memo(DocumentationTab);

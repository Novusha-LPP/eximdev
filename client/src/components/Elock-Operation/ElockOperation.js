import React, { useMemo, useCallback, useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import useTabs from "../../customHooks/useTabs";
import ElockAssgin from "./ElockAssgin.js";
import ElockAssginOthers from "./ElockAssginOthers.js";
import ElockHistory from "./ElockHistory.js";

// Context for sharing tab state
export const TabContext = React.createContext({
  currentTab: 0,
  setCurrentTab: () => {},
  navigate: () => {},
});

function ElockOperation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { a11yProps, CustomTabPanel } = useTabs();

  const initialTab = location.state?.tabIndex ?? 0;
  const [currentTab, setCurrentTab] = useState(initialTab);

  const handleChange = useCallback(
    (event, newValue) => {
      setCurrentTab(newValue);
      navigate(".", { state: { tabIndex: newValue }, replace: true });
    },
    [navigate]
  );

  const contextValue = useMemo(
    () => ({ currentTab, setCurrentTab, navigate }),
    [currentTab, navigate]
  );

  return (
    <TabContext.Provider value={contextValue}>
      <Box sx={{ width: "100%" }}>
        {/* Tabs Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={currentTab}
            onChange={handleChange}
            aria-label="Elock Tabs"
          >
            <Tab label="Elock Assign" {...a11yProps(0)} key="tab-0" />
            <Tab label="Elock Assign Others" {...a11yProps(1)} key="tab-1" />
            <Tab label="Elock History" {...a11yProps(2)} key="tab-2" />
            {/* Future Tabs can be added here */}
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <CustomTabPanel value={currentTab} index={0}>
          <ElockAssgin />
        </CustomTabPanel>
        <CustomTabPanel value={currentTab} index={1}>
          <ElockAssginOthers />
        </CustomTabPanel>
        <CustomTabPanel value={currentTab} index={2}>
          <ElockHistory />
        </CustomTabPanel>
      </Box>
    </TabContext.Provider>
  );
}

export default React.memo(ElockOperation);

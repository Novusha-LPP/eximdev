import * as React from "react";
import { Tabs, Tab, Box, ToggleButtonGroup, ToggleButton, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import useTabs from "../../customHooks/useTabs";
import ImportBilling from "./ImportBilling";
import ClearanceCompleted from "./ClearanceCompleted";
import PaymentRequested from "./PaymentRequested";
import PaymentPending from "./PaymentPending";
import PaymentCompleted from "./PaymentCompleted";
import ImportCompletedBilling from './ImportCompletedBilling.js'

// Create a context to share tab state between components
export const TabContext = React.createContext({
  currentTab: 0,
  setCurrentTab: () => {},
  navigate: () => {},
});

function ImportBillingTab() {
  const location = useLocation();
  const navigate = useNavigate();
  const { a11yProps, CustomTabPanel } = useTabs();

  // Get initial tab value from URL state or default to 0
  const initialTab = location.state?.tabIndex ?? 0;
  const [value, setValue] = React.useState(initialTab);
  const [workMode, setWorkMode] = React.useState("Payment");

  // Sync tab state when the component mounts (to prevent mismatches)
  React.useEffect(() => {
    if (value !== initialTab) {
      setValue(initialTab);
    }
  }, [initialTab]);

  const handleWorkModeChange = (event, newMode) => {
    if (newMode !== null) {
      setWorkMode(newMode);
    }
  };

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
        <Box sx={{ borderBottom: 1, borderColor: "divider", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="import Billing Tabs"
            sx={{ flexGrow: 1 }}
          >
            <Tab label="Import Billing" {...a11yProps(0)} />
            <Tab label="Clearance Completed" {...a11yProps(1)} />
            <Tab label={workMode === "Payment" ? "Payment Requested" : "Purchase Book Requested"} {...a11yProps(2)} />
            <Tab label={workMode === "Payment" ? "Payment" : "Purchase Book"} {...a11yProps(3)} />
            <Tab label={workMode === "Payment" ? "Payment Completed" : "Purchase Book Completed"} {...a11yProps(4)} />
            <Tab label="Import Completed Billing" {...a11yProps(5)} />
          </Tabs>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>Work Mode:</Typography>
            <ToggleButtonGroup
              value={workMode}
              exclusive
              onChange={handleWorkModeChange}
              size="small"
              color="primary"
              sx={{ height: 32 }}
            >
              <ToggleButton value="Payment" sx={{ px: 2, fontSize: '0.75rem' }}>Payment</ToggleButton>
              <ToggleButton value="Purchase Book" sx={{ px: 2, fontSize: '0.75rem' }}>Purchase Book</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Tab Panels */}
        <CustomTabPanel value={value} index={0}>
          <ImportBilling workMode={workMode} />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <ClearanceCompleted workMode={workMode} />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <PaymentRequested workMode={workMode} />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={3}>
          <PaymentPending workMode={workMode} />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={4}>
          <PaymentCompleted workMode={workMode} />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={5}>
          <ImportCompletedBilling workMode={workMode} />
        </CustomTabPanel>
      </Box>
    </TabContext.Provider>
  );
}

// Memoized for performance optimization
export default React.memo(ImportBillingTab);

import * as React from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import OnboardEmployee from "./OnboardEmployee";
import CompleteOnboarding from "./CompleteOnboarding";
import ViewOnboardings from "./ViewOnboardings";
import useTabs from "../../customHooks/useTabs";

// Create a context to share tab state between components
export const TabContext = React.createContext({
  currentTab: 0,
  setCurrentTab: () => {},
  navigate: () => {},
});

function EmployeeOnboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = React.useContext(UserContext);
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

  // Render tabs based on user role
  const renderAdminTabs = () => (
    <>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="Employee Onboarding Tabs"
        >
          <Tab label="Onboard Employee" {...a11yProps(0)} />
          <Tab label="View Employee Onboardings" {...a11yProps(1)} />
          <Tab label="Complete Onboarding" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <Box>
        <CustomTabPanel value={value} index={0}>
          <OnboardEmployee />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <ViewOnboardings />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <CompleteOnboarding />
        </CustomTabPanel>
      </Box>
    </>
  );

  const renderNonAdminTabs = () => (
    <>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="Employee Onboarding Tabs"
        >
          <Tab label="Complete Onboarding" {...a11yProps(0)} />
        </Tabs>
      </Box>
      <Box>
        <CustomTabPanel value={value} index={0}>
          <CompleteOnboarding />
        </CustomTabPanel>
      </Box>
    </>
  );

  return (
    <TabContext.Provider value={contextValue}>
      <Box sx={{ width: "100%" }}>
        {user.role === "Admin" ? renderAdminTabs() : renderNonAdminTabs()}
      </Box>
    </TabContext.Provider>
  );
}

export default React.memo(EmployeeOnboarding);

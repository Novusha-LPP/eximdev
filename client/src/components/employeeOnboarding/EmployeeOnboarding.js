import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { UserContext } from "../../contexts/UserContext";
import OnboardEmployee from "./OnboardEmployee";
import CompleteOnboarding from "./CompleteOnboarding";
import ViewOnboardings from "./ViewOnboardings";
import useTabs from "../../customHooks/useTabs";
import "../../styles/hr-modules.scss";

function EmployeeOnboarding() {
  const [value, setValue] = React.useState(0);
  const { user } = React.useContext(UserContext);
  const { a11yProps, CustomTabPanel } = useTabs();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box className="hr-page-container">
      {/* Page Header */}
      <div className="hr-page-header">
        <h1 className="hr-page-title">Employee Onboarding</h1>
      </div>

      {/* Main Content */}
      <div className="hr-tabs-container">
        {user.role === "Admin" ? (
          <>
            <Tabs value={value} onChange={handleChange} aria-label="Employee Onboarding tabs">
              <Tab label="Onboard Employee" {...a11yProps(0)} />
              <Tab label="View Onboardings" {...a11yProps(1)} />
              <Tab label="Complete Onboarding" {...a11yProps(2)} />
            </Tabs>
            <div className="hr-tab-content">
              <CustomTabPanel value={value} index={0}>
                <OnboardEmployee />
              </CustomTabPanel>
              <CustomTabPanel value={value} index={1}>
                <ViewOnboardings />
              </CustomTabPanel>
              <CustomTabPanel value={value} index={2}>
                <CompleteOnboarding />
              </CustomTabPanel>
            </div>
          </>
        ) : (
          <>
            <Tabs value={value} onChange={handleChange} aria-label="Employee Onboarding tabs">
              <Tab label="Complete Onboarding" {...a11yProps(0)} />
            </Tabs>
            <div className="hr-tab-content">
              <CustomTabPanel value={value} index={0}>
                <CompleteOnboarding />
              </CustomTabPanel>
            </div>
          </>
        )}
      </div>
    </Box>
  );
}

export default React.memo(EmployeeOnboarding);

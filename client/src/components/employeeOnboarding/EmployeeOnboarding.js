import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { UserContext } from "../../contexts/UserContext";
import OnboardEmployee from "./OnboardEmployee";
import CompleteOnboarding from "./CompleteOnboarding";
import ViewOnboardings from "./ViewOnboardings";
import useTabs from "../../customHooks/useTabs";

function EmployeeOnboarding() {
  const [value, setValue] = React.useState(0);
  const { user } = React.useContext(UserContext);
  const { a11yProps, CustomTabPanel } = useTabs();
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      {user.role === "Admin" ? (
        <>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="basic tabs example"
            >
              <Tab label="Onboard Employee" {...a11yProps(0)} key={0} />,
              <Tab
                label="View Employee Onboardings"
                {...a11yProps(1)}
                key={1}
              />
              ,
              <Tab label="Complete Onboarding" {...a11yProps(2)} key={2} />
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
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="basic tabs example"
            >
              <Tab label="Complete Onboarding" {...a11yProps(1)} key={0} />
            </Tabs>
          </Box>

          <Box>
            <CustomTabPanel value={value} index={0}>
              <CompleteOnboarding />
            </CustomTabPanel>
          </Box>
        </>
      )}
    </Box>
  );
}

export default React.memo(EmployeeOnboarding);

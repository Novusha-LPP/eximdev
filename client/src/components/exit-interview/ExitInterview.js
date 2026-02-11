import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { UserContext } from "../../contexts/UserContext";
import ExitInterviewForm from "../../forms/ExitInterviewForm";
import ViewExitInterviews from "./ViewExitInterviews";
import useTabs from "../../customHooks/useTabs";
import "../../styles/hr-modules.scss";

function ExitInterview() {
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
        <h1 className="hr-page-title">Exit Feedback</h1>
      </div>

      {/* Main Content */}
      <div className="hr-tabs-container">
        {user.role === "Admin" ? (
          <>
            <Tabs value={value} onChange={handleChange} aria-label="Exit Feedback tabs">
              <Tab label="Submit Feedback" {...a11yProps(0)} />
              <Tab label="View Feedbacks" {...a11yProps(1)} />
            </Tabs>
            <div className="hr-tab-content">
              <CustomTabPanel value={value} index={0}>
                <ExitInterviewForm />
              </CustomTabPanel>
              <CustomTabPanel value={value} index={1}>
                <ViewExitInterviews />
              </CustomTabPanel>
            </div>
          </>
        ) : (
          <>
            <Tabs value={value} onChange={handleChange} aria-label="Exit Feedback tabs">
              <Tab label="Submit Feedback" {...a11yProps(0)} />
            </Tabs>
            <div className="hr-tab-content">
              <CustomTabPanel value={value} index={0}>
                <ExitInterviewForm />
              </CustomTabPanel>
            </div>
          </>
        )}
      </div>
    </Box>
  );
}

export default React.memo(ExitInterview);

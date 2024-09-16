import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { UserContext } from "../../contexts/UserContext";
import ExitInterviewForm from "../../forms/ExitInterviewForm";
import ViewExitInterviews from "./ViewExitInterviews";
import useTabs from "../../customHooks/useTabs";

function ExitInterview() {
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
              <Tab label="Exit Feedback Form" {...a11yProps(0)} key={0} />,
              <Tab label="View Exit Feedbacks" {...a11yProps(1)} key={1} />,
            </Tabs>
          </Box>

          <Box>
            <CustomTabPanel value={value} index={0}>
              <ExitInterviewForm />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
              <ViewExitInterviews />
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
              <Tab label="Exit Interview Form" {...a11yProps(1)} key={0} />
            </Tabs>
          </Box>

          <Box>
            <CustomTabPanel value={value} index={0}>
              <ExitInterviewForm />
            </CustomTabPanel>
          </Box>
        </>
      )}
    </Box>
  );
}

export default React.memo(ExitInterview);

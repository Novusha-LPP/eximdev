import * as React from "react";
import { useParams } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import CompleteKYC from "./CompleteKYC";
import ViewKycList from "./ViewKycList";
import useTabs from "../../customHooks/useTabs";
import { UserContext } from "../../contexts/UserContext";
import "../../styles/hr-modules.scss";

function EmployeeKYC() {
  const { username } = useParams();
  const [value, setValue] = React.useState(username ? 1 : 0);
  const { a11yProps, CustomTabPanel } = useTabs();
  const { user } = React.useContext(UserContext);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box className="hr-page-container">
      {/* Page Header */}
      <div className="hr-page-header">
        <h1 className="hr-page-title">Employee KYC</h1>
      </div>

      {/* Main Content */}
      {username ? (
        <CompleteKYC />
      ) : (
        <div className="hr-tabs-container">
          {user.role === "Admin" ? (
            <>
              <Tabs value={value} onChange={handleChange} aria-label="Employee KYC tabs">
                <Tab label="View Employee KYCs" {...a11yProps(0)} />
                <Tab label="Complete KYC" {...a11yProps(1)} />
              </Tabs>
              <div className="hr-tab-content">
                <CustomTabPanel value={value} index={0}>
                  <ViewKycList />
                </CustomTabPanel>
                <CustomTabPanel value={value} index={1}>
                  <CompleteKYC />
                </CustomTabPanel>
              </div>
            </>
          ) : (
            <>
              <Tabs value={value} onChange={handleChange} aria-label="Employee KYC tabs">
                <Tab label="Complete KYC" {...a11yProps(0)} />
              </Tabs>
              <div className="hr-tab-content">
                <CustomTabPanel value={value} index={0}>
                  <CompleteKYC />
                </CustomTabPanel>
              </div>
            </>
          )}
        </div>
      )}
    </Box>
  );
}

export default React.memo(EmployeeKYC);

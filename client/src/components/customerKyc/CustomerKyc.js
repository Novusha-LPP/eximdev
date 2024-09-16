import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import CustomerKycForm from "./CustomerKycForm";
import CompletedKyc from "./CompletedKyc";
import useTabs from "../../customHooks/useTabs";
import ViewDrafts from "./ViewDrafts";
import ApprovedByHod from "./ApprovedByHod";
import HodApprovalPending from "./HodApprovalPending";
import RevisionList from "./RevisionList";
import { UserContext } from "../../contexts/UserContext";

function CustomerKyc() {
  const { user } = React.useContext(UserContext);
  const [value, setValue] = React.useState(0);
  const { a11yProps, CustomTabPanel } = useTabs();
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      {user.role === "Admin" ? (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="basic tabs example"
            >
              <Tab label="Customer KYC" {...a11yProps(0)} key={0} />,
              <Tab label="View Drafts" {...a11yProps(1)} key={1} />,
              <Tab label="Revise KYC" {...a11yProps(2)} key={2} />,
              <Tab label="First Approval" {...a11yProps(3)} key={3} />,
              <Tab label="Second Approval" {...a11yProps(4)} key={4} />,
              <Tab label="View Completed KYC" {...a11yProps(5)} key={5} />,
            </Tabs>
          </Box>

          <Box>
            <CustomTabPanel value={value} index={0}>
              <CustomerKycForm />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
              <ViewDrafts />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
              <RevisionList />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={3}>
              <HodApprovalPending />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={4}>
              <ApprovedByHod />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={5}>
              <CompletedKyc />
            </CustomTabPanel>
          </Box>
        </Box>
      ) : (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="basic tabs example"
            >
              <Tab label="Customer KYC" {...a11yProps(0)} key={0} />,
              <Tab label="View Drafts" {...a11yProps(1)} key={1} />,
              <Tab label="Revise KYC" {...a11yProps(4)} key={2} />,
            </Tabs>
          </Box>

          <Box>
            <CustomTabPanel value={value} index={0}>
              <CustomerKycForm />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
              <ViewDrafts />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
              <RevisionList />
            </CustomTabPanel>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default React.memo(CustomerKyc);

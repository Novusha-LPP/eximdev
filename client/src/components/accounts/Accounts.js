import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Forms from "./Forms";
import ViewAccounts from "./ViewAccounts";
import LedgerProcessor from "./LedgerProcessor";
import useTabs from "../../customHooks/useTabs";

function Accounts() {
  const [value, setValue] = React.useState(0);
  const [entryToEdit, setEntryToEdit] = React.useState(null);
  const { a11yProps, CustomTabPanel } = useTabs();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Function to handle edit from View tab
  const handleEditEntry = (entry) => {
    setEntryToEdit(entry);
    setValue(0); // Switch to Forms tab
  };

  // Function to reset entry after edit is done
  const handleResetEntry = () => {
    setEntryToEdit(null);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label="Forms" {...a11yProps(0)} />
          <Tab label="View" {...a11yProps(1)} />
          <Tab label="Ledger Processor" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <Forms/>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <ViewAccounts onEditEntry={handleEditEntry} />{" "}
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <LedgerProcessor />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(Accounts);

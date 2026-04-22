import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Forms from "./Forms";
import ViewAccounts from "./ViewAccounts";
import LedgerProcessor from "./LedgerProcessor";
import BillCover from "./BillCover";
import useTabs from "../../customHooks/useTabs";
import { UserContext } from "../../contexts/UserContext";

function Accounts() {
  const [value, setValue] = React.useState(0);
  const [entryToEdit, setEntryToEdit] = React.useState(null);
  const { a11yProps, CustomTabPanel } = useTabs();
  const { user } = React.useContext(UserContext);
  const userModules = user?.modules || [];

  const hasAccounts = userModules.includes("Accounts");
  const hasBillCover = userModules.includes("Bill Cover");

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

  // Determine which tabs to show
  const availableTabs = [];
  if (hasAccounts) {
    availableTabs.push({ label: "Forms", index: 0, component: <Forms /> });
    availableTabs.push({ label: "View", index: 1, component: <ViewAccounts onEditEntry={handleEditEntry} /> });
    availableTabs.push({ label: "Ledger Calc.", index: 2, component: <LedgerProcessor /> });
  }
  if (hasBillCover) {
    availableTabs.push({ label: "Bill Cover", index: 3, component: <BillCover /> });
  }

  // Effect to set initial value to the first available tab if current index is invalid
  React.useEffect(() => {
    if (availableTabs.length > 0) {
      const isCurrentValueValid = availableTabs.some(tab => tab.index === value);
      if (!isCurrentValueValid) {
        setValue(availableTabs[0].index);
      }
    }
  }, [availableTabs, value]);

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="accounts tabs"
        >
          {availableTabs.map((tab) => (
            <Tab key={tab.index} label={tab.label} {...a11yProps(tab.index)} value={tab.index} />
          ))}
        </Tabs>
      </Box>
      {availableTabs.map((tab) => (
        <CustomTabPanel key={tab.index} value={value} index={tab.index}>
          {tab.component}
        </CustomTabPanel>
      ))}
    </Box>
  );
}

export default React.memo(Accounts);

import React, { useState, useCallback } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import useTabs from "../../../customHooks/useTabs";
import RmProcurementList from "./RmProcurementList";
import RmProcurementForm from "./RmProcurementForm";

function RmProcurementSop() {
  const [value, setValue] = useState(0);
  const [selectedPr, setSelectedPr] = useState(null);
  const { a11yProps, CustomTabPanel } = useTabs();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleEdit = useCallback((pr) => {
    setSelectedPr(pr);
    setValue(1);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedPr(null);
    setValue(1);
  }, []);

  const handleSaved = useCallback(() => {
    setSelectedPr(null);
    setValue(0);
  }, []);

  const handleCancel = useCallback(() => {
    setSelectedPr(null);
    setValue(0);
  }, []);

  const tabs = [
    { label: "PR List", index: 0 },
    { label: selectedPr ? "Edit PR" : "Create PR", index: 1 },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={value} onChange={handleChange} aria-label="rm procurement tabs">
          {tabs.map((tab) => (
            <Tab key={tab.index} label={tab.label} {...a11yProps(tab.index)} value={tab.index} />
          ))}
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <RmProcurementList onEdit={handleEdit} onCreate={handleCreate} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <RmProcurementForm
          pr={selectedPr}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(RmProcurementSop);

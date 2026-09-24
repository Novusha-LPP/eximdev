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
  const [isView, setIsView] = useState(false);
  const { a11yProps, CustomTabPanel } = useTabs();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleEdit = useCallback((pr) => {
    setSelectedPr(pr);
    setIsView(false);
    setValue(1);
  }, []);

  const handleView = useCallback((pr) => {
    setSelectedPr(pr);
    setIsView(true);
    setValue(1);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedPr(null);
    setIsView(false);
    setValue(1);
  }, []);

  const handleSaved = useCallback(() => {
    setSelectedPr(null);
    setIsView(false);
    setValue(0);
  }, []);

  const handleCancel = useCallback(() => {
    setSelectedPr(null);
    setIsView(false);
    setValue(0);
  }, []);

  const tabs = [
    { label: "PR List", index: 0 },
    { label: isView ? "View PR" : (selectedPr ? "Edit PR" : "Create PR"), index: 1 },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="rm procurement tabs"
          sx={{
            minHeight: 40,
            "& .MuiTabs-indicator": {
              backgroundColor: "#2563eb",
              height: 2.5,
              borderRadius: 2,
            },
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.index}
              label={tab.label}
              {...a11yProps(tab.index)}
              value={tab.index}
              sx={{
                fontWeight: 600,
                fontSize: "0.875rem",
                textTransform: "none",
                color: "#64748b",
                "&.Mui-selected": {
                  color: "#2563eb",
                  fontWeight: 700,
                },
              }}
            />
          ))}
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <RmProcurementList onEdit={handleEdit} onView={handleView} onCreate={handleCreate} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <RmProcurementForm
          pr={selectedPr}
          isView={isView}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(RmProcurementSop);


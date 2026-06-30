import React, { useState, useCallback } from "react";
import FleetInsuranceList from "./FleetInsuranceList";
import FleetInsuranceForm from "./FleetInsuranceForm";
import { Box } from "@mui/material";

function FleetInsuranceSop() {
  const [view, setView] = useState("list"); // list, form
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [isView, setIsView] = useState(false);

  const handleEdit = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsView(false);
    setView("form");
  }, []);

  const handleView = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsView(true);
    setView("form");
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedProposal(null);
    setIsView(false);
    setView("form");
  }, []);

  const handleCancel = useCallback(() => {
    setSelectedProposal(null);
    setIsView(false);
    setView("list");
  }, []);

  const handleSaved = useCallback(() => {
    setSelectedProposal(null);
    setIsView(false);
    setView("list");
  }, []);

  return (
    <Box sx={{ p: 1 }}>
      {view === "list" ? (
        <FleetInsuranceList onEdit={handleEdit} onView={handleView} onCreate={handleCreate} />
      ) : (
        <FleetInsuranceForm
          proposal={selectedProposal}
          isView={isView}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
}

export default React.memo(FleetInsuranceSop);

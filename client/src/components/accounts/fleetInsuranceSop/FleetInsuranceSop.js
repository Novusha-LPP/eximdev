import React, { useState, useCallback } from "react";
import FleetInsuranceList from "./FleetInsuranceList";
import FleetInsuranceForm from "./FleetInsuranceForm";
import { Box } from "@mui/material";

function FleetInsuranceSop() {
  const [view, setView] = useState("list"); // list, form
  const [selectedProposal, setSelectedProposal] = useState(null);

  const handleEdit = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setView("form");
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedProposal(null);
    setView("form");
  }, []);

  const handleCancel = useCallback(() => {
    setSelectedProposal(null);
    setView("list");
  }, []);

  const handleSaved = useCallback(() => {
    setSelectedProposal(null);
    setView("list");
  }, []);

  return (
    <Box sx={{ p: 1 }}>
      {view === "list" ? (
        <FleetInsuranceList onEdit={handleEdit} onCreate={handleCreate} />
      ) : (
        <FleetInsuranceForm
          proposal={selectedProposal}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
}

export default React.memo(FleetInsuranceSop);

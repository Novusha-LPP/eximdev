import React, { useState, useCallback } from "react";
import FleetInsuranceList from "./FleetInsuranceList";
import FleetInsuranceForm from "./FleetInsuranceForm";
import FleetInsuranceHistory from "./FleetInsuranceHistory";
import { Box } from "@mui/material";

function FleetInsuranceSop() {
  const [view, setView] = useState("list"); // list, form, history
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedRegNo, setSelectedRegNo] = useState(null);
  const [isView, setIsView] = useState(false);
  const [isRenew, setIsRenew] = useState(false);

  const handleViewHistory = useCallback((regNo) => {
    setSelectedRegNo(regNo);
    setView("history");
  }, []);

  const handleEdit = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsView(false);
    setIsRenew(false);
    setView("form");
  }, []);

  const handleRenew = useCallback((proposal) => {
    // We clone the proposal for renewal but mark it as a new record
    setSelectedProposal(proposal);
    setIsView(false);
    setIsRenew(true); // this flag tells the form to strip ID and submit as POST
    setView("form");
  }, []);

  const handleView = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setIsView(true);
    setIsRenew(false);
    setView("form");
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedProposal(null);
    setIsView(false);
    setIsRenew(false);
    setView("form");
  }, []);

  const handleCancel = useCallback(() => {
    if (view === "form" && selectedRegNo) {
      setView("history");
    } else {
      setSelectedProposal(null);
      setSelectedRegNo(null);
      setIsView(false);
      setIsRenew(false);
      setView("list");
    }
  }, [view, selectedRegNo]);

  const handleSaved = useCallback(() => {
    if (view === "form" && selectedRegNo) {
      setView("history");
    } else {
      setSelectedProposal(null);
      setSelectedRegNo(null);
      setIsView(false);
      setIsRenew(false);
      setView("list");
    }
  }, [view, selectedRegNo]);
  
  const handleBackToList = useCallback(() => {
    setSelectedRegNo(null);
    setView("list");
  }, []);

  return (
    <Box sx={{ p: 1 }}>
      {view === "list" && (
        <FleetInsuranceList onViewHistory={handleViewHistory} onRenew={handleRenew} onCreate={handleCreate} />
      )}
      
      {view === "history" && (
        <FleetInsuranceHistory 
          registrationNo={selectedRegNo} 
          onEdit={handleEdit} 
          onRenew={handleRenew}
          onBack={handleBackToList}
        />
      )}

      {view === "form" && (
        <FleetInsuranceForm
          proposal={selectedProposal}
          isView={isView}
          isRenew={isRenew}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
}

export default React.memo(FleetInsuranceSop);

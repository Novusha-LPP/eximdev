import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import FleetInsuranceList from "./FleetInsuranceList";
import FleetInsuranceForm from "./FleetInsuranceForm";
import FleetInsuranceHistory from "./FleetInsuranceHistory";
import { Box } from "@mui/material";

function FleetInsuranceSop({ mode: propMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [view, setView] = useState("list"); // list, form, history
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedRegNo, setSelectedRegNo] = useState(null);
  const [isView, setIsView] = useState(false);
  const [isRenew, setIsRenew] = useState(false);
  const [initialStageTab, setInitialStageTab] = useState(0);

  // Sync state from current URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/fleet-insurance/create")) {
      setView("form");
      setSelectedProposal(null);
      setIsView(false);
      setIsRenew(false);
      setInitialStageTab(0);
    } else if (path.includes("/fleet-insurance/renew/")) {
      const id = path.split("/fleet-insurance/renew/")[1];
      setView("form");
      setSelectedProposal(id ? { _id: id } : null);
      setIsView(false);
      setIsRenew(true);
      setInitialStageTab(0);
    } else if (path.includes("/fleet-insurance/edit/")) {
      const id = path.split("/fleet-insurance/edit/")[1];
      setView("form");
      setSelectedProposal(id ? { _id: id } : null);
      setIsView(false);
      setIsRenew(false);
      setInitialStageTab(0);
    } else if (path.includes("/fleet-insurance/view/")) {
      const id = path.split("/fleet-insurance/view/")[1];
      setView("form");
      setSelectedProposal(id ? { _id: id } : null);
      setIsView(true);
      setIsRenew(false);
      setInitialStageTab(0);
    } else if (path.includes("/fleet-insurance/approval/")) {
      const id = path.split("/fleet-insurance/approval/")[1];
      setView("form");
      setSelectedProposal(id ? { _id: id } : null);
      setIsView(false);
      setIsRenew(false);
      setInitialStageTab(2);
    } else if (path.includes("/fleet-insurance/payment-utr/")) {
      const id = path.split("/fleet-insurance/payment-utr/")[1];
      setView("form");
      setSelectedProposal(id ? { _id: id } : null);
      setIsView(false);
      setIsRenew(false);
      setInitialStageTab(3);
    } else if (path.includes("/fleet-insurance/history")) {
      const reg = params.registrationNo || (path.split("/fleet-insurance/history/")[1] ? decodeURIComponent(path.split("/fleet-insurance/history/")[1]) : null);
      setView("history");
      setSelectedRegNo(reg);
    } else {
      setView("list");
      setSelectedProposal(null);
      setIsView(false);
      setIsRenew(false);
    }
  }, [location.pathname, params.registrationNo]);

  const handleViewHistory = useCallback((regNo) => {
    navigate(`/fleet-insurance/history/${encodeURIComponent(regNo)}`);
  }, [navigate]);

  const handleEdit = useCallback((proposal) => {
    const id = proposal?._id || proposal;
    if (id) {
      navigate(`/fleet-insurance/edit/${id}`);
    } else {
      navigate(`/fleet-insurance/create`);
    }
  }, [navigate]);

  const handleRenew = useCallback((proposal) => {
    const id = proposal?._id || proposal;
    if (id) {
      navigate(`/fleet-insurance/renew/${id}`);
    } else {
      navigate(`/fleet-insurance/create`);
    }
  }, [navigate]);

  const handleOpenApproval = useCallback((proposal) => {
    const id = proposal?._id || proposal;
    if (id) {
      navigate(`/fleet-insurance/approval/${id}`);
    }
  }, [navigate]);

  const handleOpenPaymentUtr = useCallback((proposal) => {
    const id = proposal?._id || proposal;
    if (id) {
      navigate(`/fleet-insurance/payment-utr/${id}`);
    }
  }, [navigate]);

  const handleView = useCallback((proposal) => {
    const id = proposal?._id || proposal;
    if (id) {
      navigate(`/fleet-insurance/view/${id}`);
    }
  }, [navigate]);

  const handleCreate = useCallback(() => {
    navigate("/fleet-insurance/create");
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate("/procurement-insurance-sops");
  }, [navigate]);

  const handleSaved = useCallback(() => {
    navigate("/procurement-insurance-sops");
  }, [navigate]);
  
  const handleBackToList = useCallback(() => {
    navigate("/procurement-insurance-sops");
  }, [navigate]);

  return (
    <Box sx={{ p: 1 }}>
      {view === "list" && (
        <FleetInsuranceList
          onViewHistory={handleViewHistory}
          onRenew={handleRenew}
          onCreate={handleCreate}
          onOpenApproval={handleOpenApproval}
          onOpenPaymentUtr={handleOpenPaymentUtr}
          onEdit={handleEdit}
          onView={handleView}
        />
      )}
      
      {view === "history" && (
        <FleetInsuranceHistory 
          registrationNo={selectedRegNo} 
          onEdit={handleEdit} 
          onRenew={handleRenew}
          onView={handleView}
          onBack={handleBackToList}
        />
      )}

      {view === "form" && (
        <FleetInsuranceForm
          proposal={selectedProposal}
          isView={isView}
          isRenew={isRenew}
          initialTab={initialStageTab}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
}

export default React.memo(FleetInsuranceSop);

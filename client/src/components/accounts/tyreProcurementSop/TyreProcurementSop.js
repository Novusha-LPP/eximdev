import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import TyreProcurementList from "./TyreProcurementList";
import TyreProcurementForm from "./TyreProcurementForm";
import { Box } from "@mui/material";

function TyreProcurementSop() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [view, setView] = useState("list"); // list, form
  const [selectedPr, setSelectedPr] = useState(null);
  const [isView, setIsView] = useState(false);

  // Sync state from current URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/tyre-procurement/create") || path.includes("/tyre/create")) {
      setView("form");
      setSelectedPr(null);
      setIsView(false);
    } else if (path.includes("/tyre-procurement/edit/") || path.includes("/tyre/edit/")) {
      const parts = path.split(path.includes("/tyre-procurement/edit/") ? "/tyre-procurement/edit/" : "/tyre/edit/");
      const id = parts[1] || params.id;
      setView("form");
      setSelectedPr(id ? { _id: id } : null);
      setIsView(false);
    } else if (path.includes("/tyre-procurement/view/") || path.includes("/tyre/view/")) {
      const parts = path.split(path.includes("/tyre-procurement/view/") ? "/tyre-procurement/view/" : "/tyre/view/");
      const id = parts[1] || params.id;
      setView("form");
      setSelectedPr(id ? { _id: id } : null);
      setIsView(true);
    } else {
      setView("list");
      setSelectedPr(null);
      setIsView(false);
    }
  }, [location.pathname, params.id]);

  const handleEdit = useCallback((pr) => {
    const id = pr?._id || pr;
    if (id) {
      navigate(`/tyre-procurement/edit/${id}`);
    } else {
      navigate(`/tyre-procurement/create`);
    }
  }, [navigate]);

  const handleView = useCallback((pr) => {
    const id = pr?._id || pr;
    if (id) {
      navigate(`/tyre-procurement/view/${id}`);
    }
  }, [navigate]);

  const handleCreate = useCallback(() => {
    navigate("/tyre-procurement/create");
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate("/procurement-insurance-sops");
  }, [navigate]);

  const handleSaved = useCallback((savedData) => {
    if (savedData && savedData._id) {
      setSelectedPr(savedData);
      navigate(`/tyre-procurement/edit/${savedData._id}`, { replace: true });
    }
  }, [navigate]);

  return (
    <Box sx={{ p: 1 }}>
      {view === "list" ? (
        <TyreProcurementList onEdit={handleEdit} onView={handleView} onCreate={handleCreate} />
      ) : (
        <TyreProcurementForm
          pr={selectedPr}
          isView={isView}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
}

export default React.memo(TyreProcurementSop);

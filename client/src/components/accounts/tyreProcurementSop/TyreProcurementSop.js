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
    const isSopsRoute = location.pathname.includes("/procurement-insurance-sops");
    if (id) {
      navigate(isSopsRoute ? `/procurement-insurance-sops/tyre/edit/${id}` : `/tyre-procurement/edit/${id}`);
    } else {
      setSelectedPr(null);
      setIsView(false);
      setView("form");
      navigate(isSopsRoute ? `/procurement-insurance-sops/tyre/create` : `/tyre-procurement/create`);
    }
  }, [navigate, location.pathname]);

  const handleView = useCallback((pr) => {
    const id = pr?._id || pr;
    const isSopsRoute = location.pathname.includes("/procurement-insurance-sops");
    if (id) {
      navigate(isSopsRoute ? `/procurement-insurance-sops/tyre/view/${id}` : `/tyre-procurement/view/${id}`);
    }
  }, [navigate, location.pathname]);

  const handleCreate = useCallback(() => {
    setSelectedPr(null);
    setIsView(false);
    setView("form");
    if (location.pathname.includes("/procurement-insurance-sops")) {
      navigate("/procurement-insurance-sops/tyre/create");
    } else {
      navigate("/tyre-procurement/create");
    }
  }, [navigate, location.pathname]);

  const handleCancel = useCallback(() => {
    if (location.pathname.includes("/procurement-insurance-sops")) {
      navigate("/procurement-insurance-sops/tyre");
    } else {
      navigate("/tyre-procurement");
    }
  }, [navigate, location.pathname]);

  const handleSaved = useCallback((savedData) => {
    if (savedData && savedData._id) {
      setSelectedPr(savedData);
      const isSopsRoute = location.pathname.includes("/procurement-insurance-sops");
      navigate(isSopsRoute ? `/procurement-insurance-sops/tyre/edit/${savedData._id}` : `/tyre-procurement/edit/${savedData._id}`, { replace: true });
    }
  }, [navigate, location.pathname]);

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

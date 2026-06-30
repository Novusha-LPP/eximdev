import React, { useState, useCallback } from "react";
import TyreProcurementList from "./TyreProcurementList";
import TyreProcurementForm from "./TyreProcurementForm";
import { Box } from "@mui/material";

function TyreProcurementSop() {
  const [view, setView] = useState("list"); // list, form
  const [selectedPr, setSelectedPr] = useState(null);
  const [isView, setIsView] = useState(false);

  const handleEdit = useCallback((pr) => {
    setSelectedPr(pr);
    setIsView(false);
    setView("form");
  }, []);

  const handleView = useCallback((pr) => {
    setSelectedPr(pr);
    setIsView(true);
    setView("form");
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedPr(null);
    setView("form");
  }, []);

  const handleCancel = useCallback(() => {
    setSelectedPr(null);
    setView("list");
  }, []);

  const handleSaved = useCallback(() => {
    setSelectedPr(null);
    setView("list");
  }, []);

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

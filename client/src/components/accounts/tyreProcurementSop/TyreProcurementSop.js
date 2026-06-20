import React, { useState, useCallback } from "react";
import TyreProcurementList from "./TyreProcurementList";
import TyreProcurementForm from "./TyreProcurementForm";
import { Box } from "@mui/material";

function TyreProcurementSop() {
  const [view, setView] = useState("list"); // list, form
  const [selectedPr, setSelectedPr] = useState(null);

  const handleEdit = useCallback((pr) => {
    setSelectedPr(pr);
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
        <TyreProcurementList onEdit={handleEdit} onCreate={handleCreate} />
      ) : (
        <TyreProcurementForm
          pr={selectedPr}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
}

export default React.memo(TyreProcurementSop);

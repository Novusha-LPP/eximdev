import React, { useState } from "react";
import { Button, Paper, Typography, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DirectoryModal from "./DirectoryModal";
import DirectoryTable from "./DirectoryTable";

function VehiclesDirectory() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);

  const handleAddNew = () => {
    setModalMode("add");
    setEditData(null);
    setIsModalOpen(true);
  };

  const handleEdit = (rowData) => {
    setModalMode("edit");
    setEditData(rowData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditData(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Vehicles Directory
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Add New Entry
        </Button>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <DirectoryTable
          directoryType="vehicles"
          onEdit={handleEdit}
          // Pass your API data here for the vehicle entries
        />
      </Paper>

      <DirectoryModal
        open={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        directoryType="vehicles"
        editData={editData}
      />
    </Box>
  );
}

export default VehiclesDirectory;

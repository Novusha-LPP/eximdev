import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { viewMasterList } from "../../assets/data/srccDirectoriesData";
import DirectoryTable from "./DirectoryTable";
import DirectoryModal from "./DirectoryModal";

function SrccDirectories() {
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);

  const handleDirectoryChange = (event) => {
    setSelectedDirectory(event.target.value);
  };

  const handleAddNew = () => {
    setModalMode("add");
    setEditData(null); // Clear the data for new entry
    setIsModalOpen(true);
  };

  const handleEdit = (rowData) => {
    setModalMode("edit");
    setEditData(rowData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditData(null); // Reset edit data on modal close
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
        Directory Management
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <TextField
            select
            size="small"
            label="Select Directory"
            value={selectedDirectory}
            onChange={handleDirectoryChange}
            sx={{ minWidth: 250 }}
          >
            {viewMasterList.map((dir) => (
              <MenuItem key={dir} value={dir}>
                {dir}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
            disabled={!selectedDirectory}
          >
            Add New Entry
          </Button>
        </Box>
      </Paper>

      {selectedDirectory && (
        <Paper sx={{ p: 2 }}>
          <DirectoryTable
            directoryType={selectedDirectory}
            onEdit={handleEdit}
          />
        </Paper>
      )}

      <DirectoryModal
        open={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        directoryType={selectedDirectory}
        editData={editData}
      />
    </Box>
  );
}

export default React.memo(SrccDirectories);

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectoryModal from "./DirectoryModal";
import { directoryConfig } from "../../config/directoryConfig";

function DirectoryComponent({ directoryType }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);
  const [data, setData] = useState(
    directoryConfig[directoryType]?.dummyData || []
  );

  const config = directoryConfig[directoryType];

  const handleAddNew = () => {
    setModalMode("add");
    setEditData(null);
    setIsModalOpen(true);
  };

  const handleEdit = (row) => {
    setModalMode("edit");
    setEditData(row);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    // Add confirmation dialog here
    setData(data.filter((item) => item.id !== id));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditData(null);
  };

  const handleSave = (formData) => {
    if (modalMode === "add") {
      setData([...data, { id: Date.now(), ...formData }]);
    } else {
      setData(
        data.map((item) =>
          item.id === editData.id ? { ...item, ...formData } : item
        )
      );
    }
    handleCloseModal();
  };

  if (!config) return null;

  return (
    <Box>
      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" component="h2">
          {directoryType}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Add New Entry
        </Button>
      </Box>

      {/* Table Section */}
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {config.fields.map((field) => (
                  <TableCell key={field.name}>{field.label}</TableCell>
                ))}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  {config.fields.map((field) => (
                    <TableCell key={field.name}>{row[field.name]}</TableCell>
                  ))}
                  <TableCell align="right">
                    <IconButton onClick={() => handleEdit(row)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(row.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal */}
      <DirectoryModal
        open={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        directoryType={directoryType}
        editData={editData}
        onSave={handleSave}
        fields={config.fields}
      />
    </Box>
  );
}

export default DirectoryComponent;

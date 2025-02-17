import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectoryModal from "./DirectoryModal";
import { directoryFields } from "../../assets/data/srccDirectoriesData";

function ContainerTypeDirectory() {
  const [containerTypes, setContainerTypes] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // ✅ Fetch container types from API
  const fetchContainerTypes = async () => {
    try {
      console.log("🚀 Fetching Container Types...");
      const response = await axios.get(`${API_URL}/get-container-types`);

      if (!Array.isArray(response.data)) {
        console.error(
          "❌ API Error: Expected an array but got:",
          response.data
        );
        return;
      }

      console.log("✅ API Response:", response.data);
      setContainerTypes(response.data);
    } catch (error) {
      console.error("❌ Error fetching container types:", error);
      alert("Failed to load container types. Check the server.");
    }
  };

  useEffect(() => {
    fetchContainerTypes();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setEditData(null);
    setOpenModal(true);
  };

  const handleEdit = (container) => {
    console.log("📝 Editing Container Type:", container);
    setModalMode("edit");
    setEditData(container);
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert("Error: Missing container type ID for deletion!");
      return;
    }

    if (
      window.confirm("Are you sure you want to delete this container type?")
    ) {
      try {
        await axios.delete(`${API_URL}/delete-container-type/${id}`);
        fetchContainerTypes();
        alert("✅ Container type deleted successfully.");
      } catch (error) {
        console.error("❌ Error deleting container type:", error);
        alert(
          error.response?.data?.error || "Failed to delete container type."
        );
      }
    }
  };

  const handleSave = async (formData) => {
    try {
      if (modalMode === "add") {
        console.log("🚀 Adding New Container Type:", formData);
        await axios.post(`${API_URL}/add-container-type`, formData);
      } else {
        console.log("📝 Updating Container Type:", formData);
        await axios.put(
          `${API_URL}/update-container-type/${editData._id}`,
          formData
        );
      }
      setOpenModal(false);
      fetchContainerTypes();
    } catch (error) {
      console.error("❌ Error saving container type:", error);
      alert(error.response?.data?.error || "Failed to save container type.");
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Container Type
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Container Type</TableCell>
              <TableCell>ISO Code</TableCell>
              <TableCell>TEU</TableCell>
              <TableCell>Outer Dimension</TableCell>
              <TableCell>Tare Weight</TableCell>
              <TableCell>Payload</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {containerTypes.length > 0 ? (
              containerTypes.map((container) => (
                <TableRow key={container._id}>
                  <TableCell>{container.container_type}</TableCell>
                  <TableCell>{container.iso_code}</TableCell>
                  <TableCell>{container.teu}</TableCell>
                  <TableCell>{container.outer_dimension}</TableCell>
                  <TableCell>{container.tare_weight}</TableCell>
                  <TableCell>{container.payload}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(container)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(container._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  style={{ textAlign: "center", color: "gray" }}
                >
                  No container types found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <DirectoryModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        mode={modalMode}
        directoryType="Container Type"
        editData={editData}
        onSave={handleSave}
        fields={directoryFields["Container Type"]}
      />
    </Box>
  );
}

export default ContainerTypeDirectory;

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

function UnitMeasurementDirectory() {
  const [units, setUnits] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  const fetchUnits = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-unit-measurements`);
      setUnits(response.data);
    } catch (error) {
      console.error("Error fetching unit measurements:", error);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setEditData(null);
    setOpenModal(true);
  };

  const handleEdit = (unit) => {
    setModalMode("edit");
    setEditData(unit);
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this unit measurement?")
    ) {
      try {
        await axios.delete(`${API_URL}/delete-unit-measurement/${id}`);
        fetchUnits();
      } catch (error) {
        console.error("Error deleting unit measurement:", error);
      }
    }
  };

  const handleSave = async (formData) => {
    try {
      if (modalMode === "add") {
        await axios.post(`${API_URL}/add-unit-measurement`, formData);
      } else {
        await axios.put(
          `${API_URL}/update-unit-measurement/${editData._id}`,
          formData
        );
      }
      setOpenModal(false);
      fetchUnits();
    } catch (error) {
      console.error("Error saving unit measurement:", error);
      alert(error.response?.data?.error || "An error occurred");
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Unit Measurement
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Unit Type</TableCell>
              <TableCell>Decimal Places</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit._id}>
                <TableCell>{unit.description}</TableCell>
                <TableCell>{unit.code}</TableCell>
                <TableCell>{unit.unit_type}</TableCell>
                <TableCell>{unit.decimal_places}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(unit)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(unit._id)}
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

      <DirectoryModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        mode={modalMode}
        directoryType="Unit Measurement"
        editData={editData}
        onSave={handleSave}
        fields={directoryFields["Unit Measurement"]}
      />
    </Box>
  );
}

export default UnitMeasurementDirectory;

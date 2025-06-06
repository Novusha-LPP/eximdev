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

function LocationDirectory() {
  const [locations, setLocations] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // ✅ Fetch Locations from API
  const fetchLocations = async () => {
    try {
      console.log("🚀 Fetching Locations...");
      const response = await axios.get(`${API_URL}/get-location`);

      if (!Array.isArray(response.data)) {
        console.error(
          "❌ API Error: Expected an array but got:",
          response.data
        );
        return;
      }

      console.log("✅ API Response:", response.data);
      setLocations(response.data);
    } catch (error) {
      console.error("❌ Error fetching locations:", error);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setEditData(null);
    setOpenModal(true);
  };

  const handleEdit = (location) => {
    console.log("📝 Editing Location:", location);
    setModalMode("edit");
    setEditData(location);
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert("Error: Missing location ID for deletion!");
      return;
    }

    if (window.confirm("Are you sure you want to delete this location?")) {
      try {
        await axios.delete(`${API_URL}/delete-location/${id}`);
        fetchLocations();
        alert("✅ Location deleted successfully.");
      } catch (error) {
        console.error("❌ Error deleting location:", error);
        alert(error.response?.data?.error || "Failed to delete location.");
      }
    }
  };

  const handleSave = async (formData) => {
    try {
      if (modalMode === "add") {
        console.log("🚀 Adding New Location:", formData);
        await axios.post(`${API_URL}/add-location`, formData);
      } else {
        console.log("📝 Updating Location:", formData);
        await axios.put(`${API_URL}/update-location/${editData._id}`, formData);
      }
      setOpenModal(false);
      fetchLocations();
    } catch (error) {
      console.error("❌ Error saving location:", error);
      alert(error.response?.data?.error || "Failed to save location.");
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Location
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Postal Code</TableCell>
              <TableCell>Taluka</TableCell>
              <TableCell>District</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.length > 0 ? (
              locations.map((location) => (
                <TableRow key={location._id}>
                  <TableCell>{location.name}</TableCell>
                  <TableCell>{location.postal_code}</TableCell>
                  <TableCell>{location.city}</TableCell>
                  <TableCell>{location.district}</TableCell>
                  <TableCell>{location.state}</TableCell>
                  <TableCell>{location.country}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(location)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(location._id)}
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
                  No locations found.
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
        directoryType="Location"
        editData={editData}
        onSave={handleSave}
        fields={directoryFields["Location"]}
      />
    </Box>
  );
}

export default LocationDirectory;

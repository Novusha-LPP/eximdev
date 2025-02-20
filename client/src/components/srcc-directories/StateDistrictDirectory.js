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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

function StateDistrictDirectory() {
  const [stateData, setStateData] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({ state: "", districts: "" });
  const [existingStates, setExistingStates] = useState([]);
  const [stateError, setStateError] = useState("");
  const [typingTimeout, setTypingTimeout] = useState(null);

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // ✅ Fetch States from API
  const fetchStates = async () => {
    try {
      console.log("🚀 Fetching States...");
      const response = await axios.get(`${API_URL}/get-state-districts`);
      const statesList = response.data.states || [];
      setStateData(statesList);
      setExistingStates(statesList.map((s) => s.state.toLowerCase())); // Store existing states for quick check
    } catch (error) {
      console.error("❌ Error fetching states:", error);
    }
  };

  useEffect(() => {
    fetchStates();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({ state: "", districts: "" });
    setStateError(""); // Reset error message
    setOpenModal(true);
  };

  const handleEdit = (state) => {
    setModalMode("edit");
    setFormData({
      state: state.state,
      districts: state.districts?.join(", ") || "",
    });
    setOpenModal(true);
  };

  const handleDelete = async (stateName) => {
    if (window.confirm(`Are you sure you want to delete ${stateName}?`)) {
      try {
        await axios.delete(`${API_URL}/delete-state/${stateName}`);
        fetchStates();
      } catch (error) {
        console.error("❌ Error deleting state:", error);
      }
    }
  };

  const handleSave = async () => {
    try {
      const formattedData = {
        state: formData.state.trim(),
        districts: [
          ...new Set( // ✅ Remove duplicates before saving
            formData.districts.split(",").map((district) => district.trim())
          ),
        ].filter((district) => district.length > 0), // ✅ Remove empty values
      };

      // ✅ Check for duplicate states (Frontend)
      if (
        modalMode === "add" &&
        existingStates.includes(formattedData.state.toLowerCase())
      ) {
        setStateError(
          `⚠️ "${formattedData.state}" already exists! Try a different name.`
        );
        return;
      }

      if (modalMode === "add") {
        await axios.post(`${API_URL}/add-state-district`, {
          states: [formattedData],
        });
      } else {
        await axios.put(
          `${API_URL}/update-state-district/${formattedData.state}`,
          {
            districts: formattedData.districts,
          }
        );
      }

      setOpenModal(false);
      fetchStates();
    } catch (error) {
      console.error("❌ Error saving state:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // ✅ If editing "districts", start a 5-second delay to remove duplicates
    if (name === "districts") {
      if (typingTimeout) clearTimeout(typingTimeout);
      const newTimeout = setTimeout(() => {
        const uniqueDistricts = [
          ...new Set(value.split(",").map((d) => d.trim())),
        ]
          .filter((d) => d.length > 0)
          .join(", ");

        setFormData((prev) => ({
          ...prev,
          districts: uniqueDistricts, // ✅ After 5 sec, update input with unique values
        }));
      }, 1000); // 5-second delay before removing duplicates
      setTypingTimeout(newTimeout);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add State
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>State Name</TableCell>
              <TableCell>Districts</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stateData.map((state) => (
              <TableRow key={state.state}>
                <TableCell>{state.state}</TableCell>
                <TableCell>
                  {state.districts?.join(", ") || "No Districts"}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(state)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(state.state)}
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

      {/* ✅ Modal for Adding & Editing States */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add New State" : "Edit State"}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2, mt: "8px" }}
          >
            <TextField
              name="state"
              label="State Name"
              value={formData.state}
              onChange={handleChange}
              fullWidth
              disabled={modalMode === "edit"}
              error={Boolean(stateError)}
              helperText={stateError}
            />
            <strong>Districts (comma-separated)</strong>
            <TextField
              name="districts"
              value={formData.districts}
              onChange={handleChange}
              fullWidth
              multiline
              rows={4} // ✅ Expands but remains controlled
              sx={{
                overflow: "auto",
                maxHeight: "150px", // ✅ Scroll appears if text exceeds
                "& .MuiInputBase-root": {
                  overflowY: "auto", // ✅ Enables vertical scrolling
                },
              }}
              helperText="Enter multiple districts separated by commas (duplicates will be removed automatically after 5 seconds)."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {modalMode === "add" ? "Add" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StateDistrictDirectory;

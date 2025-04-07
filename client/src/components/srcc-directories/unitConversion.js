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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

function UnitConversion() {
  const [conversions, setConversions] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({ uqc: "", uqc_desc: "", type: "" });
  const [editId, setEditId] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:9000/api";

  useEffect(() => {
    fetchConversions();
  }, []);

  const fetchConversions = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-unit-conversions`);
      setConversions(response.data);
    } catch (error) {
      console.error("Error fetching unit conversions:", error);
    }
  };

  const handleAdd = () => {
    setModalMode("add");
    setFormData({ uqc: "", uqc_desc: "", type: "" });
    setOpenModal(true);
    setEditId(null);
  };

  const handleEdit = (conversion) => {
    setModalMode("edit");
    setFormData({ ...conversion });
    setEditId(conversion._id);
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this conversion?")) {
      try {
        await axios.delete(`${API_URL}/delete-unit-conversion/${id}`);
        fetchConversions();
      } catch (error) {
        console.error("Error deleting conversion:", error);
      }
    }
  };

  const handleSave = async () => {
    try {
      if (modalMode === "add") {
        await axios.post(`${API_URL}/add-unit-conversion`, formData);
      } else {
        await axios.put(
          `${API_URL}/update-unit-conversion/${editId}`,
          formData
        );
      }
      setOpenModal(false);
      fetchConversions();
    } catch (error) {
      console.error("Error saving conversion:", error);
    }
  };

  return (
    <Box>
      <Button variant="contained" onClick={handleAdd} sx={{ mb: 2 }}>
        Add Unit Conversion
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>UQC</strong>
              </TableCell>
              <TableCell>
                <strong>UQC Decription</strong>
              </TableCell>
              <TableCell>
                <strong>Type</strong>
              </TableCell>
              <TableCell>
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {conversions.map((conversion) => (
              <TableRow key={conversion._id}>
                <TableCell>{conversion.uqc}</TableCell>
                <TableCell>{conversion.uqc_desc}</TableCell>
                <TableCell>{conversion.type}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEdit(conversion)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(conversion._id)}
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

      {/* Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <DialogTitle>
          {modalMode === "add" ? "Add" : "Edit"} Unit Conversion
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="UQC"
            name="uqc"
            value={formData.uqc}
            onChange={(e) => setFormData({ ...formData, uqc: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="UQC Description"
            name="uqc_desc"
            value={formData.uqc_desc}
            onChange={(e) => setFormData({ ...formData, uqc_desc: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Type"        
            name="type"
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UnitConversion;

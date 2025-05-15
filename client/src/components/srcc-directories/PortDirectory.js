import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

function PortDirectory() {
  const [ports, setPorts] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({
    port_code: "",
    port_name: "",
    port_address: "",
    custom_fields: {},
  });
  const [errors, setErrors] = useState({});
  
  // Store both display names and actual field names
  const [customFields, setCustomFields] = useState([]);
  
  const API_URL = "http://localhost:9000/api";

  const [openFieldDialog, setOpenFieldDialog] = useState(false);
  const [newField, setNewField] = useState({ name: "", type: "string" });

  // Transform field name to database format (for reference)
  const transformFieldName = (name) => {
    return name.toLowerCase().replace(/\s+/g, '_');
  };

  // Extract custom field definitions from the first port (if any)
  const extractCustomFields = (portsData) => {
    if (portsData.length > 0 && portsData[0].custom_fields) {
      const fields = [];
      const customFieldsObj = portsData[0].custom_fields;
      
      Object.keys(customFieldsObj).forEach(key => {
        const value = customFieldsObj[key];
        const type = typeof value;
        
        // Create a display name by replacing underscores with spaces and capitalizing words
        const displayName = key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        fields.push({ 
          name: key,          // Actual field name in database (lowercase with underscores)
          displayName,        // User-friendly display name
          type                // Data type
        });
      });
      
      setCustomFields(fields);
    }
  };

  const fetchPorts = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-port`);
      setPorts(response.data);
      extractCustomFields(response.data);
    } catch (error) {
      console.error("Error fetching ports:", error);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({ 
      port_code: "", 
      port_name: "", 
      port_address: "",
      custom_fields: initializeCustomFields() 
    });
    setOpenModal(true);
    setErrors({});
  };

  // Initialize custom fields with default values based on their type
  const initializeCustomFields = () => {
    const initialFields = {};
    customFields.forEach(field => {
      switch(field.type) {
        case 'number':
          initialFields[field.name] = 0;
          break;
        case 'boolean':
          initialFields[field.name] = false;
          break;
        default:
          initialFields[field.name] = "";
      }
    });
    return initialFields;
  };

  const handleEdit = (port) => {
    setModalMode("edit");
    setEditData(port);
    
    // Ensure custom_fields is properly formatted
    const formattedPort = {
      ...port,
      custom_fields: port.custom_fields || {}
    };
    
    setFormData(formattedPort);
    setOpenModal(true);
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this port?")) {
      try {
        await axios.delete(`${API_URL}/delete-port/${id}`);
        fetchPorts();
      } catch (error) {
        console.error("Error deleting port:", error);
      }
    }
  };

  const handleSave = async () => {
    const requiredFields = ["port_code", "port_name", "port_address"];
    let newErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field]?.trim()) newErrors[field] = "Required";
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (modalMode === "add") {
        await axios.post(`${API_URL}/add-port`, formData);
      } else {
        await axios.put(`${API_URL}/update-port/${editData._id}`, formData);
      }
      setOpenModal(false);
      fetchPorts();
    } catch (error) {
      console.error("Error saving port:", error);
      alert(error.response?.data?.error || "Something went wrong");
    }
  };

  const handleFieldChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleCustomFieldChange = (fieldName, value) => {
    setFormData({
      ...formData,
      custom_fields: {
        ...formData.custom_fields,
        [fieldName]: value
      }
    });
  };

  const addNewCustomField = async () => {
    if (!newField.name.trim()) {
      alert("Field name is required");
      return;
    }

    try {
      const response = await axios.patch(`${API_URL}/add-port-field`, {
        fieldName: newField.name.trim(),
        fieldType: newField.type
      });
      
      // Get the transformed field name from the server response
      const { transformedName } = response.data;
      
      // Create a display name by replacing underscores with spaces and capitalizing words
      const displayName = newField.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Update UI by adding the new field to our list
      setCustomFields([...customFields, { 
        name: transformedName,  // Actual field name in database
        displayName,            // User-friendly display name
        type: newField.type 
      }]);
      
      setOpenFieldDialog(false);
      setNewField({ name: "", type: "string" });
      
      // Refresh data to get updated documents
      fetchPorts();
    } catch (err) {
      alert(err.response?.data?.error || "Error adding field");
    }
  };

  // Render a custom field input based on its type
  const renderCustomFieldInput = (field) => {
    const value = formData.custom_fields?.[field.name] ?? 
      (field.type === 'number' ? 0 : field.type === 'boolean' ? false : "");
    
    switch(field.type) {
      case 'number':
        return (
          <TextField
            key={field.name}
            fullWidth
            margin="dense"
            label={field.displayName}
            type="number"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.name, Number(e.target.value))}
          />
        );
      case 'boolean':
        return (
          <FormControlLabel
            key={field.name}
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
              />
            }
            label={field.displayName}
            sx={{ my: 1, display: 'block' }}
          />
        );
      default:
        return (
          <TextField
            key={field.name}
            fullWidth
            margin="dense"
            label={field.displayName}
            value={value || ""}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
          />
        );
    }
  };

  // Render a table cell for a custom field based on its type
  const renderCustomFieldCell = (port, field) => {
    const value = port.custom_fields?.[field.name];
    
    if (field.type === 'boolean') {
      return <TableCell key={field.name}>{value ? "Yes" : "No"}</TableCell>;
    }
    
    return <TableCell key={field.name}>{value !== undefined ? String(value) : ""}</TableCell>;
  };

  // Preview the transformed field name
  const renderFieldNamePreview = () => {
    if (!newField.name.trim()) return null;
    
    const transformed = transformFieldName(newField.name);
    
    return (
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        Will be stored as: <code>{transformed}</code>
      </Typography>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Port
        </Button>
        <Button variant="outlined" onClick={() => setOpenFieldDialog(true)}>
          Add New Field
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Port Code</strong></TableCell>
              <TableCell><strong>Port Name</strong></TableCell>
              <TableCell><strong>Port Address</strong></TableCell>
              {customFields.map(field => (
                <TableCell key={field.name}><strong>{field.displayName}</strong></TableCell>
              ))}
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ports.map((port) => (
              <TableRow key={port._id}>
                <TableCell>{port.port_code}</TableCell>
                <TableCell>{port.port_name}</TableCell>
                <TableCell>{port.port_address}</TableCell>
                {customFields.map(field => renderCustomFieldCell(port, field))}
                <TableCell>
                  <IconButton onClick={() => handleEdit(port)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(port._id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Port Add/Edit Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>{modalMode === "add" ? "Add" : "Edit"} Port</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Port Code"
            name="port_code"
            value={formData.port_code}
            onChange={handleFieldChange}
            error={!!errors.port_code}
            helperText={errors.port_code}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Port Name"
            name="port_name"
            value={formData.port_name}
            onChange={handleFieldChange}
            error={!!errors.port_name}
            helperText={errors.port_name}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Port Address"
            name="port_address"
            value={formData.port_address}
            onChange={handleFieldChange}
            error={!!errors.port_address}
            helperText={errors.port_address}
          />
          
          {/* Custom Fields */}
          {customFields.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <DialogTitle sx={{ px: 0 }}>Custom Fields</DialogTitle>
              {customFields.map(field => renderCustomFieldInput(field))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add New Field Dialog */}
      <Dialog open={openFieldDialog} onClose={() => setOpenFieldDialog(false)}>
        <DialogTitle>Add Custom Field</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Field Name"
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
          />
          {renderFieldNamePreview()}
          <FormControl fullWidth margin="dense">
            <InputLabel>Field Type</InputLabel>
            <Select
              value={newField.type}
              onChange={(e) => setNewField({ ...newField, type: e.target.value })}
              label="Field Type"
            >
              <MenuItem value="string">String</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="boolean">Boolean</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFieldDialog(false)}>Cancel</Button>
          <Button onClick={addNewCustomField} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PortDirectory;
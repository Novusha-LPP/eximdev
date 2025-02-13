import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

function DirectoryModal({ open, onClose, mode, directoryType, editData }) {
  const [formData, setFormData] = useState({});

  const directoryFieldConfig = {
    vehicles: [
      { name: "truck_no", label: "Truck Number", type: "text" },
      { name: "type_of_vehicle", label: "Type of Vehicle", type: "text" },
      { name: "max_tyres", label: "Max Tyres", type: "number" },
      { name: "units", label: "Units", type: "number" },
      { name: "drivers", label: "Drivers", type: "text" },
      { name: "tyres", label: "Tyres", type: "text" },
      { name: "rto", label: "RTO", type: "text" },
      { name: "challans", label: "Challans", type: "text" },
      { name: "accidents", label: "Accidents", type: "text" },
    ],
    employees: [
      { name: "employee_id", label: "Employee ID", type: "text" },
      { name: "name", label: "Name", type: "text" },
      { name: "position", label: "Position", type: "text" },
      { name: "salary", label: "Salary", type: "number" },
    ],
  };

  useEffect(() => {
    // Initialize the form data based on editData or defaults if in "add" mode
    if (editData) {
      setFormData(editData);
    } else {
      // Initialize an empty form based on selected directoryType
      const fields = directoryFieldConfig[directoryType] || [];
      const initialFormData = fields.reduce((acc, field) => {
        acc[field.name] = "";
        return acc;
      }, {});
      setFormData(initialFormData);
    }
  }, [editData, directoryType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    onClose(); // Close the modal after submitting
  };

  const fields = directoryFieldConfig[directoryType] || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === "add" ? `Add New ${directoryType}` : `Edit ${directoryType}`}
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {fields.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type}
              value={formData[field.name] || ""}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
          ))}
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" onClick={handleSubmit}>
          {mode === "add" ? "Add" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DirectoryModal;

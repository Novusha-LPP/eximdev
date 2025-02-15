import React, { useState, useEffect } from "react";
import { Select, MenuItem, InputLabel, FormControl } from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from "@mui/material";

function DirectoryModal({
  open,
  onClose,
  mode,
  directoryType,
  editData,
  onSave,
  fields,
}) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      const initialData = fields.reduce((acc, field) => {
        acc[field.name] = "";
        return acc;
      }, {});
      setFormData(initialData);
    }
  }, [editData, fields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === "add" ? `Add New ${directoryType}` : `Edit ${directoryType}`}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {fields.map((field) =>
              field.type === "select" ? (
                <FormControl fullWidth key={field.name}>
                  <InputLabel id={`${field.name}-label`} shrink>
                    {field.label}
                  </InputLabel>
                  <Select
                    labelId={`${field.name}-label`}
                    name={field.name}
                    value={formData[field.name] || ""}
                    onChange={handleChange}
                    displayEmpty
                  >
                    <MenuItem value="" disabled>
                      {field.label}
                    </MenuItem>
                    {field.options.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  type={field.type}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              )
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {mode === "add" ? "Add" : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default DirectoryModal;

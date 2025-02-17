import React, { useState, useEffect, useCallback } from "react";
import {
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  TextField,
  Box,
} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import axios from "axios";

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
  const [loading, setLoading] = useState(false);

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

  // ✅ Fetch Address using Postal Code
  const fetchAddressByPostalCode = useCallback(async (postalCode) => {
    if (!postalCode) return;
    setLoading(true);

    try {
      console.log(`🔎 Fetching address for postal code: ${postalCode}`);
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?postalcode=${postalCode}&country=India&format=json`
      );

      if (response.data.length > 0) {
        const addressParts = response.data[0].display_name
          .split(", ")
          .reverse(); // ✅ Extract from the end
        console.log("📍 Address Data:", response.data[0]);

        // ✅ Extracting values from the end to ensure accuracy
        let country = addressParts[0] || "India";
        let state = addressParts[1] || "";
        let district = addressParts[2] || "";
        let city = addressParts[3] || district; // ✅ Use District if City is missing

        setFormData((prev) => ({
          ...prev,
          city,
          district,
          state,
          country,
        }));
      } else {
        // alert("⚠️ No address found for this postal code.");
        setFormData((prev) => ({
          ...prev,
          city: "",
          district: "",
          state: "",
          country: "",
        }));
      }
    } catch (error) {
      console.error("❌ Error fetching address:", error);
      // alert("Failed to fetch address details.");
    }
    setLoading(false);
  }, []);

  // ✅ Debounce Effect for Postal Code API Call
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (formData.postal_code) {
        fetchAddressByPostalCode(formData.postal_code);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.postal_code, fetchAddressByPostalCode]);

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
                  // disabled={field.name !== "postal_code" && field.disabled} // ✅ Disable fields except Postal Code
                />
              )
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Fetching..." : mode === "add" ? "Add" : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default DirectoryModal;

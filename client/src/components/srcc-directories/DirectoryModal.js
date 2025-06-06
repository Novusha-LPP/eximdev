import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
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
  const [postalCodeError, setPostalCodeError] = useState("");

  // ✅ Reset Form when Modal Opens or Edit Data Changes
  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      const initialData = fields.reduce((acc, field) => {
        acc[field.name] = field.type === "multi-select" ? [] : "";
        return acc;
      }, {});
      setFormData(initialData);
    }
  }, [editData, fields]);

  // ✅ Validate Postal Code (6 Digits Only)
  const validatePostalCode = (code) => /^[0-9]{6}$/.test(code);

  // ✅ Fetch Address Based on Postal Code (Only for Location Directory)
  const fetchAddressByPostalCode = useCallback(async (postalCode) => {
    if (!validatePostalCode(postalCode)) {
      setPostalCodeError("Postal Code must be exactly 6 digits.");
      return;
    } else {
      setPostalCodeError(""); // Clear error if valid
    }

    setLoading(true);
    try {
      console.log(`🔎 Fetching address for postal code: ${postalCode}`);
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?postalcode=${postalCode}&country=India&format=json`
      );

      if (response.data.length > 0) {
        const addressParts = response.data[0].display_name
          .split(", ")
          .reverse();
        console.log("📍 Address Data:", response.data[0]);

        let country = addressParts[0] || "India";
        let state = addressParts[1] || "";
        let district = addressParts[2] || "";
        let city = addressParts[3] || district; // ✅ Use District if City is Missing

        setFormData((prev) => ({
          ...prev,
          postal_code: postalCode,
          city,
          district,
          state,
          country,
        }));
      } else {
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
    }
    setLoading(false);
  }, []);

  // ✅ Debounced Postal Code API Call (Only for Location)
  useEffect(() => {
    if (directoryType === "Location") {
      const delayDebounceFn = setTimeout(() => {
        if (formData.postal_code) {
          fetchAddressByPostalCode(formData.postal_code);
        }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [formData.postal_code, fetchAddressByPostalCode, directoryType]);

  // ✅ Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Ensure Postal Code is Only 6 Digits
    if (name === "postal_code" && !/^\d{0,6}$/.test(value)) return;

    // ✅ Handle Multi-Select for Districts
    if (name === "districts") {
      setFormData((prev) => ({
        ...prev,
        [name]: typeof value === "string" ? value.split(",") : value, // Convert to array
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // ✅ Handle Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      directoryType === "Location" &&
      !validatePostalCode(formData.postal_code)
    ) {
      setPostalCodeError("Postal Code must be exactly 6 digits.");
      return;
    }

    onSave(formData);

    // ✅ Reset Form Data After Submission
    setFormData(
      fields.reduce((acc, field) => {
        acc[field.name] = field.type === "multi-select" ? [] : "";
        return acc;
      }, {})
    );
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
              ) : field.type === "multi-select" ? (
                <FormControl fullWidth key={field.name}>
                  <InputLabel id={`${field.name}-label`} shrink>
                    {field.label}
                  </InputLabel>
                  <Select
                    labelId={`${field.name}-label`}
                    name={field.name}
                    multiple
                    value={formData[field.name] || []}
                    onChange={handleChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
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
                  error={
                    field.name === "postal_code" && Boolean(postalCodeError)
                  }
                  helperText={
                    field.name === "postal_code" ? postalCodeError : ""
                  }
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

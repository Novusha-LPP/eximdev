// src/components/UserDetails/UserDetails.js

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Avatar,
  Typography,
  Autocomplete,
  TextField,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import axios from "axios";
import PropTypes from "prop-types";
import { importerOptions } from "../../MasterLists/MasterLists"; // Ensure the path is correct

// Convert importerOptions to the format required for Autocomplete
const formattedImporterOptions = importerOptions.map((name) => ({ name }));

function UserDetails({ selectedUser, onClose, onSave }) {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });
  const [loading, setLoading] = useState(false);

  // Initialize selectedOptions when selectedUser changes
  useEffect(() => {
    if (selectedUser?.assigned_importer_name) {
      setSelectedOptions(
        selectedUser.assigned_importer_name.map((name) => ({ name }))
      );
    } else {
      setSelectedOptions([]);
    }
  }, [selectedUser]);

  const handleImportersChange = (event, newValue) => {
    setSelectedOptions(newValue);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Make API call to update importers
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/users/${selectedUser?._id}/importers`,
        { importers: selectedOptions.map((option) => option.name) }
      );

      // Notify parent component about the update
      if (onSave) {
        onSave(selectedOptions.map((option) => option.name));
      }

      // Show success snackbar
      setSnackbar({
        open: true,
        message: "Importers assigned successfully.",
        type: "success",
      });

      // Close the UserDetails view after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error saving importers:", error);
      // Show error snackbar
      setSnackbar({
        open: true,
        message: "Failed to assign importers. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar({ open: false, message: "", type: "" });
  };

  return (
    <Card style={{ padding: "20px", margin: "20px auto", maxWidth: "600px" }}>
      <CardContent>
        {/* User Avatar */}
        <Avatar
          src={selectedUser?.employee_photo || "/default-avatar.png"}
          alt={selectedUser?.username}
          style={{ width: "80px", height: "80px", margin: "0 auto 20px" }}
        />

        {/* User Information */}
        <Typography variant="h5" align="center" gutterBottom>
          {selectedUser?.username}
        </Typography>
        <Typography variant="body1" align="center" gutterBottom>
          Role: {selectedUser?.role}
        </Typography>

        {/* Importers Autocomplete */}
        <Autocomplete
          multiple
          options={formattedImporterOptions}
          getOptionLabel={(option) => option.name}
          value={selectedOptions}
          onChange={handleImportersChange}
          isOptionEqualToValue={(option, value) => option.name === value.name}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Assign Importers"
              placeholder="Select importers"
            />
          )}
          style={{ marginBottom: "20px" }}
        />

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button variant="outlined" color="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.type}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}

// PropTypes for type checking
UserDetails.propTypes = {
  selectedUser: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    employee_photo: PropTypes.string,
    assigned_importer_name: PropTypes.arrayOf(PropTypes.string),
  }),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func, // Optional, but recommended
};

// Default props in case they are not provided
UserDetails.defaultProps = {
  selectedUser: null,
  onSave: null,
};

export default UserDetails;

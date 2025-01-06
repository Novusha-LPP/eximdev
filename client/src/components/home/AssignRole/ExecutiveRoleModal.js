import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";

function ExecutiveRoleModal({
  open,
  onClose,
  initialSelectedImporters = [],
  onSave,
  selectedUser,
  userDetails,
}) {
  const [selectedOptions, setSelectedOptions] = useState(
    initialSelectedImporters
  );
  const [importerOptions, setImporterOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedOptions(initialSelectedImporters);
      fetchImporterOptions();
    }
  }, [open, initialSelectedImporters]);
  useEffect(() => {
    console.log("Importer Options:", importerOptions);
    console.log("Selected Options:", selectedOptions);
  }, [importerOptions, selectedOptions]);

  // Fetch importer options
  const fetchImporterOptions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/importers`
      );
      setImporterOptions(
        res.data.importers.map((importer) => ({
          id: importer?._id || "unknown-id",
          name: importer?.name || "Unnamed Importer",
        }))
      );
    } catch (error) {
      console.error("Error fetching importer options:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle selection changes
  const handleSelect = (event, value) => {
    setSelectedOptions(value);
  };

  // Save selected importers
  const handleSave = async () => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/users/${userDetails?._id}/importers`,
        {
          importerIds: selectedOptions.map((option) => option.id),
        }
      );
      onSave(selectedOptions);
      onClose();
    } catch (error) {
      console.error("Error saving importers:", error);
      alert("Failed to assign importers. Please try again.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {userDetails?.role || "Unknown Role"} Role - Assign Importers for{" "}
        {userDetails?.username || "Unknown User"}
      </DialogTitle>
      <DialogContent>
        {/* Display user details */}
        {userDetails && (
          <div style={{ marginBottom: "20px" }}>
            <Typography variant="body1">
              <strong>Name:</strong> {userDetails?.username || "N/A"}
            </Typography>
            <Typography variant="body1">
              <strong>Role:</strong> {userDetails?.role || "N/A"}
            </Typography>
            <Typography variant="body1">
              <strong>Importers Count:</strong>{" "}
              {userDetails?.assigned_importer_name?.length || 0}
            </Typography>
          </div>
        )}

        {/* Autocomplete for Importers */}
        {loading ? (
          <CircularProgress />
        ) : (
          <Autocomplete
            multiple
            options={importerOptions}
            getOptionLabel={(option) => option?.name || "Unnamed"}

            value={selectedOptions}
            isOptionEqualToValue={(option, value) => option?.id === value?.id} // Safe comparison
            onChange={(event, value) => handleSelect(event, value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Importers"
                variant="outlined"
              />
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox checked={selected} style={{ marginRight: 8 }} />
                {option?.name || "Unnamed"}
              </li>
            )}
          />
        )}

        {/* Display selected importers */}
        <div style={{ marginTop: "20px" }}>
          <Typography variant="h6">Selected Importers:</Typography>
          {selectedOptions.map((option) => (
            <Typography key={option?.id || "unknown"}>
              {option?.name || "Unnamed"}
            </Typography>
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExecutiveRoleModal;

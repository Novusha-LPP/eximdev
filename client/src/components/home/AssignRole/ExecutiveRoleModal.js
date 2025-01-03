import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { importerOptions } from "../../MasterLists/MasterLists"; // Import your data

function ExecutiveRoleModal({
  open,
  onClose,
  initialSelectedImporters = [],
  onSave,
  selectedUser,
}) {
  const [selectedOptions, setSelectedOptions] = useState(
    initialSelectedImporters
  );

  useEffect(() => {
    if (open) {
      setSelectedOptions(initialSelectedImporters); // Load the current selection when modal opens
    }
  }, [open, initialSelectedImporters]);

  const handleSelect = (event, value) => {
    setSelectedOptions(value); // Update selected options
  };

  const handleSave = () => {
    onSave(selectedOptions); // Pass selected importers to parent
    onClose(); // Close the modal
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Executive Role - Assign Importers for {selectedUser || "User"}{" "}
        {/* Dynamically show the selected user's name */}
      </DialogTitle>
      <DialogContent>
        {/* Autocomplete for Importers */}
        <Autocomplete
          multiple
          options={importerOptions} // Use only importerOptions
          value={selectedOptions}
          onChange={handleSelect}
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
              {option}
            </li>
          )}
        />

        {/* Display Selected Importers */}
        <div style={{ marginTop: "20px" }}>
          <h4>Selected Importers:</h4>
          {selectedOptions.map((option) => (
            <FormControlLabel
              key={option}
              control={<Checkbox checked />}
              label={option}
            />
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

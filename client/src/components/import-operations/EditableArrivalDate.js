import React, { useState, useEffect } from "react";
import { FcCalendar } from "react-icons/fc";
import axios from "axios";
import { Snackbar, Alert } from "@mui/material";

const EditableArrivalDate = ({ cell }) => {
  // Initialize hooks first (must be called in the same order every render)
  const [containers, setContainers] = useState([]);
  const [editable, setEditable] = useState(null);
  const [tempDateValue, setTempDateValue] = useState("");
  const [dateError, setDateError] = useState("");

  // Safe destructuring with defaults to avoid undefined access
  const rowData = cell?.row?.original || {};
  const { _id = null, container_nos = [] } = rowData;  // Initialize containers from rowData after safe destructuring
  useEffect(() => {
    if (cell && cell.row && cell.row.original && container_nos.length > 0) {
      setContainers([...container_nos]);
    }
  }, [cell, container_nos]);

  // Validate date format
  const validateDate = (dateString) => {
    // Allow empty string (cleared date is valid)
    if (!dateString || dateString.trim() === "") return true;

    const date = new Date(dateString);

    // Check if date is valid (not Invalid Date)
    if (isNaN(date.getTime())) return false;

    // Check year is reasonable (between 2000 and 2100)
    const year = date.getFullYear();
    if (year < 2000 || year > 2100) return false;

    return true;
  };

  // Handle date change
  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };  // Handle initiating edit mode for a date field
  const handleEditStart = (index) => {
    setEditable(`arrival_date_${index}`);
    setTempDateValue(""); // Start with empty value like EditableDateCell
    setDateError("");
  };
  // Handle clearing a date field (double-click functionality)
  const handleClearDate = async (index) => {
    if (!cell || !cell.row || !cell.row.original || !_id) {
      return;
    }

    const updatedContainers = containers.map((container, i) => {
      if (i === index) {
        return { 
          ...container, 
          arrival_date: "",
          detention_from: "" // Also clear detention_from when clearing arrival_date
        };
      }
      return container;
    });

    setContainers(updatedContainers);

    try {
      // Get user info from localStorage for audit trail
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        'Content-Type': 'application/json',
        'user-id': user.username || 'unknown',
        'username': user.username || 'unknown',
        'user-role': user.role || 'unknown'
      };

      // SECURITY FIX: Send only the specific container index being cleared, not entire array
      // This prevents cross-job contamination if row data gets mixed up
      const update = {};
      update[`container_nos.${0}`] = updatedContainers[0];
      
      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, update, { headers });
      
      // Update the original cell data to prevent state resets
      cell.row.original.container_nos = updatedContainers;
      
      // Trigger status update if available
      if (typeof window.refreshJobTable === 'function') {
        window.refreshJobTable();
      }
    } catch (err) {
      console.error("Error clearing arrival date:", err);
    }
  };// Submit date changes
  const handleDateSubmit = async (index) => {
    if (!validateDate(tempDateValue)) {
      setDateError("Please enter a valid date");
      return;
    }

    // Add defensive check
    if (!cell || !cell.row || !cell.row.original || !_id) {
      setDateError("Unable to update - invalid data");
      return;
    }

    const finalValue = tempDateValue;

    // Update local state first
    const updatedContainers = containers.map((container, i) => {
      if (i === index) {
        const updatedContainer = { ...container, arrival_date: finalValue };
        
        // Automatically update detention_from if arrival_date is changed (like EditableDateCell)
        if (!finalValue) {
          // If arrival_date is cleared, also clear detention_from
          updatedContainer.detention_from = "";
        } else {
          // Calculate detention date based on free_time from parent data
          const arrival = new Date(finalValue);
          const freeDays = parseInt(rowData.free_time) || 0;

          const detentionDate = new Date(arrival);
          detentionDate.setDate(detentionDate.getDate() + freeDays);

          updatedContainer.detention_from = detentionDate
            .toISOString()
            .slice(0, 10);
        }
        
        return updatedContainer;
      }
      return container;
    });

    setContainers(updatedContainers);

    try {
      // Get user info from localStorage for audit trail
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        'Content-Type': 'application/json',
        'user-id': user.username || 'unknown',
        'username': user.username || 'unknown',
        'user-role': user.role || 'unknown'
      };

      // SECURITY FIX: Send only the specific container index being updated, not entire array
      // This prevents cross-job contamination if row data gets mixed up
      const update = {};
      update[`container_nos.${index}`] = updatedContainers[index];
      
      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, update, { headers });
      
      // Update the original cell data to prevent state resets
      cell.row.original.container_nos = updatedContainers;
      
      setEditable(null);
      setTempDateValue("");
      setDateError("");
      
      // Trigger status update if available (like EditableDateCell)
      if (typeof window.refreshJobTable === 'function') {
        window.refreshJobTable();
      }
    } catch (err) {
      console.error("Error updating arrival date:", err);
      setDateError("Failed to update date");
      // Revert local changes on error
      setContainers([...container_nos]);
    }
  };
  const handleCancel = () => {
    setEditable(null);
    setTempDateValue("");
    setDateError("");
  };

  // Add defensive programming to handle undefined cell prop
  if (!cell || !cell.row || !cell.row.original) {
    return (
      <div style={{ minWidth: "200px", color: "#999" }}>
        <span>No data available</span>
      </div>
    );
  }

  return (
    <div style={{ minWidth: "200px" }}>
      <strong>Arrival Dates:</strong>
      <br />
      {containers.map((container, id) => (
        <div key={id} style={{ marginBottom: "8px" }}>          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span>
              Container {id + 1}: {container.arrival_date?.slice(0, 10) || "N/A"}
            </span><FcCalendar
              style={{ cursor: "pointer", fontSize: "18px" }}
              onClick={() => handleEditStart(id)}
              onDoubleClick={() => handleClearDate(id)}
              title="Click to Edit • Double-click to Clear"
            />
          </div>
          {editable === `arrival_date_${id}` && (
            <div style={{ marginTop: "5px" }}>
              <input
                type="datetime-local"
                value={tempDateValue}
                onChange={handleDateInputChange}
                style={{
                  border: dateError ? "1px solid red" : "1px solid #ccc",
                  borderRadius: "3px",
                  padding: "4px",
                  fontSize: "12px",
                  width: "100%"
                }}
              />
              <div style={{ marginTop: "3px" }}>
                <button
                  onClick={() => handleDateSubmit(id)}
                  style={{
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    marginRight: "5px",
                    fontSize: "12px"
                  }}
                >
                  ✓
                </button>                <button
                  onClick={handleCancel}
                  style={{
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ✕
                </button>
              </div>
              {dateError && (
                <div style={{ color: "red", fontSize: "11px", marginTop: "2px" }}>
                  {dateError}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EditableArrivalDate;

import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText
} from "@mui/material";
import { UserContext } from "../../../contexts/UserContext";

function SelectIcdCode({ selectedUser }) {
  const [selectedIcdCodes, setSelectedIcdCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [userData, setUserData] = useState(null);
  const { user } = useContext(UserContext);

  // ICD Code options - you can modify this list as needed
  const icdCodeOptions = [
    "ICD SACHANA",
    "ICD SANAND", 
    "ICD KHODIYAR",
  ];

  useEffect(() => {
    // Reset form when selected user changes
    setSelectedIcdCodes([]);
    setMessage({ text: "", type: "" });
    
    // Fetch user data to check current ICD assignment
    if (selectedUser) {
      fetchUserData();
    }
  }, [selectedUser]);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-user/${selectedUser}`
      );
      setUserData(res.data);
      // Set current ICD codes if user already has them assigned
      setSelectedIcdCodes(res.data.selected_icd_codes || []);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setMessage({ 
        text: "Error fetching user information", 
        type: "error" 
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!selectedIcdCodes || selectedIcdCodes.length === 0) {
      setMessage({ text: "Please select at least one ICD code", type: "error" });
      return;
    }

    // Check if current user has admin privileges
    if (user.role !== "Admin") {
      setMessage({ text: "Only admins can assign ICD codes", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/admin/assign-icd-code`,
        {
          username: selectedUser,
          selectedIcdCodes: selectedIcdCodes,
          adminUsername: user.username
        }
      );
      
      setMessage({ text: response.data.message || "ICD codes assigned successfully", type: "success" });
      
      // Update local user data to reflect the change
      setUserData(prev => ({
        ...prev,
        selected_icd_codes: selectedIcdCodes
      }));
      
    } catch (error) {
      console.error("Error assigning ICD codes:", error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        setMessage({ 
          text: error.response.data.message || "Unauthorized action", 
          type: "error" 
        });
      } else if (error.response?.status === 404) {
        setMessage({ 
          text: "User not found", 
          type: "error" 
        });
      } else {
        setMessage({ 
          text: error.response?.data?.message || "Error assigning ICD codes", 
          type: "error" 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAllIcdCodes = async () => {
    if (!userData?.selected_icd_codes || userData.selected_icd_codes.length === 0) {
      setMessage({ text: "No ICD codes assigned to remove", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/admin/remove-icd-code`,
        {
          username: selectedUser,
          adminUsername: user.username
        }
      );
      
      setMessage({ text: response.data.message || "All ICD codes removed successfully", type: "success" });
      setSelectedIcdCodes([]);
      
      // Update local user data
      setUserData(prev => ({
        ...prev,
        selected_icd_codes: []
      }));
      
    } catch (error) {
      console.error("Error removing ICD codes:", error);
      setMessage({ 
        text: error.response?.data?.message || "Error removing ICD codes", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIcdCodeChange = (event) => {
    const value = event.target.value;
    setSelectedIcdCodes(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Assign ICD Codes for {selectedUser}
      </Typography>
      
      {message.text && (
        <Alert severity={message.type === "success" ? "success" : "error"} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Display current ICD assignments */}
      {userData?.selected_icd_codes && userData.selected_icd_codes.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Current ICD Assignments:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {userData.selected_icd_codes.map((code, index) => (
              <Chip key={index} label={code} size="small" />
            ))}
          </Box>
        </Alert>
      )}
      
      {user.role !== "Admin" ? (
        <Alert severity="warning">
          Only administrators can assign ICD codes to users
        </Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="icd-codes-select-label">Select ICD Codes</InputLabel>
            <Select
              labelId="icd-codes-select-label"
              multiple
              value={selectedIcdCodes}
              onChange={handleIcdCodeChange}
              input={<OutlinedInput label="Select ICD Codes" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {icdCodeOptions.map((icdCode) => (
                <MenuItem key={icdCode} value={icdCode}>
                  <Checkbox checked={selectedIcdCodes.indexOf(icdCode) > -1} />
                  <ListItemText primary={icdCode} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Assign ICD Codes"}
            </Button>
            
            {userData?.selected_icd_codes && userData.selected_icd_codes.length > 0 && (
              <Button 
                onClick={handleRemoveAllIcdCodes}
                variant="outlined" 
                color="error"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Remove All ICD Codes"}
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default SelectIcdCode;
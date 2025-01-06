import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
} from "@mui/material";

const ImportersInfo = ({ userId }) => {
  const [importers, setImporters] = useState([]);
  const [filteredImporters, setFilteredImporters] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  console.log(userId);
  // Fetch user details with assigned importers on load
  useEffect(() => {
    fetchUserWithImporters();
  }, [userId]);

  const fetchUserWithImporters = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/users/${userId}`
      );
      const { assigned_importer_name } = res.data.user;
  
      // Fetch all importers
      const allImportersRes = await axios.get(
        `${process.env.REACT_APP_API_STRING}/importers`
      );
      const allImporters = allImportersRes.data.importers;
  
      // Match assigned_importer_name with actual importer details
      const filtered = allImporters.filter((importer) =>
        assigned_importer_name.includes(importer._id)
      );
  
      setImporters(allImporters); // Keep all importers for future updates
      setFilteredImporters(filtered); // Set filtered importers for display
    } catch (error) {
      console.error("Error fetching user or importers:", error);
      setSnackbar({
        open: true,
        message: "Failed to load importers. Please try again.",
        severity: "error",
      });
    }
  };
  

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div>
      <h3>Assigned Importers</h3>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Contact</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Address</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredImporters.map((importer) => (
            <TableRow key={importer._id}>
              <TableCell>{importer.name}</TableCell>
              <TableCell>{importer.contact}</TableCell>
              <TableCell>{importer.email}</TableCell>
              <TableCell>{importer.address}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ImportersInfo;

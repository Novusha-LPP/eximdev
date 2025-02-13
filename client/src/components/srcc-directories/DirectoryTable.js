import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

function DirectoryTable({ directoryType, onEdit }) {
  // You'll need to fetch and manage data based on directoryType
  const [data, setData] = useState([]);

  const handleDelete = (id) => {
    // Implement delete functionality
  };

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            {/* Add dynamic columns based on directoryType */}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              {/* Add dynamic cells based on directoryType */}
              <TableCell>
                <IconButton onClick={() => onEdit(row)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(row.id)}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DirectoryTable;

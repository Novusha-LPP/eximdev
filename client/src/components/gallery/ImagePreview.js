import React, { useState } from "react";
import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmDialog from "./ConfirmDialog"; // Reusable Confirm Dialog Component

const ImagePreview = ({ images, onDeleteImage, readOnly = false }) => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

  // Ensure images is always treated as an array
  const normalizedImages = Array.isArray(images) ? images : [images];

  // Function to extract the file name from the URL
  const extractFileName = (url) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return url; // Fallback to original URL if extraction fails
    }
  };

  const handleDeleteClick = (index) => {
    setDeleteIndex(index);
    setOpenDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDeleteImage(deleteIndex);
    setOpenDeleteDialog(false);
  };

  return (
    <Box mt={1} style={{ maxHeight: "150px", overflowY: "auto" }}>
      {normalizedImages.length > 0 ? (
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Image Name</TableCell>
              {!readOnly && <TableCell>Action</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {normalizedImages.map((link, index) => (
              <TableRow key={index}>
                <TableCell>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "blue" }}
                  >
                    {extractFileName(link)}
                  </a>
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <IconButton
                      onClick={() => handleDeleteClick(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p>No asset uploaded yet.</p>
      )}
      {/* Confirm Dialog */}
      {!readOnly && (
        <ConfirmDialog
          open={openDeleteDialog}
          handleClose={() => setOpenDeleteDialog(false)}
          handleConfirm={confirmDelete}
          message="Are you sure you want to delete this image?"
        />
      )}
    </Box>
  );
};

export default ImagePreview;

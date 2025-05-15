import React, { useState, useContext } from "react";
import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { UserContext } from "../../contexts/UserContext";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmDialog from "./ConfirmDialog"; // Reusable Confirm Dialog Component

const ImagePreview = ({ images, onDeleteImage, readOnly = false }) => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const { user } = useContext(UserContext);

  // Ensure `images` is always an array and handle both string URLs and object URLs
  const imageArray = Array.isArray(images) 
    ? images.map(img => typeof img === 'object' && img !== null ? img.url : img)
    : images 
      ? [typeof images === 'object' && images !== null ? images.url : images] 
      : [];

  // Function to extract the file name from the URL, with error handling
  const extractFileName = (url) => {
    try {
      if (!url) return "Unknown file";
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return "File name unavailable"; // Fallback if extraction fails
    }
  };

  const handleDeleteClick = (index) => {
    if (user.role === "Admin") {
      setDeleteIndex(index);
      setOpenDeleteDialog(true);
    } else {
      alert("You do not have permission to delete images.");
    }
  };

  const confirmDelete = async () => {
    const imageUrl = imageArray[deleteIndex];
  
    try {
      const key = new URL(imageUrl).pathname.slice(1); // correct key including folders
  
      const response = await fetch(`${process.env.REACT_APP_API_STRING}/delete-s3-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      });
  
      if (response.ok) {
        onDeleteImage(deleteIndex);
      } else {
        alert("Failed to delete image from S3.");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Error deleting image.");
    }
  
    setOpenDeleteDialog(false);
  };

  return (
    <Box mt={1} style={{ maxHeight: "150px", overflowY: "auto" }}>
      {imageArray.length > 0 ? (
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Image Name</TableCell>
              {!readOnly && <TableCell>Action</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {imageArray.map((link, index) => (
              <TableRow key={index}>
                <TableCell>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "blue" }}
                    >
                      {extractFileName(link)}
                    </a>
                  ) : (
                    "Invalid image link"
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <IconButton
                      onClick={() => handleDeleteClick(index)}
                      color="error"
                      size="small"
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
        <Typography variant="body2" color="textSecondary">
          No assets uploaded yet.
        </Typography>
      )}
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
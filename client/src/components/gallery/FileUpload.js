import React, { useState, useContext } from "react";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import { Button, CircularProgress } from "@mui/material";
import { UserContext } from "../../contexts/UserContext";

const FileUpload = ({
  label,
  onFilesUploaded,
  bucketPath,
  multiple = true,
  acceptedFileTypes = [],
  readOnly = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useContext(UserContext);

  const handleFileUpload = async (event) => {
    if (readOnly) {
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setUploading(true);
    try {
      // Use the uploadFileToS3 function directly with all files
      const result = await uploadFileToS3(files, bucketPath);
      
      // Log the entire response to see the structure
      console.log("Full upload result:", result);
      console.log("Uploaded files data:", result.uploaded);
      
      // Check the first item to see its structure
      if (result.uploaded && result.uploaded.length > 0) {
        console.log("First uploaded file structure:", result.uploaded[0]);
      }
      
      // Extract URLs correctly based on the actual response structure
      // Try different possible property names
      const uploadedUrls = result.uploaded.map(file => {
        // Log each file object to see what's available
        console.log("Processing file:", file);
        
        // Check common property names
        if (file.location) return file.location;
        if (file.Location) return file.Location;
        if (file.url) return file.url;
        if (file.URL) return file.URL;
        
        // If none found, return the whole object as a last resort
        console.warn("Could not find URL property in uploaded file:", file);
        return file;
      });
      
      console.log("Extracted URLs:", uploadedUrls);
      
      // Pass the array of URLs to the parent component
      onFilesUploaded(uploadedUrls);
    } catch (error) {
      console.error("Upload process failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <Button
        variant="contained"
        component="label"
        style={{
          backgroundColor: readOnly ? "#ccc" : "#1c1e22",
          color: "#fff",
          cursor: readOnly ? "not-allowed" : "pointer",
        }}
        disabled={readOnly || uploading}
      >
        {uploading ? "Uploading..." : label}
        <input
          type="file"
          hidden
          multiple={multiple}
          accept={acceptedFileTypes.length ? acceptedFileTypes.join(",") : ""}
          onChange={handleFileUpload}
          disabled={readOnly || uploading}
        />
      </Button>
      {uploading && (
        <CircularProgress size={24} style={{ marginLeft: "10px" }} />
      )}
    </div>
  );
};

export default FileUpload;
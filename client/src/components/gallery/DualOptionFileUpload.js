import React, { useState } from "react";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import { Button, CircularProgress } from "@mui/material";

const DualOptionFileUpload = ({
  label,
  onFilesUploaded,
  bucketPath,
  multiple = true,
  acceptedFileTypes = ["image/*", "video/*", ".zip"], // Default file types
}) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    const uploadedFiles = [];

    setUploading(true);
    for (const file of files) {
      try {
        const result = await uploadFileToS3(file, bucketPath);
        uploadedFiles.push(result.Location);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }
    setUploading(false);
    onFilesUploaded(uploadedFiles);
  };

  return (
    <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
      {/* Original Upload Button */}
      <div>
        <Button
          variant="contained"
          component="label"
          style={{ backgroundColor: "#1c1e22", color: "#fff" }}
        >
          {label}
          <input
            type="file"
            hidden
            multiple={multiple}
            accept={acceptedFileTypes.join(",")} // Combine accepted types
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </Button>
      </div>

      {/* New Camera Capture Button */}
      <div>
        <Button
          variant="contained"
          component="label"
          style={{ backgroundColor: "#1c1e22", color: "#fff" }}
        >
          Capture Photo
          <input
            type="file"
            hidden
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </Button>
      </div>

      {uploading && <CircularProgress size={24} style={{ marginLeft: "10px" }} />}
    </div>
  );
};

export default DualOptionFileUpload;

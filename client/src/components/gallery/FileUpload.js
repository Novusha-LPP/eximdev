import React, { useState } from "react";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import { Button, CircularProgress } from "@mui/material";

const FileUpload = ({
  label,
  onFilesUploaded,
  bucketPath,
  multiple = true,
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
    <div style={{ marginTop: "10px" }}>
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
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </Button>
      {uploading && (
        <CircularProgress size={24} style={{ marginLeft: "10px" }} />
      )}
    </div>
  );
};

export default FileUpload;

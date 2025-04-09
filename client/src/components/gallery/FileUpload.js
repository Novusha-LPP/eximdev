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
    if (readOnly) return; // Prevent upload if readOnly is true

    const files = event.target.files;
    if (!files || files.length === 0) return;

    const uploadedFiles = [];
    setUploading(true);

    try {
      for (const file of files) {
        try {
          const result = await uploadFileToS3(file, bucketPath);
          // Make sure we're using the correct property name (Location with capital L)
          if (result && result.Location) {
            uploadedFiles.push(result.Location);
          } else {
            console.error("Upload response missing Location:", result);
          }
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      // Call the callback function with the uploaded file URLs
      if (uploadedFiles.length > 0) {
        onFilesUploaded(uploadedFiles);
      }
    } catch (error) {
      console.error("Error in file upload process:", error);
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

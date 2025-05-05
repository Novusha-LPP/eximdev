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
      // console.log("Upload prevented: component is in readOnly mode");
      return;
    }

    const files = event.target.files;
    // console.log(`Files selected: ${files?.length || 0}`);

    if (!files || files.length === 0) {
      // console.log("No files selected, returning early");
      return;
    }

    const uploadedFiles = [];

    setUploading(true);
    try {
      for (const file of files) {
        try {
          const result = await uploadFileToS3(file, bucketPath);
          // Just store the URL string rather than an object
          uploadedFiles.push(result.Location);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }
      onFilesUploaded(uploadedFiles);
    } catch (error) {
      console.error("Upload process failed:", error);
    } finally {
      setUploading(false);
    }
  };

  //console.log("FileUpload: Rendering button with uploading state:", uploading);

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

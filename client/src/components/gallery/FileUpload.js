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
      // Call the upload utility function
      const result = await uploadFileToS3(files, bucketPath);
      console.log(bucketPath);
      // Extract file URLs from the uploaded array in the response
      if (result && result.uploaded && result.uploaded.length > 0) {
        // Map through the uploaded files to get their locations
        const fileUrls = result.uploaded.map((file) => file.location);
        uploadedFiles.push(...fileUrls);
      } else {
        console.error("Upload response missing uploaded files data:", result);
      }

      // Call the callback function with the uploaded file URLs
      if (uploadedFiles.length > 0) {
        onFilesUploaded(uploadedFiles);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Unknown error occurred";
      console.error("Error in file upload process:", errorMessage);
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

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
      // Call the upload utility function
      const result = await uploadFileToS3(files, bucketPath);

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
      } else {
        console.log("No files to pass to callback");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Unknown error occurred";
      console.error("Error in file upload process:", errorMessage);
      console.error("Error details:", error);
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
          onChange={(e) => {
            //console.log("FileUpload: File input change event triggered");
            handleFileUpload(e);
          }}
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

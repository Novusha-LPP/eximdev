import React, { useState, useContext } from "react";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import { Button, CircularProgress, Tooltip } from "@mui/material";
import { UserContext } from "../../contexts/UserContext";

const FileUpload = ({
  label,
  onFilesUploaded,
  bucketPath,
  multiple = true,
  acceptedFileTypes = [],
  readOnly = false,
  replaceMode = false, // New prop: when true, replaces existing files; when false, appends
  singleFileOnly = false, // New prop: when true, only allows one file to be selected
  containerStyles = {}, // New prop: custom styles for the container div
  buttonSx = {}, // New prop: custom sx styles for the MUI Button
  shouldCompress = false, // New prop: only compress if true
}) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useContext(UserContext);

  const handleFileUpload = async (event) => {
    if (readOnly) return;

    const files = event.target.files;
    const uploadedFiles = [];

    setUploading(true);

    try {
      // If singleFileOnly is true, only upload the first file
      const filesToUpload = singleFileOnly ? [files[0]] : Array.from(files);

      for (const file of filesToUpload) {
        try {
<<<<<<< HEAD
<<<<<<< HEAD
          console.log("shouldCompress", shouldCompress);
          const fileToUpload = shouldCompress ? await compressFile(file, 900) : file;
          const result = await uploadFileToS3(fileToUpload, bucketPath);
=======
          const result = await uploadFileToS3(file, bucketPath);
>>>>>>> parent of 9561443 (feat: Implement AWS S3 file upload with client-side compression for images, PDFs, and Office documents.)
=======
          const result = await uploadFileToS3(file, bucketPath);
>>>>>>> parent of 9561443 (feat: Implement AWS S3 file upload with client-side compression for images, PDFs, and Office documents.)
          uploadedFiles.push(result.Location);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }
    } finally {
      setUploading(false);
    }

    // Pass the upload mode to the callback
    onFilesUploaded(uploadedFiles, replaceMode);
  };

  return (
    <div style={{ marginTop: "10px", ...containerStyles }}>
      <Tooltip
        title={
          readOnly
            ? "Upload is disabled"
            : `Select file to upload${singleFileOnly ? " (single file)" : ""}`
        }
        arrow
      >
        <span>
          <Button
            variant="contained"
            component="label"
            sx={{ ...buttonSx }}
            style={{
              backgroundColor: readOnly ? "#ccc" : "#1c1e22",
              color: "#fff",
              cursor: readOnly ? "not-allowed" : "pointer",
            }}
            disabled={readOnly || uploading}
          >
            {label}
            <input
              type="file"
              hidden
              multiple={!singleFileOnly && multiple} // Disable multiple when singleFileOnly is true
              accept={
                acceptedFileTypes.length ? acceptedFileTypes.join(",") : ""
              }
              onChange={handleFileUpload}
              disabled={readOnly || uploading}
            />
          </Button>
        </span>
      </Tooltip>
      {uploading && (
        <CircularProgress size={24} style={{ marginLeft: "10px" }} />
      )}
    </div>
  );
};

export default FileUpload;

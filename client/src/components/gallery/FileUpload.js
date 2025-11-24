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
          const result = await uploadFileToS3(file, bucketPath);
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
    <div style={{ marginTop: "10px" }}>
      <Tooltip 
        title={readOnly ? "Upload is disabled" : `Select file to upload${singleFileOnly ? " (single file)" : ""}`}
        arrow
      >
        <span>
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
            {label}
            <input
              type="file"
              hidden
              multiple={!singleFileOnly && multiple} // Disable multiple when singleFileOnly is true
              accept={acceptedFileTypes.length ? acceptedFileTypes.join(",") : ""}
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

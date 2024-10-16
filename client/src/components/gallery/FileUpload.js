import React, { useState } from "react";
import { uploadFileToS3 } from "../../utils/awsFileUpload"; // Assume this is your utility for uploading to S3
import { Button } from "@mui/material";

const FileUpload = ({ label, onFilesUploaded, multiple = true }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    const uploadedFiles = [];

    setUploading(true);
    for (const file of files) {
      try {
        const result = await uploadFileToS3(file, "accidents");
        uploadedFiles.push(result.Location);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Handle error display logic here
      }
    }
    setUploading(false);
    onFilesUploaded(uploadedFiles); // Pass the uploaded file URLs to parent component
  };

  return (
    <div>
      <input
        type="file"
        multiple={multiple}
        onChange={handleFileUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
};

export default FileUpload;

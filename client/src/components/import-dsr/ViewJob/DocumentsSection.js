import React from "react";
import { Box, Typography } from "@mui/material";
import JobDetailsRowHeading from "../JobDetailsRowHeading";
import FileUpload from "../../gallery/FileUpload.js";
import ImagePreview from "../../gallery/ImagePreview.js";

const DocumentsSection = ({ cthDocuments, setCthDocuments }) => {

  // Helper function to render a single document item
  // This avoids code duplication between the two columns
  const renderDocumentItem = (doc, docIndex) => (
    <Box key={doc.document_code || docIndex}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
        {doc.document_name} ({doc.document_code})
      </Typography>
      
      {/* Container to place upload and preview side-by-side */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        <FileUpload
          hideLabel
          label={`${doc.document_name} (${doc.document_code})`}
          bucketPath={`cth-documents/${doc.document_name}`}
          onFilesUploaded={(urls) => {
            const updated = [...cthDocuments];
            updated[docIndex].url = [
              ...(updated[docIndex].url || []),
              ...urls,
            ];
            setCthDocuments(updated);
          }}
          multiple
        />
        <ImagePreview
          images={doc.url || []}
          onDeleteImage={(deleteIndex) => {
            const updated = [...cthDocuments];
            updated[docIndex].url = updated[docIndex].url.filter(
              (_, i) => i !== deleteIndex
            );
            setCthDocuments(updated);
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: 2 }}>
      <JobDetailsRowHeading heading="Documents" />

      <Box
  sx={{
    mt: 1.5,
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr" }, // Responsive columns
    gap: { xs: 2, sm: 3, md: 4 }, // Adjust column gap based on screen size
    rowGap: { xs: 2, sm: 3, md: 4 }, // Adjust row gap for better spacing
    alignItems: "start", // Align items at the top
  }}
>
  {/* Left column */}
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {cthDocuments
      .slice(0, 4)
      .map((doc, index) => renderDocumentItem(doc, index))}
  </Box>

  {/* Right column */}
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {cthDocuments
      .slice(4, 7)
      .map((doc, index) => renderDocumentItem(doc, 4 + index))}
  </Box>
</Box>
    </Box>
  );
};

export default DocumentsSection;

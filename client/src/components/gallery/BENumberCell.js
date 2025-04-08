import React, { useCallback, useMemo, useState } from "react";
import FileUpload from "./FileUpload.js";
import { FaUpload } from "react-icons/fa";

const BENumberCell = ({ 
  cell, 
  onDocumentsUpdated // Callback to update parent component's state
}) => {
  const [activeUpload, setActiveUpload] = useState(null);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);

  const getCustomHouseLocation = useMemo(
    () => (customHouse) => {
      const houseMap = {
        "ICD SACHANA": "SACHANA ICD (INJKA6)",
        "ICD SANAND": "THAR DRY PORT ICD/AHMEDABAD GUJARAT ICD (INSAU6)",
        "ICD KHODIYAR": "AHEMDABAD ICD (INSBI6)",
      };
      return houseMap[customHouse] || customHouse;
    },
    []
  );

  const beNumber = cell?.getValue()?.toString();
  const rawBeDate = cell.row.original.be_date;
  const customHouse = cell.row.original.custom_house;
  const beDate = formatDate(rawBeDate);
  const location = getCustomHouseLocation(customHouse);
  const rowId = cell.row.original.id || cell.row.id;

  const {
    processed_be_attachment = [],
    ooc_copies = [],
    gate_pass_copies = [],
  } = cell.row.original;

  const getFirstLink = (input) => {
    if (Array.isArray(input)) {
      return input.length > 0 ? input[0] : null;
    }
    return input || null;
  };

  const processed_be_attachmentLink = getFirstLink(processed_be_attachment);

  const handleFilesUploaded = (newFiles, fieldName) => {
    // Create a copy of the row data
    const updatedRowData = { ...cell.row.original };
    
    // Update the specific field with new files
    const existingFiles = updatedRowData[fieldName] || [];
    updatedRowData[fieldName] = [...existingFiles, ...newFiles];
    
    // Call the parent's callback to update the data
    if (onDocumentsUpdated) {
      onDocumentsUpdated(rowId, fieldName, updatedRowData[fieldName]);
    }
    
    // Close upload popup
    setActiveUpload(null);
  };

  const renderDocumentSection = (title, documents, fieldName) => {
    const isUploadActive = activeUpload === fieldName;
    
    return (
      <div style={{ marginTop: "10px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {documents.length > 0 ? (
            <a
              href={documents[0]}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "blue",
                textDecoration: "underline",
                cursor: "pointer",
                marginRight: "10px"
              }}
            >
              {title}
            </a>
          ) : (
            <span style={{ color: "gray", marginRight: "10px" }}>{title}</span>
          )}
          
          <button
            type="button"
            onClick={() => setActiveUpload(isUploadActive ? null : fieldName)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0",
              color: "#0066cc"
            }}
            title={`Upload ${title}`}
          >
            <FaUpload size={14} />
          </button>
        </div>
        
        {/* Additional files if they exist */}
        {documents.length > 1 && fieldName !== "processed_be_attachment" && (
          <div style={{ marginTop: "5px" }}>
            {documents.slice(1).map((doc, index) => (
              <a
                key={index}
                href={doc}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "blue",
                  textDecoration: "underline",
                  cursor: "pointer",
                  display: "block",
                  marginTop: "3px"
                }}
              >
                {fieldName === "ooc_copies" ? `OOC Copy ${index + 2}` : `Gate Pass ${index + 2}`}
              </a>
            ))}
          </div>
        )}
        
        {/* Upload component */}
        {isUploadActive && (
          <div style={{ 
            position: "absolute", 
            zIndex: 10, 
            width: "200px", 
            background: "white", 
            padding: "10px", 
            boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
            borderRadius: "4px",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: "5px"
          }}>
            <FileUpload
              label={`Upload ${title}`}
              bucketPath={fieldName}
              onFilesUploaded={(newFiles) => handleFilesUploaded(newFiles, fieldName)}
              multiple={fieldName !== "processed_be_attachment"}
            />
            <button
              type="button"
              onClick={() => setActiveUpload(null)}
              style={{
                marginTop: "5px",
                padding: "3px 8px",
                background: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        position: "relative"
      }}
    >
      {beNumber && (
        <div>
          <a
            href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${beNumber}&BE_DT=${beDate}&beTrack_location=${location}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            {beNumber}
          </a>
          <div>{beDate}</div>
        </div>
      )}

      {/* Processed BE Attachment */}
      {renderDocumentSection("Processed Copy of BOE", processed_be_attachment, "processed_be_attachment")}
      
      {/* OOC Copies */}
      {renderDocumentSection(ooc_copies.length > 0 ? `OOC Copy 1` : "No OOC Copies", ooc_copies, "ooc_copies")}
      
      {/* Gate Pass Copies */}
      {renderDocumentSection(gate_pass_copies.length > 0 ? `Gate Pass 1` : "No Gate Pass", gate_pass_copies, "gate_pass_copies")}
    </div>
  );
};

export default BENumberCell;
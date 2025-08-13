import React from "react";
import { Row, Col } from "react-bootstrap";
import { TextField } from "@mui/material";
import JobDetailsRowHeading from "../JobDetailsRowHeading";
import FileUpload from "../../gallery/FileUpload.js";
import ImagePreview from "../../gallery/ImagePreview.js";
import { preventFormSubmitOnEnter } from "../../../utils/preventFormSubmitOnEnter.js";

const ChargesSection = ({
  DsrCharges,
  setDsrCharges,
  selectedChargesDocuments,
  setSelectedChargesDocuments,
  newChargesDocumentName,
  setNewChargesDocumentName,
}) => {
  const predefinedCharges = ["Notary", "Duty", "MISC", "CE Certification Charges", "ADC/NOC Charges"];

  // Helper function to abstract the common pattern of updating the selected documents array
  const updateSelectedDocument = (docName, updateCallback) => {
    const updatedDocs = [...selectedChargesDocuments];
    const docIndex = updatedDocs.findIndex(d => d.document_name === docName);

    if (docIndex !== -1) {
      updatedDocs[docIndex] = updateCallback(updatedDocs[docIndex]);
    } else {
      // Create a new document if it doesn't exist
      const newDoc = { document_name: docName, url: [], document_check_date: "", document_amount_details: "" };
      updatedDocs.push(updateCallback(newDoc));
    }
    setSelectedChargesDocuments(updatedDocs);
  };

  // Handlers for charge item interactions
  const handleFileUpload = (docName, urls) => {
    updateSelectedDocument(docName, doc => ({
      ...doc,
      url: [...(doc.url || []), ...urls],
    }));
  };

  const handleAmountChange = (docName, value) => {
    if (value !== "" && !/^\d+(\.\d*)?$/.test(value)) return; // Allow only numbers/decimals
    updateSelectedDocument(docName, doc => ({
      ...doc,
      document_amount_details: value,
    }));
  };

  const handleDeleteImage = (docName, imageIndex) => {
    updateSelectedDocument(docName, doc => ({
      ...doc,
      url: doc.url.filter((_, i) => i !== imageIndex),
    }));
  };

  const handleDeleteCustomCharge = (docName, index) => {
    setDsrCharges(DsrCharges.filter((_, i) => i !== index));
    setSelectedChargesDocuments(
      selectedChargesDocuments.filter(doc => doc.document_name !== docName)
    );
  };

  // Handler for adding a new custom charge
  const handleAddCustomCharge = () => {
    const trimmedName = newChargesDocumentName.trim();
    if (trimmedName && !DsrCharges.some(doc => doc.document_name === trimmedName)) {
      setDsrCharges([...DsrCharges, { document_name: trimmedName }]);
      setNewChargesDocumentName("");
    }
  };

  const isAddButtonDisabled = !newChargesDocumentName.trim() || DsrCharges.some(doc => doc.document_name === newChargesDocumentName.trim());

  return (
    <div className="job-details-container">
      <JobDetailsRowHeading heading="Charges" />
      <br />

      {/* All Charges Documents */}
      <Row>
        {DsrCharges?.map((doc, index) => {
          const selectedDoc = selectedChargesDocuments.find(s => s.document_name === doc.document_name) || {};
          const isCustom = !predefinedCharges.includes(doc.document_name);

          return (
            <Col xs={12} lg={4} key={`charges-${index}`} style={{ marginBottom: "20px", position: "relative" }}>
              {/* === MODIFIED SECTION START === */}
              <Row className="g-2 align-items-end">
                <Col xs={7}>
                  <FileUpload
                    label={doc.document_name}
                    bucketPath={`charges-documents/${doc.document_name}`}
                    onFilesUploaded={(urls) => handleFileUpload(doc.document_name, urls)}
                    multiple={true}
                  />
                </Col>
                <Col xs={5}>
                  <TextField
                    label="Amount"
                    variant="outlined"
                    size="small"
                    fullWidth
                    type="number"
                    inputProps={{ min: 0, step: "0.01" }}
                    value={selectedDoc.document_amount_details || ""}
                    onChange={(e) => handleAmountChange(doc.document_name, e.target.value)}
                  />
                </Col>
              </Row>
              {/* === MODIFIED SECTION END === */}

              <ImagePreview
                images={selectedDoc.url || []}
                onDeleteImage={(deleteIndex) => handleDeleteImage(doc.document_name, deleteIndex)}
                readOnly={false}
              />
              {isCustom && (
                <div
                  style={{ position: "absolute", top: "10px", right: "10px", cursor: "pointer", color: "#dc3545" }}
                  onClick={() => handleDeleteCustomCharge(doc.document_name, index)}
                >
                  <i className="fas fa-trash-alt" title="Delete"></i>
                </div>
              )}
            </Col>
          );
        })}
      </Row>

      {/* Add Custom Charges Document Section */}
      <Row style={{ marginTop: "20px", marginBottom: "20px" }}>
        <Col xs={12} lg={4}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            label="Custom Charge Document Name"
            value={newChargesDocumentName}
            onChange={(e) => setNewChargesDocumentName(e.target.value)}
            onKeyDown={preventFormSubmitOnEnter}
          />
        </Col>
        <Col xs={12} lg={4} style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            className="btn"
            style={{ marginTop: "8px", height: "fit-content" }}
            onClick={handleAddCustomCharge}
            disabled={isAddButtonDisabled}
          >
            Add Custom Charge Document
          </button>
        </Col>
      </Row>
    </div>
  );
};

export default ChargesSection;

// src/pages/job-details/tabs/DocumentsTab.jsx
import React from "react";

export default function DocumentsTab({
  user,
  formik,
  cthDocuments,
  setCthDocuments,
  cth_Dropdown,
  selectedDocument,
  setSelectedDocument,
  newDocumentName,
  setNewDocumentName,
  newDocumentCode,
  setNewDocumentCode,
  preventFormSubmitOnEnter,
  dialogOpen,            // controlled in parent ConfirmDialog
  setDialogOpen,
  currentDocument,
  setCurrentDocument,
  isEditMode,
  setIsEditMode,
  editValues,
  setEditValues,
}) {
  const containerStyle = {
    padding: "10px 12px",
    backgroundColor: "#f9f9f9",
    fontFamily: "Arial, sans-serif",
    fontSize: "13px",
  };

  const sectionTitleStyle = {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
    margin: "10px 0 6px 0",
    borderBottom: "1px solid #ddd",
    paddingBottom: "4px",
  };

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "8px",
  };

  const fieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#555",
  };

  const inputStyle = {
    padding: "4px 7px",
    fontSize: "12px",
    border: "1px solid #ccc",
    borderRadius: "3px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  };

  const selectStyle = { ...inputStyle };

  const buttonStyle = {
    padding: "5px 10px",
    fontSize: "12px",
    border: "1px solid #007bff",
    borderRadius: "3px",
    cursor: "pointer",
    fontWeight: "bold",
    backgroundColor: "#007bff",
    color: "white",
  };

  const smallButtonStyle = {
    ...buttonStyle,
    padding: "3px 8px",
    fontSize: "11px",
  };

  const secondaryButtonStyle = {
    ...smallButtonStyle,
    backgroundColor: "#6c757d",
    borderColor: "#6c757d",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    backgroundColor: "white",
  };

  const thStyle = {
    border: "1px solid #ddd",
    padding: "6px 8px",
    textAlign: "left",
    backgroundColor: "#f0f0f0",
    fontSize: "11px",
  };

  const tdStyle = {
    border: "1px solid #ddd",
    padding: "5px 8px",
    textAlign: "left",
  };

  const actionCellStyle = {
    ...tdStyle,
    whiteSpace: "nowrap",
  };

  const iconButtonStyle = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "11px",
    marginRight: "4px",
    color: "#007bff",
  };

  const deleteButtonStyle = {
    ...iconButtonStyle,
    color: "#dc3545",
  };

  // -------------------------
  // Handlers
  // -------------------------
  const handleAddCthDocumentFromDropdown = () => {
    if (!selectedDocument) return;

    const doc = cth_Dropdown.find(
      (d) => String(d.document_name) === String(selectedDocument)
    );
    if (!doc) return;

    const already = cthDocuments.some(
      (d) =>
        d.document_name === doc.document_name &&
        d.document_code === doc.document_code
    );
    if (already) return;

    setCthDocuments((prev) => [
      ...prev,
      {
        document_name: doc.document_name,
        document_code: doc.document_code,
      },
    ]);
  };

  const handleAddCustomDocument = (e) => {
    e.preventDefault();
    if (!newDocumentName?.trim()) return;

    setCthDocuments((prev) => [
      ...prev,
      {
        document_name: newDocumentName.trim(),
        document_code: newDocumentCode.trim(),
      },
    ]);

    setNewDocumentName("");
    setNewDocumentCode("");
  };

  const openEditDialog = (doc) => {
    setCurrentDocument(doc);
    setEditValues({
      document_name: doc.document_name,
      document_code: doc.document_code,
    });
    setIsEditMode(true);
    setDialogOpen(true);
  };

  const openDeleteDialog = (doc) => {
    setCurrentDocument(doc);
    setIsEditMode(false);
    setDialogOpen(true);
  };

  return (
    <div style={containerStyle}>
      {/* CTH Document dropdown add */}
      <h3 style={sectionTitleStyle}>CTH Documents</h3>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Select Document:</label>
          <select
            style={selectStyle}
            value={selectedDocument || ""}
            onChange={(e) => setSelectedDocument(e.target.value)}
          >
            <option value="">-- Select --</option>
            {cth_Dropdown?.map((doc) => (
              <option key={doc.document_code} value={doc.document_name}>
                {doc.document_name} ({doc.document_code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            type="button"
            style={buttonStyle}
            onClick={handleAddCthDocumentFromDropdown}
          >
            Add Document
          </button>
        </div>
      </div>

      {/* Manual add row */}
      <form
        onSubmit={handleAddCustomDocument}
        onKeyDown={preventFormSubmitOnEnter}
        style={{ marginBottom: "10px" }}
      >
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>New Document Name:</label>
            <input
              type="text"
              style={inputStyle}
              value={newDocumentName}
              onChange={(e) => setNewDocumentName(e.target.value)}
              placeholder="e.g. Invoice"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Document Code:</label>
            <input
              type="text"
              style={inputStyle}
              value={newDocumentCode}
              onChange={(e) => setNewDocumentCode(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" style={buttonStyle}>
              Add Custom
            </button>
          </div>
        </div>
      </form>

      {/* Document list */}
      {cthDocuments && cthDocuments.length > 0 && (
        <div style={{ marginBottom: "15px" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cthDocuments.map((doc, index) => (
                <tr key={`${doc.document_name}-${index}`}>
                  <td style={tdStyle}>{doc.document_name}</td>
                  <td style={tdStyle}>{doc.document_code}</td>
                  <td style={actionCellStyle}>
                    <button
                      type="button"
                      style={iconButtonStyle}
                      onClick={() => openEditDialog(doc)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      style={deleteButtonStyle}
                      onClick={() => openDeleteDialog(doc)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p
            style={{
              fontSize: "11px",
              color: "#999",
              marginTop: "3px",
            }}
          >
            Use Edit/Delete; changes will be applied when you confirm in the
            dialog.
          </p>
        </div>
      )}

      {/* Any other doc-level info inside formik if required */}
      <h3 style={sectionTitleStyle}>Other Information</h3>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Document Remarks:</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: "50px",
              resize: "vertical",
              fontFamily: "Arial, sans-serif",
            }}
            value={formik.values.document_remarks || ""}
            onChange={(e) =>
              formik.setFieldValue("document_remarks", e.target.value)
            }
            placeholder="Any additional information about documents..."
          />
        </div>
      </div>
    </div>
  );
}

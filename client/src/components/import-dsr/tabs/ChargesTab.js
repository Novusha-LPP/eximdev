// src/pages/job-details/tabs/ChargesTab.jsx
import React from "react";

export default function ChargesTab({
  user,
  formik,
  DsrCharges,
  setDsrCharges,
  selectedChargesDocuments,
  setSelectedChargesDocuments,
  newChargesDocumentName,
  setNewChargesDocumentName,
  preventFormSubmitOnEnter,
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

  const labelStyle = {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#555",
  };

  const inputStyle = {
    padding: "4px 6px",
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

  const deleteButtonStyle = {
    ...smallButtonStyle,
    backgroundColor: "#dc3545",
    borderColor: "#dc3545",
  };

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    marginBottom: "6px",
  };

  const fieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
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

  // Fallback: if no predefined templates, treat selectedChargesDocuments as plain string list
  const chargeTemplates =
    Array.isArray(selectedChargesDocuments) &&
    selectedChargesDocuments.length > 0
      ? selectedChargesDocuments
      : [];

  // -------------------------
  // Handlers
  // -------------------------

  const handleAddChargeFromTemplate = () => {
    const name = formik.values.selectedChargeTemplate || "";
    if (!name) return;

    setDsrCharges((prev) => [
      ...prev,
      {
        document_name: name,
        amount: "",
        currency: "INR",
        remarks: "",
      },
    ]);

    formik.setFieldValue("selectedChargeTemplate", "");
  };

  const handleAddCustomCharge = (e) => {
    e.preventDefault();
    if (!newChargesDocumentName?.trim()) return;

    setDsrCharges((prev) => [
      ...prev,
      {
        document_name: newChargesDocumentName.trim(),
        amount: "",
        currency: "INR",
        remarks: "",
      },
    ]);
    setNewChargesDocumentName("");
  };

  const handleChargeFieldChange = (index, key, value) => {
    const updated = (DsrCharges || []).map((c, i) =>
      i === index ? { ...c, [key]: value } : c
    );
    setDsrCharges(updated);
  };

  const handleDeleteCharge = (index) => {
    const updated = (DsrCharges || []).filter((_, i) => i !== index);
    setDsrCharges(updated);
  };

  const totalAmountINR = (DsrCharges || []).reduce((sum, c) => {
    const amt = parseFloat(c.amount || 0);
    // You can extend: sum only INR or convert curr
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  return (
    <div style={containerStyle}>
      <h3 style={sectionTitleStyle}>DSR Charges</h3>

      {/* Template-based add (optional) */}
      {chargeTemplates.length > 0 && (
        <div style={{ marginBottom: "8px" }}>
          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Select Charge Template:</label>
              <select
                style={selectStyle}
                value={formik.values.selectedChargeTemplate || ""}
                onChange={(e) =>
                  formik.setFieldValue(
                    "selectedChargeTemplate",
                    e.target.value
                  )
                }
              >
                <option value="">-- Select --</option>
                {chargeTemplates.map((tpl, idx) => (
                  <option key={idx} value={tpl.document_name || tpl}>
                    {tpl.document_name || tpl}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="button"
                style={buttonStyle}
                onClick={handleAddChargeFromTemplate}
              >
                Add Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Charge add */}
      <form
        onSubmit={handleAddCustomCharge}
        onKeyDown={preventFormSubmitOnEnter}
        style={{ marginBottom: "10px" }}
      >
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>New Charge Name:</label>
            <input
              type="text"
              style={inputStyle}
              value={newChargesDocumentName}
              onChange={(e) => setNewChargesDocumentName(e.target.value)}
              placeholder="e.g. THC, DO Charges"
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" style={buttonStyle}>
              Add Custom Charge
            </button>
          </div>
        </div>
      </form>

      {/* Charges table */}
      {(DsrCharges || []).length > 0 ? (
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Charge Name</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Currency</th>
                <th style={thStyle}>Remarks</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {DsrCharges.map((charge, index) => (
                <tr key={`${charge.document_name}-${index}`}>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      style={inputStyle}
                      value={charge.document_name || ""}
                      onChange={(e) =>
                        handleChargeFieldChange(
                          index,
                          "document_name",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      style={{ ...inputStyle, width: "100px" }}
                      value={charge.amount || ""}
                      onChange={(e) =>
                        handleChargeFieldChange(
                          index,
                          "amount",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td style={tdStyle}>
                    <select
                      style={{ ...selectStyle, width: "80px" }}
                      value={charge.currency || "INR"}
                      onChange={(e) =>
                        handleChargeFieldChange(
                          index,
                          "currency",
                          e.target.value
                        )
                      }
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      {/* Add currencies as needed */}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      style={inputStyle}
                      value={charge.remarks || ""}
                      onChange={(e) =>
                        handleChargeFieldChange(
                          index,
                          "remarks",
                          e.target.value
                        )
                      }
                      placeholder="Optional"
                    />
                  </td>
                  <td style={actionCellStyle}>
                    <button
                      type="button"
                      style={deleteButtonStyle}
                      onClick={() => handleDeleteCharge(index)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
            }}
          >
            <span>
              Total Rows: <strong>{DsrCharges.length}</strong>
            </span>
            <span>
              Total Amount (INR only):{" "}
              <strong>{totalAmountINR.toFixed(2)}</strong>
            </span>
          </div>
        </>
      ) : (
        <p style={{ fontSize: "12px", color: "#777" }}>
          No charges added yet. Use the controls above to add charges.
        </p>
      )}
    </div>
  );
}

import React from "react";

const DutyCalculation = ({
  dutyRates,
  handleDutyRateChange,
  handleBOFChange,
  clearanceValue,
  assessableValue,
  handleAssessableValueChange,
  additionalCharges,
  additionalChargesList,
  showAddChargeInput,
  newCharge,
  setNewCharge,
  addCharge,
  handleAddCharge,
  setShowAddChargeInput,
  deleteCharge,
  dutyValues,
  calculateCIF,
  calculateDuties,
  exportCSV,
  cifINR,
  userModified,
  resetToAutoCalculation,
}) => {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 8px 16px rgba(0,0,0,0.06)",
        width: "50%",
        minWidth: "500px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: "17px",
          marginBottom: "12px",
          fontWeight: 600,
          color: "#34495e",
          cursor: "pointer",
        }}
      >
        💸 Duty Calculation
      </div>

      <div style={{ display: "block" }}>
        <table style={{ width: "100%", borderSpacing: "0 6px" }}>
          <tbody>
            <tr>
              <td>Clearance Value</td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <div
                  style={{
                    width: "180px",
                    padding: "6px 10px",
                    fontSize: "14px",
                  }}
                >
                  {clearanceValue}
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    marginBottom: "4px",
                  }}
                >
                  Assemble Value (₹)
                  <br />
                  <span style={{ fontSize: "11px", color: "#666" }}>
                    (Manual entry enabled)
                  </span>
                </div>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <input
                    type="number"
                    value={assessableValue}
                    onChange={handleAssessableValueChange}
                    onFocus={(e) => e.target.select()}
                    style={{
                      width: "180px",
                      padding: "6px 10px",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      fontSize: "14px",
                      backgroundColor: userModified ? "#ffffe0" : "#fff",
                      cursor: "text",
                    }}
                  />
                  <button
                    onClick={addCharge}
                    style={{
                      background: "#007bff",
                      color: "white",
                      padding: "6px 14px",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    + Add
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#666",
                    }}
                  >
                    Auto = {(cifINR + additionalCharges).toFixed(2)}
                  </div>
                  {userModified && (
                    <button
                      onClick={resetToAutoCalculation}
                      style={{
                        background: "#6c757d",
                        color: "white",
                        padding: "2px 8px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      Reset to Auto
                    </button>
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td>Additional Charges (₹)</td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#1e8449" }}>
                      {additionalCharges.toFixed(2)}
                    </span>
                  </div>

                  {showAddChargeInput && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="number"
                        value={newCharge}
                        onChange={(e) => setNewCharge(e.target.value)}
                        placeholder="Enter charge amount"
                        style={{
                          width: "180px",
                          padding: "6px 10px",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                      <button
                        onClick={handleAddCharge}
                        style={{
                          background: "#28a745",
                          color: "white",
                          padding: "6px 14px",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowAddChargeInput(false)}
                        style={{
                          background: "#dc3545",
                          color: "white",
                          padding: "6px 14px",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {additionalChargesList.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      {additionalChargesList.map((charge, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "4px",
                          }}
                        >
                          <span style={{ fontSize: "14px" }}>
                            ₹{charge.toFixed(2)}
                          </span>
                          <button
                            onClick={() => deleteCharge(index)}
                            style={{
                              background: "#dc3545",
                              color: "white",
                              padding: "2px 8px",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td>
                BCD (%)
                <span
                  style={{
                    display: "inline-block",
                    position: "relative",
                    cursor: "help",
                    color: "#007bff",
                    fontWeight: "bold",
                    marginLeft: "6px",
                  }}
                  title="Basic Customs Duty = Assemble × BCD%;"
                >
                  ℹ️
                </span>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  id="bcdRate"
                  value={dutyRates.bcdRate}
                  onChange={handleDutyRateChange}
                  style={{
                    width: "180px",
                    padding: "6px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
                <div
                  style={{
                    fontWeight: 600,
                    color: "#1e8449",
                    marginTop: "4px",
                    display: "inline-block",
                  }}
                >
                  {dutyValues.bcd.toFixed(2)}
                </div>
              </td>
            </tr>
            <tr>
              <td>
                FTA (%)
                <span
                  style={{
                    display: "inline-block",
                    position: "relative",
                    cursor: "help",
                    color: "#007bff",
                    fontWeight: "bold",
                    marginLeft: "6px",
                  }}
                  title="Free Trade Agreement - Percentage reduction applied to FTA"
                >
                  ℹ️
                </span>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <label style={{ marginRight: "15px" }}>
                    <input
                      type="radio"
                      name="bofEnabled"
                      value="yes"
                      checked={dutyRates.bofEnabled}
                      onChange={handleBOFChange}
                      style={{ marginRight: "5px" }}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="bofEnabled"
                      value="no"
                      checked={!dutyRates.bofEnabled}
                      onChange={handleBOFChange}
                      style={{ marginRight: "5px" }}
                    />
                    No
                  </label>
                </div>

                {dutyRates.bofEnabled && (
                  <div>
                    <input
                      type="number"
                      id="bofPercentage"
                      value={dutyRates.bofPercentage}
                      onChange={handleDutyRateChange}
                      placeholder="Percentage %"
                      style={{
                        width: "180px",
                        padding: "6px 10px",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                    {dutyValues.bofReduction > 0 && (
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#c0392b",
                          marginTop: "4px",
                          display: "inline-block",
                          marginLeft: "8px",
                        }}
                      >
                        - {dutyValues.bofReduction.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td>
                SWS (%)
                <span
                  style={{
                    display: "inline-block",
                    position: "relative",
                    cursor: "help",
                    color: "#007bff",
                    fontWeight: "bold",
                    marginLeft: "6px",
                  }}
                  title="SWS = 10% of BCD amount (after BOF reduction if applicable)"
                >
                  ℹ️
                </span>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  id="swsRate"
                  value={dutyRates.swsRate}
                  onChange={handleDutyRateChange}
                  style={{
                    width: "180px",
                    padding: "6px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
                <div
                  style={{
                    fontWeight: 600,
                    color: "#1e8449",
                    marginTop: "4px",
                    display: "inline-block",
                  }}
                >
                  {dutyValues.sws.toFixed(2)}
                </div>
              </td>
            </tr>
            <tr>
              <td>
                IGST (%)
                <span
                  style={{
                    display: "inline-block",
                    position: "relative",
                    cursor: "help",
                    color: "#007bff",
                    fontWeight: "bold",
                    marginLeft: "6px",
                  }}
                  title="IGST = (Assessable + BCD + SWS) × IGST%"
                >
                  ℹ️
                </span>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  id="igstRate"
                  value={dutyRates.igstRate}
                  onChange={handleDutyRateChange}
                  style={{
                    width: "180px",
                    padding: "6px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
                <div
                  style={{
                    fontWeight: 600,
                    color: "#1e8449",
                    marginTop: "4px",
                    display: "inline-block",
                  }}
                >
                  {dutyValues.igst.toFixed(2)}
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Total Duty (₹)</strong>
              </td>
              <td
                style={{
                  fontWeight: 600,
                  color: "#1e8449",
                  marginTop: "4px",
                  display: "inline-block",
                  padding: "4px",
                }}
              >
                {dutyValues.total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
        <button
          onClick={() => {
            calculateCIF();
            calculateDuties();
          }}
          style={{
            background: "#007bff",
            color: "white",
            padding: "6px 14px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            marginTop: "10px",
            marginRight: "5px",
          }}
        >
          🔁 Recalculate
        </button>
        <button
          onClick={() => window.print()}
          style={{
            background: "#007bff",
            color: "white",
            padding: "6px 14px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            marginTop: "10px",
            marginRight: "5px",
          }}
        >
          🖨️ Print
        </button>
        <button
          onClick={exportCSV}
          style={{
            background: "#007bff",
            color: "white",
            padding: "6px 14px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            marginTop: "10px",
          }}
        >
          📥 Export CSV
        </button>
      </div>
    </div>
  );
};

export default DutyCalculation;

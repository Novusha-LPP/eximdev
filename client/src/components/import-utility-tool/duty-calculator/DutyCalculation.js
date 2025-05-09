import React from "react";
import AdditionalChargesList from "./AdditionalChargesList";

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
  deleteCharge,
  dutyValues,
  calculateCIF,
  calculateDuties,
  exportCSV,
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
                  (Auto = CIF INR + Charges)
                </div>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="number"
                    value={assessableValue.toFixed(2)}
                    onChange={handleAssessableValueChange}
                    placeholder="Auto/manual"
                    style={{
                      width: "180px",
                      padding: "6px 10px",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      fontSize: "14px",
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

                  <AdditionalChargesList
                    showAddChargeInput={showAddChargeInput}
                    newCharge={newCharge}
                    setNewCharge={setNewCharge}
                    handleAddCharge={handleAddCharge}
                    setShowAddChargeInput={() => showAddChargeInput(false)}
                    additionalChargesList={additionalChargesList}
                    deleteCharge={deleteCharge}
                  />
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
                  value={dutyRates.bcdRate}
                  onChange={(e) =>
                    handleDutyRateChange("bcdRate", e.target.value)
                  }
                  style={{
                    width: "180px",
                    padding: "6px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
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
                  title="Social Welfare Surcharge = BCD Amount × SWS%"
                >
                  ℹ️
                </span>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  value={dutyRates.swsRate}
                  onChange={(e) =>
                    handleDutyRateChange("swsRate", e.target.value)
                  }
                  style={{
                    width: "180px",
                    padding: "6px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
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
                  title="IGST = (Assemble + BCD Amount + SWS Amount) × IGST%"
                >
                  ℹ️
                </span>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  value={dutyRates.igstRate}
                  onChange={(e) =>
                    handleDutyRateChange("igstRate", e.target.value)
                  }
                  style={{
                    width: "180px",
                    padding: "6px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </td>
            </tr>
            <tr>
              <td>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <input
                    type="checkbox"
                    checked={dutyRates.bofEnabled}
                    onChange={(e) => handleBOFChange(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  <span>
                    BOF (%)
                    <span
                      style={{
                        display: "inline-block",
                        position: "relative",
                        cursor: "help",
                        color: "#007bff",
                        fontWeight: "bold",
                        marginLeft: "6px",
                      }}
                      title="Basic Overseas Freight = Assemble × BOF%"
                    >
                      ℹ️
                    </span>
                  </span>
                </div>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  value={dutyRates.bofPercentage}
                  onChange={(e) =>
                    handleDutyRateChange("bofPercentage", e.target.value)
                  }
                  disabled={!dutyRates.bofEnabled}
                  style={{
                    width: "180px",
                    padding: "6px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    fontSize: "14px",
                    backgroundColor: dutyRates.bofEnabled ? "white" : "#f5f5f5",
                  }}
                />
              </td>
            </tr>

            {/* Results Section */}
            <tr>
              <td colSpan="2">
                <div
                  style={{
                    marginTop: "20px",
                    padding: "15px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                  }}
                >
                  <h4 style={{ margin: "0 0 15px 0", color: "#2c3e50" }}>
                    Calculated Duties
                  </h4>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {Object.entries(dutyValues).map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "14px",
                        }}
                      >
                        <span>{key}</span>
                        <span style={{ fontWeight: 600 }}>
                          ₹ {value.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </td>
            </tr>

            {/* Export Button */}
            <tr>
              <td
                colSpan="2"
                style={{ textAlign: "right", paddingTop: "20px" }}
              >
                <button
                  onClick={exportCSV}
                  style={{
                    background: "#28a745",
                    color: "white",
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Export to CSV
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DutyCalculation;

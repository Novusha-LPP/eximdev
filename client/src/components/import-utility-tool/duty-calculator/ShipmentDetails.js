import React from "react";

const ShipmentDetails = ({ shipmentDetails, handleInputChange, cifINR }) => {
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
        📦 Shipment Details
      </div>

      <div style={{ display: "block" }}>
        <table style={{ width: "100%", borderSpacing: "0 6px" }}>
          <tbody>
            <tr>
              <td>B/L Date</td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="text"
                  id="blDate"
                  value={shipmentDetails.blDate}
                  onChange={handleInputChange}
                  placeholder="DD/MM/YYYY"
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
              <td>HS Code</td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="text"
                  id="hsCode"
                  value={shipmentDetails.hsCode}
                  onChange={handleInputChange}
                  placeholder="e.g. 39011090"
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
              <td>Unit Price (USD/MT)</td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  id="unitPrice"
                  value={shipmentDetails.unitPrice}
                  onChange={handleInputChange}
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
              <td>Net Wt (MTS)</td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  id="netWeight"
                  value={shipmentDetails.netWeight}
                  onChange={handleInputChange}
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
                Freight (USD){" "}
                <span style={{ fontSize: "12px", color: "#888" }}>
                  (Optional)
                </span>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  id="freightUSD"
                  value={shipmentDetails.freightUSD}
                  onChange={handleInputChange}
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
                Insurance (USD){" "}
                <span style={{ fontSize: "12px", color: "#888" }}>
                  (Optional)
                </span>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  id="insuranceUSD"
                  value={shipmentDetails.insuranceUSD}
                  onChange={handleInputChange}
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
                CIF Value (USD){" "}
                <span style={{ fontSize: "12px", color: "#888" }}>
                  (Incl. Freight & Insurance)
                </span>
              </td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  id="baseCIFUSD"
                  value={shipmentDetails.baseCIFUSD}
                  onChange={handleInputChange}
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
              <td>Exchange Rate</td>
              <td style={{ padding: "4px", verticalAlign: "top" }}>
                <input
                  type="number"
                  id="exchangeRate"
                  value={shipmentDetails.exchangeRate}
                  onChange={handleInputChange}
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
              <td>CIF Value (INR)</td>
              <td
                style={{
                  fontWeight: 600,
                  color: "#1e8449",
                  marginTop: "4px",
                  display: "inline-block",
                  padding: "4px",
                }}
              >
                {cifINR ? cifINR.toFixed(2) : "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShipmentDetails;

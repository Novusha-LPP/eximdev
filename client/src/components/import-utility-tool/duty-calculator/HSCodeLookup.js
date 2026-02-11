import React from "react";

const HSCodeLookup = ({
  hsCode,
  handleInputChange,
  jobNo,
  setJobNo,
  year,
  setYear,
  lookupHSCode,
  isLoading,
  error,
}) => {
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      lookupHSCode();
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 8px 16px rgba(0,0,0,0.06)",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          fontSize: "17px",
          marginBottom: "12px",
          fontWeight: 600,
          color: "#34495e",
        }}
      >
        🔍 HS Code Lookup
      </div>

      <table style={{ width: "100%", borderSpacing: "0 6px" }}>
        <tbody>
          <tr>
            <td>HS Code</td>
            <td style={{ padding: "4px" }}>
              <input
                type="text"
                id="hsCode"
                value={hsCode}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="e.g. 76020010"
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
            <td>Job Number</td>
            <td style={{ padding: "4px" }}>
              <input
                type="text"
                value={jobNo}
                onChange={(e) => setJobNo(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g. 00232"
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
            <td>Year</td>
            <td style={{ padding: "4px" }}>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{
                  width: "180px",
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <option value="25-26">25-26</option>
                <option value="24-25">24-25</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>

      <button
        onClick={lookupHSCode}
        disabled={isLoading}
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
        {isLoading ? "Loading..." : "Lookup Data"}
      </button>

      {error && (
        <div style={{ color: "red", marginTop: "10px", fontSize: "14px" }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default HSCodeLookup;

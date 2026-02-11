import React from "react";

const AdditionalChargesList = ({
  showAddChargeInput,
  newCharge,
  setNewCharge,
  handleAddCharge,
  setShowAddChargeInput,
  additionalChargesList,
  deleteCharge,
}) => {
  return (
    <div style={{ marginTop: "8px" }}>
      {showAddChargeInput && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
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
        <div
          style={{
            maxHeight: "150px",
            overflowY: "auto",
            border: "1px solid #eee",
            borderRadius: "6px",
            padding: "8px",
          }}
        >
          {additionalChargesList.map((charge, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px",
                borderBottom:
                  index === additionalChargesList.length - 1
                    ? "none"
                    : "1px solid #eee",
              }}
            >
              <span style={{ fontSize: "14px" }}>₹{charge.toFixed(2)}</span>
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
  );
};

export default AdditionalChargesList;

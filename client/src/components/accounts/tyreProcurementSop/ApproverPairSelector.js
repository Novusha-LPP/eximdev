import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BookmarkAdded, Save, Person, CheckCircle } from "@mui/icons-material";
import { CircularProgress, Tooltip } from "@mui/material";

/**
 * ApproverPairSelector
 * 
 * Manages Name + Designation pairs dynamically for procurement documents (e.g., Checked By, Approved By).
 * Users can pick from previously saved pairs in a dropdown, or type a new Name and Designation
 * and save it directly to the database so it appears in the dropdown forever.
 */
function ApproverPairSelector({
  name = "",
  designation = "",
  role = "CHECKED_BY",
  label = "Checked By",
  onPairChange,
  compact = false,
  readOnly = false,
}) {
  const [approvers, setApprovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Normalize current inputs
  const currentName = (name || "").trim().toUpperCase();
  const currentDesignation = (designation || "").trim().toUpperCase();

  // Fetch approvers from backend
  const fetchApprovers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/procurement-approvers`);
      if (res.data?.success && Array.isArray(res.data.approvers)) {
        setApprovers(res.data.approvers);
      }
    } catch (err) {
      console.error("Error fetching procurement approvers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovers();
  }, [fetchApprovers]);

  // Determine which dropdown option matches current name + designation
  const matchedApprover = approvers.find(
    (a) =>
      a.name.trim().toUpperCase() === currentName &&
      a.designation.trim().toUpperCase() === currentDesignation
  );

  const selectedDropdownValue = matchedApprover
    ? `${matchedApprover.name}___${matchedApprover.designation}`
    : currentName || currentDesignation
    ? "CUSTOM"
    : "";

  // Handle dropdown selection
  const handleDropdownChange = (e) => {
    const val = e.target.value;
    if (!val || val === "CUSTOM") {
      return;
    }
    const [selName, selDesignation] = val.split("___");
    if (onPairChange) {
      onPairChange({
        name: selName ? selName.trim().toUpperCase() : "",
        designation: selDesignation ? selDesignation.trim().toUpperCase() : "",
      });
    }
  };

  // Handle typing in name or designation
  const handleNameChange = (e) => {
    const newName = e.target.value.toUpperCase();
    if (onPairChange) {
      onPairChange({
        name: newName,
        designation: currentDesignation,
      });
    }
  };

  const handleDesignationChange = (e) => {
    const newDesig = e.target.value.toUpperCase();
    if (onPairChange) {
      onPairChange({
        name: currentName,
        designation: newDesig,
      });
    }
  };

  // Save new/current pair to database
  const handleSavePair = async () => {
    if (!currentName || !currentDesignation) {
      alert("Please enter both Name and Designation before saving.");
      return;
    }

    try {
      setSaving(true);
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/procurement-approvers`, {
        name: currentName,
        designation: currentDesignation,
        role,
      });

      if (res.data?.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await fetchApprovers();
      }
    } catch (err) {
      console.error("Error saving procurement approver pair:", err);
      alert(err.response?.data?.message || "Failed to save approver pair.");
    } finally {
      setSaving(false);
    }
  };

  // Check if current pair is already in the saved list
  const isAlreadySaved = Boolean(matchedApprover);

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
        {/* Dropdown Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <select
            value={selectedDropdownValue}
            onChange={handleDropdownChange}
            disabled={readOnly || loading}
            style={{
              flex: 1,
              height: "28px",
              fontSize: "11.5px",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              color: "#1e293b",
            }}
            title="Pick a saved Name + Designation pair"
          >
            <option value="">-- Choose Saved Approver --</option>
            {approvers.map((app) => (
              <option key={app._id || `${app.name}-${app.designation}`} value={`${app.name}___${app.designation}`}>
                {app.name} — {app.designation}
              </option>
            ))}
            <option value="CUSTOM">➕ Type Custom Pair...</option>
          </select>

          {!isAlreadySaved && currentName && currentDesignation && !readOnly && (
            <Tooltip title="Save this Name & Designation pair to the dropdown list">
              <button
                type="button"
                onClick={handleSavePair}
                disabled={saving}
                style={{
                  height: "28px",
                  padding: "0 8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {saving ? (
                  <CircularProgress size={12} sx={{ color: "#ffffff" }} />
                ) : saveSuccess ? (
                  <>
                    <CheckCircle style={{ fontSize: "13px", color: "#86efac" }} /> Saved!
                  </>
                ) : (
                  <>
                    <Save style={{ fontSize: "13px" }} /> Save Pair
                  </>
                )}
              </button>
            </Tooltip>
          )}
        </div>

        {/* Inputs Row: Name and Designation in Pair */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <input
            type="text"
            className="sop-input"
            placeholder="Name (e.g. MOHIT SINGH)"
            value={name}
            onChange={handleNameChange}
            readOnly={readOnly}
            style={{
              height: "28px",
              fontSize: "11.5px",
              fontWeight: 600,
              padding: "2px 6px",
              backgroundColor: isAlreadySaved ? "#f1f5f9" : "#ffffff",
            }}
          />
          <input
            type="text"
            className="sop-input"
            placeholder="Designation (e.g. CEO)"
            value={designation}
            onChange={handleDesignationChange}
            readOnly={readOnly}
            style={{
              height: "28px",
              fontSize: "11.5px",
              fontWeight: 600,
              padding: "2px 6px",
              backgroundColor: isAlreadySaved ? "#f1f5f9" : "#ffffff",
            }}
          />
        </div>
      </div>
    );
  }

  // Full Card / Field Group layout
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        padding: "10px 12px",
        backgroundColor: "#f8fafc",
        marginBottom: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <label
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Person style={{ fontSize: "16px", color: "#2563eb" }} />
          {label} (Name & Designation Pair)
        </label>

        {isAlreadySaved ? (
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: "4px",
              backgroundColor: "#dcfce7",
              color: "#15803d",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <BookmarkAdded style={{ fontSize: "12px" }} /> Saved Pair
          </span>
        ) : currentName && currentDesignation ? (
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: "4px",
              backgroundColor: "#fef3c7",
              color: "#b45309",
            }}
          >
            Unsaved Custom Pair
          </span>
        ) : null}
      </div>

      {/* Dropdown Selector */}
      <div style={{ marginBottom: "8px" }}>
        <select
          value={selectedDropdownValue}
          onChange={handleDropdownChange}
          disabled={readOnly || loading}
          style={{
            width: "100%",
            height: "32px",
            fontSize: "12px",
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: "5px",
            border: "1.5px solid #cbd5e1",
            backgroundColor: "#ffffff",
            color: "#1e293b",
            cursor: "pointer",
          }}
        >
          <option value="">-- Select from Saved Approvers --</option>
          {approvers.map((app) => (
            <option key={app._id || `${app.name}-${app.designation}`} value={`${app.name}___${app.designation}`}>
              {app.name} — {app.designation}
            </option>
          ))}
          <option value="CUSTOM">➕ Type Custom Name & Designation...</option>
        </select>
      </div>

      {/* Paired Name & Designation Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", alignItems: "center" }}>
        <div>
          <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "2px" }}>
            Name
          </label>
          <input
            type="text"
            className="sop-input"
            placeholder="e.g. MOHIT SINGH"
            value={name}
            onChange={handleNameChange}
            readOnly={readOnly}
            style={{
              height: "32px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: "#ffffff",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "2px" }}>
            Designation
          </label>
          <input
            type="text"
            className="sop-input"
            placeholder="e.g. CEO"
            value={designation}
            onChange={handleDesignationChange}
            readOnly={readOnly}
            style={{
              height: "32px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: "#ffffff",
            }}
          />
        </div>

        {!readOnly && (
          <div style={{ alignSelf: "flex-end" }}>
            <button
              type="button"
              onClick={handleSavePair}
              disabled={saving || isAlreadySaved || !currentName || !currentDesignation}
              style={{
                height: "32px",
                padding: "0 12px",
                fontSize: "11.5px",
                fontWeight: 700,
                backgroundColor: isAlreadySaved ? "#e2e8f0" : "#2563eb",
                color: isAlreadySaved ? "#64748b" : "#ffffff",
                border: "none",
                borderRadius: "5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                cursor: isAlreadySaved || !currentName || !currentDesignation ? "default" : "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
              title={
                isAlreadySaved
                  ? "This pair is already saved in the list"
                  : "Save this pair to the dropdown list for future PRs and POs"
              }
            >
              {saving ? (
                <CircularProgress size={14} sx={{ color: "#ffffff" }} />
              ) : saveSuccess ? (
                <>
                  <CheckCircle style={{ fontSize: "15px", color: "#86efac" }} /> Saved!
                </>
              ) : isAlreadySaved ? (
                <>
                  <CheckCircle style={{ fontSize: "15px", color: "#16a34a" }} /> Saved
                </>
              ) : (
                <>
                  <Save style={{ fontSize: "15px" }} /> Save to List
                </>
              )}
            </button>
          </div>
        )}
      </div>
      <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "5px" }}>
        * Name and Designation will appear together as a pair in the official Purchase Order footer.
      </div>
    </div>
  );
}

export default React.memo(ApproverPairSelector);

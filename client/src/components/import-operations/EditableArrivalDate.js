import React, { useState, useEffect } from "react";
import { FcCalendar } from "react-icons/fc";
import axios from "axios";

// Accept both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm"
const isDateOnly = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
const isDateTime = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.trim());
const validateDate = (value) => {
  if (!value || value.trim() === "") return true;
  const s = String(value).trim();
  if (isDateOnly(s) || isDateTime(s)) return true;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= 2000 && y <= 2100;
};

const toInputDateTime = (value) => {
  if (!value) return "";
  const s = String(value).trim();
  if (isDateTime(s)) return s;
  if (isDateOnly(s)) return `${s}T00:00`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
};

const normalizeDateForSave = (value) => {
  if (!value) return null;
  const s = String(value).trim();
  if (isDateOnly(s)) return `${s}T00:00`;
  if (isDateTime(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
};

const addDaysISODate = (ISOStringOrDateOnly, days) => {
  const base = String(ISOStringOrDateOnly || "");
  const dateOnly = isDateOnly(base) ? base : (isDateTime(base) ? base.split("T")[0] : null);
  let y, m, d;
  if (dateOnly) {
    [y, m, d] = dateOnly.split("-").map(Number);
  } else {
    const dt = new Date(base);
    if (isNaN(dt.getTime())) return "";
    y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate();
  }
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + (parseInt(days, 10) || 0));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const EditableArrivalDate = ({ cell }) => {
  const rowData = cell?.row?.original || {};
  const { _id = null, container_nos = [], free_time } = rowData;

  const [containers, setContainers] = useState([]);
  const [editable, setEditable] = useState(null);
  const [tempDateValue, setTempDateValue] = useState("");
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    setContainers(Array.isArray(container_nos) ? [...container_nos] : []);
  }, [container_nos]);

  const handleEditStart = (index) => {
    setEditable(`arrival_date_${index}`);
    setTempDateValue(""); // empty to show blank date picker
    setDateError("");
  };

  // Double-click: clear arrival_date and detention_from at index
  const handleClearDate = async (index) => {
    if (!_id) return;

    const updated = containers.map((c, i) =>
      i === index ? { ...c, arrival_date: "", detention_from: "" } : c
    );
    setContainers(updated);

    try {
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      const payload = {
        [`container_nos.${index}.arrival_date`]: null, // ask backend to $unset
        [`container_nos.${index}.detention_from`]: null,
        __op: "unset",
      };

      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, payload, { headers });

      // mutate row to avoid immediate rehydrate conflicts
      cell.row.original.container_nos = updated;
    } catch (err) {
      console.error("Error clearing arrival date:", err);
    }
  };

  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };

  const handleDateSubmit = async (index) => {
    if (!validateDate(tempDateValue)) {
      setDateError("Please enter a valid date (YYYY-MM-DD or YYYY-MM-DDTHH:mm)");
      return;
    }
    if (!_id) {
      setDateError("Invalid job id");
      return;
    }

    const val = tempDateValue === "" ? null : normalizeDateForSave(tempDateValue);

    const updated = containers.map((c, i) => {
      if (i !== index) return c;
      const next = { ...c, arrival_date: val };
      if (!val) {
        next.detention_from = "";
      } else {
        const free = parseInt(free_time) || 0;
        next.detention_from = addDaysISODate(val, free); // YYYY-MM-DD
      }
      return next;
    });
    setContainers(updated);

    try {
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      const payload = {};
      payload[`container_nos.${index}.arrival_date`] = val;
      payload[`container_nos.${index}.detention_from`] = updated[index].detention_from || null;

      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, payload, { headers });

      cell.row.original.container_nos = updated;
      setEditable(null);
      setTempDateValue("");
      setDateError("");
    } catch (err) {
      console.error("Error updating arrival date:", err);
      setDateError("Failed to update date");
      setContainers([...container_nos]); // revert
    }
  };

  const handleCancel = () => {
    setEditable(null);
    setTempDateValue("");
    setDateError("");
  };

  if (!cell || !cell.row || !cell.row.original) {
    return <div style={{ minWidth: 200, color: "#999" }}>No data available</div>;
  }

  return (
    <div style={{ minWidth: 220 }}>
      <strong>Arrival Dates:</strong>
      <br />
      {containers.map((container, id) => (
        <div key={id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>
              Container {id + 1}: {container.arrival_date ? String(container.arrival_date).slice(0, 10) : "N/A"}
            </span>
            <FcCalendar
              style={{ cursor: "pointer", fontSize: 18 }}
              onClick={() => handleEditStart(id)}          // click → open editor cleared
              onDoubleClick={() => handleClearDate(id)}    // dblclick → clear immediately
              title="Click to Edit • Double-click to Clear"
            />
          </div>

          {editable === `arrival_date_${id}` && (
            <div style={{ marginTop: 5 }}>
              <input
                type="datetime-local"
                value={toInputDateTime(tempDateValue)} // keep normalized while editing
                onChange={handleDateInputChange}
                style={{
                  border: dateError ? "1px solid red" : "1px solid #ccc",
                  borderRadius: 3,
                  padding: 4,
                  fontSize: 12,
                  width: "100%",
                }}
              />
              <div style={{ marginTop: 4 }}>
                <button
                  onClick={() => handleDateSubmit(id)}
                  style={{
                    backgroundColor: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: 3,
                    padding: "2px 6px",
                    cursor: "pointer",
                    marginRight: 6,
                    fontSize: 12,
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: 3,
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
              {dateError && <div style={{ color: "red", fontSize: 11, marginTop: 2 }}>{dateError}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EditableArrivalDate;

import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import axios from "axios";
import { TextField, MenuItem } from "@mui/material";
import { FcCalendar } from "react-icons/fc";
import AddIcon from "@mui/icons-material/Add";
import IgstModal from "./IgstModal";

// ---------- Date helpers ----------
const isDateOnly = (s) =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
const isDateTime = (s) =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.trim());

// Accept "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
const validateDateFlexible = (value) => {
  if (value === "" || value === null || value === undefined) return true;
  const s = String(value).trim();
  if (isDateOnly(s) || isDateTime(s)) return true;
  const d = new Date(s);
  return !isNaN(d.getTime());
};

// For datetime-local input value
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

// Display as YYYY-MM-DD
const formatDateDisplay = (value) => {
  if (!value) return "N/A";
  const s = String(value).trim();
  if (isDateOnly(s)) return s;
  if (isDateTime(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return "N/A";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Normalize for saving to a datetime schema
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

// Date-only math used for detention
const getDateOnly = (dateString) => {
  if (!dateString) return null;
  const s = String(dateString);
  if (isDateOnly(s)) return s;
  if (isDateTime(s)) return s.split("T")[0];
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDaysToDate = (dateString, days) => {
  const base = getDateOnly(dateString);
  if (!base) return null;
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return null;
  dt.setDate(dt.getDate() + (parseInt(days, 10) || 0));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

// ---------- Component ----------
const EditableDateCell = memo(({ cell, onRowDataUpdate }) => {
  const rowData = cell.row.original || {};
  const {
    _id,
    payment_method,
    assessment_date,
    free_time,
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
    type_of_b_e,
    consignment_type,
    type_of_Do,
    container_nos = [],
    detailed_status,
    be_no,
    duty_paid_date,
    assessable_ammount,
    igst_ammount,
  } = rowData;

  const initialDates = useMemo(
    () => ({
      assessment_date,
      vessel_berthing,
      gateway_igm_date,
      discharge_date,
      pcv_date,
      out_of_charge,
      duty_paid_date,
    }),
    [
      assessment_date,
      vessel_berthing,
      gateway_igm_date,
      discharge_date,
      pcv_date,
      out_of_charge,
      duty_paid_date,
    ]
  );

  const [dates, setDates] = useState(initialDates);
  const [localStatus, setLocalStatus] = useState(detailed_status);
  const [containers, setContainers] = useState(() => [...container_nos]);
  const [editable, setEditable] = useState(null);
  const [localFreeTime, setLocalFreeTime] = useState(free_time);
  const [tempDateValue, setTempDateValue] = useState("");
  const [dateError, setDateError] = useState("");
  const [igstModalOpen, setIgstModalOpen] = useState(false);

  // Rehydrate when parent row changes
  const dataKey = useMemo(() => {
    const cKey = (container_nos || [])
      .map(
        (c) =>
          `${c.container_number || ""}|${c.arrival_date || ""}|${c.detention_from || ""
          }|${c.delivery_date || ""}|${c.emptyContainerOffLoadDate || ""}|${c.container_rail_out_date || ""
          }|${c.by_road_movement_date || ""}`
      )
      .join("||");
    return `${_id}|${assessment_date || ""}|${vessel_berthing || ""}|${gateway_igm_date || ""
      }|${discharge_date || ""}|${pcv_date || ""}|${out_of_charge || ""}|${duty_paid_date || ""
      }|${detailed_status || ""}|${free_time || ""}|${cKey}`;
  }, [
    _id,
    assessment_date,
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
    duty_paid_date,
    detailed_status,
    free_time,
    container_nos,
  ]);

  useEffect(() => {
    setDates(initialDates);
    setContainers([...(container_nos || [])]);
    setLocalStatus(detailed_status);
    setLocalFreeTime(free_time);
    setEditable(null);
    setTempDateValue("");
    setDateError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  const options = useMemo(() => Array.from({ length: 41 }, (_, i) => i), []);
  const InBondflag = type_of_b_e === "In-Bond";
  const isExBond = type_of_b_e === "Ex-Bond";
  const isLCL = consignment_type === "LCL";
  const isFactory = type_of_Do === "Factory";

  // Utility
  const getEarliestDetention = (arr) => {
    const list = (arr || [])
      .map((c) => c?.detention_from)
      .filter(Boolean)
      .sort();
    return list[0];
  };

  const adjustValidityDate = (earliestDateString) => {
    if (!earliestDateString) return "";
    const base = getDateOnly(earliestDateString);
    if (!base) return "";
    const [y, m, d] = base.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return "";
    dt.setDate(dt.getDate() - 1);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  const buildFieldPayload = (fieldPath, value) => {
    // value is already normalized or raw; treat "empty" as empty string
    if (value === "" || value === null || value === undefined) {
      return { [fieldPath]: "" };
    }
    const normalized = normalizeDateForSave(value);
    return { [fieldPath]: normalized };
  };

  const isArrivalDateDisabled = useCallback(
    (idx) => {
      const c = containers[idx];
      if (isExBond) return true;
      if (isLCL) return !c?.by_road_movement_date;
      return !c?.container_rail_out_date;
    },
    [containers, isExBond, isLCL]
  );

  // Click: open editor blank
  const startEditBlank = (field, index = null, guardDisabled = false) => {
    if (guardDisabled && index !== null && isArrivalDateDisabled(index)) return;
    setEditable(index !== null ? `${field}_${index}` : field);
    setTempDateValue(""); // open picker empty
    setDateError("");
  };

  // Double-click: clear immediately in DB, then open editor blank
  const clearAndEdit = async (field, index = null) => {
    setDateError("");
    const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
    const headers = {
      "Content-Type": "application/json",
      "user-id": user.username || "unknown",
      username: user.username || "unknown",
      "user-role": user.role || "unknown",
    };

    try {
      if (index !== null) {
        const updated = containers.map((c, i) => {
          if (i !== index) return c;
          const next = { ...c, [field]: "" };
          if (field === "arrival_date" && !isLCL) next.detention_from = "";
          return next;
        });
        setContainers(updated);
        const payload = {};
        payload[`container_nos.${index}.${field}`] = "";
        if (field === "arrival_date" && !isLCL) {
          payload[`container_nos.${index}.detention_from`] = "";
        }



        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
          payload,
          { headers }
        );
        const serverJob = res?.data?.data || res?.data?.job || null;
        if (typeof onRowDataUpdate === "function")
          onRowDataUpdate(_id, serverJob ? serverJob : payload);

        setEditable(`${field}_${index}`);
        setTempDateValue("");
      } else {
        setDates((d) => ({ ...d, [field]: null }));
        const payload = { [field]: "" };
        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
          payload,
          { headers }
        );
        const serverJob = res?.data?.data || res?.data?.job || null;
        if (typeof onRowDataUpdate === "function")
          onRowDataUpdate(_id, serverJob ? serverJob : payload);
        setEditable(field);
        setTempDateValue("");
      }
    } catch (e) {
      console.error("Clear failed:", e);
    }
  };

  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };

  // Free time (unchanged except optimizations you had)
  const handleFreeTimeChange = (value) => {
    if (isLCL) return;
    if (parseInt(value, 10) === parseInt(localFreeTime, 10)) return;

    setLocalFreeTime(value);

    const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
    const headers = {
      "Content-Type": "application/json",
      "user-id": user.username || "unknown",
      username: user.username || "unknown",
      "user-role": user.role || "unknown",
    };

    (async () => {
      try {
        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
          { free_time: value },
          { headers }
        );
        if (typeof onRowDataUpdate === "function")
          onRowDataUpdate(_id, { free_time: value });

        const updated = containers.map((c) => {
          if (!c.arrival_date) return c;
          const detention = addDaysToDate(c.arrival_date, value);
          return detention ? { ...c, detention_from: detention } : c;
        });
        if (JSON.stringify(updated) === JSON.stringify(containers)) return;

        setContainers(updated);

        const payload = {};
        updated.forEach((c, i) => {
          if (c.detention_from !== containers[i]?.detention_from) {
            payload[`container_nos.${i}.detention_from`] =
              c.detention_from || null;
          }
        });

        const earliest = getEarliestDetention(updated);
        const validity = adjustValidityDate(earliest);
        if (validity) payload.do_validity_upto_job_level = validity;

        if (Object.keys(payload).length > 0) {
          const res2 = await axios.patch(
            `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
            payload,
            { headers }
          );
          const serverJob2 = res2?.data?.data || res2?.data?.job || null;
          if (typeof onRowDataUpdate === "function")
            onRowDataUpdate(_id, serverJob2 ? serverJob2 : payload);
        }
      } catch (e) {
        console.error("Free time update failed:", e);
      }
    })();
  };

  const handleDateSubmit = async (field, index = null) => {
    if (!validateDateFlexible(tempDateValue)) {
      setDateError(
        "Please enter a valid date (YYYY-MM-DD or YYYY-MM-DDTHH:mm)"
      );
      return;
    }

    const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
    const headers = {
      "Content-Type": "application/json",
      "user-id": user.username || "unknown",
      username: user.username || "unknown",
      "user-role": user.role || "unknown",
    };

    try {
      if (index !== null) {
        const updated = containers.map((c, i) => {
          if (i !== index) return c;
          const val =
            tempDateValue === "" ? null : normalizeDateForSave(tempDateValue);
          const next = { ...c, [field]: val };
          if (field === "arrival_date" && !isLCL) {
            next.detention_from = val
              ? addDaysToDate(val, localFreeTime || 0)
              : "";
          }
          return next;
        });
        setContainers(updated);

        const fieldPath = `container_nos.${index}.${field}`;
        const valForSave =
          tempDateValue === "" ? "" : normalizeDateForSave(tempDateValue);
        const payload = buildFieldPayload(fieldPath, valForSave);
        if (field === "arrival_date" && !isLCL) {
          payload[`container_nos.${index}.detention_from`] =
            updated[index].detention_from || null;
          const earliest = getEarliestDetention(updated);
          const validity = adjustValidityDate(earliest);
          if (validity) payload.do_validity_upto_job_level = validity;
        }

        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
          payload,
          { headers }
        );
        const serverJob = res?.data?.data || res?.data?.job || null;
        if (typeof onRowDataUpdate === "function")
          onRowDataUpdate(_id, serverJob ? serverJob : payload);
      } else {
        const val =
          tempDateValue === "" ? "" : normalizeDateForSave(tempDateValue);
        setDates((d) => ({ ...d, [field]: val }));
        const payload = buildFieldPayload(field, val);
        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
          payload,
          { headers }
        );
        const serverJob = res?.data?.data || res?.data?.job || null;
        if (typeof onRowDataUpdate === "function")
          onRowDataUpdate(_id, serverJob ? serverJob : payload);
      }
      setEditable(null);
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  const isIgstFieldsAvailable = Boolean(assessable_ammount && igst_ammount);

  // -------------- UI --------------
  const renderRowDateEditor = (label, value, fieldKey) => (
    <div>
      <strong>{label}:</strong> {formatDateDisplay(value)}{" "}
      <FcCalendar
        style={styles.icon}
        onClick={() => startEditBlank(fieldKey)}
        onDoubleClick={() => clearAndEdit(fieldKey)}
        title="Click: edit • Double-click: clear"
      />
      {editable === fieldKey && (
        <div>
          <input
            type="datetime-local"
            value={toInputDateTime(tempDateValue)}
            onChange={(e) => {
              setTempDateValue(e.target.value);
              setDateError("");
            }}
            style={dateError ? styles.errorInput : {}}
            autoFocus
          />
          <button
            style={styles.submitButton}
            onClick={() => handleDateSubmit(fieldKey)}
          >
            ✓
          </button>
          <button style={styles.cancelButton} onClick={() => setEditable(null)}>
            ✕
          </button>
          {dateError && <div style={styles.errorText}>{dateError}</div>}
        </div>
      )}
    </div>
  );

  const renderContainerEditor = (
    label,
    cValue,
    fieldKey,
    idx,
    guardDisabled = false
  ) => (
    <div>
      <strong>{label}:</strong> {formatDateDisplay(cValue)}{" "}
      <FcCalendar
        style={{
          ...styles.icon,
          ...(guardDisabled && isArrivalDateDisabled(idx)
            ? { opacity: 0.4, filter: "grayscale(100%)", cursor: "not-allowed" }
            : {}),
        }}
        onClick={() =>
          (!guardDisabled || !isArrivalDateDisabled(idx)) &&
          startEditBlank(fieldKey, idx, guardDisabled)
        }
        onDoubleClick={() =>
          (!guardDisabled || !isArrivalDateDisabled(idx)) &&
          clearAndEdit(fieldKey, idx)
        }
        title={
          guardDisabled && isArrivalDateDisabled(idx)
            ? "Disabled"
            : "Click: edit • Double-click: clear"
        }
      />
      {editable === `${fieldKey}_${idx}` && (
        <div>
          <input
            type="datetime-local"
            value={toInputDateTime(tempDateValue)}
            onChange={(e) => {
              setTempDateValue(e.target.value);
              setDateError("");
            }}
            style={dateError ? styles.errorInput : {}}
            autoFocus
          />
          <button
            style={styles.submitButton}
            onClick={() => handleDateSubmit(fieldKey, idx)}
          >
            ✓
          </button>
          <button style={styles.cancelButton} onClick={() => setEditable(null)}>
            ✕
          </button>
          {dateError && <div style={styles.errorText}>{dateError}</div>}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* Left */}
      <div>
        {!isExBond && (
          <>
            {renderRowDateEditor(
              "ETA",
              dates.vessel_berthing,
              "vessel_berthing"
            )}
            <br />
            {renderRowDateEditor(
              "GIGM",
              dates.gateway_igm_date,
              "gateway_igm_date"
            )}
            <br />
            {renderRowDateEditor(
              "Discharge",
              dates.discharge_date,
              "discharge_date"
            )}
            <br />

            {!isExBond &&
              !isLCL &&
              containers.map((c, i) =>
                renderContainerEditor(
                  "Rail-out",
                  c.container_rail_out_date,
                  "container_rail_out_date",
                  i
                )
              )}

            {isLCL &&
              containers.map((c, i) =>
                renderContainerEditor(
                  "ByRoad",
                  c.by_road_movement_date,
                  "by_road_movement_date",
                  i
                )
              )}
            <br />

            {!isExBond &&
              containers.map((c, i) =>
                renderContainerEditor(
                  "Arrival",
                  c.arrival_date,
                  "arrival_date",
                  i,
                  true
                )
              )}

            <br />
            {!isLCL && (
              <div style={{ marginBottom: 10 }}>
                <strong>Free time:</strong>{" "}
                <TextField
                  select
                  size="small"
                  variant="outlined"
                  value={localFreeTime || 0}
                  onChange={(e) => handleFreeTimeChange(e.target.value)}
                  sx={{ width: 90, ml: 1 }}
                >
                  {options.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            )}

            <br />
            {!isLCL && !isExBond && (
              <>
                <strong>Detention F.:</strong>
                {containers.map((c, i) => (
                  <div key={`det-${i}`}>
                    {formatDateDisplay(c.detention_from)}
                  </div>
                ))}
              </>
            )}
            <br />
          </>
        )}
      </div>

      {/* Right */}
      <div>
        {renderRowDateEditor(
          "Assessment Date",
          dates.assessment_date,
          "assessment_date"
        )}
        <br />
        {renderRowDateEditor("PCV", dates.pcv_date, "pcv_date")}
        <br />

        {payment_method !== "Deferred" && !InBondflag && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>
              <strong>Duty Paid:</strong>{" "}
              {formatDateDisplay(dates.duty_paid_date)}
            </span>
            <FcCalendar
              style={styles.icon}
              onClick={() => startEditBlank("duty_paid_date")}
              onDoubleClick={() => clearAndEdit("duty_paid_date")}
              title="Click: edit • Double-click: clear"
            />
            <AddIcon
              fontSize="small"
              style={{ cursor: "pointer" }}
              onClick={() => setIgstModalOpen(true)}
              title="Add Duty Details"
            />
          </div>
        )}
        {editable === "duty_paid_date" && (
          <div>
            <input
              type="datetime-local"
              value={toInputDateTime(tempDateValue)}
              onChange={(e) => {
                setTempDateValue(e.target.value);
                setDateError("");
              }}
              style={dateError ? styles.errorInput : {}}
              disabled={!isIgstFieldsAvailable}
              autoFocus
            />
            <button
              style={styles.submitButton}
              onClick={() => handleDateSubmit("duty_paid_date")}
              disabled={!isIgstFieldsAvailable}
            >
              ✓
            </button>
            <button
              style={styles.cancelButton}
              onClick={() => setEditable(null)}
            >
              ✕
            </button>
            {!isIgstFieldsAvailable && (
              <div style={styles.errorText}>
                Please add IGST and Assessable Amount
              </div>
            )}
            {dateError && <div style={styles.errorText}>{dateError}</div>}
          </div>
        )}
        <br />
        {renderRowDateEditor("OOC", dates.out_of_charge, "out_of_charge")}
        <br />

        {isFactory ? (
          <>
            {/* Delivery then EmptyOff */}
            <>
              <br />
              {containers.map((c, i) =>
                renderContainerEditor(
                  "Delivery",
                  c.delivery_date,
                  "delivery_date",
                  i
                )
              )}
            </>

            <br />


            {!isLCL &&
              !isExBond &&
              containers.map((c, i) =>
                renderContainerEditor(
                  "EmptyOff",
                  c.emptyContainerOffLoadDate,
                  "emptyContainerOffLoadDate",
                  i
                )
              )}
          </>
        ) : (
          <>
            {!isLCL &&
              !isExBond &&
              containers.map((c, i) =>
                renderContainerEditor(
                  "Destuffing Date / EmptyOff",
                  c.emptyContainerOffLoadDate,
                  "emptyContainerOffLoadDate",
                  i
                )
              )}
            {!InBondflag && (
              <>
                <br />
                {containers.map((c, i) =>
                  renderContainerEditor(
                    "Delivery",
                    c.delivery_date,
                    "delivery_date",
                    i
                  )
                )}
              </>
            )}
          </>
        )}
        <br />
      </div>

      <IgstModal
        open={igstModalOpen}
        onClose={() => setIgstModalOpen(false)}
        onSubmit={async (updateData) => {
          try {
            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const headers = {
              "Content-Type": "application/json",
              "user-id": user.username || "unknown",
              username: user.username || "unknown",
              "user-role": user.role || "unknown",
            };
            const res = await axios.patch(
              `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
              updateData,
              { headers }
            );
            const serverJob = res?.data?.data || res?.data?.job || null;
            if (typeof onRowDataUpdate === "function") {
              onRowDataUpdate(_id, serverJob ? serverJob : updateData);
            }
            setIgstModalOpen(false);
          } catch (e) {
            console.error("IGST submit failed:", e);
          }
        }}
        rowData={rowData}
        dates={dates}
        containers={containers}
      />
    </div>
  );
});

const styles = {
  icon: { cursor: "pointer", marginLeft: 5, fontSize: 18, color: "#282828" },
  errorInput: { border: "1px solid red" },
  errorText: { color: "red", fontSize: 12, marginTop: 2 },
  submitButton: {
    marginLeft: 5,
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: 3,
    padding: "2px 6px",
    cursor: "pointer",
  },
  cancelButton: {
    marginLeft: 5,
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: 3,
    padding: "2px 6px",
    cursor: "pointer",
  },
};

export default EditableDateCell;

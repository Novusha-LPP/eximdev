import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import axios from "axios";
import { TextField, MenuItem } from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";

import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import IgstModal from "./IgstModal";
import { BranchContext } from "../../contexts/BranchContext";
import { isAirMode } from "../../utils/modeLogic";

// Outline calendar (same props the old coloured icon took)
const FcCalendar = ({ title, style, ...rest }) => (
  <CalendarMonthOutlinedIcon titleAccess={title} style={{ ...style, fontSize: style?.fontSize || 18, color: "#64748b" }} {...rest} />
);


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
  const s = String(dateString).trim();
  const matchYMD = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (matchYMD) return `${matchYMD[1]}-${matchYMD[2]}-${matchYMD[3]}`;
  const matchDMY = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (matchDMY) return `${matchDMY[3]}-${matchDMY[2]}-${matchDMY[1]}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDaysToDate = (dateString, days) => {
  const base = getDateOnly(dateString);
  const free = parseInt(days, 10);
  if (!base || isNaN(free) || free <= 0) return null;
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt.getTime())) return null;
  dt.setUTCDate(dt.getUTCDate() + free);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

// ---------- Component ----------
// compact: tighter spacing between dates (used by the Import DSR job list to fit more jobs on screen)
// showDoPlanningDate: read-only DO Planning date under OOC (only where the list loads that field)
const EditableDateCell = memo(({ cell, onRowDataUpdate, compact = false, showDoPlanningDate = false }) => {
  const rowData = cell.row.original || {};
  const {
    _id,
    payment_method,
    assessment_date,
    free_time,
    vessel_berthing,
    branch_code,
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
    mode,
    igm_date,
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
      igm_date,
    }),
    [
      assessment_date,
      vessel_berthing,
      gateway_igm_date,
      discharge_date,
      pcv_date,
      out_of_charge,
      duty_paid_date,
      igm_date,
    ]
  );

  const [dates, setDates] = useState(initialDates);
  const [localStatus, setLocalStatus] = useState(detailed_status);
  const [containers, setContainers] = useState(() => [...container_nos]);
  const [editable, setEditable] = useState(null);
  const { branches } = React.useContext(BranchContext);
  const activeBranchConfig = useMemo(() => {
    return branches.find(b => b.branch_code === branch_code)?.configuration || {
      railout_enabled: true,
      gateway_igm_enabled: true,
      gateway_igm_date_enabled: true,
    };
  }, [branches, branch_code]);
  const [localFreeTime, setLocalFreeTime] = useState(free_time);
  const [tempDateValue, setTempDateValue] = useState("");
  const [dateError, setDateError] = useState("");
  const [igstModalOpen, setIgstModalOpen] = useState(false);
  // job cards: with many containers only the first few dates show until "Show more" is used
  const [showAllContainers, setShowAllContainers] = useState(false);
  const CONTAINER_PREVIEW = 4;
  const hideRest = compact && !showAllContainers && containers.length > CONTAINER_PREVIEW;

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
    return `${_id}|${assessment_date || ""}|${vessel_berthing || ""}|${gateway_igm_date || ""}|${igm_date || ""
      }|${discharge_date || ""}|${pcv_date || ""}|${out_of_charge || ""}|${duty_paid_date || ""
      }|${detailed_status || ""}|${free_time || ""}|${cKey}`;
  }, [
    _id,
    assessment_date,
    vessel_berthing,
    gateway_igm_date,
    igm_date,
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
      if (isAirMode(mode)) return false; // AIR: arrival always enabled
      if (isLCL) return !c?.by_road_movement_date;
      return !c?.container_rail_out_date;
    },
    [containers, isExBond, isLCL, mode]
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

  // Free time (syncs server-calculated container detention to row)
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
        const res = await axios.patch(
          `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
          { free_time: value },
          { headers }
        );
        const serverJob = res?.data?.data || res?.data?.job || null;
        if (serverJob?.container_nos) {
          setContainers(serverJob.container_nos);
        }
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, serverJob ? serverJob : { free_time: value });
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
            const effectiveFree = parseInt(localFreeTime ?? free_time ?? 0, 10) || 0;
            next.detention_from = (val && effectiveFree > 0)
              ? addDaysToDate(val, effectiveFree)
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
  // Job list cards (compact): each date is a tile and a bar counts how many of the shown dates are set
  let tileTotal = 0;
  let tileFilled = 0;
  const countTile = (value) => {
    tileTotal += 1;
    const has = Boolean(value) && formatDateDisplay(value) !== "N/A";
    if (has) tileFilled += 1;
    return has;
  };
  const tileClass = (has) => (compact ? `ms-tile${has ? " ms-tile--done" : ""}` : undefined);
  // Free time + detention under the dates: one tidy line on the job cards, the old stacked lines elsewhere
  const showFreeTime = !isLCL && !isAirMode(mode);
  const showDetention = !isLCL && !isExBond && !isAirMode(mode);
  const freeTimeSelect = (sx) => (
    <TextField
      select
      size="small"
      variant="outlined"
      value={localFreeTime || 0}
      onChange={(e) => handleFreeTimeChange(e.target.value)}
      sx={sx}
    >
      {options.map((n) => (
        <MenuItem key={n} value={n}>
          {n}
        </MenuItem>
      ))}
    </TextField>
  );
  // Detention already running and the container not yet emptied: shown in red on the cards
  const isDetentionLate = (c) =>
    Boolean(c.detention_from) && !c.emptyContainerOffLoadDate && new Date(c.detention_from) <= new Date();

  // Same wording as the old list: "ETA:", "Assessment Date:" ... (the colon is dropped on the cards, where the label sits on its own)
  const tileLabel = (label) => (compact ? label : `${label}:`);

  const renderRowDateEditor = (label, value, fieldKey) => (
    <div className={tileClass(countTile(value))} title={compact ? label : undefined}>
      <strong>{tileLabel(label)}</strong> {formatDateDisplay(value)}{" "}
      <FcCalendar
        style={styles.icon}
        onClick={() => startEditBlank(fieldKey)}
        onDoubleClick={() => clearAndEdit(fieldKey)}
        title="Click: edit • Double-click: clear"
      />
      {editable === fieldKey && (
        <div className={compact ? "ms-editor" : undefined}>
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
    <div className={tileClass(countTile(cValue))} title={compact ? label : undefined}>
      <strong>{tileLabel(label)}</strong> {formatDateDisplay(cValue)}{" "}
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
        <div className={compact ? "ms-editor" : undefined}>
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


  // A date that exists once per container (Rail-out, Arrival, Delivery, Empty-off): on the job cards it is
  // ONE box holding every container's value (tagged #1, #2, ...); elsewhere it stays one line per container
  const renderContainerGroup = (label, fieldKey, guardDisabled = false) => {
    if (!compact) {
      return containers.map((c, i) => (
        <React.Fragment key={`${fieldKey}-${i}`}>
          {renderContainerEditor(label, c[fieldKey], fieldKey, i, guardDisabled)}
        </React.Fragment>
      ));
    }
    if (!containers.length) return null;
    const hasValue = (c) => Boolean(c[fieldKey]) && formatDateDisplay(c[fieldKey]) !== "N/A";
    const setCount = containers.filter(hasValue).length;
    tileTotal += 1;
    if (setCount === containers.length) tileFilled += 1;
    const state = setCount === containers.length ? " ms-tile--done" : setCount > 0 ? " ms-tile--partial" : "";
    const multi = containers.length > 1;
    return (
      <div className={`ms-tile ms-tile--multi${state}`} title={label}>
        <strong>{tileLabel(label)}</strong>
        <div className="ms-vals">
          {containers.map((c, idx) => {
            if (hideRest && idx >= CONTAINER_PREVIEW) return null;
            const locked = guardDisabled && isArrivalDateDisabled(idx);
            return (
              <div key={idx} className="ms-val">
                {multi && (
                  <span className="ms-cn" title={c.container_number || `Container ${idx + 1}`}>
                    #{idx + 1}
                  </span>
                )}
                <span className={`ms-vd${hasValue(c) ? "" : " ms-na"}`}>{formatDateDisplay(c[fieldKey])}</span>
                <FcCalendar
                  style={{
                    ...styles.icon,
                    ...(locked ? { opacity: 0.4, filter: "grayscale(100%)", cursor: "not-allowed" } : {}),
                  }}
                  onClick={() => !locked && startEditBlank(fieldKey, idx, guardDisabled)}
                  onDoubleClick={() => !locked && clearAndEdit(fieldKey, idx)}
                  title={locked ? "Disabled" : "Click: edit • Double-click: clear"}
                />
                {editable === `${fieldKey}_${idx}` && (
                  <div className="ms-editor">
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
                    <button style={styles.submitButton} onClick={() => handleDateSubmit(fieldKey, idx)}>
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
          })}
        </div>
      </div>
    );
  };

  // Default layout separates dates with blank lines; compact stacks them with a small gap
  const lineBreak = compact ? null : <br />;
  const columnStyle = compact ? { display: "flex", flexDirection: "column", gap: 12 } : undefined;

  const content = (
    <div className={compact ? "ms-root" : undefined} style={compact ? undefined : { display: "flex", gap: 20 }}>
      {/* Left */}
      <div className={compact ? "ms-col" : undefined} style={compact ? undefined : columnStyle}>
        {!isExBond && (
          <>
            {renderRowDateEditor(
              "ETA",
              dates.vessel_berthing,
              "vessel_berthing"
            )}
            {lineBreak}
            {activeBranchConfig.gateway_igm_date_enabled && (
              <>
                {renderRowDateEditor(
                  "GIGM",
                  dates.gateway_igm_date,
                  "gateway_igm_date"
                )}
                {lineBreak}
              </>
            )}
            {!activeBranchConfig.gateway_igm_date_enabled && (
              <>
                {renderRowDateEditor(
                  "IGM Date",
                  dates.igm_date,
                  "igm_date"
                )}
                {lineBreak}
              </>
            )}
            {renderRowDateEditor(
              "Discharge",
              dates.discharge_date,
              "discharge_date"
            )}
            {lineBreak}

            {!isExBond &&
              !isLCL &&
              !isAirMode(mode) &&
              activeBranchConfig.railout_enabled && (
                <div className={compact ? "ms-group" : undefined}>
                  {renderContainerGroup("Rail-out", "container_rail_out_date")}
                </div>
              )}

            {isLCL &&
              !isAirMode(mode) &&
              renderContainerGroup("ByRoad", "by_road_movement_date")}
            {lineBreak}

            {!isExBond && (
              <div className={compact ? "ms-group" : undefined}>
                {renderContainerGroup("Arrival", "arrival_date", true)}
              </div>
            )}

            {compact ? (
              (showFreeTime || showDetention) && (
                <div className="ms-foot">
                  {showFreeTime && (
                    <div className="ms-free">
                      <span className="ms-foot-k">Free time</span>
                      {freeTimeSelect({ width: 82 })}
                      <span className="ms-foot-u">days</span>
                    </div>
                  )}
                  {showDetention && (
                    <div className="ms-detention">
                      <span className="ms-foot-k">Detention from</span>
                      {containers.map((c, i) => (hideRest && i >= CONTAINER_PREVIEW ? null : (
                        <span key={`det-${i}`} className="ms-det-val">
                          {containers.length > 1 && (
                            <span className="ms-cn" title={c.container_number || `Container ${i + 1}`}>
                              #{i + 1}
                            </span>
                          )}
                          <b className={isDetentionLate(c) ? "ms-late" : undefined}>
                            {formatDateDisplay(c.detention_from)}
                          </b>
                        </span>
                      )))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <>
                {lineBreak}
                {showFreeTime && (
                  <div style={{ marginBottom: 10 }}>
                    <strong>Free time:</strong> {freeTimeSelect({ width: 90, ml: 1 })}
                  </div>
                )}

                {lineBreak}
                {showDetention && (
                  <>
                    <div>
                      <strong>Detention F.:</strong>
                      {containers.map((c, i) => (
                        <div key={`det-${i}`}>{formatDateDisplay(c.detention_from)}</div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            {lineBreak}
          </>
        )}
      </div>

      {/* Right */}
      <div className={compact ? "ms-col" : undefined} style={compact ? undefined : columnStyle}>
        {renderRowDateEditor(
          "Assessment Date",
          dates.assessment_date,
          "assessment_date"
        )}
        {lineBreak}
        {renderRowDateEditor("PCV", dates.pcv_date, "pcv_date")}
        {lineBreak}

        {payment_method !== "Deferred" && !InBondflag && (
          <div
            className={compact ? `${tileClass(countTile(dates.duty_paid_date))} ms-tile--duty` : undefined}
            style={compact ? undefined : { display: "flex", alignItems: "center", gap: 6 }}
          >
            <span className={compact ? "ms-duty-text" : undefined}>
              <strong>Duty Paid{compact ? "" : ":"}</strong>{" "}
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
          <div className={compact ? "ms-editor" : undefined}>
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
        {lineBreak}
        {renderRowDateEditor("OOC", dates.out_of_charge, "out_of_charge")}
        {lineBreak}
        {/* Shown after OOC by position only; set by ticking DO Planning on the job page */}
        {showDoPlanningDate && (
          <>
            <div className={tileClass(countTile(rowData.do_planning_date))}>
              <strong>DO Planning{compact ? "" : ":"}</strong> {formatDateDisplay(rowData.do_planning_date)}
            </div>
            {lineBreak}
          </>
        )}

        {isFactory ? (
          <>
            {/* Delivery then EmptyOff */}
            <>
              {lineBreak}
              <div className={compact ? "ms-group" : undefined}>
                {renderContainerGroup("Delivery", "delivery_date")}
              </div>
            </>

            {lineBreak}


            {!isLCL && !isExBond && !isAirMode(mode) && (
              <div className={compact ? "ms-group" : undefined}>
                {renderContainerGroup("EmptyOff", "emptyContainerOffLoadDate")}
              </div>
            )}
          </>
        ) : (
          <>
            {!isLCL && !isExBond && !isAirMode(mode) && (
              <div className={compact ? "ms-group" : undefined}>
                {renderContainerGroup("Destuffing Date / EmptyOff", "emptyContainerOffLoadDate")}
              </div>
            )}
            {!InBondflag && (
              <>
                {lineBreak}
                <div className={compact ? "ms-group" : undefined}>
                  {renderContainerGroup("Delivery", "delivery_date")}
                </div>
              </>
            )}
          </>
        )}
        {lineBreak}
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
        onAutosave={async (updateData) => {
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
          } catch (e) {
            console.error("IGST autosave failed:", e);
          }
        }}
        rowData={rowData}
        dates={dates}
        containers={containers}
      />
    </div>
  );

  if (!compact) return content;
  return (
    <div className="ms-wrap">
      <div className="ms-head">
        <span className="jc-k">Milestones</span>
        <div className="ms-bar" aria-hidden="true">
          {Array.from({ length: tileTotal }, (_, i) => (
            <i key={i} className={i < tileFilled ? "on" : ""} />
          ))}
        </div>
        <span className="ms-count">
          <b>{tileFilled}</b> of {tileTotal}
        </span>
      </div>
      {content}
      {containers.length > CONTAINER_PREVIEW && (
        <button
          type="button"
          className="ms-more"
          onClick={(e) => {
            e.stopPropagation();
            setShowAllContainers((prev) => !prev);
          }}
        >
          {showAllContainers ? "Show less" : `Show dates of ${containers.length - CONTAINER_PREVIEW} more containers`}
          <KeyboardArrowDownIcon className={`ms-more__chev${showAllContainers ? " is-open" : ""}`} fontSize="inherit" />
        </button>
      )}
    </div>
  );
});

const styles = {
  icon: { cursor: "pointer", marginLeft: 5, fontSize: 18, color: "#282828", verticalAlign: "middle" },
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

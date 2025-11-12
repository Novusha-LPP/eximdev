import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { FcCalendar } from "react-icons/fc";
import axios from "axios";
import {
  TextField,
  MenuItem,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import IgstModal from "./IgstModal";

// Safe date helpers
const safeToISOString = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date detected:', dateValue);
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.error('Error converting date:', dateValue, error);
    return null;
  }
};

const safeFormatDate = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date for formatting:', dateValue);
      return null;
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', dateValue, error);
    return null;
  }
};

// Helper functions for date-only detention calculation
const getDateOnly = (dateString) => {
  if (!dateString) return null;
  return dateString.split('T')[0];
};

const addDaysToDate = (dateString, days) => {
  if (!dateString) return null;
  
  const dateOnly = getDateOnly(dateString);
  if (!dateOnly) return null;
  
  const [year, month, day] = dateOnly.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;
  
  date.setDate(date.getDate() + days);
  
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  
  return `${newYear}-${newMonth}-${newDay}`;
};

const EditableDateCell = memo(({ cell, onRowDataUpdate }) => {
  const rowData = cell.row.original;
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
    container_nos = [],
    detailed_status,
    be_no,
    duty_paid_date,
    assessable_ammount,
    igst_ammount,
  } = rowData;

  const initialDates = useMemo(() => ({
    assessment_date,
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
    duty_paid_date,
  }), [assessment_date, vessel_berthing, gateway_igm_date, discharge_date, pcv_date, out_of_charge, duty_paid_date]);

  const [dates, setDates] = useState(initialDates);
  const [localStatus, setLocalStatus] = useState(detailed_status);
  const [containers, setContainers] = useState(() => [...container_nos]);
  const [editable, setEditable] = useState(null);
  const [localFreeTime, setLocalFreeTime] = useState(free_time);
  const [tempDateValue, setTempDateValue] = useState("");
  const [dateError, setDateError] = useState("");
  const [igstModalOpen, setIgstModalOpen] = useState(false);

  const options = useMemo(() => Array.from({ length: 41 }, (_, index) => index), []);

  // CRITICAL FIX: Sync with props only when the job changes
  useEffect(() => {
    if (cell?.row?.original && cell.row.original._id === _id) {
      const {
        assessment_date,
        vessel_berthing,
        gateway_igm_date,
        discharge_date,
        pcv_date,
        out_of_charge,
        duty_paid_date,
        container_nos = [],
        detailed_status,
        free_time,
      } = cell.row.original;

      setDates({
        assessment_date,
        vessel_berthing,
        gateway_igm_date,
        discharge_date,
        pcv_date,
        out_of_charge,
        duty_paid_date,
      });
      setContainers([...container_nos]);
      setLocalStatus(detailed_status);
      setLocalFreeTime(free_time);
      setEditable(null);
      setTempDateValue("");
      setDateError("");
    }
  }, [_id, cell.row.original]);

  const handleOpenIgstModal = useCallback(() => {
    setIgstModalOpen(true);
  }, []);

  const handleCloseIgstModal = useCallback(() => {
    setIgstModalOpen(false);
  }, []);

  const handleIgstSubmit = useCallback(async (updateData) => {
    try {
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        'Content-Type': 'application/json',
        'user-id': user.username || 'unknown',
        'username': user.username || 'unknown',
        'user-role': user.role || 'unknown'
      };

      const res = await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, updateData, { headers });
      const returnedJob = res?.data?.data || res?.data?.job || null;

      if (typeof onRowDataUpdate === "function") {
        if (returnedJob) {
          onRowDataUpdate(_id, returnedJob);
          setLocalStatus(returnedJob.detailed_status);
          setContainers(returnedJob.container_nos || []);
        } else {
          onRowDataUpdate(_id, updateData);
        }
      }

      setIgstModalOpen(false);
    } catch (error) {
      console.error("Error submitting IGST data:", error);
    }
  }, [_id, onRowDataUpdate]);

  const updateDetailedStatus = useCallback(async () => {
    const eta = dates.vessel_berthing;
    const gatewayIGMDate = dates.gateway_igm_date;
    const dischargeDate = dates.discharge_date;
    const outOfChargeDate = dates.out_of_charge;
    const pcvDate = dates.pcv_date;
    const billOfEntryNo = be_no;
    const anyContainerArrivalDate = containers.some((c) => c.arrival_date);
    const containerRailOutDate = containers?.length > 0 &&
      containers.every((container) => container.container_rail_out_date);
    const emptyContainerOffLoadDate = containers?.length > 0 &&
      containers.every((container) => container.emptyContainerOffLoadDate);
    const deliveryDate = containers?.length > 0 &&
      containers.every((container) => container.delivery_date);
    const isExBondOrLCL = type_of_b_e === "Ex-Bond" || consignment_type === "LCL";

    let newStatus = "";

    if (billOfEntryNo && anyContainerArrivalDate && outOfChargeDate &&
        (isExBondOrLCL ? deliveryDate : emptyContainerOffLoadDate)) {
      newStatus = "Billing Pending";
    } else if (billOfEntryNo && anyContainerArrivalDate && outOfChargeDate) {
      newStatus = "Custom Clearance Completed";
    } else if (billOfEntryNo && anyContainerArrivalDate && pcvDate) {
      newStatus = "PCV Done, Duty Payment Pending";
    } else if (billOfEntryNo && anyContainerArrivalDate) {
      newStatus = "BE Noted, Clearance Pending";
    } else if (billOfEntryNo) {
      newStatus = "BE Noted, Arrival Pending";
    } else if (!billOfEntryNo && anyContainerArrivalDate) {
      newStatus = "Arrived, BE Note Pending";
    } else if (containerRailOutDate) {
      newStatus = "Rail Out";
    } else if (dischargeDate) {
      newStatus = "Discharged";
    } else if (gatewayIGMDate) {
      newStatus = "Gateway IGM Filed";
    } else if (!eta || eta === "Invalid Date") {
      newStatus = "ETA Date Pending";
    } else if (eta) {
      newStatus = "Estimated Time of Arrival";
    }

    try {
      if (newStatus && newStatus !== localStatus) {
        cell.row.original.detailed_status = newStatus;
        setLocalStatus(newStatus);
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, { detailed_status: newStatus });
        }
      }
    } catch (err) {
      console.error("Error updating local status:", err);
    }
  }, [dates, containers, be_no, consignment_type, type_of_b_e, localStatus, _id, onRowDataUpdate, cell]);

  const formatDate = (date) => safeFormatDate(date);

  const adjustValidityDate = (earliestDateString) => {
    if (!earliestDateString) return "";
    const date = new Date(earliestDateString);
    if (isNaN(date.getTime())) return "";
    
    const oneDayBefore = new Date(date);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    const diffDays = (date - oneDayBefore) / (1000 * 60 * 60 * 24);
    const formatted = formatDate(oneDayBefore);
    return diffDays > 0 && formatted ? formatted : earliestDateString;
  };

  const getEarliestDetention = (containersArr) => {
    const validDetentionDates = (containersArr || [])
      .map((c) => c?.detention_from)
      .filter(Boolean)
      .sort();
    return validDetentionDates[0];
  };

  const buildContainerUpdatePayload = (updatedContainers, oldContainers) => {
    const updateData = {};
    (updatedContainers || []).forEach((c, idx) => {
      const old = (oldContainers || [])[idx] || {};
      try {
        if (JSON.stringify(c) !== JSON.stringify(old)) {
          updateData[`container_nos.${idx}`] = c;
        }
      } catch (e) {
        updateData[`container_nos.${idx}`] = c;
      }
    });
    return updateData;
  };

  const isArrivalDateDisabled = useCallback((containerIndex) => {
    const container = containers[containerIndex];
    const ExBondflag = type_of_b_e === "Ex-Bond";
    const LCLFlag = consignment_type === "LCL";
    
    if (ExBondflag) return true;
    if (LCLFlag) return !container?.by_road_movement_date;
    return !container?.container_rail_out_date;
  }, [containers, type_of_b_e, consignment_type]);

  const handleEditStart = (field, index = null) => {
    if (field === "arrival_date" && index !== null && isArrivalDateDisabled(index)) {
      return;
    }
    
    let currentValue = "";
    if (index !== null) {
      currentValue = containers[index]?.[field] || "";
    } else {
      currentValue = dates[field] || "";
    }
    
    setEditable(index !== null ? `${field}_${index}` : field);
    setTempDateValue(currentValue);
    setDateError("");
  };

  const validateDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return true;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };

  // CRITICAL FIX: Removed problematic useEffect that was causing infinite loops
  // This was the main culprit - useEffect that auto-updated containers on every change

  // CRITICAL FIX: Free time change handler with proper guard clause
  const handleFreeTimeChange = (value) => {
    if (consignment_type === "LCL") return;

    // GUARD CLAUSE: Only proceed if value actually changed
    if (parseInt(value, 10) === parseInt(localFreeTime, 10)) return;

    setLocalFreeTime(value);
    
    const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
    const headers = {
      'Content-Type': 'application/json',
      'user-id': user.username || 'unknown',
      'username': user.username || 'unknown',
      'user-role': user.role || 'unknown'
    };

    (async () => {
      try {
        // Update free_time in backend
        const res = await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          free_time: value,
        }, { headers });

        const returnedJob = res?.data?.data || res?.data?.job || null;

        if (typeof onRowDataUpdate === "function") {
          if (returnedJob) {
            onRowDataUpdate(_id, returnedJob);
            setLocalStatus(returnedJob.detailed_status);
            setContainers(returnedJob.container_nos || []);
          } else {
            onRowDataUpdate(_id, { free_time: value });
          }
        }

        // Only update detention dates if we have containers with arrival dates
        const containersWithArrival = containers.filter(c => c.arrival_date);
        if (containersWithArrival.length === 0) return;

        const updatedContainers = containers.map((container) => {
          if (container.arrival_date) {
            const freeDays = parseInt(value, 10) || 0;
            const detentionDate = addDaysToDate(container.arrival_date, freeDays);
            
            if (detentionDate) {
              return { ...container, detention_from: detentionDate };
            }
          }
          return container;
        });

        // Check if any containers actually changed
        const hasChanges = JSON.stringify(updatedContainers) !== JSON.stringify(containers);
        if (!hasChanges) return;

        // Update local state immediately
        setContainers(updatedContainers);

        const earliestDetention = getEarliestDetention(updatedContainers);
        const adjustedValidity = adjustValidityDate(earliestDetention);

        // Build and send update payload
        const payload = buildContainerUpdatePayload(updatedContainers, containers);
        if (adjustedValidity) payload.do_validity_upto_job_level = adjustedValidity;

        if (Object.keys(payload).length > 0) {
          const res2 = await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, payload, { headers });
          const returnedJob2 = res2?.data?.data || res2?.data?.job || null;
          
          if (typeof onRowDataUpdate === "function" && returnedJob2) {
            onRowDataUpdate(_id, returnedJob2);
          }
        }

      } catch (err) {
        console.error("Error Updating Free Time:", err);
      }
    })();
  };

  const handleDateSubmit = async (field, index = null) => {
    let finalValue;
    
    if (tempDateValue === "") {
      finalValue = "";
    } else if (!validateDate(tempDateValue)) {
      setDateError("Please enter a valid date");
      return;
    } else {
      finalValue = tempDateValue;
    }

    if (index !== null) {
      const oldContainers = [...containers];

      const updatedContainers = containers.map((container, i) => {
        if (i === index) {
          const updatedContainer = { ...container, [field]: finalValue || null };

          // Calculate detention_from immediately when arrival_date changes
          if (field === "arrival_date" && consignment_type !== "LCL") {
            if (!finalValue) {
              updatedContainer.detention_from = "";
            } else {
              const freeDays = parseInt(localFreeTime, 10) || 0;
              const detentionDate = addDaysToDate(finalValue, freeDays);
              if (detentionDate) {
                updatedContainer.detention_from = detentionDate;
              }
            }
          }
          return updatedContainer;
        }
        return container;
      });

      // Update local state immediately
      setContainers(updatedContainers);

      try {
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          'Content-Type': 'application/json',
          'user-id': user.username || 'unknown',
          'username': user.username || 'unknown',
          'user-role': user.role || 'unknown'
        };

        const earliestDetention = getEarliestDetention(updatedContainers);
        const adjustedValidity = adjustValidityDate(earliestDetention);

        const payload = buildContainerUpdatePayload(updatedContainers, oldContainers);
        if (adjustedValidity) payload.do_validity_upto_job_level = adjustedValidity;

        // Update status
        await updateDetailedStatus();

        if (Object.keys(payload).length > 0 || adjustedValidity) {
          const finalPayload = Object.keys(payload).length > 0 ? payload : { do_validity_upto_job_level: adjustedValidity };
          const res = await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, finalPayload, { headers });
          const returnedJob = res?.data?.data || res?.data?.job || null;

          if (typeof onRowDataUpdate === "function") {
            if (returnedJob) {
              onRowDataUpdate(_id, returnedJob);
            } else {
              onRowDataUpdate(_id, finalPayload);
            }
          }
        }

        setEditable(null);
      } catch (err) {
        console.error("Error Updating Container:", err);
        setContainers(oldContainers);
      }
    } else {
      const oldDates = { ...dates };
      const newDates = { ...dates, [field]: finalValue || null };
      setDates(newDates);

      try {
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          'Content-Type': 'application/json',
          'user-id': user.username || 'unknown',
          'username': user.username || 'unknown',
          'user-role': user.role || 'unknown'
        };

        const res = await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          [field]: finalValue || null,
        }, { headers });

        const returnedJob = res?.data?.data || res?.data?.job || null;
        if (typeof onRowDataUpdate === "function") {
          if (returnedJob) {
            onRowDataUpdate(_id, returnedJob);
          } else {
            onRowDataUpdate(_id, { [field]: finalValue || null });
          }
        }

        setEditable(null);
      } catch (err) {
        console.error(`Error Updating ${field}:`, err);
        setDates(oldDates);
      }
    }
  };

  const isIgstFieldsAvailable = assessable_ammount && igst_ammount;

  const renderDateValue = (dateValue) => {
    if (!dateValue) return "N/A";
    const formatted = safeFormatDate(dateValue);
    return formatted || "N/A";
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Left Section */}
      <div>
        {type_of_b_e !== "Ex-Bond" && (
          <>
            <div>
              <strong>ETA:</strong> {renderDateValue(dates.vessel_berthing)}{" "}
              <FcCalendar style={styles.icon} onClick={() => handleEditStart("vessel_berthing")} />
              {editable === "vessel_berthing" && (
                <div>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : {}}
                    autoFocus
                  />
                  <button style={styles.submitButton} onClick={() => handleDateSubmit("vessel_berthing")}>✓</button>
                  <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
            </div>
            <br />
            <div>
              <strong>GIGM:</strong> {renderDateValue(dates.gateway_igm_date)}{" "}
              <FcCalendar style={styles.icon} onClick={() => handleEditStart("gateway_igm_date")} />
              {editable === "gateway_igm_date" && (
                <div>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : {}}
                    autoFocus
                  />
                  <button style={styles.submitButton} onClick={() => handleDateSubmit("gateway_igm_date")}>✓</button>
                  <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
            </div>
            <br />
            <div>
              <strong>Discharge:</strong> {renderDateValue(dates.discharge_date)}{" "}
              <FcCalendar style={styles.icon} onClick={() => handleEditStart("discharge_date")} />
              {editable === "discharge_date" && (
                <div>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : {}}
                    autoFocus
                  />
                  <button style={styles.submitButton} onClick={() => handleDateSubmit("discharge_date")}>✓</button>
                  <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
            </div>
            <br />
            
            {type_of_b_e !== "Ex-Bond" && consignment_type !== "LCL" && containers.map((container, id) => (
              <div key={id}>
                <div>
                  <strong>Rail-out:</strong> {renderDateValue(container.container_rail_out_date)}{" "}
                  <FcCalendar style={styles.icon} onClick={() => handleEditStart("container_rail_out_date", id)} />
                  {editable === `container_rail_out_date_${id}` && (
                    <div>
                      <input
                        type="datetime-local"
                        value={tempDateValue}
                        onChange={handleDateInputChange}
                        style={dateError ? styles.errorInput : {}}
                        autoFocus
                      />
                      <button style={styles.submitButton} onClick={() => handleDateSubmit("container_rail_out_date", id)}>✓</button>
                      <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
                      {dateError && <div style={styles.errorText}>{dateError}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {consignment_type === "LCL" && containers.map((container, id) => (
              <div key={id}>
                <div>
                  <strong>ByRoad:</strong> {renderDateValue(container.by_road_movement_date)}{" "}
                  <FcCalendar style={styles.icon} onClick={() => handleEditStart("by_road_movement_date", id)} />
                  {editable === `by_road_movement_date_${id}` && (
                    <div>
                      <input
                        type="datetime-local"
                        value={tempDateValue}
                        onChange={handleDateInputChange}
                        style={dateError ? styles.errorInput : {}}
                        autoFocus
                      />
                      <button style={styles.submitButton} onClick={() => handleDateSubmit("by_road_movement_date", id)}>✓</button>
                      <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
                      {dateError && <div style={styles.errorText}>{dateError}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <br />
            
            {type_of_b_e !== "Ex-Bond" && (
              <>
                {containers.map((container, id) => (
                  <div key={id}>
                    <div>
                      <strong>Arrival:</strong> {renderDateValue(container.arrival_date)}{" "}
                      <FcCalendar
                        style={{
                          ...styles.icon,
                          opacity: isArrivalDateDisabled(id) ? 0.4 : 1,
                          filter: isArrivalDateDisabled(id) ? "grayscale(100%)" : "none",
                          cursor: isArrivalDateDisabled(id) ? "not-allowed" : "pointer"
                        }}
                        onClick={() => !isArrivalDateDisabled(id) && handleEditStart("arrival_date", id)}
                        title={isArrivalDateDisabled(id) ? "Arrival date is disabled. Please set rail-out/by-road date first." : "Edit date"}
                      />
                      {editable === `arrival_date_${id}` && (
                        <div>
                          <input
                            type="datetime-local"
                            value={tempDateValue}
                            onChange={handleDateInputChange}
                            style={dateError ? styles.errorInput : {}}
                            autoFocus
                          />
                          <button style={styles.submitButton} onClick={() => handleDateSubmit("arrival_date", id)}>✓</button>
                          <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
                          {dateError && <div style={styles.errorText}>{dateError}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <br />

                {consignment_type !== "LCL" && (
                  <div style={{ marginBottom: "10px" }}>
                    <strong>Free time:</strong>{" "}
                    <div style={{ display: "inline-block", minWidth: "80px", marginLeft: "5px" }}>
                      <TextField
                        select
                        size="small"
                        variant="outlined"
                        value={localFreeTime || ""}
                        onChange={(e) => handleFreeTimeChange(e.target.value)}
                        style={{ minWidth: "80px" }}
                      >
                        {options.map((option, id) => (
                          <MenuItem key={id} value={option}>{option}</MenuItem>
                        ))}
                      </TextField>
                    </div>
                  </div>
                )}

                <br />
                {consignment_type !== "LCL" && type_of_b_e !== "Ex-Bond" && (
                  <>
                    <strong>Detention F.:</strong>
                    {containers.map((container, id) => (
                      <div key={id}>{renderDateValue(container.detention_from)}</div>
                    ))}
                  </>
                )}
                <br />
              </>
            )}
          </>
        )}
      </div>
      
      {/* Right Section */}
      <div>
        <div>
          <strong>Assessment Date:</strong> {renderDateValue(dates.assessment_date)}{" "}
          <FcCalendar style={styles.icon} onClick={() => handleEditStart("assessment_date")} />
          {editable === "assessment_date" && (
            <div>
              <input
                type="datetime-local"
                value={tempDateValue}
                onChange={handleDateInputChange}
                style={dateError ? styles.errorInput : {}}
                autoFocus
              />
              <button style={styles.submitButton} onClick={() => handleDateSubmit("assessment_date")}>✓</button>
              <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
              {dateError && <div style={styles.errorText}>{dateError}</div>}
            </div>
          )}
        </div>
        <br />
        <div>
          <strong>PCV:</strong> {renderDateValue(dates.pcv_date)}{" "}
          <FcCalendar style={styles.icon} onClick={() => handleEditStart("pcv_date")} />
          {editable === "pcv_date" && (
            <div>
              <input
                type="datetime-local"
                value={tempDateValue}
                onChange={handleDateInputChange}
                style={dateError ? styles.errorInput : {}}
                autoFocus
              />
              <button style={styles.submitButton} onClick={() => handleDateSubmit("pcv_date")}>✓</button>
              <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
              {dateError && <div style={styles.errorText}>{dateError}</div>}
            </div>
          )}
        </div>
        <br />
        
        {payment_method !== "Deferred" && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span><strong>Duty Paid:</strong> {renderDateValue(dates.duty_paid_date)} </span>
            <FcCalendar style={{ ...styles.icon, marginRight: "5px" }} onClick={() => handleEditStart("duty_paid_date")} />
            <AddIcon fontSize="small" style={{ cursor: "pointer" }} onClick={handleOpenIgstModal} title="Add Duty Details" />
          </div>
        )}
        {editable === "duty_paid_date" && (
          <div>
            <input
              type="datetime-local"
              value={tempDateValue}
              onChange={handleDateInputChange}
              style={dateError ? styles.errorInput : {}}
              disabled={!isIgstFieldsAvailable}
              autoFocus
            />
            <button style={styles.submitButton} onClick={() => handleDateSubmit("duty_paid_date")} disabled={!isIgstFieldsAvailable}>✓</button>
            <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
            {!isIgstFieldsAvailable && <div style={styles.errorText}>Please add IGST and Assessable Amount details</div>}
            {dateError && <div style={styles.errorText}>{dateError}</div>}
          </div>
        )}
        <br />
        <div>
          <strong>OOC:</strong> {renderDateValue(dates.out_of_charge)}{" "}
          <FcCalendar style={styles.icon} onClick={() => handleEditStart("out_of_charge")} />
          {editable === "out_of_charge" && (
            <div>
              <input
                type="datetime-local"
                value={tempDateValue}
                onChange={handleDateInputChange}
                style={dateError ? styles.errorInput : {}}
                autoFocus
              />
              <button style={styles.submitButton} onClick={() => handleDateSubmit("out_of_charge")}>✓</button>
              <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
              {dateError && <div style={styles.errorText}>{dateError}</div>}
            </div>
          )}
        </div>
        <br />
        {containers.map((container, id) => (
          <div key={id}>
            <div>
              <strong>Delivery:</strong> {renderDateValue(container.delivery_date)}{" "}
              <FcCalendar style={styles.icon} onClick={() => handleEditStart("delivery_date", id)} />
              {editable === `delivery_date_${id}` && (
                <div>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : {}}
                    autoFocus
                  />
                  <button style={styles.submitButton} onClick={() => handleDateSubmit("delivery_date", id)}>✓</button>
                  <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
            </div>
          </div>
        ))}

        <br />

        {consignment_type !== "LCL" && containers.map((container, id) => (
          <div key={id}>
            <div>
              <strong>EmptyOff:</strong> {renderDateValue(container.emptyContainerOffLoadDate)}{" "}
              <FcCalendar style={styles.icon} onClick={() => handleEditStart("emptyContainerOffLoadDate", id)} />
              {editable === `emptyContainerOffLoadDate_${id}` && (
                <div>
                  <input
                    type="datetime-local"
                    value={tempDateValue}
                    onChange={handleDateInputChange}
                    style={dateError ? styles.errorInput : {}}
                    autoFocus
                  />
                  <button style={styles.submitButton} onClick={() => handleDateSubmit("emptyContainerOffLoadDate", id)}>✓</button>
                  <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
                  {dateError && <div style={styles.errorText}>{dateError}</div>}
                </div>
              )}
            </div>
          </div>
        ))}

        <br />
      </div>

      <IgstModal
        open={igstModalOpen}
        onClose={handleCloseIgstModal}
        onSubmit={handleIgstSubmit}
        rowData={rowData}
        dates={dates}
        containers={containers}
      />
    </div>
  );
});

const styles = {
  icon: { cursor: "pointer", marginLeft: "5px", fontSize: "18px", color: "#282828" },
  errorInput: { border: "1px solid red" },
  errorText: { color: "red", fontSize: "12px", marginTop: "2px" },
  submitButton: { marginLeft: "5px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "3px", padding: "2px 6px", cursor: "pointer" },
  cancelButton: { marginLeft: "5px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px", padding: "2px 6px", cursor: "pointer" },
};

export default EditableDateCell;
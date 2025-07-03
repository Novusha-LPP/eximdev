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

const EditableDateCell = memo(({ cell, onRowDataUpdate }) => {
  const rowData = cell.row.original;
  const {
    _id,
    job_no,
    cth_no,
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
    igst_rate,
    job_net_weight,
    bcd_ammount,
    sws_ammount,
    penalty_ammount,
    fine_ammount,
  } = rowData;

  // Memoize initial dates to prevent unnecessary re-renders
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
  const [tempTimeValue, setTempTimeValue] = useState("");
  const [dateError, setDateError] = useState("");
  const [igstModalOpen, setIgstModalOpen] = useState(false);

  // Memoize free time options
  const options = useMemo(() => Array.from({ length: 25 }, (_, index) => index), []);

  // Memoized utility function to calculate number of days between two dates
  const calculateDaysBetween = useCallback((startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Reset data when row ID changes
  useEffect(() => {
    if (cell?.row?.original) {
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
      setTempTimeValue("");
      setDateError("");
    }
  }, [_id]);

  // Handle IGST modal open
  const handleOpenIgstModal = useCallback(() => {
    setIgstModalOpen(true);
  }, []);

  const handleCloseIgstModal = useCallback(() => {
    setIgstModalOpen(false);
  }, []);

  const handleIgstSubmit = useCallback(async (updateData) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, updateData);

      // Update the cell.row.original data to reflect the changes
      if (typeof onRowDataUpdate === "function") {
        onRowDataUpdate(_id, updateData);
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
    const containerRailOutDate =
      containers?.length > 0 &&
      containers.every((container) => container.container_rail_out_date);
    const emptyContainerOffLoadDate =
      containers?.length > 0 &&
      containers.every((container) => container.emptyContainerOffLoadDate);
    const deliveryDate =
      containers?.length > 0 &&
      containers.every((container) => container.delivery_date);
    const isExBondOrLCL =
      type_of_b_e === "Ex-Bond" || consignment_type === "LCL";

    let newStatus = "";

    if (
      billOfEntryNo &&
      anyContainerArrivalDate &&
      outOfChargeDate &&
      (isExBondOrLCL ? deliveryDate : emptyContainerOffLoadDate)
    ) {
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

    if (newStatus && newStatus !== localStatus) {
      cell.row.original.detailed_status = newStatus;

      try {
        await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          detailed_status: newStatus,
        });
        setLocalStatus(newStatus);        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, { detailed_status: newStatus });
        }
      } catch (err) {
        console.error("Error updating status:", err);
        cell.row.original.detailed_status = localStatus;
      }
    }
  }, [
    dates,
    containers,
    be_no,
    consignment_type,
    type_of_b_e,
    localStatus,
    _id,
  ]);

  useEffect(() => {
    updateDetailedStatus();
  }, [
    dates.vessel_berthing,
    dates.gateway_igm_date,
    dates.discharge_date,
    dates.out_of_charge,
    dates.assessment_date,
    containers,
    updateDetailedStatus,
  ]);

  // Handle date editing
  const handleEditStart = (field, index = null) => {
    setEditable(index !== null ? `${field}_${index}` : field);
    
    // Initialize tempDateValue with existing value
    let currentValue = "";
    if (index !== null) {
      // Container field
      const container = containers[index];
      currentValue = container?.[field] || "";
    } else {
      // Direct date field
      currentValue = dates[field] || "";
    }
    
    // For rail-out dates that might be date-only, convert to datetime format
    if (field === "container_rail_out_date" && currentValue && currentValue.length === 10) {
      currentValue = `${currentValue}T00:00`;
    }
    
    setTempDateValue(currentValue);
    setTempTimeValue("");
    setDateError("");
  };

  const validateDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return true;
    const date = new Date(dateString);
    return !isNaN(date.getTime()); // Only check if valid date
  };

  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };

  const handleCombinedDateTimeChange = (e) => {
    setTempDateValue(e.target.value);
  };

  // Add this to prevent unnecessary state resets
  useEffect(() => {
    // Only reset when job data actually changes
    if (cell.row.original._id !== _id) {
      // Your existing reset logic...
    }
  }, [cell.row.original]);  const handleDateSubmit = async (field, index = null) => {
    let finalValue;
    
    // Allow clearing dates
    if (tempDateValue === "") {
      finalValue = "";
    }
    // Validate non-empty dates
    else if (!validateDate(tempDateValue)) {
      setDateError("Please enter a valid date");
      return;
    } else {
      finalValue = tempDateValue;
    }

    // Special handling for by-road dates only (keep rail-out with datetime)
    if (field === "by_road_movement_date") {
      // Extract only date portion (YYYY-MM-DD)
      finalValue = tempDateValue.split("T")[0];
    }

    if (index !== null) {
      const oldContainers = [...containers];

      const updatedContainers = containers.map((container, i) => {
        if (i === index) {
          const updatedContainer = {
            ...container,
            [field]: finalValue || null,
          };

          // Auto-calculate detention date
          if (field === "arrival_date") {
            if (!finalValue) {
              updatedContainer.detention_from = "";
            } else {
              const arrival = new Date(finalValue);
              const freeDays = parseInt(localFreeTime) || 0;
              const detentionDate = new Date(arrival);
              detentionDate.setDate(detentionDate.getDate() + freeDays);
              updatedContainer.detention_from = detentionDate
                .toISOString()
                .split("T")[0];
            }
          }
          return updatedContainer;
        }
        return container;
      });

      // Optimistic update
      setContainers(updatedContainers);      try {
        await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          container_nos: updatedContainers,
        });
        
        // Update parent component data
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, { container_nos: updatedContainers });
        }
        
        setEditable(null);
        updateDetailedStatus();
      } catch (err) {
        console.error("Error Updating Container:", err);
        // Revert on error
        setContainers(oldContainers);
      }
    } else {
      const oldDates = { ...dates };
      const newDates = { ...dates, [field]: finalValue || null };

      // Optimistic update
      setDates(newDates);      try {
        await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          [field]: finalValue || null,
        });
        
        // Update parent component data
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, { [field]: finalValue || null });
        }
        
        setEditable(null);
        updateDetailedStatus();
      } catch (err) {
        console.error(`Error Updating ${field}:`, err);
        // Revert on error
        setDates(oldDates);
      }
    }
  };
  const handleFreeTimeChange = (value) => {
    setLocalFreeTime(value);
    axios
      .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
        free_time: value,
      })
      .then(() => {
        // Update parent component data for free_time
        if (typeof onRowDataUpdate === "function") {
          onRowDataUpdate(_id, { free_time: value });
        }

        const updatedContainers = containers.map((container) => {
          const updatedContainer = { ...container };
          if (updatedContainer.arrival_date) {
            const arrival = new Date(updatedContainer.arrival_date);
            const freeDays = parseInt(value) || 0;
            const detentionDate = new Date(arrival);
            detentionDate.setDate(detentionDate.getDate() + freeDays);
            updatedContainer.detention_from = detentionDate
              .toISOString()
              .slice(0, 10);
          }
          return updatedContainer;
        });

        if (JSON.stringify(updatedContainers) !== JSON.stringify(containers)) {
          setContainers(updatedContainers);
          axios
            .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
              container_nos: updatedContainers,
            })
            .then(() => {
              // Update parent component data for containers
              if (typeof onRowDataUpdate === "function") {
                onRowDataUpdate(_id, { container_nos: updatedContainers });
              }
            })
            .catch((err) => console.error("Error Updating Containers:", err));
        }
      })
      .catch((err) => console.error("Error Updating Free Time:", err));
  };
  const isIgstFieldsAvailable =
    assessable_ammount && igst_ammount;
  const DateField = ({ label, value, field, index = null }) => (
    <div>
      <strong>{label}:</strong> {value?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
      <FcCalendar
        style={styles.icon}
        onClick={() => handleEditStart(field, index)}
      />
      {editable === (index !== null ? `${field}_${index}` : field) && (
        <div>
          <input
            type="datetime-local"
            value={tempDateValue}
                      onChange={
            handleDateInputChange
            }
            style={dateError ? styles.errorInput : {}}
          />
          <button
            style={styles.submitButton}
            onClick={() => handleDateSubmit(field, index)}
          >
            ✓
          </button>
          <button style={styles.cancelButton} onClick={() => setEditable(null)}>
            ✕
          </button>
          {dateError && <div style={styles.errorText}>{dateError}</div>}
        </div>      )}
    </div>
  );

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Left Section */}
      <div>
        {type_of_b_e !== "Ex-Bond" && (
          <>
            <DateField
              label="ETA"
              value={dates.vessel_berthing}
              field="vessel_berthing"
            />
            <br />
            <DateField
              label="GIGM"
              value={dates.gateway_igm_date}
              field="gateway_igm_date"
            />
            <br />
            <DateField
              label="Discharge"
              value={dates.discharge_date}
              field="discharge_date"
            />
            <br />

            {type_of_b_e !== "Ex-Bond" &&
              consignment_type !== "LCL" &&
              containers.map((container, id) => (
                <div key={id}>
                  <DateField
                    label="Rail-out"
                    value={container.container_rail_out_date}
                    field="container_rail_out_date"
                    index={id}
                  />
                </div>
              ))}

            {consignment_type === "LCL" &&
              containers.map((container, id) => (
                <div key={id}>
                  <DateField
                    label="ByRoad"
                    value={container.by_road_movement_date}
                    field="by_road_movement_date"
                    index={id}
                  />
                </div>
              ))}
            <br />
            {type_of_b_e !== "Ex-Bond" && (
              <>
                {containers.map((container, id) => (
                  <div key={id}>
                    <DateField
                      label="Arrival"
                      value={container.arrival_date}
                      field="arrival_date"
                      index={id}
                    />
                  </div>
                ))}

                <br />

                <div style={{ marginBottom: "10px" }}>
                  <strong>Free time:</strong>{" "}
                  <div
                    style={{
                      display: "inline-block",
                      minWidth: "80px",
                      marginLeft: "5px",
                    }}
                  >
                    <TextField
                      select
                      size="small"
                      variant="outlined"
                      value={localFreeTime || ""}
                      onChange={(e) => handleFreeTimeChange(e.target.value)}
                      style={{ minWidth: "80px" }}
                    >
                      {options.map((option, id) => (
                        <MenuItem key={id} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>
                </div>

                <br />
                {consignment_type !== "LCL" && type_of_b_e !== "Ex-Bond" && (
                  <>
                    <strong>Detention F.:</strong>
                    {containers.map((container, id) => (
                      <div key={id}>
                        {container.detention_from?.slice(0, 10) || "N/A"}
                      </div>
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
        <DateField
          label="Assessment Date"
          value={dates.assessment_date}
          field="assessment_date"
        />
        <br />
        <DateField label="PCV" value={dates.pcv_date} field="pcv_date" />
        <br />

        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span>
            <strong>Duty Paid:</strong>{" "}
            {dates.duty_paid_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
          </span>
          <FcCalendar
            style={{ ...styles.icon, marginRight: "5px" }}
            onClick={() => handleEditStart("duty_paid_date")}
          />
          <AddIcon
            fontSize="small"
            style={{ cursor: "pointer" }}
            onClick={handleOpenIgstModal}
            title="Add Duty Details"
          />
        </div>
        {editable === "duty_paid_date" && (
          <div>
            <input
              type="datetime-local"
              value={tempDateValue}
              onChange={handleDateInputChange}
              style={dateError ? styles.errorInput : {}}
              disabled={!isIgstFieldsAvailable}
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
                Please add IGST and Assessable Amount details
              </div>
            )}
            {dateError && <div style={styles.errorText}>{dateError}</div>}
          </div>
        )}
        <br />

        <DateField
          label="OOC"
          value={dates.out_of_charge}
          field="out_of_charge"
        />
        <br />

        {containers.map((container, id) => (
          <div key={id}>
            <DateField
              label="Delivery"
              value={container.delivery_date}
              field="delivery_date"
              index={id}
            />
          </div>
        ))}

        <br />

        {consignment_type !== "LCL" && (
          <>
            {/* <strong>EmptyOff:</strong> */}
            {containers.map((container, id) => (
              <div key={id}>
                <DateField
                  label="EmptyOff"
                  value={container.emptyContainerOffLoadDate}
                  field="emptyContainerOffLoadDate"
                  index={id}
                />
              </div>
            ))}
          </>
        )}

        <br />      </div>

      {/* IGST Modal */}
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
  icon: {
    cursor: "pointer",
    marginLeft: "5px",
    fontSize: "18px",
    color: "#282828",
  },
  errorInput: {
    border: "1px solid red",
  },
  errorText: {
    color: "red",
    fontSize: "12px",
    marginTop: "2px",
  },
  submitButton: {
    marginLeft: "5px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "3px",
    padding: "2px 6px",
    cursor: "pointer",
  },
  cancelButton: {
    marginLeft: "5px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "3px",
    padding: "2px 6px",
    cursor: "pointer",
  },
};

export default EditableDateCell;


import { useState, useEffect, useCallback } from "react";
import { FcCalendar } from "react-icons/fc";
import axios from "axios";
import { TextField, MenuItem } from "@mui/material";

const EditableDateCell = ({ cell }) => {
  const {
    _id,
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
  } = cell.row.original;

  const [dates, setDates] = useState({
    assessment_date,
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
  });

  const [localStatus, setLocalStatus] = useState(detailed_status);
  const [containers, setContainers] = useState([...container_nos]);
  const [editable, setEditable] = useState(null);
  const [localFreeTime, setLocalFreeTime] = useState(free_time);
  const [tempDateValue, setTempDateValue] = useState("");
  const [tempTimeValue, setTempTimeValue] = useState("");
  const [dateError, setDateError] = useState("");

  // Free time options
  const options = Array.from({ length: 25 }, (_, index) => index);

  const handleCombinedDateTimeChange = (e) => {
    setTempDateValue(e.target.value);
  };

  // Reset data when row changes
  useEffect(() => {
    setDates({
      assessment_date,
      vessel_berthing,
      gateway_igm_date,
      discharge_date,
      pcv_date,
      out_of_charge,
    });
    setContainers([...container_nos]);
    setLocalStatus(detailed_status);
    setLocalFreeTime(free_time);
    setEditable(null);
    setTempDateValue("");
    setTempTimeValue("");
    setDateError("");
  }, [cell.row.original]);

  const updateDetailedStatus = useCallback(async () => {
    const eta = dates.vessel_berthing;
    const gatewayIGMDate = dates.gateway_igm_date;
    const dischargeDate = dates.discharge_date;
    const outOfChargeDate = dates.out_of_charge;
    const pcvDate = dates.pcv_date;
    const assessmentDate = dates.assessment_date;

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
        setLocalStatus(newStatus);
      } catch (err) {
        console.error("Error updating status:", err);
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

  // Handle initiating edit mode for a date field
  const handleEditStart = (field, index = null) => {
    setEditable(index !== null ? `${field}_${index}` : field);
    setTempDateValue("");
    setTempTimeValue("");
    setDateError("");
  };

  // Validate date format
  const validateDate = (dateString) => {
    // Allow empty string (cleared date is valid)
    if (!dateString || dateString.trim() === "") return true;

    const date = new Date(dateString);

    // Check if date is valid (not Invalid Date)
    if (isNaN(date.getTime())) return false;

    // Check year is reasonable (between 2000 and 2100)
    const year = date.getFullYear();
    if (year < 2000 || year > 2100) return false;

    return true;
  };

  // Handle date change
  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };


  // Submit date changes
  const handleDateSubmit = (field, index = null) => {
    if (!validateDate(tempDateValue)) {
      setDateError("Please enter a valid date");
      return;
    }

    let finalValue = tempDateValue;

    // Add time component for rail-out if available
    if (field === "container_rail_out_date" && tempTimeValue) {
      finalValue = `${tempDateValue}T${tempTimeValue}`;
    }

    if (index !== null) {
      const updatedContainers = containers.map((container, i) => {
        if (i === index) {
          const updatedContainer = { ...container, [field]: finalValue };

          // Automatically update detention_from if arrival_date is changed
          if (field === "arrival_date") {
            if (!finalValue) {
              // If arrival_date is cleared, also clear detention_from
              updatedContainer.detention_from = "";
            } else {
              const arrival = new Date(finalValue);
              const freeDays = parseInt(localFreeTime) || 0;

              const detentionDate = new Date(arrival);
              detentionDate.setDate(detentionDate.getDate() + freeDays);

              updatedContainer.detention_from = detentionDate
                .toISOString()
                .slice(0, 10);
            }
          }

          return updatedContainer;
        }
        return container;
      });

      setContainers(updatedContainers);

      axios
        .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          container_nos: updatedContainers,
        })
        .then(() => {
          setEditable(null);
          updateDetailedStatus();
        })
        .catch((err) => console.error("Error Updating:", err));
    } else {
      // Handle non-container fields
      setDates((prev) => {
        const newDates = { ...prev, [field]: finalValue };

        axios
          .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
            [field]: finalValue,
          })
          .then(() => {
            setEditable(null);
            updateDetailedStatus();
          })
          .catch((err) => console.error("Error Updating:", err));

        return newDates;
      });
    }
  };

  // Handle free time change
  const handleFreeTimeChange = (value) => {
    setLocalFreeTime(value);

    // Update free time in database
    axios
      .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
        free_time: value,
      })
      .then(() => {
        // Update detention dates for all containers based on their arrival dates
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

          // Update containers in database
          axios
            .patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
              container_nos: updatedContainers,
            })
            .catch((err) => console.error("Error Updating Containers:", err));
        }
      })
      .catch((err) => console.error("Error Updating Free Time:", err));
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Left Section */}
      <div>
        {type_of_b_e !== "Ex-Bond" && (
          <>
            <strong>ETA :</strong>{" "}
            {dates.vessel_berthing?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
            <FcCalendar
              style={styles.icon}
              onClick={() => handleEditStart("vessel_berthing")}
            />
            {editable === "vessel_berthing" && (
              <div>
                <input
                  type="datetime-local"
                  value={tempDateValue}
                  onChange={handleCombinedDateTimeChange}
                  style={dateError ? styles.errorInput : {}}
                />
                <button
                  style={styles.submitButton}
                  onClick={() => handleDateSubmit("vessel_berthing")}
                >
                  ✓
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => setEditable(null)}
                >
                  ✕
                </button>
                {dateError && <div style={styles.errorText}>{dateError}</div>}
              </div>
            )}
            <br />
            <strong>GIGM :</strong>{" "}
            {dates.gateway_igm_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
            <FcCalendar
              style={styles.icon}
              onClick={() => handleEditStart("gateway_igm_date")}
            />
            {editable === "gateway_igm_date" && (
              <div>
                <input
                  type="datetime-local"
                  value={tempDateValue}
                  onChange={handleDateInputChange}
                  style={dateError ? styles.errorInput : {}}
                />
                <button
                  style={styles.submitButton}
                  onClick={() => handleDateSubmit("gateway_igm_date")}
                >
                  ✓
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => setEditable(null)}
                >
                  ✕
                </button>
                {dateError && <div style={styles.errorText}>{dateError}</div>}
              </div>
            )}
            <br />
            <strong>Discharge :</strong>{" "}
            {dates.discharge_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
            <FcCalendar
              style={styles.icon}
              onClick={() => handleEditStart("discharge_date")}
            />
            {editable === "discharge_date" && (
              <div>
                <input
                  type="datetime-local"
                  value={tempDateValue}
                  onChange={handleDateInputChange}
                  style={dateError ? styles.errorInput : {}}
                />
                <button
                  style={styles.submitButton}
                  onClick={() => handleDateSubmit("discharge_date")}
                >
                  ✓
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => setEditable(null)}
                >
                  ✕
                </button>
                {dateError && <div style={styles.errorText}>{dateError}</div>}
              </div>
            )}
            <br />
            {type_of_b_e !== "Ex-Bond" && consignment_type !== "LCL" && (
              <>
                {/* Container Dates */}
                {containers.map((container, id) => (
                  <div key={id}>
                    <strong>Rail-out :</strong>{" "}
                    {container.container_rail_out_date
                      ?.slice(0, 10)
                      .replace("T", " ") || "N/A"}{" "}
                    <FcCalendar
                      style={styles.icon}
                      onClick={() =>
                        handleEditStart("container_rail_out_date", id)
                      }
                    />
                    {editable === `container_rail_out_date_${id}` && (
                      <div>
                        <input
                          type="datetime-local"
                          value={tempDateValue}
                          onChange={handleCombinedDateTimeChange}
                          style={dateError ? styles.errorInput : {}}
                        />
                        <button
                          style={styles.submitButton}
                          onClick={() =>
                            handleDateSubmit("container_rail_out_date", id)
                          }
                        >
                          ✓
                        </button>
                        <button
                          style={styles.cancelButton}
                          onClick={() => setEditable(null)}
                        >
                          ✕
                        </button>
                        {dateError && (
                          <div style={styles.errorText}>{dateError}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            {type_of_b_e !== "Ex-Bond" && (
              <>
                {containers.map((container, id) => (
                  <div key={id}>
                    <strong>Arrival :</strong>{" "}
                    {container.arrival_date?.slice(0, 10) || "N/A"}{" "}
                    <FcCalendar
                      style={styles.icon}
                      onClick={() => handleEditStart("arrival_date", id)}
                    />
                    {editable === `arrival_date_${id}` && (
                      <div>
                        <input
                          type="datetime-local"
                          value={tempDateValue}
                          onChange={handleDateInputChange}
                          style={dateError ? styles.errorInput : {}}
                        />
                        <button
                          style={styles.submitButton}
                          onClick={() => handleDateSubmit("arrival_date", id)}
                        >
                          ✓
                        </button>
                        <button
                          style={styles.cancelButton}
                          onClick={() => setEditable(null)}
                        >
                          ✕
                        </button>
                        {dateError && (
                          <div style={styles.errorText}>{dateError}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Free Time Dropdown - Added below arrival date */}
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
                      SelectProps={{
                        MenuProps: {
                          PaperProps: {
                            style: {
                              maxHeight: 300,
                              width: 200,
                            },
                          },
                        },
                      }}
                    >
                      {options.map((option, id) => (
                        <MenuItem key={id} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>
                </div>

                {consignment_type !== "LCL" && type_of_b_e !== "Ex-Bond" && (
                  <>
                    <strong>Detention F. :</strong>
                    {containers.map((container, id) => (
                      <div key={id}>
                        {container.detention_from?.slice(0, 10) || "N/A"}{" "}
                        {editable === `detention_from_${id}` && (
                          <div>
                            <input
                              type="datetime-local"
                              value={tempDateValue}
                              onChange={handleDateInputChange}
                              style={dateError ? styles.errorInput : {}}
                            />
                          
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Right Section */}
      <div>
        <strong>Assesment Date:</strong>{" "}
        {dates.assessment_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
        <FcCalendar
          style={styles.icon}
          onClick={() => handleEditStart("assessment_date")}
        />
{editable === "assessment_date" && (
          <div>
            <input
              type="datetime-local"
              value={tempDateValue}
              onChange={handleDateInputChange}
              style={dateError ? styles.errorInput : {}}
            />
            <button
              style={styles.submitButton}
              onClick={() => handleDateSubmit("assessment_date")}
            >
              ✓
            </button>
            <button
              style={styles.cancelButton}
              onClick={() => setEditable(null)}
            >
              ✕
            </button>
            {dateError && <div style={styles.errorText}>{dateError}</div>}
          </div>
        )}
        <br />
        
        <strong>PCV :</strong>{" "}
        {dates.pcv_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
        <FcCalendar
          style={styles.icon}
          onClick={() => handleEditStart("pcv_date")}
        />
        {editable === "pcv_date" && (
          <div>
            <input
              type="datetime-local"
              value={tempDateValue}
              onChange={handleDateInputChange}
              style={dateError ? styles.errorInput : {}}
            />
            <button
              style={styles.submitButton}
              onClick={() => handleDateSubmit("pcv_date")}
            >
              ✓
            </button>
            <button
              style={styles.cancelButton}
              onClick={() => setEditable(null)}
            >
              ✕
            </button>
            {dateError && <div style={styles.errorText}>{dateError}</div>}
          </div>
        )}
        <br />
        <strong>OOC :</strong>{" "}
        {dates.out_of_charge?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
        <FcCalendar
          style={styles.icon}
          onClick={() => handleEditStart("out_of_charge")}
        />
        {editable === "out_of_charge" && (
          <div>
            <input
              type="datetime-local"
              value={tempDateValue}
              onChange={handleDateInputChange}
              style={dateError ? styles.errorInput : {}}
            />
            <button
              style={styles.submitButton}
              onClick={() => handleDateSubmit("out_of_charge")}
            >
              ✓
            </button>
            <button
              style={styles.cancelButton}
              onClick={() => setEditable(null)}
            >
              ✕
            </button>
            {dateError && <div style={styles.errorText}>{dateError}</div>}
          </div>
        )}
        <br />
        {containers.map((container, id) => (
          <div key={id}>
            <strong>Delivery :</strong>{" "}
            {container.delivery_date?.slice(0, 10) || "N/A"}{" "}
            <FcCalendar
              style={styles.icon}
              onClick={() => handleEditStart("delivery_date", id)}
            />
            {editable === `delivery_date_${id}` && (
              <div>
                <input
                  type="datetime-local"
                  value={tempDateValue}
                  onChange={handleDateInputChange}
                  style={dateError ? styles.errorInput : {}}
                />
                <button
                  style={styles.submitButton}
                  onClick={() => handleDateSubmit("delivery_date", id)}
                >
                  ✓
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => setEditable(null)}
                >
                  ✕
                </button>
                {dateError && <div style={styles.errorText}>{dateError}</div>}
              </div>
            )}
          </div>
        ))}
        {consignment_type !== "LCL" && (
          <>
            <strong>EmptyOff:</strong>
            {containers.map((container, id) => (
              <div key={id}>
                {container.emptyContainerOffLoadDate?.slice(0, 10) || "N/A"}{" "}
                <FcCalendar
                  style={styles.icon}
                  onClick={() =>
                    handleEditStart("emptyContainerOffLoadDate", id)
                  }
                />
                {editable === `emptyContainerOffLoadDate_${id}` && (
                  <div>
                    <input
                      type="datetime-local"
                      value={tempDateValue}
                      onChange={handleDateInputChange}
                      style={dateError ? styles.errorInput : {}}
                    />
                    <button
                      style={styles.submitButton}
                      onClick={() =>
                        handleDateSubmit("emptyContainerOffLoadDate", id)
                      }
                    >
                      ✓
                    </button>
                    <button
                      style={styles.cancelButton}
                      onClick={() => setEditable(null)}
                    >
                      ✕
                    </button>
                    {dateError && (
                      <div style={styles.errorText}>{dateError}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

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

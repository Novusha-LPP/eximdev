import { useState, useEffect, useCallback, useRef } from "react";
import { FcCalendar } from "react-icons/fc";
import axios from "axios";
import { TextField, MenuItem, Snackbar, Alert } from "@mui/material";

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

  // Track API calls to prevent race conditions
  const pendingApiRef = useRef(false);

  // State management
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
  const [dateError, setDateError] = useState("");
  const [updateSuccessful, setUpdateSuccessful] = useState(true);
  
  // New notification state
  const [notification, setNotification] = useState({
    open: false,
    severity: "success",
    message: ""
  });

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
    setDateError("");
    setUpdateSuccessful(true);
  }, [
    assessment_date,
    vessel_berthing,
    gateway_igm_date, 
    discharge_date,
    pcv_date,
    out_of_charge,
    container_nos,
    detailed_status,
    free_time
  ]);

  // Handle notification close
  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification(prev => ({...prev, open: false}));
  };

  // Show notification when updates occur
  const showNotification = (message, severity = "success") => {
    setNotification({
      open: true,
      severity,
      message
    });
  };

  // Safely make API calls with error handling and retry logic
  const safeApiCall = useCallback(async (endpoint, data) => {
    if (pendingApiRef.current) {
      console.log("API call already in progress, queuing...");
      // Wait for previous call to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    pendingApiRef.current = true;
    setUpdateSuccessful(true);
    
    try {
      const response = await axios.patch(
        `${process.env.REACT_APP_API_STRING}${endpoint}`, 
        data,
        { timeout: 10000 } // Add timeout to avoid hanging requests
      );
      
      // Show notification for successful update
      if (data.assessment_date) {
        showNotification("Assessment date updated successfully");
      } else if (data.vessel_berthing) {
        showNotification("ETA date updated successfully");
      } else if (data.gateway_igm_date) {
        showNotification("Gateway IGM date updated successfully");
      } else if (data.discharge_date) {
        showNotification("Discharge date updated successfully");
      } else if (data.pcv_date) {
        showNotification("PCV date updated successfully");
      } else if (data.out_of_charge) {
        showNotification("Out of charge date updated successfully");
      } else if (data.free_time !== undefined) {
        showNotification("Free time updated successfully");
      } else if (data.container_nos) {
        // Check what container field was updated
        showNotification("Container date updated successfully");
      }
      
      return response.data;
    } catch (err) {
      console.error(`Error updating ${endpoint}:`, err);
      setUpdateSuccessful(false);
      
      // Show error notification
      showNotification(`Update failed: ${err.message || 'Network error'}`, "error");
      
      // Retry once after 1 second on network errors
      if (err.message?.includes('network') || err.code === 'ECONNABORTED') {
        console.log("Network error, retrying...");
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retryResponse = await axios.patch(
            `${process.env.REACT_APP_API_STRING}${endpoint}`, 
            data
          );
          setUpdateSuccessful(true);
          showNotification("Update successful after retry");
          return retryResponse.data;
        } catch (retryErr) {
          console.error("Retry failed:", retryErr);
          setUpdateSuccessful(false);
          showNotification("Update failed after retry", "error");
          throw retryErr;
        }
      }
      
      throw err;
    } finally {
      pendingApiRef.current = false;
    }
  }, []);

  // Update detailed status based on dates
  const updateDetailedStatus = useCallback(async () => {
    if (!updateSuccessful) return; // Don't update status if previous updates failed
    
    const eta = dates.vessel_berthing;
    const gatewayIGMDate = dates.gateway_igm_date;
    const dischargeDate = dates.discharge_date;
    const outOfChargeDate = dates.out_of_charge;
    const pcvDate = dates.pcv_date;
    const billOfEntryNo = be_no;
    
    const anyContainerArrivalDate = containers.some(c => c.arrival_date);
    const containerRailOutDate = containers.length > 0 && 
      containers.every(container => container.container_rail_out_date);
    const emptyContainerOffLoadDate = containers.length > 0 && 
      containers.every(container => container.emptyContainerOffLoadDate);
    const deliveryDate = containers.length > 0 && 
      containers.every(container => container.delivery_date);
    
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
  }, [
    dates,
    containers,
    be_no,
    consignment_type,
    type_of_b_e,
    localStatus,
    _id,
    safeApiCall,
    updateSuccessful
  ]);

  // Update detailed status when relevant data changes
  useEffect(() => {
    // Only update status if no pending API calls
    if (!pendingApiRef.current) {
      updateDetailedStatus();
    }
  }, [
    dates.vessel_berthing,
    dates.gateway_igm_date,
    dates.discharge_date,
    dates.out_of_charge,
    dates.assessment_date,
    containers,
    updateDetailedStatus
  ]);

  // Handle initiating edit mode
  const handleEditStart = (field, index = null) => {
    const editableKey = index !== null ? `${field}_${index}` : field;
    setEditable(editableKey);
    
    // Initialize with current value for better UX
    if (index !== null) {
      // For container fields
      const currentValue = containers[index]?.[field];
      setTempDateValue(currentValue ? currentValue.slice(0, 16) : "");
    } else {
      // For job-level date fields
      const currentValue = dates[field];
      setTempDateValue(currentValue ? currentValue.slice(0, 16) : "");
    }
    
    setDateError("");
  };

  // Validate date format
  const validateDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return true;
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) return false;
    
    const year = date.getFullYear();
    if (year < 2000 || year > 2100) return false;
    
    return true;
  };

  // Handle date input change
  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };

  // Get readable field name for notifications
  const getFieldDisplayName = (field) => {
    const fieldMap = {
      assessment_date: "Assessment Date",
      vessel_berthing: "ETA",
      gateway_igm_date: "Gateway IGM Date",
      discharge_date: "Discharge Date",
      pcv_date: "PCV Date",
      out_of_charge: "Out of Charge Date",
      container_rail_out_date: "Rail-out Date",
      arrival_date: "Arrival Date",
      delivery_date: "Delivery Date",
      emptyContainerOffLoadDate: "Empty Container Return Date"
    };
    
    return fieldMap[field] || field;
  };

  // Submit date changes with improved error handling
  const handleDateSubmit = async (field, index = null) => {
    if (!validateDate(tempDateValue)) {
      setDateError("Please enter a valid date");
      return;
    }

    const finalValue = tempDateValue;
    const displayName = getFieldDisplayName(field);
    
    try {
      if (index !== null) {
        // Handle container field updates
        const updatedContainers = containers.map((container, i) => {
          if (i === index) {
            const updatedContainer = { ...container, [field]: finalValue };
            
            // Auto-update detention_from if arrival_date changes
            if (field === "arrival_date" && finalValue) {
              const arrival = new Date(finalValue);
              const freeDays = parseInt(localFreeTime) || 0;
              
              const detentionDate = new Date(arrival);
              detentionDate.setDate(detentionDate.getDate() + freeDays);
              
              updatedContainer.detention_from = detentionDate.toISOString().slice(0, 10);
            } else if (field === "arrival_date" && !finalValue) {
              updatedContainer.detention_from = "";
            }
            
            return updatedContainer;
          }
          return container;
        });
        
        // Update local state first for responsiveness
        setContainers(updatedContainers);
        
        // Then update via API
        await safeApiCall(`/jobs/${_id}`, { container_nos: updatedContainers });
        
        showNotification(`${displayName} updated successfully`);
        
        // Double-check that the update was successful by verifying with backend data
        try {
          const verification = await axios.get(`${process.env.REACT_APP_API_STRING}/get-job-by-id/${_id}`);
          const serverContainers = verification.data.container_nos || [];
          
          // Verify that rail-out date was properly saved
          if (field === "container_rail_out_date") {
            const isUpdated = serverContainers.some(
              (container, i) => i === index && container.container_rail_out_date === finalValue
            );
            
            if (!isUpdated) {
              console.warn("Rail-out date verification failed - data not saved on server");
              // Try one more time to update
              await safeApiCall(`/jobs/${_id}`, { container_nos: updatedContainers });
            }
          }
        } catch (verifyErr) {
          console.error("Verification error:", verifyErr);
        }
      } else {
        // Handle job-level date field updates
        const oldValue = dates[field];
        
        setDates(prev => {
          const newDates = { ...prev, [field]: finalValue };
          return newDates;
        });
        
        await safeApiCall(`/jobs/${_id}`, { [field]: finalValue });
        
        showNotification(`${displayName} updated successfully`);
      }
      
      setEditable(null);
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      setDateError(`Update failed: ${err.message || 'Network error'}`);
    }
  };

  // Handle free time change with improved error handling
  const handleFreeTimeChange = async (value) => {
    try {
      setLocalFreeTime(value);
      
      // Update free time in database
      await safeApiCall(`/jobs/${_id}`, { free_time: value });
      
      showNotification(`Free time updated to ${value} days`);
      
      // Update detention dates based on arrival dates
      const updatedContainers = containers.map(container => {
        const updatedContainer = { ...container };
        
        if (updatedContainer.arrival_date) {
          const arrival = new Date(updatedContainer.arrival_date);
          const freeDays = parseInt(value) || 0;
          
          const detentionDate = new Date(arrival);
          detentionDate.setDate(detentionDate.getDate() + freeDays);
          
          updatedContainer.detention_from = detentionDate.toISOString().slice(0, 10);
        }
        
        return updatedContainer;
      });
      
      if (JSON.stringify(updatedContainers) !== JSON.stringify(containers)) {
        setContainers(updatedContainers);
        await safeApiCall(`/jobs/${_id}`, { container_nos: updatedContainers });
        showNotification("Detention dates updated based on new free time");
      }
    } catch (err) {
      console.error("Error updating free time:", err);
      // Restore previous value on error
      setLocalFreeTime(free_time);
    }
  };

  // Show error indicator if previous update failed
  const errorIndicator = !updateSuccessful && (
    <span style={{ color: "red", marginLeft: "5px" }}>
      ⚠ Update failed
    </span>
  );

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Left Section */}
      <div>
        {type_of_b_e !== "Ex-Bond" && (
          <>
            <strong>ETA:</strong>{" "}
            {dates.vessel_berthing?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
            <FcCalendar
              style={styles.icon}
              onClick={() => handleEditStart("vessel_berthing")}
            />
            {errorIndicator}
            {editable === "vessel_berthing" && (
              <div>
                <input
                  type="datetime-local"
                  value={tempDateValue}
                  onChange={handleDateInputChange}
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
            
            <strong>GIGM:</strong>{" "}
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
            
            <strong>Discharge:</strong>{" "}
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
                    <strong>Rail-out:</strong>{" "}
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
                          onChange={handleDateInputChange}
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
                    <strong>Arrival:</strong>{" "}
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

                {/* Free Time Dropdown */}
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
                      {Array.from({ length: 25 }, (_, i) => (
                        <MenuItem key={i} value={i}>
                          {i}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>
                </div>

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
              </>
            )}
          </>
        )}
      </div>

      {/* Right Section */}
      <div>
        <strong>Assessment Date:</strong>{" "}
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
        
        <strong>PCV:</strong>{" "}
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
        
        <strong>OOC:</strong>{" "}
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
            <strong>Delivery:</strong>{" "}
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
      
      {/* Notification Snackbar */}
      <Snackbar
  open={notification.open}
  autoHideDuration={3000}
  onClose={handleCloseNotification}
  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
  sx={{
    zIndex: 1500, // above other content like forms
    ml: 30, // add margin from top (adjust as needed)
  }}
>
  <Alert
    onClose={handleCloseNotification}
    severity={notification.severity}
    sx={{ width: "100%" }}
  >
    {notification.message}
  </Alert>
</Snackbar>

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
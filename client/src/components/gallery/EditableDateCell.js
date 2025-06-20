import React, { useState, useEffect, useCallback } from "react";
import { FcCalendar } from "react-icons/fc";
import axios from "axios";
import {
  TextField,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

const EditableDateCell = ({ cell, onRowDataUpdate }) => {
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
  } = cell.row.original;

  const [dates, setDates] = useState({
    assessment_date,
    vessel_berthing,
    gateway_igm_date,
    discharge_date,
    pcv_date,
    out_of_charge,
    duty_paid_date,
  });

  const [localStatus, setLocalStatus] = useState(detailed_status);
  const [containers, setContainers] = useState([...container_nos]);
  const [editable, setEditable] = useState(null);
  const [localFreeTime, setLocalFreeTime] = useState(free_time);
  const [tempDateValue, setTempDateValue] = useState("");
  const [tempTimeValue, setTempTimeValue] = useState("");
  const [dateError, setDateError] = useState("");
  const [igstModalOpen, setIgstModalOpen] = useState(false);
  const [igstValues, setIgstValues] = useState({
    assessable_ammount: assessable_ammount || "",
    igst_ammount: igst_ammount || "",
    bcd_ammount: bcd_ammount || "",
    sws_ammount: sws_ammount || "",
    intrest_ammount: cell.row.original.intrest_ammount || "",
    penalty_ammount: penalty_ammount || "",
    fine_ammount: fine_ammount || "",
    bcdRate: "",
    swsRate: "10",
    igstRate: igst_rate || "",
  });

  // Free time options
  const options = Array.from({ length: 25 }, (_, index) => index);

  // Utility function to calculate number of days between two dates
  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate interest amount
  const calculateInterestAmount = () => {
    const totalDuty = parseFloat(igstValues.bcd_ammount || 0) + 
                     parseFloat(igstValues.sws_ammount || 0) + 
                     parseFloat(igstValues.igst_ammount || 0);
    
    const assessmentDate = dates.assessment_date || cell.row.original.assessment_date;
    const dutyPaidDate = dates.duty_paid_date || cell.row.original.duty_paid_date;
    
    if (totalDuty <= 0 || !assessmentDate || !dutyPaidDate) return 0;
    
    const assessmentDateObj = new Date(assessmentDate);
    const dutyPaidDateObj = new Date(dutyPaidDate);
    
    if (isNaN(assessmentDateObj.getTime()) || isNaN(dutyPaidDateObj.getTime())) return 0;
    if (dutyPaidDateObj <= assessmentDateObj) return 0;
    
    const daysBetween = calculateDaysBetween(assessmentDate, dutyPaidDate);
    const interestAmount = ((totalDuty * 15 / 100) / 365) * daysBetween;
    
    return Math.round(interestAmount * 100) / 100;
  };
  // Calculate penalty amount
  const calculatePenaltyAmount = () => {
    const beDate = dates.assessment_date || cell.row.original.be_date || cell.row.original.assessment_date;
    
    // Get arrival_date from containers (use the first container that has arrival_date)
    const containerWithArrival = containers.find(c => c.arrival_date);
    const arrivalDate = containerWithArrival ? containerWithArrival.arrival_date : null;
    
    if (!arrivalDate) return 0;
    
    const arrivalDateObj = new Date(arrivalDate);
    const beDateObj = beDate ? new Date(beDate) : null;
    
    if (isNaN(arrivalDateObj.getTime())) return 0;
    
    // If be_date and arrival_date are same day
    if (beDateObj && !isNaN(beDateObj.getTime()) && 
        arrivalDateObj.toDateString() === beDateObj.toDateString()) {
      return 5000;
    }
    
    // If arrival_date is present and be_date is not present
    if (!beDate) {
      const today = new Date();
      const daysBetween = calculateDaysBetween(arrivalDate, today);
      let penalty = 0;
      
      for (let i = 1; i <= daysBetween; i++) {
        penalty += i <= 3 ? 5000 : 10000;
      }
      return penalty;
    }
    
    // If both dates are present and be_date is after arrival_date
    if (beDateObj && !isNaN(beDateObj.getTime()) && beDateObj > arrivalDateObj) {
      const daysBetween = calculateDaysBetween(arrivalDate, beDate);
      let penalty = 0;
      
      for (let i = 1; i <= daysBetween; i++) {
        penalty += i <= 3 ? 5000 : 10000;
      }
      return penalty;
    }
    
    return 0;
  };

  // Calculate duty amounts based on assessable value
  const calculateDutyAmounts = () => {
    const assessableValue = parseFloat(igstValues.assessable_ammount || 0);
    const bcdRate = parseFloat(igstValues.bcdRate || 0);
    const swsRate = parseFloat(igstValues.swsRate || 10);
    const igstRate = parseFloat(igstValues.igstRate || 0);
    
    if (assessableValue <= 0) return;
    
    const bcdAmount = (assessableValue * bcdRate) / 100;
    const swsAmount = (bcdAmount * swsRate) / 100; // SWS is calculated only on assessable value
    const igstAmount = ((assessableValue + bcdAmount + swsAmount) * igstRate) / 100;
    
    setIgstValues(prev => ({
      ...prev,
      bcd_ammount: bcdAmount.toFixed(2),
      sws_ammount: swsAmount.toFixed(2),
      igst_ammount: igstAmount.toFixed(2)
    }));
  };

  // Auto-calculate duty amounts when rates or assessable value change
  useEffect(() => {
    const timeoutId = setTimeout(calculateDutyAmounts, 100);
    return () => clearTimeout(timeoutId);
  }, [igstValues.assessable_ammount, igstValues.bcdRate, igstValues.swsRate, igstValues.igstRate]);

  // Auto-calculate interest and penalty when relevant values change
  useEffect(() => {
    const interestAmount = calculateInterestAmount();
    const penaltyAmount = calculatePenaltyAmount();
    
    setIgstValues(prev => ({
      ...prev,
      intrest_ammount: interestAmount.toFixed(2),
      penalty_ammount: penaltyAmount.toFixed(2)
    }));  }, [
    igstValues.bcd_ammount, 
    igstValues.sws_ammount, 
    igstValues.igst_ammount, 
    dates.assessment_date, 
    dates.duty_paid_date,
    cell.row.original.assessment_date,
    cell.row.original.duty_paid_date,
    cell.row.original.be_date,
    containers // Add containers to watch for arrival_date changes
  ]);

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
        assessable_ammount,
        igst_ammount,        
        bcd_ammount,
        sws_ammount,
        intrest_ammount,
        penalty_ammount,
        fine_ammount,
        igst_rate,
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
      setIgstValues({
        assessable_ammount: assessable_ammount || "",
        igst_ammount: igst_ammount || "",
        bcd_ammount: bcd_ammount || "",
        sws_ammount: sws_ammount || "",
        intrest_ammount: intrest_ammount || "",
        penalty_ammount: penalty_ammount || "",
        fine_ammount: fine_ammount || "",
        bcdRate: "",
        swsRate: "10",
        igstRate: igst_rate || "",
      });
    }
  }, [_id]);

  // Handle IGST modal open with CTH data fetch
  const handleOpenIgstModal = async () => {
    if (cell.row.original.cth_no && cell.row.original.job_no) {
      try {
        const apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9000';
        const response = await fetch(`${apiUrl}/jobs/${cell.row.original.job_no}/update-duty-from-cth`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ cth_no: cell.row.original.cth_no }),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('CTH Response:', result);
          
          // Extract rates from CTH data
          const bcdSchRate = parseFloat(result.addedFields?.cth_basic_duty_sch || 0);
          const bcdNtfnRate = parseFloat(result.addedFields?.cth_basic_duty_ntfn || 0);
          const bcdRate = Math.max(bcdSchRate, isNaN(bcdNtfnRate) ? 0 : bcdNtfnRate);
          
          setIgstValues(prev => ({
            ...prev,
            // Set the rates for calculation
            bcdRate: bcdRate.toString(),
            igstRate: result.addedFields?.cth_igst_ammount || prev.igstRate,
            swsRate: "10", // Keep default SWS rate
            // Pre-populate amounts if assessable amount exists
            ...(prev.assessable_ammount && {
              bcd_ammount: result.addedFields?.cth_bcd_ammount || prev.bcd_ammount,
              sws_ammount: result.addedFields?.cth_sws_ammount || prev.sws_ammount,
              igst_ammount: result.addedFields?.cth_igst_ammount || prev.igst_ammount,
            })
          }));
        }
      } catch (error) {
        console.error('Error in CTH duty lookup:', error);
      }
    }
    setIgstModalOpen(true);
  };

  const handleCloseIgstModal = () => {
    setIgstModalOpen(false);
  };
  const handleIgstSubmit = async () => {
    try {
      // Calculate total duty
      const totalDuty = (
        parseFloat(igstValues.bcd_ammount || 0) +
        parseFloat(igstValues.igst_ammount || 0) +
        parseFloat(igstValues.sws_ammount || 0) +
        parseFloat(igstValues.intrest_ammount || 0) +
        parseFloat(igstValues.penalty_ammount || 0) +
        parseFloat(igstValues.fine_ammount || 0)
      ).toFixed(2);

      await axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
        assessable_ammount: igstValues.assessable_ammount,
        igst_ammount: igstValues.igst_ammount,
        bcd_ammount: igstValues.bcd_ammount,
        sws_ammount: igstValues.sws_ammount,
        intrest_ammount: igstValues.intrest_ammount,
        penalty_ammount: igstValues.penalty_ammount,
        fine_ammount: igstValues.fine_ammount,
        total_duty: totalDuty,
      });
      setIgstModalOpen(false);
    } catch (error) {
      console.error("Error submitting IGST data:", error);
    }
  };

  const updateDetailedStatus = useCallback(async () => {
    const eta = dates.vessel_berthing;
    const gatewayIGMDate = dates.gateway_igm_date;
    const dischargeDate = dates.discharge_date;
    const outOfChargeDate = dates.out_of_charge;
    const pcvDate = dates.pcv_date;
    const billOfEntryNo = be_no;
    const anyContainerArrivalDate = containers.some((c) => c.arrival_date);
    const containerRailOutDate = containers?.length > 0 && containers.every((container) => container.container_rail_out_date);
    const emptyContainerOffLoadDate = containers?.length > 0 && containers.every((container) => container.emptyContainerOffLoadDate);
    const deliveryDate = containers?.length > 0 && containers.every((container) => container.delivery_date);
    const isExBondOrLCL = type_of_b_e === "Ex-Bond" || consignment_type === "LCL";

    let newStatus = "";

    if (billOfEntryNo && anyContainerArrivalDate && outOfChargeDate && (isExBondOrLCL ? deliveryDate : emptyContainerOffLoadDate)) {
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
        
        if (typeof onRowDataUpdate === 'function') {
          onRowDataUpdate(_id, newStatus);
        }
      } catch (err) {
        console.error("Error updating status:", err);
        cell.row.original.detailed_status = localStatus;
      }
    }
  }, [dates, containers, be_no, consignment_type, type_of_b_e, localStatus, _id]);

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
    setTempDateValue("");
    setTempTimeValue("");
    setDateError("");
  };

  const validateDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return true;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    const year = date.getFullYear();
    return year >= 2000 && year <= 2100;
  };

  const handleDateInputChange = (e) => {
    setTempDateValue(e.target.value);
    setDateError("");
  };

  const handleCombinedDateTimeChange = (e) => {
    setTempDateValue(e.target.value);
  };

  const handleDateSubmit = (field, index = null) => {
    if (!validateDate(tempDateValue)) {
      setDateError("Please enter a valid date");
      return;
    }

    let finalValue = tempDateValue;

    if ((field === "container_rail_out_date" || field === "by_road_movement_date") && tempTimeValue) {
      finalValue = `${tempDateValue}T${tempTimeValue}`;
    }

    if (index !== null) {
      const updatedContainers = containers.map((container, i) => {
        if (i === index) {
          const updatedContainer = { ...container, [field]: finalValue };

          if (field === "arrival_date") {
            if (!finalValue) {
              updatedContainer.detention_from = "";
            } else {
              const arrival = new Date(finalValue);
              const freeDays = parseInt(localFreeTime) || 0;
              const detentionDate = new Date(arrival);
              detentionDate.setDate(detentionDate.getDate() + freeDays);
              updatedContainer.detention_from = detentionDate.toISOString().slice(0, 10);
            }
          }
          return updatedContainer;
        }
        return container;
      });

      setContainers(updatedContainers);
      axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
        container_nos: updatedContainers,
      }).then(() => {
        setEditable(null);
        updateDetailedStatus();
      }).catch((err) => console.error("Error Updating:", err));
    } else {
      setDates((prev) => {
        const newDates = { ...prev, [field]: finalValue };
        axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          [field]: finalValue,
        }).then(() => {
          setEditable(null);
          updateDetailedStatus();
        }).catch((err) => console.error("Error Updating:", err));
        return newDates;
      });
    }
  };

  const handleFreeTimeChange = (value) => {
    setLocalFreeTime(value);
    axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
      free_time: value,
    }).then(() => {
      const updatedContainers = containers.map((container) => {
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
        axios.patch(`${process.env.REACT_APP_API_STRING}/jobs/${_id}`, {
          container_nos: updatedContainers,
        }).catch((err) => console.error("Error Updating Containers:", err));
      }
    }).catch((err) => console.error("Error Updating Free Time:", err));
  };

  const isIgstFieldsAvailable = igstValues.assessable_ammount && igstValues.igst_ammount;

  const DateField = ({ label, value, field, index = null }) => (
    <div>
      <strong>{label}:</strong> {value?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
      <FcCalendar style={styles.icon} onClick={() => handleEditStart(field, index)} />
      {editable === (index !== null ? `${field}_${index}` : field) && (
        <div>
          <input
            type="datetime-local"
            value={tempDateValue}
            onChange={field.includes("rail_out") || field.includes("by_road") ? handleCombinedDateTimeChange : handleDateInputChange}
            style={dateError ? styles.errorInput : {}}
          />
          <button style={styles.submitButton} onClick={() => handleDateSubmit(field, index)}>✓</button>
          <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
          {dateError && <div style={styles.errorText}>{dateError}</div>}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Left Section */}
      <div>
        {type_of_b_e !== "Ex-Bond" && (
          <>
            <DateField label="ETA" value={dates.vessel_berthing} field="vessel_berthing" />
            <br />
            <DateField label="GIGM" value={dates.gateway_igm_date} field="gateway_igm_date" />
            <br />
            <DateField label="Discharge" value={dates.discharge_date} field="discharge_date" />
            <br />
            
            {type_of_b_e !== "Ex-Bond" && consignment_type !== "LCL" && (
              containers.map((container, id) => (
                <div key={id}>
                  <DateField label="Rail-out" value={container.container_rail_out_date} field="container_rail_out_date" index={id} />
                </div>
              ))
            )}
            
            {consignment_type === "LCL" && (
              containers.map((container, id) => (
                <div key={id}>
                  <DateField label="ByRoad" value={container.by_road_movement_date} field="by_road_movement_date" index={id} />
                </div>
              ))
            )}
                    <br />
            {type_of_b_e !== "Ex-Bond" && (
              <>
                {containers.map((container, id) => (
                  <div key={id}>
                    <DateField label="Arrival" value={container.arrival_date} field="arrival_date" index={id} />
                  </div>
                ))}
                
                    <br />

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

                    <br />
                {consignment_type !== "LCL" && type_of_b_e !== "Ex-Bond" && (
                  <>
                    <strong>Detention F.:</strong>
                    {containers.map((container, id) => (
                      <div key={id}>{container.detention_from?.slice(0, 10) || "N/A"}</div>
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
        <DateField label="Assessment Date" value={dates.assessment_date} field="assessment_date" />
        <br />
        <DateField label="PCV" value={dates.pcv_date} field="pcv_date" />
        <br />
        
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span>
            <strong>Duty Paid:</strong> {dates.duty_paid_date?.slice(0, 10).replace("T", " ") || "N/A"}{" "}
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
            >✓</button>
            <button style={styles.cancelButton} onClick={() => setEditable(null)}>✕</button>
            {!isIgstFieldsAvailable && (
              <div style={styles.errorText}>Please add IGST and Assessable Amount details</div>
            )}
            {dateError && <div style={styles.errorText}>{dateError}</div>}
          </div>
        )}
        <br />
        
        <DateField label="OOC" value={dates.out_of_charge} field="out_of_charge" />
        <br />
        
        {containers.map((container, id) => (
          <div key={id}>
            <DateField label="Delivery" value={container.delivery_date} field="delivery_date" index={id} />
          </div>
          
        ))}
        
                    <br />
        
        {consignment_type !== "LCL" && (
          <>
            {/* <strong>EmptyOff:</strong> */}
            {containers.map((container, id) => (
              <div key={id}>
                <DateField label="EmptyOff" value={container.emptyContainerOffLoadDate} field="emptyContainerOffLoadDate" index={id} />
              </div>
            ))}
          </>
        )}
        
                    <br />
      </div>

      {/* IGST Modal */}
      <Dialog open={igstModalOpen} onClose={handleCloseIgstModal} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box sx={{ fontSize: '16px', fontWeight: 600, color: '#34495e' }}>
              💸 Duty Payment Details
            </Box>
            {cell.row.original.cth_no && (
              <Chip 
                label={`CTH: ${cell.row.original.cth_no}`}
                size="small"
                sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: '#e8f5e8', color: '#155724' }}
              />
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 2, pt: 1 }}>
          <DialogContentText sx={{ mb: 2, fontSize: '13px', color: '#666' }}>
            Please fill in the duty payment details below. All amounts should be entered in INR.
            {cell.row.original.cth_no && (
              <Box sx={{ mt: 1, color: 'success.main', fontWeight: 'bold', fontSize: '12px' }}>
                ✅ CTH rates auto-populated from database
              </Box>
            )}
          </DialogContentText>

          {/* Assessable Amount */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#555', mb: 0.5 }}>
              Assessable Amount (INR)
            </Typography>
            <TextField
              type="number"
              value={igstValues.assessable_ammount}
              onChange={(e) => setIgstValues({ ...igstValues, assessable_ammount: e.target.value })}
              fullWidth
              variant="outlined"
              size="small"
            />
          </Box>

          {/* Main Grid Layout */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            {/* BCD */}
            <Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#555', mb: 0.5 }}>
                BCD Rate (%)
              </Typography>
              <TextField
                type="number"
                value={igstValues.bcdRate}
                onChange={(e) => setIgstValues({ ...igstValues, bcdRate: e.target.value })}
                size="small"
                fullWidth
                placeholder="Enter BCD rate"
              />              <Box sx={{ 
                mt: 0.5, 
                p: 0.5, 
                backgroundColor: '#e8f5e8', 
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: '#28a745'
              }}>
                ₹{parseFloat(igstValues.bcd_ammount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Box>
            </Box>

            {/* SWS */}
            <Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#555', mb: 0.5 }}>
                SWS Rate (%)
              </Typography>
              <TextField
                type="number"
                value={igstValues.swsRate}
                onChange={(e) => setIgstValues({ ...igstValues, swsRate: e.target.value })}
                size="small"
                fullWidth
                placeholder="Default: 10%"
              />
              <Box sx={{ 
                mt: 0.5, 
                p: 0.5, 
                backgroundColor: '#e8f5e8', 
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: '#28a745'
              }}>
                ₹{parseFloat(igstValues.sws_ammount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Box>
            </Box>

            {/* IGST */}
            <Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#555', mb: 0.5 }}>
                IGST Rate (%)
              </Typography>
              <TextField
                type="number"
                value={igstValues.igstRate}
                onChange={(e) => setIgstValues({ ...igstValues, igstRate: e.target.value })}
                size="small"
                fullWidth
                placeholder="Enter IGST rate"
              />
              <Box sx={{ 
                mt: 0.5, 
                p: 0.5, 
                backgroundColor: '#e8f5e8', 
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: '#28a745'
              }}>
                ₹{parseFloat(igstValues.igst_ammount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Box>
            </Box>

            {/* Interest Amount */}
            <Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#555', mb: 0.5 }}>
                Interest Amount (Auto-calculated)
              </Typography>
              <Box sx={{ 
                p: 1, 
                backgroundColor: '#fff3cd', 
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#856404',
                textAlign: 'center',
                border: '1px solid #ffeaa7'
              }}>
                ₹{parseFloat(igstValues.intrest_ammount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Box>
              <Typography sx={{ fontSize: '10px', color: '#666', fontStyle: 'italic', mt: 0.5 }}>
                15% per annum between assessment & payment dates
              </Typography>
            </Box>

            {/* Penalty Amount */}
            <Box>
              <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#555', mb: 0.5 }}>
                Penalty Amount (Auto-calculated)
              </Typography>
              <Box sx={{ 
                p: 1, 
                backgroundColor: '#f8d7da', 
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#721c24',
                textAlign: 'center',
                border: '1px solid #f5c6cb'
              }}>
                ₹{parseFloat(igstValues.penalty_ammount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Box>
              <Typography sx={{ fontSize: '10px', color: '#666', fontStyle: 'italic', mt: 0.5 }}>
                Based on BE date vs arrival date comparison
              </Typography>
            </Box>

            {/* Fine Amount */}
            <Box sx={{ gridColumn: 'span 2' }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#555', mb: 0.5 }}>
                Fine Amount (INR)
              </Typography>
              <TextField
                type="number"
                value={igstValues.fine_ammount}
                onChange={(e) => setIgstValues({ ...igstValues, fine_ammount: e.target.value })}
                size="small"
                fullWidth
                placeholder="Enter fine amount"
              />
            </Box>
          </Box>

          {/* Total Summary */}
          <Box sx={{ mt: 3, p: 2, backgroundColor: "#f8f9fa", borderRadius: 2, border: '1px solid #dee2e6' }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1, fontSize: '14px', color: '#495057' }}>
              📊 Total Summary
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '11px', color: "#6c757d" }}>
                BCD: ₹{parseFloat(igstValues.bcd_ammount || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', color: "#6c757d" }}>
                SWS: ₹{parseFloat(igstValues.sws_ammount || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', color: "#6c757d" }}>
                IGST: ₹{parseFloat(igstValues.igst_ammount || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', color: "#6c757d" }}>
                Interest: ₹{parseFloat(igstValues.intrest_ammount || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', color: "#6c757d" }}>
                Penalty: ₹{parseFloat(igstValues.penalty_ammount || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '11px', color: "#6c757d" }}>
                Fine: ₹{parseFloat(igstValues.fine_ammount || 0).toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ 
              p: 1.5, 
              backgroundColor: '#ffeaa7', 
              borderRadius: '6px',
              border: '2px solid #fdcb6e'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: "bold", 
                color: "#2d3436",
                fontSize: '16px',
                textAlign: 'center'
              }}>
                💰 Total Duty: ₹{(
                  parseFloat(igstValues.bcd_ammount || 0) +
                  parseFloat(igstValues.igst_ammount || 0) +
                  parseFloat(igstValues.sws_ammount || 0) +
                  parseFloat(igstValues.intrest_ammount || 0) +
                  parseFloat(igstValues.penalty_ammount || 0) +
                  parseFloat(igstValues.fine_ammount || 0)
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ 
            fontSize: '10px', 
            color: '#666', 
            fontStyle: 'italic'
          }}>
            ⚠️ Interest & penalty amounts are auto-calculated
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={handleCloseIgstModal} 
              size="small" 
              variant="outlined"
              color="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleIgstSubmit}
              size="small"
              variant="contained"
              color="primary"
            >
              Save & Update
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
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
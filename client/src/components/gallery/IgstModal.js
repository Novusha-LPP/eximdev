import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
} from "@mui/material";

const IgstModal = ({
  open,
  onClose,
  onSubmit,
  rowData,
  dates,
  containers = []
}) => {
  const [igstValues, setIgstValues] = useState({
    assessable_ammount: "",
    igst_ammount: "",
    bcd_ammount: "",
    sws_ammount: "",
    intrest_ammount: "",
    penalty_ammount: "",
    fine_ammount: "",
    bcdRate: "",
    swsRate: "10",
    igstRate: "",
  });

  // Initialize IGST values when modal opens or rowData changes
  useEffect(() => {
    if (open && rowData) {
      setIgstValues({
        assessable_ammount: rowData.assessable_ammount || "",
        igst_ammount: rowData.igst_ammount || "",
        bcd_ammount: rowData.bcd_ammount || "",
        sws_ammount: rowData.sws_ammount || "",
        intrest_ammount: rowData.intrest_ammount || "",
        penalty_ammount: rowData.penalty_ammount || "",
        fine_ammount: rowData.fine_ammount || "",
        bcdRate: "",
        swsRate: "10",
        igstRate: rowData.igst_rate || "",
      });
    }
  }, [open, rowData]);

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
    const totalDuty =
      parseFloat(igstValues.bcd_ammount || 0) +
      parseFloat(igstValues.sws_ammount || 0) +
      parseFloat(igstValues.igst_ammount || 0);

    const assessmentDate = dates?.assessment_date || rowData?.assessment_date;
    const dutyPaidDate = dates?.duty_paid_date || rowData?.duty_paid_date;

    if (totalDuty <= 0 || !assessmentDate || !dutyPaidDate) return 0;

    const assessmentDateObj = new Date(assessmentDate);
    const dutyPaidDateObj = new Date(dutyPaidDate);

    if (isNaN(assessmentDateObj.getTime()) || isNaN(dutyPaidDateObj.getTime()))
      return 0;
    if (dutyPaidDateObj <= assessmentDateObj) return 0;

    const daysBetween = calculateDaysBetween(assessmentDate, dutyPaidDate);
    const interestAmount = ((totalDuty * 15) / 100 / 365) * daysBetween;

    return Math.round(interestAmount * 100) / 100;
  };

  // Calculate penalty amount
  const calculatePenaltyAmount = () => {
    const beDate = dates?.assessment_date || rowData?.be_date || rowData?.assessment_date;

    // Get arrival_date from containers (use the first container that has arrival_date)
    const containerWithArrival = containers.find((c) => c.arrival_date);
    const arrivalDate = containerWithArrival ? containerWithArrival.arrival_date : null;

    if (!arrivalDate) return 0;

    const arrivalDateObj = new Date(arrivalDate);
    const beDateObj = beDate ? new Date(beDate) : null;

    if (isNaN(arrivalDateObj.getTime())) return 0;

    // If be_date and arrival_date are same day
    if (
      beDateObj &&
      !isNaN(beDateObj.getTime()) &&
      arrivalDateObj.toDateString() === beDateObj.toDateString()
    ) {
      return 5000;
    }

    // If arrival_date is present and be_date is not present
    if (!beDate) {
      const today = new Date();
      const daysBetween = calculateDaysBetween(arrivalDate, today);
      let penalty = 0;

      if (daysBetween >= 30) {
        penalty = 355000;
      } else if (daysBetween >= 7) {
        penalty = 5000;
      }

      return penalty;
    }

    // If be_date is present and arrival_date is present
    if (beDateObj && !isNaN(beDateObj.getTime())) {
      const daysBetween = calculateDaysBetween(arrivalDate, beDate);
      let penalty = 0;

      if (daysBetween >= 30) {
        penalty = 355000;
      } else if (daysBetween >= 7) {
        penalty = 5000;
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

    // Only recalculate if we have at least one meaningful rate
    // Otherwise, keep the existing pre-filled values
    if (bcdRate > 0 || igstRate > 0) {
      const bcdAmount = (assessableValue * bcdRate) / 100;
      const swsAmount = (bcdAmount * swsRate) / 100;
      const igstAmount = ((assessableValue + bcdAmount + swsAmount) * igstRate) / 100;

      setIgstValues((prev) => ({
        ...prev,
        bcd_ammount: bcdAmount.toFixed(2),
        sws_ammount: swsAmount.toFixed(2),
        igst_ammount: igstAmount.toFixed(2),
      }));
    }
    // If no rates are available, keep the existing amounts from database
  };

  // Auto-calculate duty amounts when rates or assessable value change
  useEffect(() => {
    if (
      igstValues.assessable_ammount &&
      (igstValues.bcdRate || igstValues.swsRate || igstValues.igstRate)
    ) {
      const timeoutId = setTimeout(calculateDutyAmounts, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [
    igstValues.assessable_ammount,
    igstValues.bcdRate,
    igstValues.swsRate,
    igstValues.igstRate,
  ]);

  // Force calculation when modal opens and values are available
  useEffect(() => {
    if (open && igstValues.assessable_ammount) {
      const timeoutId = setTimeout(() => {
        calculateDutyAmounts();
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [
    open,
    igstValues.assessable_ammount,
    igstValues.bcdRate,
    igstValues.swsRate,
    igstValues.igstRate,
  ]);

  // Auto-calculate interest and penalty when relevant values change
  useEffect(() => {
    const interestAmount = calculateInterestAmount();
    const penaltyAmount = calculatePenaltyAmount();

    setIgstValues((prev) => ({
      ...prev,
      intrest_ammount: interestAmount.toFixed(2),
      penalty_ammount: penaltyAmount.toFixed(2),
    }));
  }, [
    igstValues.bcd_ammount,
    igstValues.sws_ammount,
    igstValues.igst_ammount,
    dates?.assessment_date,
    dates?.duty_paid_date,
    rowData?.assessment_date,
    rowData?.duty_paid_date,
    rowData?.be_date,
    containers,
  ]);

  
  const handleCthDataFetch = async () => {
    if (rowData?.cth_no && rowData?.job_no) {
      try {
        const apiUrl = process.env.REACT_APP_API_STRING || "http://localhost:9000";
        const response = await fetch(
          `${apiUrl}/jobs/${rowData.job_no}/update-duty-from-cth`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ cth_no: rowData.cth_no }),
          }
        );

        if (response.ok) {
          const result = await response.json();          // Extract rates from CTH data - ALWAYS prioritize basic_duty_ntfn (including "0")
          const bcdNtfnValue = result.addedFields?.cth_basic_duty_ntfn;
          const bcdSchValue = result.addedFields?.cth_basic_duty_sch;
          
          // Logic: ALWAYS use basic_duty_ntfn if it exists and is a valid number (including "0")
          let bcdRate = 0;
          
          // Check if basic_duty_ntfn is present and valid (including "0")
          const isBcdNtfnValid = bcdNtfnValue !== null && 
                                bcdNtfnValue !== undefined && 
                                bcdNtfnValue !== '' && 
                                bcdNtfnValue !== 'nan' && 
                                bcdNtfnValue !== 'NaN' &&
                                !isNaN(parseFloat(bcdNtfnValue));
          
          if (isBcdNtfnValid) {
            bcdRate = parseFloat(bcdNtfnValue);
          } else if (bcdSchValue && bcdSchValue !== '' && bcdSchValue !== 'nan' && bcdSchValue !== 'NaN' && !isNaN(parseFloat(bcdSchValue))) {
            bcdRate = parseFloat(bcdSchValue);
          }

          setIgstValues((prev) => ({
            ...prev,
            bcdRate: bcdRate.toString(),
            igstRate: result.addedFields?.cth_igst_ammount || prev.igstRate,
            swsRate: "10",
            ...(prev.assessable_ammount && {
              bcd_ammount: result.addedFields?.cth_bcd_ammount || prev.bcd_ammount,
              sws_ammount: result.addedFields?.cth_sws_ammount || prev.sws_ammount,
              igst_ammount: result.addedFields?.cth_igst_ammount || prev.igst_ammount,
            }),
          }));

          setTimeout(() => {
            calculateDutyAmounts();
          }, 100);
        }
      } catch (error) {
        console.error("Error in CTH duty lookup:", error);
      }
    }
  };

  // Call CTH data fetch when modal opens
  useEffect(() => {
    if (open) {
      handleCthDataFetch();
    }
  }, [open]);

  const handleSubmit = () => {
    const totalDuty = (
      parseFloat(igstValues.bcd_ammount || 0) +
      parseFloat(igstValues.igst_ammount || 0) +
      parseFloat(igstValues.sws_ammount || 0) +
      parseFloat(igstValues.intrest_ammount || 0) +
      parseFloat(igstValues.penalty_ammount || 0) +
      parseFloat(igstValues.fine_ammount || 0)
    ).toFixed(2);

    const updateData = {
      assessable_ammount: igstValues.assessable_ammount,
      igst_ammount: igstValues.igst_ammount,
      bcd_ammount: igstValues.bcd_ammount,
      sws_ammount: igstValues.sws_ammount,
      intrest_ammount: igstValues.intrest_ammount,
      penalty_ammount: igstValues.penalty_ammount,
      fine_ammount: igstValues.fine_ammount,
      total_duty: totalDuty,
      igst_rate: igstValues.igstRate,
    };

    onSubmit(updateData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "16px",
          maxHeight: "90vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
              }}
            >
              💸
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "white" }}>
              Duty Payment Calculator
            </Typography>
          </Box>
          {rowData?.cth_no && (
            <Chip
              label={`CTH: ${rowData.cth_no}`}
              size="small"
              sx={{
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: "rgba(255,255,255,0.9)",
                color: "#155724",
                backdropFilter: "blur(10px)",
              }}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, background: "white", color: "#333" }}>
        {/* Modern Side-by-Side Layout with Summary on Right */}
        <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 3 }}>
          {/* Left Side - Input Fields */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2.5, marginTop: "20px" }}>
            {/* Assessable Amount */}
            <Box
              sx={{
                p: 2.5,
                border: "1px solid #e3f2fd",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1565c0",
                  mb: 1.5,
                }}
              >
                💰 Assessable Amount (INR)
              </Typography>
              <TextField
                type="number"
                value={igstValues.assessable_ammount}
                onChange={(e) =>
                  setIgstValues(prev => ({ ...prev, assessable_ammount: e.target.value }))
                }
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Enter assessable amount"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                    borderRadius: "8px",
                    "& fieldset": { borderColor: "#e0e0e0" },
                    "&:hover fieldset": { borderColor: "#1565c0" },
                    "&.Mui-focused fieldset": { borderColor: "#1565c0" },
                  },
                }}
              />
            </Box>

            {/* Duty Components Grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {/* BCD Rate & Amount */}
              <Box
                sx={{
                  p: 2,
                  border: "1px solid #e8f5e8",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#2e7d32",
                    mb: 1,
                  }}
                >
                  🏛️ BCD Rate (%)
                </Typography>
                <TextField
                  type="number"
                  value={igstValues.bcdRate}
                  onChange={(e) =>
                    setIgstValues(prev => ({ ...prev, bcdRate: e.target.value }))
                  }
                  size="small"
                  fullWidth
                  placeholder="Enter BCD rate"
                  sx={{
                    mb: 1.5,
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: "6px",
                      "& fieldset": { borderColor: "#e0e0e0" },
                      "&:hover fieldset": { borderColor: "#2e7d32" },
                      "&.Mui-focused fieldset": { borderColor: "#2e7d32" },
                    },
                  }}
                />
                <Box
                  sx={{
                    p: 1.5,
                    background: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
                    borderRadius: "8px",
                    textAlign: "center",
                    boxShadow: "0 3px 10px rgba(76,175,80,0.3)",
                  }}
                >
                  <Typography sx={{ fontSize: "16px", fontWeight: 700, color: "white" }}>
                    ₹{parseFloat(igstValues.bcd_ammount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>

              {/* SWS Rate & Amount */}
              <Box
                sx={{
                  p: 2,
                  border: "1px solid #fff3e0",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#ef6c00",
                    mb: 1,
                  }}
                >
                  ⚓ SWS Rate (%)
                </Typography>
                <TextField
                  type="number"
                  value={igstValues.swsRate}
                  onChange={(e) =>
                    setIgstValues(prev => ({ ...prev, swsRate: e.target.value }))
                  }
                  size="small"
                  fullWidth
                  placeholder="Default: 10%"
                  sx={{
                    mb: 1.5,
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: "6px",
                      "& fieldset": { borderColor: "#e0e0e0" },
                      "&:hover fieldset": { borderColor: "#ef6c00" },
                      "&.Mui-focused fieldset": { borderColor: "#ef6c00" },
                    },
                  }}
                />
                <Box
                  sx={{
                    p: 1.5,
                    background: "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)",
                    borderRadius: "8px",
                    textAlign: "center",
                    boxShadow: "0 3px 10px rgba(255,152,0,0.3)",
                  }}
                >
                  <Typography sx={{ fontSize: "16px", fontWeight: 700, color: "white" }}>
                    ₹{parseFloat(igstValues.sws_ammount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>

              {/* IGST Rate & Amount */}
              <Box
                sx={{
                  p: 2,
                  border: "1px solid #f3e5f5",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#7b1fa2",
                    mb: 1,
                  }}
                >
                  📊 IGST Rate (%)
                </Typography>
                <TextField
                  type="number"
                  value={igstValues.igstRate}
                  onChange={(e) =>
                    setIgstValues(prev => ({ ...prev, igstRate: e.target.value }))
                  }
                  size="small"
                  fullWidth
                  placeholder="Enter IGST rate"
                  sx={{
                    mb: 1.5,
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: "6px",
                      "& fieldset": { borderColor: "#e0e0e0" },
                      "&:hover fieldset": { borderColor: "#7b1fa2" },
                      "&.Mui-focused fieldset": { borderColor: "#7b1fa2" },
                    },
                  }}
                />
                <Box
                  sx={{
                    p: 1.5,
                    background: "linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)",
                    borderRadius: "8px",
                    textAlign: "center",
                    boxShadow: "0 3px 10px rgba(156,39,176,0.3)",
                  }}
                >
                  <Typography sx={{ fontSize: "16px", fontWeight: 700, color: "white" }}>
                    ₹{parseFloat(igstValues.igst_ammount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>

              {/* Fine Amount */}
              <Box
                sx={{
                  p: 2,
                  border: "1px solid #e0f2f1",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#00695c",
                    mb: 1.5,
                  }}
                >
                  💳 Fine Amount (INR)
                </Typography>
                <TextField
                  type="number"
                  value={igstValues.fine_ammount}
                  onChange={(e) =>
                    setIgstValues(prev => ({ ...prev, fine_ammount: e.target.value }))
                  }
                  size="small"
                  fullWidth
                  placeholder="Enter fine amount"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: "6px",
                      "& fieldset": { borderColor: "#e0e0e0" },
                      "&:hover fieldset": { borderColor: "#00695c" },
                      "&.Mui-focused fieldset": { borderColor: "#00695c" },
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Interest Amount & Penalty Amount - Auto-calculated */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 2.5 }}>
              
              {/* Interest Amount (Auto-calculated) */}
              <Box sx={{ 
                p: 2.5, 
                border: "1px solid #fff3e0", 
                borderRadius: "10px",
                background: "linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
              }}>
                <Typography sx={{ 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#f57c00", 
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1
                }}>
                  ⏰ Interest Amount (Auto-calculated)
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  background: "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)", 
                  borderRadius: "8px",
                  textAlign: "center",
                  boxShadow: "0 3px 10px rgba(255,152,0,0.3)"
                }}>
                  <Typography sx={{ fontSize: "18px", fontWeight: 700, color: "white" }}>
                    ₹{parseFloat(igstValues.intrest_ammount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Typography sx={{ 
                  fontSize: "10px", 
                  color: "#666", 
                  fontStyle: "italic",
                  textAlign: "center",
                  mt: 1
                }}>
                  15% p.a. assessment to payment
                </Typography>
              </Box>

              {/* Penalty Amount (Auto-calculated) */}
              <Box sx={{ 
                p: 2.5, 
                border: "1px solid #ffebee", 
                borderRadius: "10px",
                background: "linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
              }}>
                <Typography sx={{ 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#c62828", 
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1
                }}>
                  ⚠️ Penalty Amount (Auto-calculated)
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  background: "linear-gradient(135deg, #f44336 0%, #e57373 100%)", 
                  borderRadius: "8px",
                  textAlign: "center",
                  boxShadow: "0 3px 10px rgba(244,67,54,0.3)"
                }}>
                  <Typography sx={{ fontSize: "18px", fontWeight: 700, color: "white" }}>
                    ₹{parseFloat(igstValues.penalty_ammount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Typography sx={{ 
                  fontSize: "10px", 
                  color: "#666", 
                  fontStyle: "italic",
                  textAlign: "center",
                  mt: 1
                }}>
                  BE vs arrival date comparison
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right Side - Summary Panel */}
          <Box>
            {/* Detailed Breakdown */}
            <Box
              sx={{
                p: 2.5,
                backgroundColor: "#f8f9fa",
                borderRadius: "12px",
                border: "1px solid #dee2e6",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                marginTop: "20px",
                mb: 3,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: "14px",
                  color: "#495057",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                📊 Breakdown
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1.5 }}>
                {[
                  { label: "BCD", value: igstValues.bcd_ammount, color: "#2e7d32", icon: "🏛️" },
                  { label: "SWS", value: igstValues.sws_ammount, color: "#ef6c00", icon: "⚓" },
                  { label: "IGST", value: igstValues.igst_ammount, color: "#7b1fa2", icon: "📊" },
                  { label: "Interest", value: igstValues.intrest_ammount, color: "#f57c00", icon: "⏰" },
                  { label: "Penalty", value: igstValues.penalty_ammount, color: "#c62828", icon: "⚠️" },
                  { label: "Fine", value: igstValues.fine_ammount, color: "#00695c", icon: "💳" },
                ].map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 1.5,
                      backgroundColor: "white",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid #e9ecef",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box>{item.icon}</Box>
                      <Typography sx={{ fontSize: "12px", color: "#6c757d", fontWeight: 500 }}>
                        {item.label}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "13px", fontWeight: 700, color: item.color }}>
                      ₹{parseFloat(item.value || 0).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Grand Total */}
            <Box
              sx={{
                p: 3,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "15px",
                color: "white",
                textAlign: "center",
                boxShadow: "0 8px 25px rgba(102,126,234,0.4)",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: "16px",
                  mb: 1,
                  opacity: 0.9,
                }}
              >
                💰 Total Duty Amount
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  fontSize: "28px",
                  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                ₹{(
                  parseFloat(igstValues.bcd_ammount || 0) +
                  parseFloat(igstValues.igst_ammount || 0) +
                  parseFloat(igstValues.sws_ammount || 0) +
                  parseFloat(igstValues.intrest_ammount || 0) +
                  parseFloat(igstValues.penalty_ammount || 0) +
                  parseFloat(igstValues.fine_ammount || 0)
                ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          borderTop: "1px solid #dee2e6",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: "11px",
              color: "#666",
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Box sx={{ fontSize: "14px" }}>🤖</Box>
            Interest & penalty amounts are auto-calculated
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              onClick={onClose}
              variant="outlined"
              sx={{
                borderRadius: "25px",
                px: 3,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#6c757d",
                color: "#6c757d",
                "&:hover": {
                  borderColor: "#5a6268",
                  backgroundColor: "rgba(108, 117, 125, 0.1)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              sx={{
                borderRadius: "25px",
                px: 3,
                textTransform: "none",
                fontWeight: 700,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                "&:hover": {
                  background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                  boxShadow: "0 6px 20px rgba(102, 126, 234, 0.6)",
                },
              }}
            >
              💾 Save & Update
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default IgstModal;

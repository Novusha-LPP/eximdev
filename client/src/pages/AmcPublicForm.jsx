import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  CircularProgress,
  Divider,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { amcVisitorAPI } from "../api/amcVisitorAPI";
import toast from "react-hot-toast";

const AMC_CATEGORIES = [
  "HVAC/Air Conditioning",
  "Electrical Systems",
  "Plumbing & Firefighting",
  "Lift & Escalator",
  "CCTV & Security",
  "IT & Networking",
  "Generator & UPS",
  "Pest Control",
  "Housekeeping/Cleaning",
  "RO Water",
  "Fire Extinguisher",
  "Other Maintenance",
];

const DEPARTMENTS = [
  "Main Entry/Security Gate",
  "Admin Block",
  "Operations Area",
  "Server Room",
  "Production Floor",
  "Warehouse",
  "Cafeteria",
  "HR Department",
  "Accounts Department",
  "Entire Premises",
];

export default function AmcPublicForm() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "checkout" ? 1 : 0;
  const [tabValue, setTabValue] = useState(initialMode);

  // Check-In Form State
  const [checkInForm, setCheckInForm] = useState({
    supplierCompany: "",
    technicianName: "",
    mobileNo: "",
    purpose: "",
    amcCategory: "",
    departmentArea: "",
  });

  // Check-Out Form State
  const [mobileSearch, setMobileSearch] = useState("");
  const [activeLog, setActiveLog] = useState(null);
  const [searching, setSearching] = useState(false);
  const [checkOutForm, setCheckOutForm] = useState({
    workStatus: "Completed",
    employeeApprovalName: "",
    remarks: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Sync mode if query param changes
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "checkout") setTabValue(1);
    else if (mode === "checkin") setTabValue(0);
  }, [searchParams]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setActiveLog(null);
    setMobileSearch("");
  };

  const handleCheckInChange = (e) => {
    const { name, value } = e.target;
    setCheckInForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckOutChange = (e) => {
    const { name, value } = e.target;
    setCheckOutForm((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Check-In
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!checkInForm.supplierCompany || !checkInForm.technicianName || !checkInForm.mobileNo || !checkInForm.purpose || !checkInForm.amcCategory || !checkInForm.departmentArea) {
      toast.error("Please fill all mandatory fields");
      return;
    }

    setSubmitting(true);
    try {
      await amcVisitorAPI.checkIn(checkInForm);
      toast.success("Check-In Successful! Welcome to the premises.");
      // Reset form
      setCheckInForm({
        supplierCompany: "",
        technicianName: "",
        mobileNo: "",
        purpose: "",
        amcCategory: "",
        departmentArea: "",
      });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to check in");
    } finally {
      setSubmitting(false);
    }
  };

  // Search Active Log for Check-Out
  const handleSearchActiveLog = async (e) => {
    e.preventDefault();
    if (!mobileSearch) {
      toast.error("Please enter your mobile number");
      return;
    }

    setSearching(true);
    setActiveLog(null);
    try {
      const data = await amcVisitorAPI.getActiveByMobile(mobileSearch);
      if (data && data.success && data.data) {
        setActiveLog(data.data);
        toast.success("Check-in record found!");
      } else {
        toast.error("No active check-in found for this mobile number.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Active record not found");
    } finally {
      setSearching(false);
    }
  };

  // Submit Check-Out
  const handleCheckOutSubmit = async (e) => {
    e.preventDefault();
    if (!activeLog) return;
    if (!checkOutForm.employeeApprovalName || !checkOutForm.remarks) {
      toast.error("Please fill all mandatory fields");
      return;
    }

    setSubmitting(true);
    try {
      await amcVisitorAPI.checkOut({
        mobileNo: activeLog.mobileNo,
        workStatus: checkOutForm.workStatus,
        employeeApprovalName: checkOutForm.employeeApprovalName,
        remarks: checkOutForm.remarks,
      });
      toast.success("Check-Out Successful! Thank you for your service.");
      setActiveLog(null);
      setMobileSearch("");
      setCheckOutForm({
        workStatus: "Completed",
        employeeApprovalName: "",
        remarks: "",
      });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to check out");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        py: 4,
        px: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ color: "#0f766e", letterSpacing: "0.5px" }}
            >
              AMC SUPPLIER CHECK-IN / CHECK-OUT
            </Typography>
            <Typography variant="body2" sx={{ color: "#475569", mt: 1 }}>
              Please enter entry / exit logs before entering or leaving the premises.
            </Typography>
          </Box>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            centered
            sx={{
              mb: 3,
              "& .MuiTabs-indicator": { backgroundColor: "#0f766e" },
              "& .MuiTab-root.Mui-selected": { color: "#0f766e", fontWeight: "bold" },
            }}
          >
            <Tab label="Check-In (Entry)" />
            <Tab label="Check-Out (Exit)" />
          </Tabs>

          {tabValue === 0 ? (
            // ─── CHECK IN FORM ───
            <form onSubmit={handleCheckInSubmit}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Supplier Company Name"
                  name="supplierCompany"
                  value={checkInForm.supplierCompany}
                  onChange={handleCheckInChange}
                  required
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  label="Technician Name"
                  name="technicianName"
                  value={checkInForm.technicianName}
                  onChange={handleCheckInChange}
                  required
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  label="Mobile Number"
                  name="mobileNo"
                  type="tel"
                  value={checkInForm.mobileNo}
                  onChange={handleCheckInChange}
                  required
                  fullWidth
                  variant="outlined"
                  helperText="10 digit mobile number"
                />
                <TextField
                  label="Purpose of Visit"
                  name="purpose"
                  value={checkInForm.purpose}
                  onChange={handleCheckInChange}
                  required
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={2}
                />

                <FormControl fullWidth required>
                  <InputLabel>AMC Category</InputLabel>
                  <Select
                    name="amcCategory"
                    value={checkInForm.amcCategory}
                    onChange={handleCheckInChange}
                    label="AMC Category"
                  >
                    {AMC_CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>Department/Area to Visit</InputLabel>
                  <Select
                    name="departmentArea"
                    value={checkInForm.departmentArea}
                    onChange={handleCheckInChange}
                    label="Department/Area to Visit"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    fontSize: "1rem",
                    fontWeight: "bold",
                    backgroundColor: "#0f766e",
                    "&:hover": { backgroundColor: "#0d9488" },
                  }}
                >
                  {submitting ? <CircularProgress size={24} color="inherit" /> : "Confirm Check-In"}
                </Button>
              </Box>
            </form>
          ) : (
            // ─── CHECK OUT FORM ───
            <Box>
              {!activeLog ? (
                <form onSubmit={handleSearchActiveLog}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      Enter your mobile number to retrieve your active check-in log.
                    </Typography>
                    <TextField
                      label="Mobile Number"
                      type="tel"
                      value={mobileSearch}
                      onChange={(e) => setMobileSearch(e.target.value)}
                      required
                      fullWidth
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={searching}
                      sx={{
                        py: 1.5,
                        backgroundColor: "#0f766e",
                        "&:hover": { backgroundColor: "#0d9488" },
                      }}
                    >
                      {searching ? <CircularProgress size={24} color="inherit" /> : "Search Active Log"}
                    </Button>
                  </Box>
                </form>
              ) : (
                <form onSubmit={handleCheckOutSubmit}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "8px",
                        backgroundColor: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <Typography variant="subtitle2" color="#166534" fontWeight="bold">
                        Active Check-In Found:
                      </Typography>
                      <Typography variant="body2" color="#1e293b" mt={0.5}>
                        <strong>Company:</strong> {activeLog.supplierCompany}
                      </Typography>
                      <Typography variant="body2" color="#1e293b">
                        <strong>Technician:</strong> {activeLog.technicianName}
                      </Typography>
                      <Typography variant="body2" color="#1e293b">
                        <strong>Check-In Time:</strong>{" "}
                        {new Date(activeLog.checkInTime).toLocaleString()}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <FormControl fullWidth required>
                      <InputLabel>Work Completion Status</InputLabel>
                      <Select
                        name="workStatus"
                        value={checkOutForm.workStatus}
                        onChange={handleCheckOutChange}
                        label="Work Completion Status"
                      >
                        <MenuItem value="Pending">Pending / Incomplete</MenuItem>
                        <MenuItem value="In Progress">In Progress (Will return)</MenuItem>
                        <MenuItem value="Completed">Completed</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      label="Employee Approval Name"
                      name="employeeApprovalName"
                      value={checkOutForm.employeeApprovalName}
                      onChange={handleCheckOutChange}
                      required
                      fullWidth
                      placeholder="Name of the employee who verified the work"
                    />

                    <TextField
                      label="Remarks / Work Details"
                      name="remarks"
                      value={checkOutForm.remarks}
                      onChange={handleCheckOutChange}
                      required
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Please specify what work was done..."
                    />

                    <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setActiveLog(null)}
                        disabled={submitting}
                        sx={{ py: 1.5, color: "#475569", borderColor: "#cbd5e1" }}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={submitting}
                        sx={{
                          py: 1.5,
                          backgroundColor: "#b91c1c",
                          "&:hover": { backgroundColor: "#991b1b" },
                        }}
                      >
                        {submitting ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          "Confirm Check-Out"
                        )}
                      </Button>
                    </Box>
                  </Box>
                </form>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

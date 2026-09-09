import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  LinearProgress,
  Alert,
  Chip
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import BoltIcon from "@mui/icons-material/Bolt";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import axios from "axios";

export default function MasterDataSyncDialog({ open, onClose, onSyncSuccess }) {
  const API_BASE = process.env.REACT_APP_API_STRING || "";

  const [selectedYear, setSelectedYear] = useState("ALL");
  const [availableYears, setAvailableYears] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overview, setOverview] = useState({
    totalJobs: 0,
    jobsWithExtractedDuties: 0,
    jobsWithAttachedBoeFiles: 0,
    totalHarvestedRules: 0,
    sectionBCount: 0,
    sectionCCount: 0,
    sectionDCount: 0,
    availableYears: []
  });

  const [syncMode, setSyncMode] = useState("FAST_DUTIES_SYNC");
  const [batchLimit, setBatchLimit] = useState("ALL");
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const pollIntervalRef = useRef(null);

  const fetchSyncOverview = async (yearToFetch = selectedYear) => {
    setLoadingOverview(true);
    try {
      const res = await axios.get(`${API_BASE}/notifications/sync/overview`, {
        params: { year: yearToFetch }
      });
      if (res.data.success) {
        setOverview(res.data.data);
        if (res.data.data?.availableYears) {
          setAvailableYears(res.data.data.availableYears);
        }
      }
    } catch (err) {
      console.error("Error fetching sync overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const pollProgress = async () => {
    try {
      const res = await axios.get(`${API_BASE}/notifications/sync/progress`);
      if (res.data.success && res.data.data) {
        const p = res.data.data;
        setProgressData(p);
        if (p.isRunning) {
          setSyncing(true);
        } else {
          setSyncing(false);
          setCancelling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (p.status === "COMPLETED" || p.status === "CANCELLED") {
            if (onSyncSuccess) onSyncSuccess();
            fetchSyncOverview(selectedYear);
          }
        }
      }
    } catch (err) {
      console.error("Error polling sync progress:", err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSyncOverview("ALL");
      setSelectedYear("ALL");
      setErrorMsg("");
      // Check if a sync is already running on server
      pollProgress();
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [open]);

  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    fetchSyncOverview(newYear);
  };

  const handleStartSync = async () => {
    setSyncing(true);
    setCancelling(false);
    setErrorMsg("");
    setProgressData({
      isRunning: true,
      percent: 0,
      processedJobs: 0,
      totalJobs: 0,
      ocrProcessedCount: 0,
      harvestedEntries: 0,
      currentJobNo: "",
      status: "RUNNING",
      message: "Starting background sync..."
    });

    try {
      const res = await axios.post(`${API_BASE}/notifications/sync/start`, {
        mode: syncMode,
        year: selectedYear,
        batchLimit
      });

      if (res.data.success) {
        // Start polling progress every 1.5 seconds
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(pollProgress, 1500);
      } else {
        setSyncing(false);
        setErrorMsg(res.data.message || "Failed to start sync.");
      }
    } catch (err) {
      console.error("Error starting sync:", err);
      setSyncing(false);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to start Master Data Sync.");
    }
  };

  const handleCancelSync = async () => {
    setCancelling(true);
    try {
      await axios.post(`${API_BASE}/notifications/sync/cancel`);
    } catch (err) {
      console.error("Error cancelling sync:", err);
    }
  };

  const isRunning = syncing || progressData?.isRunning;
  const percent = progressData?.percent || 0;

  return (
    <Dialog open={open} onClose={isRunning ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
        <SyncIcon sx={{ color: "#2563eb", fontSize: 32 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Master Data Sync from Bill of Entry Files
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            Background non-blocking engine to scan and harvest duties across all existing jobs & attached BOE PDFs.
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ background: "#f8fafc" }}>
        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

        {/* Top Control Bar: Year Selection and Batch Limit */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: "1px solid #cbd5e1", borderRadius: 2, background: "#ffffff" }}>
          <Grid container spacing={2} alignItems="center">
            {/* Year Selector */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="sync-year-select-label">Select Shipment Year</InputLabel>
                <Select
                  labelId="sync-year-select-label"
                  value={selectedYear}
                  label="Select Shipment Year"
                  onChange={(e) => handleYearChange(e.target.value)}
                  disabled={isRunning}
                >
                  <MenuItem value="ALL">
                    <em>🌐 All Years (Complete Database: {overview.totalJobs.toLocaleString("en-IN")} Jobs)</em>
                  </MenuItem>
                  {availableYears.map((yr) => (
                    <MenuItem key={yr} value={yr}>
                      📅 Year: <strong>{yr}</strong>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Batch Scope Selector */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="batch-scope-select-label">Sync Scope / Batch Size</InputLabel>
                <Select
                  labelId="batch-scope-select-label"
                  value={batchLimit}
                  label="Sync Scope / Batch Size"
                  onChange={(e) => setBatchLimit(e.target.value)}
                  disabled={isRunning}
                >
                  <MenuItem value="ALL">⚡ All Matching Jobs (Full Complete Database Sync)</MenuItem>
                  <MenuItem value="1000">Batch of 1,000 Jobs</MenuItem>
                  <MenuItem value="500">Batch of 500 Jobs</MenuItem>
                  <MenuItem value="100">Batch of 100 Jobs</MenuItem>
                  <MenuItem value="50">Batch of 50 Jobs</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Database Overview Cards for Selected Year */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#334155" }}>
            Document Status for {selectedYear === "ALL" ? "All Years (Full Database)" : `Year: ${selectedYear}`}
          </Typography>
          {loadingOverview && <CircularProgress size={16} />}
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.8, border: "1px solid #e2e8f0", borderRadius: 2, background: "#ffffff" }}>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Total Jobs
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                {overview.totalJobs.toLocaleString("en-IN")}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.8, border: "1px solid #93c5fd", borderRadius: 2, background: "#eff6ff" }}>
              <Typography variant="caption" sx={{ color: "#2563eb", fontWeight: 700, textTransform: "uppercase" }}>
                Jobs w/ Extracted Duties
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1e3a8a" }}>
                {overview.jobsWithExtractedDuties.toLocaleString("en-IN")}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.8, border: "1px solid #bbf7d0", borderRadius: 2, background: "#f0fdf4" }}>
              <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 700, textTransform: "uppercase" }}>
                Jobs w/ Attached BOEs
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#166534" }}>
                {overview.jobsWithAttachedBoeFiles.toLocaleString("en-IN")}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={0} sx={{ p: 1.8, border: "1px solid #fed7aa", borderRadius: 2, background: "#fff7ed" }}>
              <Typography variant="caption" sx={{ color: "#ea580c", fontWeight: 700, textTransform: "uppercase" }}>
                Harvested Rules
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#9a3412" }}>
                {overview.totalHarvestedRules.toLocaleString("en-IN")}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Sync Mode Selection */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>
          Select Sync Operation
        </Typography>

        <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
          <RadioGroup value={syncMode} onChange={(e) => setSyncMode(e.target.value)}>
            {/* Mode 1: Fast Duties Sync */}
            <Paper
              elevation={0}
              onClick={() => !isRunning && setSyncMode("FAST_DUTIES_SYNC")}
              sx={{
                p: 2,
                mb: 1.5,
                border: syncMode === "FAST_DUTIES_SYNC" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                borderRadius: 2,
                background: syncMode === "FAST_DUTIES_SYNC" ? "#f0f7ff" : "#ffffff",
                cursor: isRunning ? "default" : "pointer"
              }}
            >
              <FormControlLabel
                value="FAST_DUTIES_SYNC"
                control={<Radio disabled={isRunning} />}
                label={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 0.8 }}>
                      <BoltIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                      Fast Sync (Harvest from Existing Extracted Duties)
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b", fontSize: "12.5px" }}>
                      Instant scan across all jobs where Part-III duties are already extracted. Harvests Sections B, C, & D into master directories without OCR delays.
                    </Typography>
                  </Box>
                }
              />
            </Paper>

            {/* Mode 2: Deep BOE File OCR Sync */}
            <Paper
              elevation={0}
              onClick={() => !isRunning && setSyncMode("DEEP_BOE_FILE_SYNC")}
              sx={{
                p: 2,
                border: syncMode === "DEEP_BOE_FILE_SYNC" ? "2px solid #059669" : "1px solid #cbd5e1",
                borderRadius: 2,
                background: syncMode === "DEEP_BOE_FILE_SYNC" ? "#f0fdf4" : "#ffffff",
                cursor: isRunning ? "default" : "pointer"
              }}
            >
              <FormControlLabel
                value="DEEP_BOE_FILE_SYNC"
                control={<Radio disabled={isRunning} />}
                label={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#065f46", display: "flex", alignItems: "center", gap: 0.8 }}>
                      <FindInPageIcon sx={{ color: "#059669", fontSize: 20 }} />
                      Deep BOE File Sync (OCR Ingestion for Attached PDFs)
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b", fontSize: "12.5px" }}>
                      Scans jobs with attached BOE PDF files (Processed BE, BE Copy, In-Bond BE). Triggers OCR parsing for unparsed documents, saves duties directly to the job (updating View Job), and populates master directories.
                    </Typography>
                  </Box>
                }
              />
            </Paper>
          </RadioGroup>
        </FormControl>

        {/* Real-time Progress Bar & Feedback */}
        {progressData && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              border: isRunning
                ? "1.5px solid #2563eb"
                : progressData.status === "COMPLETED"
                ? "1.5px solid #16a34a"
                : progressData.status === "CANCELLED"
                ? "1.5px solid #f59e0b"
                : "1px solid #e2e8f0",
              borderRadius: 2,
              background: isRunning ? "#eff6ff" : progressData.status === "COMPLETED" ? "#f0fdf4" : "#fffbeb",
              mt: 2
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isRunning ? "#1e3a8a" : progressData.status === "COMPLETED" ? "#166534" : "#b45309" }}>
                {isRunning
                  ? "⚡ Sync in Progress..."
                  : progressData.status === "COMPLETED"
                  ? "✅ Master Data Sync Completed!"
                  : progressData.status === "CANCELLED"
                  ? "⚠️ Sync Cancelled by User"
                  : "Sync Status"}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#1e3a8a" }}>
                {percent}%
              </Typography>
            </Box>

            {/* Progress Bar */}
            <LinearProgress
              variant={isRunning && percent === 0 ? "indeterminate" : "determinate"}
              value={percent}
              sx={{ height: 10, borderRadius: 5, mb: 1.5, background: "#e2e8f0", "& .MuiLinearProgress-bar": { borderRadius: 5 } }}
            />

            <Typography variant="body2" sx={{ color: "#475569", fontSize: "13px", mb: 1.5 }}>
              {progressData.message}
            </Typography>

            {/* Live Metrics Chips */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={`Processed: ${progressData.processedJobs?.toLocaleString("en-IN") || 0} / ${progressData.totalJobs?.toLocaleString("en-IN") || 0} Jobs`}
                color="primary"
                variant={isRunning ? "filled" : "outlined"}
              />
              <Chip
                size="small"
                label={`OCR Documents: ${progressData.ocrProcessedCount?.toLocaleString("en-IN") || 0}`}
                color="info"
              />
              <Chip
                size="small"
                label={`Harvested Rules: ${progressData.harvestedEntries?.toLocaleString("en-IN") || 0}`}
                color="success"
              />
              {progressData.currentJobNo && (
                <Chip
                  size="small"
                  label={`Current: ${progressData.currentJobNo}`}
                  variant="outlined"
                  sx={{ fontFamily: "monospace" }}
                />
              )}
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, display: "flex", justifyContent: "space-between" }}>
        <Box>
          {isRunning && (
            <Button
              variant="outlined"
              color="warning"
              disabled={cancelling}
              onClick={handleCancelSync}
              startIcon={<StopCircleIcon />}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {cancelling ? "Stopping..." : "Cancel Sync"}
            </Button>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button onClick={onClose} disabled={isRunning} sx={{ textTransform: "none", fontWeight: 600 }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleStartSync}
            disabled={isRunning || loadingOverview}
            startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            sx={{
              background: "#2563eb",
              fontWeight: 700,
              textTransform: "none",
              px: 2.5,
              "&:hover": { background: "#1d4ed8" }
            }}
          >
            {isRunning ? `Syncing (${percent}%)...` : `Start Master Data Sync (${selectedYear === "ALL" ? "All Years" : selectedYear})`}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

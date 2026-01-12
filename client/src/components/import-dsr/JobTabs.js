import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import ToolboxIcon from "@mui/icons-material/BuildCircle";
import ApiIcon from "@mui/icons-material/Api";
import JobList from "./JobList";
import ImportUtilityTool from "../import-utility-tool/ImportUtilityTool";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import Badge from "@mui/material/Badge";
import { UserContext } from "../../contexts/UserContext";
import { useContext } from "react";
import { BranchContext } from "../../contexts/BranchContext";
import {
  TextField,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Divider,
  InputAdornment,
  Tooltip,
  Fade,
  Stack,
} from "@mui/material";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DateRangeIcon from "@mui/icons-material/DateRange";
import DownloadIcon from "@mui/icons-material/Download";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import DescriptionIcon from "@mui/icons-material/Description";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";

export const TabContext = React.createContext({
  currentTab: 0,
  setCurrentTab: () => { },
  navigate: () => { },
});

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

// --- Enhanced Configuration with Icons ---
const API_CATEGORIES = [
  {
    id: "dates",
    title: "Date Tracking",
    icon: <DateRangeIcon />,
    description: "Sync critical logistics dates from various sources.",
    apis: [
      { name: "Container Rail Out", endpoint: "fetch_port_out_date", description: "Sync Rail Out Date from Port Out emails." },
      { name: "ICD Arrival", endpoint: "fetch_icd_arrival_date", description: "Sync ICD Arrival Date from notices." },
      { name: "FDS Out (Delivery)", endpoint: "fetch_fds_out_date", description: "Sync Delivery Date from FDS Out emails." },
      { name: "FDS Gate In (Empty)", endpoint: "fetch_fds_Gate_in_date", description: "Sync Empty Offload Date from Gate In." },
      { name: "Vehicle Departure", endpoint: "fetch_vehicle_departure_date", description: "Sync Vehicle Departure Date." },
    ]
  },
  {
    id: "docs",
    title: "Documents",
    icon: <DescriptionIcon />,
    description: "Fetch and attach logistics documents.",
    apis: [
      { name: "Fetch BoE Number", endpoint: "fetch_ack_files", description: "Extract BoE Number from ACK files." },
      { name: "BoE First Copy", endpoint: "fetch_boe_first_copy", description: "Download BoE First Copy." },
      { name: "BoE OOC Copy", endpoint: "fetch_boe_ooc_copy", description: "Download OOC Copy." },
      { name: "eGatePass", endpoint: "fetch_boe_egatepass", description: "Download eGatePass PDF." },
      { name: "Shipping Line Invoices", endpoint: "fetch_shipping_line_invoices", description: "Fetch available invoices." },
      { name: "Weighment Slips", endpoint: "fetch_weighment_slips", description: "Fetch weighment slips." },
      { name: "Upload Confirmation", endpoint: "document_upload_confirmation", description: "Verify document upload status." },
    ]
  },
  {
    id: "system",
    title: "System & Logs",
    icon: <MonitorHeartIcon />,
    description: "System health, logs, and batch operations.",
    apis: [
      { name: "Run All Automations", endpoint: "run_all", description: "Execute all sync jobs sequentially.", variant: "gradient" },
      { name: "Logs by Date", endpoint: "logs/by_date", description: "View daily execution logs." },
      { name: "Logs by Job", endpoint: "logs/by_job", param: "job_no", description: "View logs for a specific job." },
    ]
  }
];

function JobTabs() {
  const [value, setValue] = React.useState(0);
  const [openUtilityTool, setOpenUtilityTool] = React.useState(false);
  const [openApiFetch, setOpenApiFetch] = React.useState(false);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  // Bot UI State
  const [activeCategory, setActiveCategory] = useState("dates");
  const DefaultDate = new Date();
  const [apiFilters, setApiFilters] = useState({
    date: DefaultDate.toISOString().split("T")[0],
    limit: "",
    job_no: "",
  });

  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [selectedApi, setSelectedApi] = useState(null);

  const location = useLocation();
  const { setSearchQuery, setDetailedStatus, setSelectedICD, setSelectedImporter } = useSearchQuery();
  const { user } = useContext(UserContext);
  const { selectedBranch } = useContext(BranchContext);

  const filteredCategories = React.useMemo(() => {
    return API_CATEGORIES.map(cat => ({
      ...cat,
      apis: cat.apis.filter(api => {
        if (selectedBranch === "GANDHIDHAM") {
          if (api.name === "Container Rail Out") return false;
        }
        return true;
      })
    }));
  }, [selectedBranch]);


  // --- Effects ---
  React.useEffect(() => {
    if (location.state?.fromJobDetails && location.state?.tabIndex !== undefined) {
      setValue(location.state.tabIndex);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // --- Handlers ---
  const handleChange = (event, newValue) => {
    setSearchQuery("");
    setDetailedStatus("all");
    setSelectedICD("all");
    setSelectedImporter("");
    setValue(newValue);
  };

  const handleOpenUtilityTool = () => setOpenUtilityTool(true);
  const handleCloseUtilityTool = () => setOpenUtilityTool(false);
  const handleOpenApiFetch = () => { setOpenApiFetch(true); setApiResponse(null); setSelectedApi(null); };
  const handleCloseApiFetch = () => { setOpenApiFetch(false); setApiResponse(null); setSelectedApi(null); };

  const handleDatePreset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    handleFilterChange("date", d.toISOString().split("T")[0]);
  };

  const handleFilterChange = (field, value) => {
    setApiFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApiCall = async (apiConfig) => {
    if (apiConfig.param === "job_no" && !apiFilters.job_no) {
      alert("Please enter a Job Number");
      return;
    }

    setLoading(true);
    setSelectedApi(apiConfig);
    setApiResponse(null);

    const baseUrl = "https://eximbot.alvision.in";

    try {
      const params = new URLSearchParams();
      if (apiFilters.date) params.append("date", apiFilters.date);
      if (apiFilters.limit) params.append("limit", apiFilters.limit);
      params.append("debug", "false");

      let endpointUrl = `${baseUrl}/${apiConfig.endpoint}`;
      if (apiConfig.param === "job_no") {
        endpointUrl = `${baseUrl}/${apiConfig.endpoint}/${apiFilters.job_no}`;
      }

      const url = `${endpointUrl}?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "accept": "application/json"
        }
      });

      if (response.status === 404) {
        setApiResponse({
          success: false,
          is404: true,
          error: "No matching data found for this request.",
          url: url,
        });
      } else if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      } else {
        const data = await response.json();
        setApiResponse({
          success: true,
          data: data,
          url: url,
        });
      }
    } catch (error) {
      setApiResponse({
        success: false,
        error: error.message || "Network Error - Check Console",
        url: window.location.protocol === 'https:' && baseUrl.startsWith('http:')
          ? "Blocked: Mixed Content (HTTPS -> HTTP)"
          : (selectedApi ? `${baseUrl}/${selectedApi.endpoint}` : "Unknown URL"), // Fallback to reconstruct URL if variable scope issue
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiResponse?.data) {
      navigator.clipboard.writeText(JSON.stringify(apiResponse.data, null, 2));
      alert("Copied to clipboard!");
    }
  };

  // --- Styles ---
  const mainButtonStyle = {
    borderRadius: 3,
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.875rem",
    padding: "8px 24px",
    background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2)",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
      transform: "translateY(-1px)",
      boxShadow: "0 6px 16px rgba(25, 118, 210, 0.3)",
    },
  };

  const getCategoryIcon = (id) => {
    const cat = API_CATEGORIES.find(c => c.id === id);
    return cat ? cat.icon : <ApiIcon />;
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header Tabs & Actions */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Tabs value={value} onChange={handleChange} aria-label="job type tabs" sx={{ '& .MuiTab-root': { fontWeight: 600 } }}>
          <Tab label="Pending" {...a11yProps(0)} />
          <Tab label="Completed" {...a11yProps(1)} />
          <Tab label="Cancelled" {...a11yProps(2)} />
        </Tabs>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ position: "relative" }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowUnresolvedOnly((prev) => !prev)}
              sx={{
                ...mainButtonStyle,
                background: showUnresolvedOnly
                  ? "linear-gradient(135deg, #d32f2f 0%, #c62828 100%)" // Red for "Show All" (Active Filter)
                  : "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)", // Blue for "Pending Queries"
                boxShadow: showUnresolvedOnly ? "0 4px 12px rgba(211, 47, 47, 0.3)" : mainButtonStyle.boxShadow
              }}
            >
              {showUnresolvedOnly ? "Show All Jobs" : "Pending Queries"}
            </Button>
            <Badge
              badgeContent={unresolvedCount}
              color="error"
              sx={{ position: "absolute", top: -5, right: -5 }}
            />
          </Box>

          {(user.role === "Admin" || user.can_access_exim_bot) && (
            <Button
              variant="contained"
              startIcon={<AutoModeIcon />}
              onClick={handleOpenApiFetch}
              sx={{ ...mainButtonStyle, background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)" }}
            >
              Exim Bot
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={<ToolboxIcon />}
            onClick={handleOpenUtilityTool}
            sx={mainButtonStyle}
          >
            Utility Tool
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <CustomTabPanel value={value} index={0}>
        <JobList status="Pending" showUnresolvedOnly={showUnresolvedOnly} onUnresolvedCountChange={setUnresolvedCount} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <JobList status="Completed" showUnresolvedOnly={showUnresolvedOnly} onUnresolvedCountChange={setUnresolvedCount} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <JobList status="Cancelled" showUnresolvedOnly={showUnresolvedOnly} onUnresolvedCountChange={setUnresolvedCount} />
      </CustomTabPanel>

      {/* --- Utility Tool Modal --- */}
      <Dialog
        open={openUtilityTool}
        onClose={handleCloseUtilityTool}
        maxWidth="lg"
        fullWidth
        sx={{ "& .MuiDialog-paper": { width: "90%", height: "90%", maxHeight: "95vh", borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", borderBottom: 1, borderColor: "divider" }}>
          Import Utility Tool
          <IconButton onClick={handleCloseUtilityTool}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}><ImportUtilityTool /></DialogContent>
      </Dialog>

      {/* --- Exim Bot Modal (World Class UI) --- */}
      {(user.role === "Admin" || user.can_access_exim_bot) && (
        <Dialog
          open={openApiFetch}
          onClose={handleCloseApiFetch}
          maxWidth="lg"
          fullWidth
          sx={{ "& .MuiDialog-paper": { width: "90%", height: "90%", maxHeight: "90vh", borderRadius: 4, overflow: 'hidden' } }}
        >
          {/* 1. Modal Header */}
          <Box sx={{
            p: 2, px: 3,
            background: "linear-gradient(90deg, #0d47a1 0%, #1976d2 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AutoModeIcon fontSize="large" sx={{ opacity: 0.9 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">Exim Bot Command Center</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Logistics Automation & Synchronization</Typography>
              </Box>
            </Box>
            <IconButton onClick={handleCloseApiFetch} sx={{ color: "white" }}><CloseIcon /></IconButton>
          </Box>

          <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

            {/* 2. Sidebar Navigation */}
            <Box sx={{ width: 240, borderRight: 1, borderColor: "divider", bgcolor: "#f8f9fa", display: "flex", flexDirection: "column" }}>
              <Typography variant="overline" sx={{ p: 2, pb: 1, color: "text.secondary", fontWeight: "bold" }}>Categories</Typography>
              <List sx={{ p: 1 }}>
                {filteredCategories.map((cat) => (
                  <ListItem key={cat.id} disablePadding sx={{ mb: 1 }}>
                    <Button
                      fullWidth
                      startIcon={cat.icon}
                      onClick={() => { setActiveCategory(cat.id); setApiResponse(null); }}
                      sx={{
                        justifyContent: "flex-start",
                        p: 1.5,
                        borderRadius: 2,
                        textTransform: "none",
                        color: activeCategory === cat.id ? "primary.main" : "text.secondary",
                        bgcolor: activeCategory === cat.id ? "primary.soft" : "transparent",
                        border: activeCategory === cat.id ? "1px solid" : "1px solid transparent",
                        borderColor: activeCategory === cat.id ? "primary.light" : "transparent",
                        background: activeCategory === cat.id ? "#e3f2fd" : "transparent",
                        fontWeight: activeCategory === cat.id ? 700 : 500,
                        "&:hover": { bgcolor: "#e3f2fd" }
                      }}
                    >
                      {cat.title}
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* 3. Main Action Area */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

              {/* Controls Bar */}
              <Paper square elevation={0} sx={{ p: 2, borderBottom: 1, borderColor: "divider", bgcolor: "white" }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="Target Date"
                    type="date"
                    size="small"
                    value={apiFilters.date}
                    onChange={(e) => handleFilterChange("date", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 160 }}
                  />
                  {/* Date Presets */}
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Today"><IconButton size="small" onClick={() => handleDatePreset(0)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Yesterday"><IconButton size="small" onClick={() => handleDatePreset(1)}><HistoryIcon fontSize="small" sx={{ opacity: 0.7 }} /></IconButton></Tooltip>
                  </Stack>

                  <Divider orientation="vertical" flexItem />

                  <TextField
                    label="Job Number"
                    placeholder="Optional..."
                    size="small"
                    value={apiFilters.job_no}
                    onChange={(e) => handleFilterChange("job_no", e.target.value)}
                    sx={{ width: 140 }}
                  />
                  <TextField
                    label="Limit"
                    size="small"
                    placeholder="Max..."
                    value={apiFilters.limit}
                    onChange={(e) => handleFilterChange("limit", e.target.value)}
                    sx={{ width: 80 }}
                  />
                </Stack>
              </Paper>

              <Box sx={{ flex: 1, overflow: "auto", p: 3, display: "flex", flexDirection: "column", gap: 3, bgcolor: "#fcfcfc" }}>

                {/* Result Block (If Active) */}
                {apiResponse && (
                  <Fade in={true}>
                    <Paper elevation={3} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: apiResponse.is404 ? "warning.light" : (apiResponse.success ? "success.light" : "error.light") }}>
                      <Box sx={{ p: 1.5, bgcolor: apiResponse.is404 ? "#fff3e0" : (apiResponse.success ? "#e8f5e9" : "#ffebee"), display: "flex", alignItems: "center", gap: 2 }}>
                        {apiResponse.is404 ? <WarningAmberIcon color="warning" /> : (apiResponse.success ? <CheckCircleOutlineIcon color="success" /> : <ErrorOutlineIcon color="error" />)}
                        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: "bold", color: apiResponse.is404 ? "warning.dark" : (apiResponse.success ? "success.dark" : "error.dark") }}>
                          {apiResponse.error || "Operation Completed Successfully"}
                        </Typography>
                        {apiResponse.data && (
                          <IconButton size="small" onClick={copyToClipboard} title="Copy JSON"><ContentCopyIcon fontSize="small" /></IconButton>
                        )}
                      </Box>

                      {/* 404 Special UI */}
                      {apiResponse.is404 && (
                        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <WarningAmberIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography variant="h6" color="text.secondary">No Records Found</Typography>
                          <Typography variant="body2" color="text.disabled">No data matched your criteria for this date or job number.</Typography>
                        </Box>
                      )}

                      {/* Success / Data View */}
                      {apiResponse.data && !apiResponse.is404 && (
                        <Box sx={{ p: 0 }}>
                          {apiResponse.data?.logs && (
                            <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                              <Button
                                size="small" variant="outlined"
                                onClick={() => {
                                  const logsDate = apiFilters.date || new Date().toISOString().split('T')[0];
                                  const baseUrl = `/logs?date=${logsDate}`;
                                  const finalUrl = apiFilters.job_no ? `${baseUrl}&job=${apiFilters.job_no}` : baseUrl;
                                  window.open(finalUrl, '_blank');
                                }}
                              >
                                View Full Logs Report
                              </Button>
                            </Box>
                          )}
                          <Box sx={{
                            p: 2,
                            maxHeight: 300,
                            overflow: "auto",
                            bgcolor: "#1e1e1e",
                            color: "#a9b7c6",
                            fontFamily: "'Consolas', 'Monaco', monospace",
                            fontSize: "0.85rem"
                          }}>
                            <pre style={{ margin: 0 }}>{JSON.stringify(apiResponse.data, null, 2)}</pre>
                          </Box>
                        </Box>
                      )}
                    </Paper>
                  </Fade>
                )}

                {/* API Grid */}
                <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {filteredCategories.find(c => c.id === activeCategory)?.title} Actions
                </Typography>

                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
                  {filteredCategories.find(c => c.id === activeCategory)?.apis.map((api, idx) => (
                    <Paper
                      key={idx}
                      elevation={0}
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        transition: "all 0.2s",
                        "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {api.name}
                        </Typography>
                        {api.variant === 'gradient' ? <AutoModeIcon color="success" /> : <PlayCircleOutlineIcon color="action" />}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, height: 32 }}>
                        {api.description}
                      </Typography>
                      <Button
                        fullWidth
                        variant={api.variant === 'gradient' ? "contained" : "outlined"}
                        size="small"
                        onClick={() => handleApiCall(api)}
                        disabled={loading}
                        color={api.variant === 'gradient' ? "success" : "primary"}
                        startIcon={loading && selectedApi?.endpoint === api.endpoint ? <CircularProgress size={16} color="inherit" /> : null}
                      >
                        {loading && selectedApi?.endpoint === api.endpoint ? "Running..." : "Run Automation"}
                      </Button>
                    </Paper>
                  ))}
                </Box>

              </Box>
            </Box>
          </Box>
        </Dialog>
      )}
    </Box>
  );
}

export default React.memo(JobTabs);


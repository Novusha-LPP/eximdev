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
import {
  TextField,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
  Alert,
  Paper,
} from "@mui/material";

export const TabContext = React.createContext({
  currentTab: 0,
  setCurrentTab: () => {},
  navigate: () => {},
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

// Add this function to format logs for non-technical users
const formatLogForDisplay = (log) => {
  if (!log) return '';
  
  // Remove technical symbols and format for better readability
  let formattedLog = log
    .replace(/📝\s*/g, '') // Remove emoji
    .replace(/`/g, '') // Remove backticks
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers but keep text
    .replace(/→/g, '→') // Keep arrow but you can replace with 'for' if preferred
    .replace(/job\s+(\d+)/g, 'Job #$1'); // Format job numbers

  // Add more human-readable formatting
  formattedLog = formattedLog
    .replace(/container_nos\.delivery_date/g, 'delivery date')
    .replace(/fetch_fds_out_date/g, 'FDS Out Date System')
    .replace(/fetch_icd_arrival_date/g, 'ICD Arrival System')
    .replace(/fetch_port_out_date/g, 'Port Out System')
    .replace(/fetch_fds_in_date/g, 'FDS In System')
    .replace(/fetch_ack_files/g, 'ACK Files System')
    .replace(/fetch_vehicle_departure_date/g, 'Vehicle Departure System')
    .replace(/fetch_boe_attachments/g, 'BoE Attachments System');

  return formattedLog;
};
// API configurations
const API_CONFIGS = [
  {
    name: "Container Rail Out Date",
    endpoint: "fetch_port_out_date",
    subject_keyword: "Import Port Out Intimation",
  },
  {
    name: "ICD Arrival Date",
    endpoint: "fetch_icd_arrival_date",
    subject_keyword: "Import ICD Arrival Intimation",
  },
  {
    name: "Container Delivery Date",
    endpoint: "fetch_fds_out_date",
    subject_keyword: "Import FDS Out Intimation",
  },
  {
    name: "Empty Container Off. Load Date",
    endpoint: "fetch_fds_in_date",
    subject_keyword: "FDS:Empty Container Gat In Intimation",
  },
  {
    name: "Get BoE Number",
    endpoint: "fetch_ack_files",
    subject_keyword: null,
  },
  {
    name: " Delivery Date: Vehicle Departure",
    endpoint: "fetch_vehicle_departure_date",
    subject_keyword: "FDS: Vehicle Departure intimation",
  },
  {
    name: "BoE Attachments",
    endpoint: "fetch_boe_attachments",
    subject_keyword: null,
  },
  {
    name: "Logs",
    endpoint: "logs/by_date",
    subject_keyword: null,
  },
];

function JobTabs() {
  const [value, setValue] = React.useState(0);
  const [openUtilityTool, setOpenUtilityTool] = React.useState(false);
  const [openApiFetch, setOpenApiFetch] = React.useState(false);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
    const DefaultDate = new Date();
  const [apiFilters, setApiFilters] = useState({
    date: DefaultDate.toISOString().split("T")[0],
    limit: "",
  });
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [selectedApi, setSelectedApi] = useState(null);
  const location = useLocation();
  const {
    setSearchQuery,
    setDetailedStatus,
    setSelectedICD,
    setSelectedImporter,
  } = useSearchQuery();
  const { user } = useContext(UserContext);

  // Handle tab restoration when returning from job details
  React.useEffect(() => {
    if (
      location.state?.fromJobDetails &&
      location.state?.tabIndex !== undefined
    ) {
      setValue(location.state.tabIndex);
      // Clear the state from history so it doesn't persist
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleChange = (event, newValue) => {
    // Clear search parameters when switching tabs
    setSearchQuery("");
    setDetailedStatus("all");
    setSelectedICD("all");
    setSelectedImporter("");
    setValue(newValue);
  };

  const handleOpenUtilityTool = () => {
    setOpenUtilityTool(true);
  };

  const handleCloseUtilityTool = () => {
    setOpenUtilityTool(false);
  };

  const handleOpenApiFetch = () => {
    setOpenApiFetch(true);
    setApiResponse(null);
    setSelectedApi(null);
  };

  const handleCloseApiFetch = () => {
    setOpenApiFetch(false);
    setApiFilters({ date: "", limit: "" });
    setApiResponse(null);
    setSelectedApi(null);
  };

  const handleApiCall = async (apiConfig) => {
    setLoading(true);
    setSelectedApi(apiConfig);
    setApiResponse(null);

    try {
      // Build URL with filters
      const baseUrl = "https://eximbot.alvision.in";
      const params = new URLSearchParams();

      // Add date if provided
      if (apiFilters.date) {
        params.append("date", apiFilters.date);
      }

      // Add limit if provided
      if (apiFilters.limit) {
        params.append("limit", apiFilters.limit);
      }

      // Add subject_keyword if available for the API
      if (apiConfig.subject_keyword) {
        params.append("subject_keyword", apiConfig.subject_keyword);
      }

      // Add debug parameter
      params.append("debug", "false");

      const url = `${baseUrl}/${apiConfig.endpoint}/?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const data = await response.json();
      setApiResponse({
        success: true,
        data: data,
        url: url,
      });
    } catch (error) {
      // Define url variable in the catch block to fix the error
      const baseUrl = "https://eximbot.alvision.in";
      const params = new URLSearchParams();

      if (apiFilters.date) {
        params.append("date", apiFilters.date);
      }

      if (apiFilters.limit) {
        params.append("limit", apiFilters.limit);
      }

      if (apiConfig.subject_keyword) {
        params.append("subject_keyword", apiConfig.subject_keyword);
      }

      params.append("debug", "false");

const url = `${baseUrl}/${apiConfig.endpoint}?${params.toString()}`;
      setApiResponse({
        success: false,
        error: error.message,
        url: url,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setApiFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const buttonStyle = {
    borderRadius: 3,
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.875rem",
    padding: "8px 20px",
    background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
    color: "#ffffff",
    border: "none",
    boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
    transition: "all 0.3s ease",
    "&:hover": {
      background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
      boxShadow: "0 6px 16px rgba(25, 118, 210, 0.4)",
      transform: "translateY(-1px)",
    },
    "&:active": {
      transform: "translateY(0px)",
    },
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
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
              sx={buttonStyle}
            >
              {showUnresolvedOnly ? "Show All Jobs" : "Pending Queries"}
            </Button>
            <Badge
              badgeContent={unresolvedCount}
              color="error"
              overlap="circular"
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              sx={{
                position: "absolute",
                top: -8,
                right: -8,
                "& .MuiBadge-badge": {
                  fontSize: "0.75rem",
                  minWidth: "18px",
                  height: "18px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                },
              }}
            />
          </Box>

          {/* API Fetch Button */}
       { user.role === "Admin" &&  <Button
            variant="contained"
            startIcon={<ApiIcon />}
            onClick={handleOpenApiFetch}
            sx={buttonStyle}
          >
            Exim Bot{" "}
          </Button>}

          <Button
            variant="contained"
            startIcon={<ToolboxIcon />}
            onClick={handleOpenUtilityTool}
            sx={buttonStyle}
          >
            Utility Tool
          </Button>
        </Box>
      </Box>

      <CustomTabPanel value={value} index={0}>
        <JobList
          status="Pending"
          showUnresolvedOnly={showUnresolvedOnly}
          onUnresolvedCountChange={setUnresolvedCount}
        />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <JobList
          status="Completed"
          showUnresolvedOnly={showUnresolvedOnly}
          onUnresolvedCountChange={setUnresolvedCount}
        />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <JobList
          status="Cancelled"
          showUnresolvedOnly={showUnresolvedOnly}
          onUnresolvedCountChange={setUnresolvedCount}
        />
      </CustomTabPanel>

      {/* Utility Tool Modal */}
      <Dialog
        open={openUtilityTool}
        onClose={handleCloseUtilityTool}
        maxWidth="lg"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            width: "85%",
            height: "85%",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          Import Utility Tool
          <IconButton
            onClick={handleCloseUtilityTool}
            sx={{ color: "grey.500" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: 0 }}>
          <ImportUtilityTool />
        </DialogContent>
      </Dialog>

{/* API Fetch Modal */}
{user.role === "Admin" && (
  <Dialog
    open={openApiFetch}
    onClose={handleCloseApiFetch}
    maxWidth="md"
    fullWidth
    sx={{
      "& .MuiDialog-paper": {
        width: "80%",
        maxHeight: "80vh",
      },
    }}
  >
    <DialogTitle
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Typography variant="h6" component="div">
        API Fetch Tools
      </Typography>
      <IconButton
        onClick={handleCloseApiFetch}
        sx={{ color: "grey.500" }}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>

    <DialogContent sx={{ p: 3 }}>
      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: "#f8f9fa" }}>
        <Typography variant="h6" gutterBottom sx={{ color: "#1976d2" }}>
          Common Filters
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            label="Date"
            type="date"
            value={apiFilters.date}
            onChange={(e) => handleFilterChange("date", e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="Limit"
            type="number"
            value={apiFilters.limit}
            onChange={(e) => handleFilterChange("limit", e.target.value)}
            placeholder="e.g., 10, 50, 100"
            size="small"
            sx={{ minWidth: 120 }}
          />
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: "block" }}
        >
          Note: Filters are optional. If not provided, default values will
          be used.
        </Typography>
      </Paper>

      {/* API List Section */}
      <Typography
        variant="h6"
        gutterBottom
        sx={{ color: "#1976d2", mb: 2 }}
      >
        Available APIs
      </Typography>

      <List
        sx={{
          maxHeight: 200,
          overflow: "auto",
          border: "1px solid #e0e0e0",
          borderRadius: 1,
          mb: 3,
        }}
      >
        {API_CONFIGS.map((api, index) => (
          <ListItem
            key={api.endpoint}
            button
            onClick={() => handleApiCall(api)}
            disabled={loading}
            sx={{
              borderBottom:
                index < API_CONFIGS.length - 1
                  ? "1px solid #f0f0f0"
                  : "none",
              "&:hover": {
                backgroundColor: "#f0f7ff",
              },
              "&:last-child": {
                borderBottom: "none",
              },
            }}
          >
            <ListItemText
              primary={
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <ApiIcon fontSize="small" color="primary" />
                  <Typography variant="body1" fontWeight="medium">
                    {api.name}
                  </Typography>
                  {loading && selectedApi?.endpoint === api.endpoint && (
                    <CircularProgress size={16} sx={{ ml: 1 }} />
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  Endpoint: {api.endpoint}
                  {api.subject_keyword &&
                    ` • Subject: ${api.subject_keyword}`}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>

      {/* API Response Section */}
      {apiResponse && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: "#f8f9fa" }}>
          <Typography variant="h6" gutterBottom sx={{ color: "#1976d2" }}>
            API Response
          </Typography>
          
          <Alert 
            severity={apiResponse.success ? "success" : "error"} 
            sx={{ mb: 2 }}
          >
            {apiResponse.success ? "API call successful!" : `API call failed: ${apiResponse.error}`}
          </Alert>

          <Typography variant="body2" gutterBottom sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
            <strong>URL:</strong> {apiResponse.url}
          </Typography>

          {apiResponse.success && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Response Data Preview:
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  backgroundColor: "white", 
                  maxHeight: 150, 
                  overflow: "auto",
                  fontFamily: "monospace",
                  fontSize: "0.75rem"
                }}
              >
                <pre>{JSON.stringify(apiResponse.data, null, 2)}</pre>
              </Paper>
            </Box>
          )}
        </Paper>
      )}

      {/* Logs Section */}
      {apiResponse?.success && apiResponse.data?.logs && (
        <Paper sx={{ p: 2, backgroundColor: "#fff3e0" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ color: "#f57c00" }}>
              Activity Logs
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                // Navigate to logs page with date parameter
                const logsDate = apiFilters.date || new Date().toISOString().split('T')[0];
                window.open(`/logs?date=${logsDate}`, '_blank');
              }}
              sx={{
                textTransform: 'none',
                backgroundColor: '#f57c00',
                '&:hover': {
                  backgroundColor: '#ef6c00',
                },
              }}
            >
              View Detailed Logs
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing activity for: <strong>{apiFilters.date || "Today"}</strong>
          </Typography>

          <List sx={{ maxHeight: 200, overflow: "auto", backgroundColor: "white", borderRadius: 1 }}>
            {apiResponse.data.logs.slice(0, 5).map((log, index) => (
              <ListItem key={index} sx={{ py: 1, borderBottom: index < 4 ? "1px solid #f0f0f0" : "none" }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, width: "100%" }}>
                  <Box sx={{ color: "#4caf50", mt: 0.5 }}>•</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                      {formatLogForDisplay(log)}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
          
          {apiResponse.data.logs.length > 5 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Showing 5 of {apiResponse.data.logs.length} logs. Click "View Detailed Logs" to see all.
            </Typography>
          )}
        </Paper>
      )}
    </DialogContent>

    <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
      <Button
        onClick={handleCloseApiFetch}
        sx={{ textTransform: "none" }}
      >
        Close
      </Button>
    </DialogActions>
  </Dialog>
 )} 
    </Box>
  );
}

export default React.memo(JobTabs);

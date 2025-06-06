import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  Box,
  IconButton,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  TextField,
} from "@mui/material";
import {
  Place as PlaceIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  BatteryStd as BatteryIcon,
  SignalCellularAlt as SignalIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import truckIcon from "../../assets/images/truckLong.svg";

// Time range options
const timeRangeOptions = [
  { value: "6h", label: "6 Hours Ago", hours: 6 },
  { value: "12h", label: "12 Hours Ago", hours: 12 },
  { value: "1d", label: "1 Day", hours: 24 },
  { value: "3d", label: "3 Days", hours: 72 },
  { value: "8d", label: "8 Days", hours: 192 },
  { value: "15d", label: "15 Days", hours: 360 },
  { value: "1m", label: "1 Month", hours: 720 },
  { value: "custom", label: "Custom Range", hours: 0 },
];

const getTimeRange = (
  selectedRange,
  customStartTime = null,
  customEndTime = null
) => {
  const now = new Date();

  if (selectedRange === "custom" && customStartTime && customEndTime) {
    return {
      start: new Date(customStartTime).toISOString(),
      end: new Date(customEndTime).toISOString(),
    };
  }

  const option = timeRangeOptions.find((opt) => opt.value === selectedRange);
  const startTime = new Date(now.getTime() - option.hours * 60 * 60 * 1000);

  return {
    start: startTime.toISOString(),
    end: now.toISOString(),
  };
};

const ElockGPSOperation = ({ isOpen, onClose, elockNo }) => {
  const [loading, setLoading] = useState(false);
  const [assetData, setAssetData] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("6h");
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [error, setError] = useState(null);
  const [mapUrl, setMapUrl] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Use refs to prevent excessive API calls
  const timeRangeRef = useRef(timeRange);
  const historyFetchedRef = useRef(false);

  const TOKEN_ID = "e36d2589-9dc3-4302-be7d-dc239af1846c";
  const ADMIN_API_URL = "http://icloud.assetscontrols.com:8092/OpenApi/Admin";
  const LBS_API_URL = "http://icloud.assetscontrols.com:8092/OpenApi/LBS";

  // Custom truck icon for the map
  const customTruckIcon = L.icon({
    iconUrl: truckIcon,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
  const fetchHistoryData = useCallback(async () => {
    if (!assetData?.FGUID) return;

    setHistoryLoading(true);
    try {
      const { start, end } = getTimeRange(
        timeRange,
        customStartTime,
        customEndTime
      );

      const response = await fetch(LBS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FTokenID: TOKEN_ID,
          FAction: "QueryLBSTrackListByFGUID",
          FGUID: assetData.FGUID,
          FType: 2,
          FAssetTypeID: 3701,
          FStartTime: start,
          FEndTime: end,
          FLanguage: 0,
          FDateType: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`History request failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.Result === 200 && result.FObject) {
        setHistoryData(result.FObject);
      } else {
        setHistoryData([]);
      }
      historyFetchedRef.current = true;
    } catch (err) {
      console.error("History fetch error:", err);
      setError(`Failed to fetch history data: ${err.message}`);
    } finally {
      setHistoryLoading(false);
    }
  }, [assetData?.FGUID, timeRange, customStartTime, customEndTime]);

  // Only fetch history data when asset data is available for the first time
  useEffect(() => {
    if (assetData?.FGUID && !historyFetchedRef.current) {
      fetchHistoryData();
    }
  }, [assetData?.FGUID, fetchHistoryData]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }; // Optimized time range change handler with debouncing
  const handleTimeRangeChange = (event) => {
    const newTimeRange = event.target.value;
    setTimeRange(newTimeRange);
    timeRangeRef.current = newTimeRange;

    // Clear any existing timeout
    if (window.timeRangeTimeout) {
      clearTimeout(window.timeRangeTimeout);
    }

    // If custom range is selected, set default values
    if (newTimeRange === "custom") {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Set default values if not already set
      if (!customStartTime) {
        setCustomStartTime(twentyFourHoursAgo.toISOString().slice(0, 16));
      }
      if (!customEndTime) {
        setCustomEndTime(now.toISOString().slice(0, 16));
      }
      return;
    }

    // Clear custom time values when switching away from custom
    if (customStartTime || customEndTime) {
      setCustomStartTime("");
      setCustomEndTime("");
    }

    // Debounce the API call by 500ms
    window.timeRangeTimeout = setTimeout(() => {
      if (assetData?.FGUID && timeRangeRef.current === newTimeRange) {
        fetchHistoryData();
      }
    }, 500);
  };
  // Handle custom date/time input changes
  const handleCustomStartTimeChange = (event) => {
    setCustomStartTime(event.target.value);
  };

  const handleCustomEndTimeChange = (event) => {
    setCustomEndTime(event.target.value);
  };
  // Apply custom time range
  const handleApplyCustomRange = () => {
    if (!customStartTime || !customEndTime) {
      setError("Please select both start and end date/time");
      return;
    }

    const startDate = new Date(customStartTime);
    const endDate = new Date(customEndTime);

    if (startDate >= endDate) {
      setError("Start time must be before end time");
      return;
    }

    if (endDate > new Date()) {
      setError("End time cannot be in the future");
      return;
    }

    // Check if the date range is reasonable (not more than 30 days)
    const diffInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (diffInDays > 30) {
      setError("Date range cannot exceed 30 days");
      return;
    }

    setError(null);
    fetchHistoryData();
  };

  // Reset custom time inputs to default values
  const handleResetCustomRange = () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    setCustomStartTime(twentyFourHoursAgo.toISOString().slice(0, 16));
    setCustomEndTime(now.toISOString().slice(0, 16));
    setError(null);
  };
  const fetchAssetData = useCallback(async () => {
    if (!elockNo) {
      setError("No E-lock number provided");
      return;
    }

    setLoading(true);
    setError(null);
    setAssetData(null);
    setLocationData(null);
    setHistoryData([]);
    setTimeRange("6h"); // Reset to default time range
    setCustomStartTime(""); // Clear custom inputs
    setCustomEndTime(""); // Clear custom inputs
    historyFetchedRef.current = false;

    try {
      // Fetch asset information
      const assetResponse = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FAction: "QueryAdminAssetByAssetId",
          FTokenID: TOKEN_ID,
          FAssetID: elockNo,
        }),
      });

      if (!assetResponse.ok) {
        throw new Error(`Asset request failed: ${assetResponse.statusText}`);
      }

      const assetResult = await assetResponse.json();
      if (!assetResult.FObject?.length) {
        throw new Error("No asset data found");
      }

      const assetInfo = assetResult.FObject[0];
      setAssetData(assetInfo);

      // Fetch location information
      const locationResponse = await fetch(LBS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FAction: "QueryLBSMonitorListByFGUIDs",
          FTokenID: TOKEN_ID,
          FGUIDs: assetInfo.FGUID,
          FType: 2,
        }),
      });

      if (!locationResponse.ok) {
        throw new Error(
          `Location request failed: ${locationResponse.statusText}`
        );
      }

      const locationResult = await locationResponse.json();
      if (!locationResult.FObject?.length) {
        throw new Error("No location data found");
      }

      const locationInfo = locationResult.FObject[0];
      setLocationData(locationInfo);

      // Set Google Maps URL
      setMapUrl(
        `https://www.google.com/maps?q=${locationInfo.FLatitude},${locationInfo.FLongitude}`
      );
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch E-lock data");
    } finally {
      setLoading(false);
    }
  }, [elockNo]);

  useEffect(() => {
    if (isOpen && elockNo) {
      fetchAssetData();
    }
  }, [isOpen, elockNo, fetchAssetData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (window.timeRangeTimeout) {
        clearTimeout(window.timeRangeTimeout);
      }
    };
  }, []);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusChip = (online) => {
    return (
      <Chip
        label={online === 1 ? "Online" : "Offline"}
        color={online === 1 ? "success" : "error"}
        size="small"
      />
    );
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { maxHeight: "90vh" } }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" gap={1}>
          <PlaceIcon />
          E-Lock GPS Operation - {elockNo}
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography variant="body1">Loading GPS data...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {assetData && locationData && (
          <Stack spacing={3}>
            {/* Asset Information */}
            <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Asset Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Asset ID
                  </Typography>
                  <Typography variant="body1">{assetData.FAssetID}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Vehicle Name
                  </Typography>
                  <Typography variant="body1">
                    {assetData.FVehicleName}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Agent
                  </Typography>
                  <Typography variant="body1">
                    {assetData.FAgentName}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Expire Time
                  </Typography>
                  <Typography variant="body1">
                    {formatDateTime(assetData.FExpireTime)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            {/* GPS Location Information */}
            <Box sx={{ p: 2, bgcolor: "info.light", borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                GPS Location Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  {getStatusChip(locationData.FOnline)}
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Latitude
                  </Typography>
                  <Typography variant="body1">
                    {locationData.FLatitude}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Longitude
                  </Typography>
                  <Typography variant="body1">
                    {locationData.FLongitude}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Speed
                  </Typography>
                  <Typography variant="body1">
                    {locationData.FSpeed} km/h
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    <BatteryIcon fontSize="small" /> Battery
                  </Typography>
                  <Typography variant="body1">
                    {locationData.FBattery}%
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    <SignalIcon fontSize="small" /> GPS Signal
                  </Typography>
                  <Typography variant="body1">
                    {locationData.FGPSSignal}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            {/* Lock Status Section */}
            <Box sx={{ p: 2, bgcolor: "warning.light", borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Lock Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Lock Status
                  </Typography>
                  <Stack direction="row" alignItems="center" gap={1}>
                    {locationData.FLockStatus ? (
                      <LockIcon color="error" />
                    ) : (
                      <LockOpenIcon color="success" />
                    )}
                    <Typography variant="body1">
                      {locationData.FLockStatus ? "Locked" : "Unlocked"}
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
            {/* Map View Section */}
            <Box sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Current Location
              </Typography>
              <Box sx={{ height: 400, borderRadius: 1, overflow: "hidden" }}>
                <MapContainer
                  center={[locationData.FLatitude, locationData.FLongitude]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker
                    position={[locationData.FLatitude, locationData.FLongitude]}
                    icon={customTruckIcon}
                  >
                    <Popup>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {assetData.FVehicleName}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Asset ID: {assetData.FAssetID}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Speed: {locationData.FSpeed} km/h
                        </Typography>
                        <Typography variant="caption" display="block">
                          Battery: {locationData.FBattery}%
                        </Typography>
                        <Typography variant="caption" display="block">
                          Status:{" "}
                          {locationData.FOnline === 1 ? "Online" : "Offline"}
                        </Typography>
                      </Box>
                    </Popup>
                  </Marker>
                </MapContainer>
              </Box>
            </Box>{" "}
            {/* History Section */}
            <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">
                  <HistoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  GPS Tracking History
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Time Range</InputLabel>
                    <Select
                      value={timeRange}
                      label="Time Range"
                      onChange={handleTimeRangeChange}
                    >
                      {timeRangeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>

              {/* Custom Date/Time Range Section */}
              {timeRange === "custom" && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    sx={{ fontWeight: "bold" }}
                  >
                    Custom Date & Time Range
                  </Typography>{" "}
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Start Date & Time"
                        type="datetime-local"
                        value={customStartTime}
                        onChange={handleCustomStartTimeChange}
                        fullWidth
                        size="small"
                        InputLabelProps={{
                          shrink: true,
                        }}
                        inputProps={{
                          max: new Date().toISOString().slice(0, 16), // Prevent future dates
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="End Date & Time"
                        type="datetime-local"
                        value={customEndTime}
                        onChange={handleCustomEndTimeChange}
                        fullWidth
                        size="small"
                        InputLabelProps={{
                          shrink: true,
                        }}
                        inputProps={{
                          max: new Date().toISOString().slice(0, 16), // Prevent future dates
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleApplyCustomRange}
                        disabled={
                          !customStartTime || !customEndTime || historyLoading
                        }
                        fullWidth
                        size="small"
                      >
                        Apply Range
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleResetCustomRange}
                        fullWidth
                        size="small"
                      >
                        Reset to Default
                      </Button>
                    </Grid>
                  </Grid>{" "}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    Note: End time cannot be in the future, must be after start
                    time, and date range cannot exceed 30 days
                  </Typography>
                </Box>
              )}

              {historyLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    Loading history data...
                  </Typography>
                </Box>
              ) : historyData.length > 0 ? (
                <Paper sx={{ width: "100%", overflow: "hidden" }}>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>GPS Time</TableCell>
                          <TableCell>Receive Time</TableCell>
                          <TableCell>Latitude</TableCell>
                          <TableCell>Longitude</TableCell>
                          <TableCell>Speed (km/h)</TableCell>
                          <TableCell>Direction</TableCell>
                          <TableCell>Battery (%)</TableCell>
                          <TableCell>Lock Status</TableCell>
                          <TableCell>Location Type</TableCell>
                          <TableCell>Mileage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyData
                          .slice(
                            page * rowsPerPage,
                            page * rowsPerPage + rowsPerPage
                          )
                          .map((record, index) => (
                            <TableRow hover key={index}>
                              <TableCell>
                                {new Date(record.GT).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {new Date(record.RT).toLocaleString()}
                              </TableCell>
                              <TableCell>{record.Lat.toFixed(6)}</TableCell>
                              <TableCell>{record.Lon.toFixed(6)}</TableCell>
                              <TableCell>{record.Speed}</TableCell>
                              <TableCell>{record.Dir}°</TableCell>
                              <TableCell>
                                <Chip
                                  label={`${record.Bat}%`}
                                  color={
                                    record.Bat > 30
                                      ? "success"
                                      : record.Bat > 15
                                      ? "warning"
                                      : "error"
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  gap={0.5}
                                >
                                  {record.LS ? (
                                    <LockIcon color="error" fontSize="small" />
                                  ) : (
                                    <LockOpenIcon
                                      color="success"
                                      fontSize="small"
                                    />
                                  )}
                                  <Typography variant="caption">
                                    {record.LS ? "Locked" : "Unlocked"}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={record.LType === 1 ? "GPS" : "LBS"}
                                  color={
                                    record.LType === 1 ? "success" : "warning"
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{record.Mil} km</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50, 100, 1000]}
                    component="div"
                    count={historyData.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </Paper>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 2 }}
                >
                  No history data found for the selected time range.
                </Typography>
              )}
            </Box>
            {/* Action Buttons Section */}
            <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={fetchAssetData}
                  disabled={loading}
                >
                  Refresh Data
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={fetchHistoryData}
                  disabled={historyLoading || !assetData?.FGUID}
                >
                  Refresh History
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PlaceIcon />}
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google Maps
                </Button>
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ElockGPSOperation;

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Paper,
  Chip,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Close as CloseIcon,
  Print as PrintIcon,
  Info as InfoIcon,
  AirplanemodeActive as AirplaneIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  LocationOn as LocationOnIcon,
  FlightTakeoff as FlightIcon,
} from "@mui/icons-material";
import axios from "axios";

const AirCargoStatus = ({
  isOpen,
  onClose,
  location,
  mawbNumber,
  jobId,
  onUpdateSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [cargoDetails, setCargoDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState(0);

  const tabLabels = [
    { label: "Shipment Summary", icon: <InfoIcon fontSize="small" /> },
    { label: "Flight Details", icon: <FlightIcon fontSize="small" /> },
    { label: "BE Details", icon: <DescriptionIcon fontSize="small" /> },
  ];

  useEffect(() => {
    if (isOpen && location && mawbNumber) {
      fetchCargoDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location, mawbNumber]);

  const fetchCargoDetails = async () => {
    setLoading(true);
    setError({ type: "", message: "" });
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/air-igm-full-details`,
        { location, mawbNumber },
        { timeout: 35000, headers: { "Content-Type": "application/json" } }
      );
      if (res.data?.success) {
        setCargoDetails(res.data.data || null);
      } else {
        setError({
          type: "api",
          message: res.data?.error || "Failed to fetch air cargo details",
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError({
          type: "notfound",
          message: "No records found for the provided location and MAWB number.",
        });
      } else {
        setError({
          type: "server",
          message: `Error: ${err.message}`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderValue = (v) =>
    v === undefined || v === null || v === "" || v === "N.A."
      ? "N.A."
      : String(v);

  const handleTabChange = (_e, val) => setActiveTab(val);

  const KeyValuePanel = ({ title, fields }) => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {title && (
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>
          {title}
        </Typography>
      )}
      {fields.map((field, idx) => (
        <Box
          key={idx}
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
            py: 1,
            borderTop: idx === 0 ? "1px solid transparent" : "1px solid",
            borderColor: idx === 0 ? "transparent" : "divider",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: "text.secondary",
              minWidth: { xs: "auto", sm: 200 },
              textAlign: { xs: "left", sm: "right" },
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              whiteSpace: "nowrap",
            }}
          >
            {field.icon}
            {field.label}:
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: "text.primary",
                wordBreak: "break-word",
              }}
            >
              {renderValue(field.value)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );

  const renderTabContent = () => {
    if (!cargoDetails)
      return <Typography variant="body2">No data available.</Typography>;

    const summary = Array.isArray(cargoDetails.summary) ? cargoDetails.summary[0] : (cargoDetails.summary || {});
    const flightDetails = Array.isArray(cargoDetails.flight_details) ? cargoDetails.flight_details : [];
    const beDetails = Array.isArray(cargoDetails.be_details) ? cargoDetails.be_details : [];

    if (activeTab === 0) {
      const fields = [
        { label: "MAWB Number", value: summary.mawbNo, icon: <DescriptionIcon fontSize="small" /> },
        { label: "IGM Number", value: summary.igmRotation },
        { label: "IGM Date", value: summary.igmDate },
        { label: "Line Number", value: summary.lineNo },
        { label: "Port of Origin", value: summary.portOrg },
        { label: "Port of Destination", value: summary.portDest },
        { label: "Total Packages", value: summary.totalPackage },
        { label: "Gross Weight", value: summary.grossWeight ? `${summary.grossWeight} KGS` : "" },
        { label: "Customer Site", value: summary.customer_Site },
        { label: "Segregation Time", value: summary.segregationTime },
      ];
      return <KeyValuePanel title="Air Cargo Shipment Summary" fields={fields} />;
    }

    if (activeTab === 1) {
      if (flightDetails.length === 0) {
        return <Typography variant="body2">No flight details available.</Typography>;
      }
      return (
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ fontWeight: 700 }}>Flight No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Flight Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Inward Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Submission Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IGM No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flightDetails.map((flight, i) => (
                <TableRow key={i}>
                  <TableCell>{renderValue(flight.flightNo)}</TableCell>
                  <TableCell>{renderValue(flight.flightDate)}</TableCell>
                  <TableCell>{renderValue(flight.inwardDate)}</TableCell>
                  <TableCell>{renderValue(flight.submissionDate)}</TableCell>
                  <TableCell>{renderValue(flight.igmNo)}</TableCell>
                  <TableCell>{renderValue(flight.locationCode)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (activeTab === 2) {
      if (beDetails.length === 0) {
        return <Typography variant="body2">No BE details available.</Typography>;
      }
      return (
        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ fontWeight: 700 }}>BE Number</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>BE Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IGM No/Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Line No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {beDetails.map((be, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Chip label={renderValue(be.beNo)} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>{renderValue(be.beDate)}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{renderValue(be.igmNo)}</Typography>
                      <Typography variant="caption">{renderValue(be.igmDate)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{renderValue(be.lineNo)}</TableCell>
                  <TableCell>{renderValue(be.locationCode)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? "100vh" : "80vh",
          borderRadius: isMobile ? 0 : 2,
        },
      }}
    >
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AirplaneIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Air Cargo Tracking (AMD)
            </Typography>
          </Box>
          <Box>
            <IconButton onClick={() => window.print()} size="small" sx={{ mr: 1 }}>
              <PrintIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
          <Chip label={`MAWB: ${mawbNumber}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
          <Chip label={`Location: ${location}`} size="small" variant="outlined" />
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        {tabLabels.map((tab, index) => (
          <Tab
            key={index}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {tab.icon}
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {tab.label}
                </Typography>
              </Box>
            }
          />
        ))}
      </Tabs>

      <DialogContent sx={{ p: 2, bgcolor: "grey.50" }}>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 10 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
              Fetching data from ICEGATE...
            </Typography>
          </Box>
        ) : error.message ? (
          <Paper sx={{ p: 3, textAlign: "center", border: "1px solid", borderColor: "error.light" }}>
            <Typography color="error" gutterBottom>
              {error.message}
            </Typography>
            <Button variant="contained" color="primary" onClick={fetchCargoDetails} sx={{ mt: 2 }}>
              Retry
            </Button>
          </Paper>
        ) : (
          renderTabContent()
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AirCargoStatus;

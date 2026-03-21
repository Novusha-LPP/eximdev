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
  Layers as LayersIcon,
  Assignment as AssignmentIcon,
  HomeWork as HomeWorkIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import axios from "axios";

const AirConsoleStatus = ({
  isOpen,
  onClose,
  location,
  mawbNumber,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [consoleData, setConsoleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState(0);

  const tabLabels = [
    { label: "Master Console", icon: <AssignmentIcon fontSize="small" /> },
    { label: "House Console", icon: <HomeWorkIcon fontSize="small" /> },
  ];

  useEffect(() => {
    if (isOpen && location && mawbNumber) {
      fetchConsoleDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location, mawbNumber]);

  const fetchConsoleDetails = async () => {
    setLoading(true);
    setError({ type: "", message: "" });
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/air-console-full-details`,
        { locationCode: location, masterBlNumber: mawbNumber },
        { timeout: 35000 }
      );
      if (res.data?.success) {
        setConsoleData(res.data.data);
      } else {
        setError({
          type: "api",
          message: res.data?.error || "Failed to fetch console details",
        });
      }
    } catch (err) {
      setError({
        type: "server",
        message: `Error: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderValue = (v) =>
    v === undefined || v === null || v === "" || v === "N.A" ? "N.A." : String(v);

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
        mb: 2
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
    if (!consoleData)
      return <Typography variant="body2">No data available.</Typography>;

    const data = activeTab === 0 ? (consoleData.master || []) : (consoleData.house || []);

    if (data.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: "center", border: "1px solid", borderColor: "divider" }}>
          <Typography color="text.secondary">No records found for this category.</Typography>
        </Paper>
      );
    }

    return (
      <Box>
        {data.map((row, index) => {
          const fields = [
            { label: "MAWB Number", value: row.mawbNumber, icon: <DescriptionIcon fontSize="small" /> },
            { label: "HAWB Number", value: row.hawbNumber },
            { label: "IGM Number", value: row.igmRtn },
            { label: "IGM Date", value: row.igmDate },
            { label: "Flight Number", value: row.flightNumber },
            { label: "Flight Date", value: row.flightDate },
            { label: "Total Packages", value: row.totalPackage },
            { label: "Gross Weight", value: row.grossWeight ? `${row.grossWeight} KGS` : "" },
            { label: "Customer Site", value: row.custSite },
            { label: "Sub Line Number", value: row.subLineNumber },
            { label: "Status", value: row.status },
            { label: "Remarks", value: row.remarks },
            { label: "File Name", value: row.fileName },
          ];
          return (
            <KeyValuePanel 
              key={index}
              title={data.length > 1 ? `Record #${index + 1}` : null} 
              fields={fields} 
            />
          );
        })}
      </Box>
    );
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
            <LayersIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Air Console Tracking
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
          <Chip label={`MAWB: ${mawbNumber}`} size="small" variant="outlined" color="primary" sx={{ fontWeight: 600 }} />
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
              Fetching console data from ICEGATE...
            </Typography>
            <LinearProgress sx={{ width: 200, mt: 1.5 }} />
          </Box>
        ) : error.message ? (
          <Paper sx={{ p: 3, textAlign: "center", border: "1px solid", borderColor: "error.light" }}>
            <Typography color="error" gutterBottom>
              {error.message}
            </Typography>
            <Button variant="contained" color="primary" onClick={fetchConsoleDetails} sx={{ mt: 2 }}>
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

export default AirConsoleStatus;

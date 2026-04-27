import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Container,
  Typography,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
  Grow,
  Divider,
} from "@mui/material";
import CalculateIcon from "@mui/icons-material/Calculate";
import BuildIcon from "@mui/icons-material/Build";
import SpeedIcon from "@mui/icons-material/Speed";
import StarIcon from "@mui/icons-material/Star";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import AssessmentIcon from "@mui/icons-material/Assessment";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  FormGroup,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Alert
} from "@mui/material";
import axios from "axios";

const UtilityParent = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState({
    phase: "",
    current: 0,
    total: 0,
    percent: 0
  });
  const [migrationOptions, setMigrationOptions] = React.useState({
    runSync: true,
    runMigrateJobs: true,
    runMigrateGandhidham: false,
  });
  const [notification, setNotification] = React.useState({
    open: false,
    message: "",
    severity: "info",
  });

  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const apiBase = process.env.REACT_APP_API_STRING;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress({ phase: "Initializing...", current: 0, total: 100, percent: 0 });

    try {
      // Use fetch instead of axios for easier SSE handling with POST
      const response = await fetch(`${apiBase}/utility/sync-production`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(migrationOptions),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep partial line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.success) {
                const percent = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
                setSyncProgress({
                  phase: data.phase || "Processing...",
                  current: data.current,
                  total: data.total,
                  percent: percent
                });

                if (data.done) {
                  setNotification({
                    open: true,
                    message: "Database synchronization completed successfully!",
                    severity: "success",
                  });
                  setSyncDialogOpen(false);
                }
              } else {
                throw new Error(data.message || "Sync failed");
              }
            } catch (e) {
              console.error("Error parsing SSE data", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
      setNotification({
        open: true,
        message: error.message || "Failed to synchronize database.",
        severity: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const cardStyles = {
    p: 4,
    borderRadius: 4,
    width: isSmallScreen ? "100%" : 300,
    textAlign: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    border: "1px solid rgba(230, 230, 230, 0.7)",
    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow: "0 15px 35px rgba(0,0,0,0.18)",
      border: `1px solid ${theme.palette.primary.light}`,
    },
  };

  const buttonStyles = {
    py: 1.5,
    mt: 2,
    fontSize: "1.1rem",
    fontWeight: "700",
    borderRadius: 3,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    color: "#fff",
    textTransform: "none",
    boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
    "&:hover": {
      background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
      boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
    },
  };

  const cardContent = [
    {
      title: "CTH Directory Search",
      description:
        "Streamline your import process with our comprehensive utility toolkit",
      icon: (
        <BuildIcon sx={{ fontSize: 45, color: theme.palette.primary.main }} />
      ),
      path: "/import-utility-tool",
      features: ["Smart validation", "Custom templates", "Batch processing"],
    },
    {
      title: "Import Duty Calculator",
      description: "Calculate import duties and taxes with precision",
      icon: (
        <CalculateIcon
          sx={{ fontSize: 45, color: theme.palette.primary.main }}
        />
      ),
      path: "/duty-calculator",
      features: ["Real-time rates", "Multiple currencies", "Tax breakdown"],
    },
    {
      title: "Billing Reports Utility",
      description: "Generate PB and PR reports for billing pending jobs",
      icon: (
        <AssessmentIcon
          sx={{ fontSize: 45, color: theme.palette.primary.main }}
        />
      ),
      path: "/billing-reports-utility",
      features: ["PB & PR reports", "Multi-filter support", "Excel export"],
    },
    ...(isLocal ? [{
      title: "Database Synchronization",
      description: "Sync production data to local database and run migrations",
      icon: (
        <CloudDownloadIcon
          sx={{ fontSize: 45, color: theme.palette.success.main }}
        />
      ),
      action: () => setSyncDialogOpen(true),
      features: ["Fetch latest data", "Run migrations", "Local dev only"],
    }] : []),
  ];

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 10,
          pb: 8,
          overflow: "hidden",
        }}
      >
        {/* Background elements */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
            opacity: 0.05,
            background: `radial-gradient(circle at 20% 30%, ${theme.palette.primary.light}, transparent 40%),
                      radial-gradient(circle at 80% 70%, ${theme.palette.secondary.light}, transparent 40%)`,
          }}
        />

        <Box sx={{ maxWidth: "800px", textAlign: "center" }}>
          <Typography
            variant="h2"
            fontWeight="800"
            gutterBottom
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            Import Tools & Utilities
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
            mb={2}
            sx={{ fontWeight: 400, maxWidth: "650px", mx: "auto" }}
          >
            Make your import journey smarter and more efficient with our
            professional suite of tools.
          </Typography>

          <Box
            sx={{ display: "flex", justifyContent: "center", mb: 5, gap: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <SpeedIcon sx={{ mr: 0.8, color: theme.palette.success.main }} />
              <Typography variant="body2" fontWeight={500}>
                Fast Processing
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <StarIcon sx={{ mr: 0.8, color: theme.palette.warning.main }} />
              <Typography variant="body2" fontWeight={500}>
                Highly Accurate
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 6,
            justifyContent: "center",
            flexWrap: "wrap",
            width: "100%",
            mt: 4,
          }}
        >
          {cardContent.map((card, index) => (
            <Grow in timeout={(index + 1) * 300} key={index}>
              <Paper sx={cardStyles} onClick={() => navigate(card.path)}>
                <Box sx={{ mb: 3 }}>{card.icon}</Box>
                <Typography variant="h5" fontWeight="700" mb={1.5}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  {card.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  {card.features.map((feature, i) => (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{
                        py: 0.5,
                        color: "text.secondary",
                        fontWeight: i === 0 ? 600 : 400,
                        color: i === 0 ? theme.palette.primary.main : "inherit",
                      }}
                    >
                      {feature}
                    </Typography>
                  ))}
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={card.title === "CTH Directory Search" ? <BuildIcon /> : card.title === "Import Duty Calculator" ? <CalculateIcon /> : card.title === "Billing Reports Utility" ? <AssessmentIcon /> : <CloudDownloadIcon />}
                  sx={buttonStyles}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (card.action) card.action();
                    else navigate(card.path);
                  }}
                >
                  {card.title === "Database Synchronization" ? "Sync Now" : "Get Started"}
                </Button>
              </Paper>
            </Grow>
          ))}
        </Box>

        {/* Sync Confirmation Dialog */}
        <Dialog open={syncDialogOpen} onClose={() => !isSyncing && setSyncDialogOpen(false)}>
          <DialogTitle sx={{ fontWeight: 700 }}>Database Synchronization</DialogTitle>
          <DialogContent>
            {migrationOptions.runSync && (
              <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 500 }}>
                WARNING: This will overwrite your local database collections with production data. Use with caution.
              </Typography>
            )}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Select Actions:
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={migrationOptions.runSync}
                    onChange={(e) => setMigrationOptions({ ...migrationOptions, runSync: e.target.checked })}
                    disabled={isSyncing}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Fetch Data from Production (Overwrites Local)
                  </Typography>
                }
              />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={migrationOptions.runMigrateJobs}
                    onChange={(e) => setMigrationOptions({ ...migrationOptions, runMigrateJobs: e.target.checked })}
                    disabled={isSyncing}
                  />
                }
                label="Run Jobs Migration (Standard)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={migrationOptions.runMigrateGandhidham}
                    onChange={(e) => setMigrationOptions({ ...migrationOptions, runMigrateGandhidham: e.target.checked })}
                    disabled={isSyncing}
                  />
                }
                label="Run Gandhidham Jobs Migration"
              />
            </FormGroup>
            {isSyncing && (
              <Box sx={{ display: 'flex', flexDirection: 'column', mt: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, textAlign: 'center' }}>
                  {syncProgress.phase} ({syncProgress.percent}%)
                </Typography>
                <LinearProgress variant="determinate" value={syncProgress.percent} sx={{ height: 10, borderRadius: 5 }} />
                <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center', color: 'text.secondary' }}>
                  {syncProgress.current} / {syncProgress.total} items
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSyncDialogOpen(false)} disabled={isSyncing}>
              Cancel
            </Button>
            <Button
              onClick={handleSync}
              variant="contained"
              color="primary"
              disabled={isSyncing || (!migrationOptions.runSync && !migrationOptions.runMigrateJobs && !migrationOptions.runMigrateGandhidham)}
              sx={{ fontWeight: 600 }}
            >
              Start Selected Actions
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setNotification({ ...notification, open: false })}
            severity={notification.severity}
            sx={{ width: "100%" }}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default UtilityParent;

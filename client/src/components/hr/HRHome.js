import * as React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { UserContext } from "../../contexts/UserContext";

// Submodules
import KPIDashboard from "./submodules/KPIDashboard";
import KPIEntry from "./submodules/KPIEntry";
import ProfileCompletionReport from "./submodules/ProfileCompletionReport";

// Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import RateReviewIcon from "@mui/icons-material/RateReview";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import "../../styles/hr-modules.scss";

function HRHome() {
  const [view, setView] = React.useState("menu");
  const { user } = React.useContext(UserContext);

  // Authorization Checks
  const canEvaluate = user && (
    user.role === "Admin" || 
    user.role === "Head_of_Department" || 
    user.role === "HOD"
  );

  const canViewReport = user && (
    user.role === "Admin" || 
    user.role === "HR" ||
    user.role === "Head_of_Department" || 
    user.role === "HOD"
  );

  // Map of views to components
  const renderSubmodule = () => {
    switch (view) {
      case "kpi_dashboard":
        return <KPIDashboard />;
      case "kpi_entry":
        return <KPIEntry onSaveSuccess={() => setView("kpi_dashboard")} />;
      case "profile_completion":
        return <ProfileCompletionReport />;
      default:
        return null;
    }
  };

  const getSubmoduleTitle = () => {
    switch (view) {
      case "kpi_dashboard":
        return "KPI Performance Dashboard";
      case "kpi_entry":
        return "KPI Evaluation Entry";
      case "profile_completion":
        return "Employee Profile Completion Report";
      default:
        return "HR Management Dashboard";
    }
  };

  return (
    <Box className="hr-page-container">
      {/* Header with back navigation if inside a submodule */}
      <Box style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <Box style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {view !== "menu" && (
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => setView("menu")}
              style={{
                borderColor: "#cbd5e0",
                color: "#4a5568",
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Back to HR Modules
            </Button>
          )}
          <h1 className="hr-page-title" style={{ margin: 0 }}>{getSubmoduleTitle()}</h1>
        </Box>
      </Box>

      {/* Main Panel */}
      {view === "menu" ? (
        <Box style={{ marginTop: "20px" }}>
          <Typography variant="body1" color="textSecondary" style={{ marginBottom: "24px", fontSize: "1.1rem" }}>
            Select a submodule below to manage performance metrics and data completion control frameworks.
          </Typography>
          
          <Grid container spacing={3}>
            {/* Card 1: KPI Dashboard */}
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                className="hr-nav-card" 
                onClick={() => setView("kpi_dashboard")}
                style={{ cursor: "pointer", height: "100%", border: "1px solid #e2e8f0" }}
              >
                <CardContent style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <Box style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Box className="hr-icon-wrapper" style={{ backgroundColor: "#ebf8ff", color: "#2b6cb0", padding: "10px", borderRadius: "8px", display: "flex" }}>
                      <DashboardIcon fontSize="large" />
                    </Box>
                    <Typography variant="h6" style={{ fontWeight: 700, color: "#1a365d" }}>
                      KPI Dashboard
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary" style={{ lineHeight: 1.5 }}>
                    Analyze team performance metrics, track monthly weighted KPI score averages, check RAG statuses, and export analytical PDF/Excel reports.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Card 2: KPI Evaluation Entry */}
            {canEvaluate && (
              <Grid item xs={12} sm={6} md={4}>
                <Card 
                  className="hr-nav-card" 
                  onClick={() => setView("kpi_entry")}
                  style={{ cursor: "pointer", height: "100%", border: "1px solid #e2e8f0" }}
                >
                  <CardContent style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <Box style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Box className="hr-icon-wrapper" style={{ backgroundColor: "#f0fff4", color: "#38a169", padding: "10px", borderRadius: "8px", display: "flex" }}>
                        <RateReviewIcon fontSize="large" />
                      </Box>
                      <Typography variant="h6" style={{ fontWeight: 700, color: "#1a365d" }}>
                        KPI Evaluation Entry
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" style={{ lineHeight: 1.5 }}>
                      Record monthly scores for employee parameters. Fetches real-time metrics automatically from Attendance, KPI, and Open Points modules.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Card 3: Profile Completion Report */}
            {canViewReport && (
              <Grid item xs={12} sm={6} md={4}>
                <Card 
                  className="hr-nav-card" 
                  onClick={() => setView("profile_completion")}
                  style={{ cursor: "pointer", height: "100%", border: "1px solid #e2e8f0" }}
                >
                  <CardContent style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <Box style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Box className="hr-icon-wrapper" style={{ backgroundColor: "#fff5f5", color: "#e53e3e", padding: "10px", borderRadius: "8px", display: "flex" }}>
                        <AssignmentIndIcon fontSize="large" />
                      </Box>
                      <Typography variant="h6" style={{ fontWeight: 700, color: "#1a365d" }}>
                        Profile Completion Report
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" style={{ lineHeight: 1.5 }}>
                      Monitor mandatory profile data metrics, check locking statuses, audit missing fields, and send automated reminders to managers or employees.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      ) : (
        <Box style={{ marginTop: "10px" }}>
          {renderSubmodule()}
        </Box>
      )}
    </Box>
  );
}

export default React.memo(HRHome);

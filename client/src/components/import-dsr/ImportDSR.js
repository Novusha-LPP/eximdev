import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Dashboard from "./Dashboard";
import "../../styles/import-dsr.scss";
import { Alert, MenuItem, TextField, LinearProgress } from "@mui/material";
import axios from "axios";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";
import JobTabs from "./JobTabs";
import ViewDSR from "./ViewDSR";
import ImportCreateJob from "./ImportCreateJob";
import useFileUpload from "../../customHooks/useFileUpload";
import CircularProgress from "@mui/material/CircularProgress";
import InfoIcon from "@mui/icons-material/Info";
import IconButton from "@mui/material/IconButton";
import { Tooltip } from "@mui/material";
import { Typography } from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import useTabs from "../../customHooks/useTabs";
import { UserContext } from "../../contexts/UserContext";
import { TabValueContext } from "../../contexts/TabValueContext";

function ImportDSR() {
  const { a11yProps, CustomTabPanel } = useTabs();
  const { tabValue, setTabValue } = React.useContext(TabValueContext);
  const { user } = React.useContext(UserContext);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [alt, setAlt] = React.useState(false);
  const [lastJobsDate, setLastJobsDate] = React.useState("");

  const inputRef = React.useRef();

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  React.useEffect(() => {
    async function getLastJobsDate() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-last-jobs-date`
      );
      setLastJobsDate(res.data.lastJobsDate);
    }
    getLastJobsDate();
  }, [alt]);

  const { handleFileUpload, snackbar, loading, error, setError, progress, uploadStats } = useFileUpload(
    inputRef,
    alt,
    setAlt
  );

  return (
    <SelectedYearContext.Provider value={{ selectedYear, setSelectedYear }}>
      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            [
            <Tab label="Dashboard" {...a11yProps(0)} key={0} />,
            <Tab label="Jobs" {...a11yProps(2)} key={1} />,
            {/* <Tab label="View DSR" {...a11yProps(3)} key={2} /> */}
            <Tab label="New Job" {...a11yProps(4)} key={2} />
            ,]
          </Tabs>
        </Box>
        <div className="flex-div">
          <div style={{ flex: 1 }}></div>
          {user.role === "Admin" && tabValue === 0 && (
            <>
              {loading ? (
                <Box sx={{ width: '300px', mr: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Uploading Data...
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {progress.total > 0 ? `${Math.round((progress.current / progress.total) * 100)}%` : "0%"}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant={progress.total > 0 ? "determinate" : "indeterminate"}
                    value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: (theme) => theme.palette.grey[200],
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        backgroundImage: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', // Beautiful gradient
                      }
                    }}
                  />
                </Box>
              ) : (
                <label
                  htmlFor="uploadBtn"
                  className="btn"
                  style={{ marginLeft: "10px", marginTop: "20px" }}
                >
                  Upload Party Data
                </label>
              )}

              <input
                type="file"
                accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                id="uploadBtn"
                name="upload-btn"
                ref={inputRef}
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              <Tooltip
                title={
                  <Typography sx={{ fontSize: 16 }}>
                    Jobs last added on {lastJobsDate}
                  </Typography>
                }
              >
                <IconButton aria-label="jobs-info">
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </div>
        {error && (
          <Alert
            severity="error"
            sx={{ marginTop: "10px", marginBottom: "10px" }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <CustomTabPanel value={tabValue} index={0}>
          <Dashboard />
        </CustomTabPanel>
        <CustomTabPanel value={tabValue} index={1}>
          <JobTabs />
        </CustomTabPanel>
        {/* <CustomTabPanel value={tabValue} index={2}>
          <ViewDSR />
        </CustomTabPanel> */}
        <CustomTabPanel value={tabValue} index={2}>
          <ImportCreateJob />
        </CustomTabPanel>
      </Box>
      <Snackbar
        open={snackbar}
        message={uploadStats
          ? `${uploadStats.count} jobs added successfully in ${uploadStats.timeTaken}s!`
          : "Jobs added successfully!"
        }
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </SelectedYearContext.Provider>
  );
}

export default React.memo(ImportDSR);

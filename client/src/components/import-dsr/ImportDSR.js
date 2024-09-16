import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Dashboard from "./Dashboard";
import "../../styles/import-dsr.scss";
import { MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";
import JobTabs from "./JobTabs";
import ViewDSR from "./ViewDSR";
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

  const { handleFileUpload, snackbar, loading } = useFileUpload(
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
            <Tab label="View DSR" {...a11yProps(3)} key={2} />
            ,]
          </Tabs>
        </Box>
        <div className="flex-div">
          <div style={{ flex: 1 }}></div>
          {user.role === "Admin" && tabValue === 0 && (
            <>
              {loading ? (
                <CircularProgress />
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

        <CustomTabPanel value={tabValue} index={0}>
          <Dashboard />
        </CustomTabPanel>
        <CustomTabPanel value={tabValue} index={1}>
          <JobTabs />
        </CustomTabPanel>
        <CustomTabPanel value={tabValue} index={2}>
          <ViewDSR />
        </CustomTabPanel>
      </Box>
      <Snackbar
        open={snackbar}
        message="Jobs added successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </SelectedYearContext.Provider>
  );
}

export default React.memo(ImportDSR);

import axios from "axios";
import React, { useEffect, useState } from "react";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DoDisturbIcon from "@mui/icons-material/DoDisturb";
import DensitySmallIcon from "@mui/icons-material/DensitySmall";
import { IconButton, TextField, MenuItem } from "@mui/material";
import { Col, Row } from "react-bootstrap";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";

function JobsOverView() {
  const [data, setData] = useState("");
  const { selectedYear, setSelectedYear } =
    React.useContext(SelectedYearContext);

  // Predefined array of year ranges
  const years = ["24-25", "25-26", "26-27", "27-28", "28-29", "29-30", "30-31"];

  useEffect(() => {
    // Determine default selection based on current year
    const currentYear = new Date().getFullYear();
    const currentTwoDigits = String(currentYear).slice(-2); // e.g. "24" for 2024
    const nextTwoDigits = String(Number(currentTwoDigits) + 1).padStart(2, "0");
    // Construct the year pair, e.g. "24-25"
    const defaultYearPair = `${currentTwoDigits}-${nextTwoDigits}`;

    if (!selectedYear) {
      // If our constructed year pair exists in the predefined array, use it
      // otherwise, fallback to the first element
      if (years.includes(defaultYearPair)) {
        setSelectedYear(defaultYearPair);
      } else {
        setSelectedYear(years[0]);
      }
    }
  }, [selectedYear, setSelectedYear, years]);

  useEffect(() => {
    async function getData() {
      if (selectedYear) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-jobs-overview/${selectedYear}`
        );
        setData(res.data);
      }
    }
    getData();
  }, [selectedYear]);

  return (
    <>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        <TextField
          select
          size="small"
          label="Select Year"
          value={selectedYear || ""}
          onChange={(e) => setSelectedYear(e.target.value)}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          {years.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>
      </div>

      <Row className="jobs-overview">
        <Col xs={3} className="jobs-overview-item">
          <div className="jobs-overview-item-inner">
            <IconButton aria-label="total-jobs">
              <DensitySmallIcon />
            </IconButton>
            <div>
              <p>Total Jobs</p>
              <h3>{data?.totalJobs}</h3>
            </div>
          </div>
        </Col>
        <Col xs={3} className="jobs-overview-item">
          <div className="jobs-overview-item-inner">
            <IconButton aria-label="pending-jobs">
              <HourglassBottomIcon />
            </IconButton>
            <div>
              <p>Pending Jobs</p>
              <h3>{data?.pendingJobs}</h3>
            </div>
          </div>
        </Col>
        <Col xs={3} className="jobs-overview-item">
          <div className="jobs-overview-item-inner">
            <IconButton aria-label="completed-jobs">
              <CheckCircleOutlineIcon />
            </IconButton>
            <div>
              <p>Completed Jobs</p>
              <h3>{data?.completedJobs}</h3>
            </div>
          </div>
        </Col>
        <Col xs={3} className="jobs-overview-item">
          <div className="jobs-overview-item-inner">
            <IconButton aria-label="cancelled-jobs">
              <DoDisturbIcon />
            </IconButton>
            <div>
              <p>Cancelled Jobs</p>
              <h3>{data?.cancelledJobs}</h3>
            </div>
          </div>
        </Col>
      </Row>
    </>
  );
}

export default React.memo(JobsOverView);

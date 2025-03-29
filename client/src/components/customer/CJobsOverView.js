import axios from "axios";
import React, { useEffect, useState } from "react";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DoDisturbIcon from "@mui/icons-material/DoDisturb";
import DensitySmallIcon from "@mui/icons-material/DensitySmall";
import { IconButton, TextField, MenuItem } from "@mui/material";
import { Col, Row } from "react-bootstrap";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";

// Predefined array of year ranges
const years = ["24-25", "25-26", "26-27"]; // Add more ranges as needed

function CJobsOverView() {
  const [data, setData] = useState("");
  const { selectedYear, setSelectedYear } =
    React.useContext(SelectedYearContext);

  useEffect(() => {
    // Determine the current date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Months are zero-based
    const currentTwoDigits = String(currentYear).slice(-2); // Last two digits of current year
    const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0"); // Last two digits of next year
    const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0"); // Last two digits of previous year

    let defaultYearPair;

    // Determine the financial year
    if (currentMonth >= 4) {
      // From April of the current year to March of the next year
      defaultYearPair = `${currentTwoDigits}-${nextTwoDigits}`;
    } else {
      // From January to March, use the previous financial year
      defaultYearPair = `${prevTwoDigits}-${currentTwoDigits}`;
    }

    // Set default year pair if not already selected
    if (!selectedYear) {
      if (years.includes(defaultYearPair)) {
        setSelectedYear(defaultYearPair);
      } else {
        setSelectedYear(years[0]);
      }
    }
  }, [selectedYear, setSelectedYear]);

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

export default React.memo(CJobsOverView);

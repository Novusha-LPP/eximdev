import axios from "axios";
import React, { useEffect, useState } from "react";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DoDisturbIcon from "@mui/icons-material/DoDisturb";
import DensitySmallIcon from "@mui/icons-material/DensitySmall";
import { IconButton } from "@mui/material";
import { Col, Row } from "react-bootstrap";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";

function JobsOverView() {
  const [data, setData] = useState("");
  const { selectedYear } = React.useContext(SelectedYearContext);
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
          <IconButton aria-label="total-jobs">
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
          <IconButton aria-label="total-jobs">
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
          <IconButton aria-label="total-jobs">
            <DoDisturbIcon />
          </IconButton>
          <div>
            <p>Canceled Jobs</p>
            <h3>{data?.canceledJobs}</h3>
          </div>
        </div>
      </Col>
    </Row>
  );
}

export default React.memo(JobsOverView);

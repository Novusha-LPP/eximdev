import React, { useState } from "react";
import axios from "axios";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TextField from "@mui/material/TextField";
import { Row, Col } from "react-bootstrap";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  timeline: {
    "& .MuiTimelineItem-root:before": {
      display: "none !important",
    },
  },
}));

function TyreDetails() {
  const classes = useStyles();
  const [tyreNo, setTyreNo] = useState("");
  const [data, setData] = useState([]);
  const [truckDetails, setTruckDetails] = useState([]);

  async function getData() {
    if (!tyreNo) return;
    const res = await axios(
      `${process.env.REACT_APP_API_STRING}/tyre-details/${tyreNo}`
    );
    if (res.data.message === "Tyre does not exist") {
      return alert(res.data.message);
    } else {
      setData(res.data);
      setTruckDetails(res.data.trucks);
    }
  }

  return (
    <div>
      <TextField
        size="small"
        label="Enter tyre number"
        variant="outlined"
        onChange={(e) => setTyreNo(e.target.value)}
      />
      <button
        onClick={() => getData()}
        className="btn"
        style={{ marginTop: 0, marginLeft: "15px" }}
      >
        Search
      </button>

      {data.length !== 0 && (
        <Row style={{ marginTop: "50px" }}>
          <Col>
            <h4>Tyre Info</h4>
            <ul>
              <li>
                <strong>Tyre Number: </strong>
                {data.tyre_no}
              </li>

              <li>
                <strong>Tyre Brand: </strong>
                {data.tyre_brand}
              </li>

              <li>
                <strong>Tyre Model: </strong>
                {data.tyre_model}
              </li>

              <li>
                <strong>Make: </strong>
                {data.make}
              </li>

              <li>
                <strong>Tyre Type: </strong>
                {data.tyre_type}
              </li>

              <li>
                <strong>Tyre Size: </strong>
                {data.tyre_size}
              </li>

              <li>
                <strong>Ply Rating: </strong>
                {data.ply_rating}
              </li>
            </ul>
          </Col>

          <Col>
            <h4>Vendor info</h4>
            <ul>
              <li>
                <strong>Vendor Name: </strong>
                {data.vendor_name}
              </li>

              <li>
                <strong>Vendor Address: </strong>
                {data.vendor_address}
              </li>

              <li>
                <strong>Vendor Phone: </strong>
                {data.vendor_phone}
              </li>
            </ul>
          </Col>

          <Col>
            <h4>Tyre life</h4>
            <Timeline className={classes.timeline} position="right">
              {truckDetails.map((item, index) => {
                return (
                  <TimelineItem key={index}>
                    <TimelineSeparator>
                      <TimelineDot />
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <h6>Truck number: {item.truck_no}</h6>
                      <span>
                        Distance:
                        {isNaN(
                          parseInt(item.removal_date_odometer) -
                            parseInt(item.fitting_date_odometer)
                        )
                          ? "" // Display an empty string if the result is NaN
                          : parseInt(item.removal_date_odometer) -
                            parseInt(item.fitting_date_odometer)}
                      </span>
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default TyreDetails;

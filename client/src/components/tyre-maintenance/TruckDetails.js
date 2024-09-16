import React, { useState } from "react";
import axios from "axios";
import TextField from "@mui/material/TextField";
import { Container, Row, Col } from "react-bootstrap";

function TruckDetails() {
  const [truckNo, setTruckNo] = useState("");
  const [data, setData] = useState();
  console.log(
    `${process.env.REACT_APP_API_STRING}/get-truck-details/${truckNo}`
  );
  async function getData() {
    if (!truckNo) return;
    const res = await axios(
      `${process.env.REACT_APP_API_STRING}/get-truck-details/${truckNo}`
    );
    if (res.data.message === "Tyre does not exist") {
      return alert(res.data.message);
    } else {
      setData(res.data);
    }
  }

  return (
    <div>
      <TextField
        size="small"
        id="outlined-basic"
        label="Enter truck number"
        variant="outlined"
        onChange={(e) => setTruckNo(e.target.value)}
      />

      <button
        onClick={getData}
        className="btn"
        style={{ marginTop: 0, marginLeft: "15px" }}
      >
        Search
      </button>
      <br />
      <br />
      <Container>
        <Row>
          {data && (
            <Row>
              <Col lg={3} xs={12}>
                <p>
                  <strong>Truck Number:&nbsp;</strong>
                  {data.truck_no}
                </p>
                <p>
                  <strong>Max Tyres:&nbsp;</strong>
                  {data.max_tyres}
                </p>
                <p>
                  <strong>Units:&nbsp;</strong>
                  {data.units}
                </p>
              </Col>
              <Col>
                <h4>Tyre Details</h4>
                {data.tyres?.map((tyre, id) => (
                  <>
                    <p key={id}>
                      <strong>Tyre Number:&nbsp;</strong>
                      {tyre.tyre_no}
                    </p>
                    <p key={id}>
                      <strong>Location:&nbsp;</strong>
                      {tyre.location}
                    </p>
                    <p key={id}>
                      <strong>Fitting Date:&nbsp;</strong>
                      {tyre.fitting_date}
                    </p>
                    <p key={id}>
                      <strong>Fitting Date Odometer:&nbsp;</strong>
                      {tyre.fitting_date_odometer}
                    </p>
                    <br />
                  </>
                ))}
              </Col>
              <Col>
                <h4>Driver Details</h4>
                {data.drivers?.map((driver, id) => (
                  <>
                    <p key={id}>
                      <strong>Name:&nbsp;</strong>
                      {driver.driver_name}
                    </p>
                    <p key={id}>
                      <strong>License:&nbsp;</strong>
                      {driver.driver_license}
                    </p>
                    <p key={id}>
                      <strong>Assign Date:&nbsp;</strong>
                      {driver.assign_date}
                    </p>
                    <br />
                  </>
                ))}
              </Col>
            </Row>
          )}
        </Row>
      </Container>
    </div>
  );
}

export default TruckDetails;

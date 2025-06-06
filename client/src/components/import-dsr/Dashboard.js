import React from "react";
import JobsOverview from "./JobsOverView";
import ImporterWiseDetails from "./ImporterWiseDeatils";
import { Row, Col } from "react-bootstrap";

function Dashboard() {
  return (
    <div>
      <JobsOverview />
      <Row>
        <Col className="jobs-overview">
          <div
            className="jobs-overview-item-inner"
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              margin: 0,
            }}
          >
            <ImporterWiseDetails />
          </div>
        </Col>
        <Col></Col>
      </Row>
    </div>
  );
}

export default React.memo(Dashboard);

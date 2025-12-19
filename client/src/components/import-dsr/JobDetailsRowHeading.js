import React from "react";

function JobDetailsRowHeading(props) {
  return (
    <div className="job-detail-heading-container" style={{ justifyContent: "space-between" }}>
      <div>
        <h6>{props.heading}</h6>
      </div>
      {props.rightContent && <div>{props.rightContent}</div>}
    </div>
  );
}

export default JobDetailsRowHeading;

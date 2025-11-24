import React from "react";

function JobDetailsRowHeading(props) {
  return (
    <div className="job-detail-heading-container">
      <div>
        <h6>{props.heading}</h6>
      </div>
    </div>
  );
}

export default JobDetailsRowHeading;

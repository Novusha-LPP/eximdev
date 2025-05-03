import React from "react";

function CJobDetailsRowHeading(props) {
  return (
    <div className="job-detail-heading-container">
      <div>
        <h4>{props.heading}</h4>
      </div>
    </div>
  );
}

export default CJobDetailsRowHeading;

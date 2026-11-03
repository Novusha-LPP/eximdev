import React from "react";
import JobsOverview from "./JobsOverView";
import ImporterWiseDetails from "./ImporterWiseDeatils";

function Dashboard() {
  return (
    <div className="dsr-dash">
      <JobsOverview />
      <ImporterWiseDetails />
    </div>
  );
}

export default React.memo(Dashboard);

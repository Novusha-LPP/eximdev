import React, { useEffect, useState } from "react";
import "../../styles/Screens.scss";

const Screen1 = () => {
  const [jobCounts, setJobCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  useEffect(() => {
    const SSE_URL = `${process.env.REACT_APP_API_STRING}/sse/job-overview/24-25`;
    // console.log("Connecting to SSE at:", SSE_URL);

    const eventSource = new EventSource(SSE_URL);

    eventSource.onopen = () => {
      // console.log("SSE connection opened successfully.");
    };

    eventSource.onmessage = (event) => {
      // console.log("SSE Data Received:", event.data);
      try {
        const parsedData = JSON.parse(event.data);
        // console.log("Parsed Data:", parsedData);
        setJobCounts(parsedData);
        setLoading(false);
      } catch (err) {
        console.error("Error parsing SSE data:", err);
        setError("Error parsing server data.");
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error Occurred:", err);
      setError("Connection lost. Retrying...");
      setTimeout(() => window.location.reload(), 5000);
    };

    return () => {
      // console.log("Closing SSE connection.");
      eventSource.close();
    };
  }, []);

  // Loading State
  if (loading) {
    return (
      <div className="screen">
        <p>Loading... ({connectionStatus})</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="screen error">
        <p>Error: {error}</p>
        <p>Connection Status: {connectionStatus}</p>
      </div>
    );
  }

  // Fields to render
  const statusFields = [
    { key: "totalJobs", title: "Total Jobs" },
    { key: "todayJobBeNumber", title: "todayJobBeNumber" },
    { key: "todayJobCreateImport", title: "today JobCreateImport" },
    { key: "pendingJobs", title: "Pending Jobs" },
    { key: "completedJobs", title: "Completed Jobs" },
    { key: "cancelledJobs", title: "Cancelled Jobs" },
    { key: "billingPending", title: "Billing Pending" },
    { key: "customClearanceCompleted", title: "Custom Clearance Completed" },
    // {
    //   key: "pcvDoneDutyPaymentPending",
    //   title: "PCV Done, Duty Payment Pending",
    // },
    // { key: "beNotedClearancePending", title: "BE Noted, Clearance Pending" },
    // { key: "beNotedArrivalPending", title: "BE Noted, Arrival Pending" },
    // { key: "discharged", title: "Discharged" },
    // { key: "gatewayIGMFiled", title: "Gateway IGM Filed" },
    // { key: "estimatedTimeOfArrival", title: "Estimated Time of Arrival" },
    // { key: "etaDatePending", title: "ETA Date Pending" },
    // { key: "esanchitPending", title: "E-Sanchit Pending" },
    // { key: "documentationPending", title: "Documentation Pending" },
    // { key: "submissionPending", title: "Submission Pending" },
    // { key: "doPlanningPending", title: "Do Planning" },
    // { key: "operationsPending", title: "Operations" },
  ];

  // Render Job Counts
  return (
    <div className="screen">
      {statusFields.slice(0, 6).map((field, index) => (
        <div className="box" key={index}>
          <p className="title">{field.title}</p>
          <p className="count">{jobCounts[field.key] || 0}</p>
        </div>
      ))}
    </div>
  );
};

export default Screen1;

import React, { useEffect, useState } from "react";
import "../../styles/Screens.scss";

const Screen1 = () => {
  const [jobCounts, setJobCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  useEffect(() => {
    const SSE_URL = `${process.env.REACT_APP_API_STRING}/sse/job-overview/24-25`;

    const eventSource = new EventSource(SSE_URL);

    eventSource.onopen = () => {
      console.log("SSE connection opened successfully.");
    };

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
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
      eventSource.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="screen">
        <p>Loading... ({connectionStatus})</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen error">
        <p>Error: {error}</p>
        <p>Connection Status: {connectionStatus}</p>
      </div>
    );
  }

  const statusFields = [
    { key: "todayJobCreateImport", title: "New Jobs Created" },
    { key: "todayJobBeDate", title: "Be Generated" },
    { key: "todayJobArrivalDate", title: "Arrived" },
    { key: "todayJobPcvDate", title: "PCV" },
    { key: "todayJobOutOfCharge", title: "Out Of Charge" },
    { key: "doPlanningPending", title: "Do Planning" },
  ];

  return (
    <div className="screen-container">
      <h1 className="heading">Today's Job Status</h1>
      <div className="screen">
        {statusFields.slice(0, 6).map((field, index) => (
          <div className="box" key={index}>
            <p className="title">{field.title}</p>
            <p className="count">{jobCounts[field.key] || 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Screen1;

import React, { useEffect, useState } from "react";
import "../../styles/Screens.scss";

const Screen1 = () => {
  const [jobCounts, setJobCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  useEffect(() => {
    // Replace with your actual WebSocket URL
    const socket = new WebSocket('ws://localhost:9000');

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
      setConnectionStatus("Connected");
      // Send year filter, if needed by backend
      socket.send(JSON.stringify({ year: "24-25" }));

      const payload = { year: "24-25" };
      console.log("📤 Sending:", payload);
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log()
        if (message.type === "update" || message.type === "init") {
          setJobCounts(message.data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
        setError("Error parsing server data.");
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError("WebSocket connection error.");
      setConnectionStatus("Disconnected");
    };

    socket.onclose = () => {
      console.warn("WebSocket disconnected");
      setConnectionStatus("Disconnected");
    };

    return () => {
      socket.close();
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
        {statusFields.map((field, index) => (
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

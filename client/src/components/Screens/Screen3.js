import React, { useEffect, useState } from "react";
import "../../styles/Screens.scss";

const Screen3 = () => {
  const [jobCounts, setJobCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  useEffect(() => {

    let SOCKET_URL;

    switch (process.env.REACT_APP_SOCKET_URL) {
      case "secure-production":
        SOCKET_URL = "wss://l6bnda4xwi.execute-api.ap-south-1.amazonaws.com/dev";
        break;
    
      case "testing":
        SOCKET_URL = "ws://43.205.59.159:9000";
        break;
    
      case "production":
        SOCKET_URL = "ws://13.202.42.73:9000";
        break;
    
      default:
        console.warn("⚠️ Unknown SOCKET_URL environment setting");
        SOCKET_URL = "ws://localhost:9000"; // fallback for local dev
    }
    const socket = new WebSocket(SOCKET_URL);


    socket.onopen = () => {
      setConnectionStatus("Connected");
      socket.send(JSON.stringify({ year: "25-26" }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "init" || message.type === "update") {
          setJobCounts(message.data || {});
          setError(null);
          setLoading(false);
        } else if (message.type === "error") {
          setError(message.error || "Server error");
        }
      } catch (err) {
        console.error("❌ Error parsing WebSocket message:", err);
        setError("Error parsing server data.");
      }
    };

    socket.onerror = () => {
      setError("WebSocket connection error.");
      setConnectionStatus("Error");
    };

    socket.onclose = () => {
      setConnectionStatus("Disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  const statusFields = [
    { key: "etaDatePending", title: "ETA Date Pending" },
    { key: "esanchitPending", title: "E-Sanchit Pending" },
    { key: "documentationPending", title: "Documentation Pending" },
    { key: "submissionPending", title: "Submission Pending" },
  ];

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

  return (
    <div className="screen">
      {statusFields.map((field, index) => (
        <div className="box" key={index}>
          <p className="title">{field.title}</p>
          <p className="count">{jobCounts[field.key] || 0}</p>
        </div>
      ))}
    </div>
  );
};

export default Screen3;

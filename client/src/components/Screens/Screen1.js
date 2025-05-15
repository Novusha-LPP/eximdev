import React, { useEffect, useState } from "react";
import "../../styles/Screens.scss";

const Screen1 = () => {
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
        console.log(message, "mesd")
  
        if (message.type === "init" || message.type === "update") {
          setJobCounts(message.data || {});
          setError(null); // ✅ Clear previous error
          setLoading(false);
        } else if (message.type === "error") {
          setError(message.error || "Server error");
        }
      } catch (err) {
        console.error("❌ Error parsing WebSocket message:", err);
        setError("Error parsing server data.");
      }
    };
  
    socket.onerror = (err) => {
      // Optionally only show error if socket isn't open
      if (socket.readyState !== WebSocket.OPEN) {
        setError("WebSocket connection error.");
        setConnectionStatus("Error");
      }
    };
  
    socket.onclose = () => {
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

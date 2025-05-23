import React, { useEffect, useState } from "react";
import "../../styles/Screens.scss";

const Screen2 = () => {
  const [jobCounts, setJobCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  useEffect(() => {
    const SOCKET_URL = `ws://${process.env.REACT_APP_SOCKET_URL}`;
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
    { key: "pcvDoneDutyPaymentPending", title: "PCV Done, Duty Payment Pending" },
    { key: "beNotedClearancePending", title: "BE Noted, Clearance Pending" },
    { key: "beNotedArrivalPending", title: "BE Noted, Arrival Pending" },
    { key: "discharged", title: "Discharged" },
    { key: "gatewayIGMFiled", title: "Gateway IGM Filed" },
    { key: "estimatedTimeOfArrival", title: "Estimated Time of Arrival" },
  ];

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

export default Screen2;

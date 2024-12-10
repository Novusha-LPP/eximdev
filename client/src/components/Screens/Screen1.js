// Screen1.jsx
import React, { useEffect, useState } from "react";
import "../../styles/Screens.scss";
import { screenData } from "./data";
import axios from "axios";

const Screen1 = () => {
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const response = await axios.get(
          "http://43.205.59.159:9000/api/get-jobs-overview/24-25"
        );
        setJobData(response.data);
      } catch (err) {
        console.error("Error fetching job data:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobData();
  }, []);

  if (loading) {
    return <div className="screen">Loading...</div>;
  }

  if (error) {
    return <div className="screen">Error loading data.</div>;
  }

  // Transform the API data to match the existing structure
  const dynamicData = [
    { title: "Total Jobs", count: jobData.totalJobs },
    { title: "Pending Jobs", count: jobData.pendingJobs },
    { title: "Completed Jobs", count: jobData.completedJobs },
    { title: "Cancelled Jobs", count: jobData.cancelledJobs },
  ];

  // If you have additional static data, include it here
  const staticData = [
    { title: "ETA Date Pending", count: 5 },
    { title: "Estimated Time of Arrival", count: 15 },
  ];

  // Combine dynamic and static data
  const combinedData = [...dynamicData, ...staticData];

  return (
    <div className="screen">
      {combinedData.map((item, index) => (
        <div className="box" key={index}>
          <p className="title">{item.title}</p>
          <p className="count">{item.count}</p>
        </div>
      ))}
    </div>
  );
};

export default Screen1;

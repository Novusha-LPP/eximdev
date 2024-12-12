import React, { useEffect, useState } from "react";
import "../../styles/Screens.scss";
import axios from "axios";

const Screen2 = () => {
  const [jobCounts, setJobCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Updated API endpoints for job data
  const jobEndpoints = {
    gateway_igm_filed: `${process.env.REACT_APP_API_STRING}/24-25/jobs/Pending/gateway_igm_filed?page=1&limit=100&search=`,
    discharged: `${process.env.REACT_APP_API_STRING}/24-25/jobs/Pending/discharged?page=1&limit=100&search=`,
    be_noted_arrival_pending: `${process.env.REACT_APP_API_STRING}/24-25/jobs/Pending/be_noted_arrival_pending?page=1&limit=100&search=`,
    be_noted_clearance_pending: `${process.env.REACT_APP_API_STRING}/24-25/jobs/Pending/be_noted_clearance_pending?page=1&limit=100&search=`,
    pcv_done_duty_payment_pending: `${process.env.REACT_APP_API_STRING}/24-25/jobs/Pending/pcv_done_duty_payment_pending?page=1&limit=100&search=`,
    custom_clearance_completed: `${process.env.REACT_APP_API_STRING}/24-25/jobs/Pending/custom_clearance_completed?page=1&limit=100&search=`,
  };

  useEffect(() => {
    const fetchJobCounts = async () => {
      try {
        // Fetch data from all endpoints concurrently
        const responses = await Promise.all(
          Object.entries(jobEndpoints).map(([key, endpoint]) =>
            axios.get(endpoint)
          )
        );

        // Map responses to respective keys
        const counts = Object.keys(jobEndpoints).reduce((acc, key, index) => {
          acc[key] = responses[index].data.total || 0; // Extract total from API response
          return acc;
        }, {});

        setJobCounts(counts);
      } catch (err) {
        console.error("Error fetching job counts:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobCounts();
  }, []);

  if (loading) {
    return <div className="screen">Loading...</div>;
  }

  if (error) {
    return <div className="screen">Error loading data.</div>;
  }

  const dataToRender = [
    { title: "Gateway IGM Filed", count: jobCounts.gateway_igm_filed },
    { title: "Discharged", count: jobCounts.discharged },
    {
      title: "BE Noted, Arrival Pending",
      count: jobCounts.be_noted_arrival_pending,
    },
    {
      title: "BE Noted, Clearance Pending",
      count: jobCounts.be_noted_clearance_pending,
    },
    {
      title: "PCV Done, Duty Payment Pending",
      count: jobCounts.pcv_done_duty_payment_pending,
    },
    {
      title: "Custom Clearance Completed",
      count: jobCounts.custom_clearance_completed,
    },
  ];

  return (
    <div className="screen">
      {dataToRender.map((item, index) => (
        <div className="box" key={index}>
          <p className="title">{item.title}</p>
          <p className="count">{item.count}</p>
        </div>
      ))}
    </div>
  );
};

export default Screen2;

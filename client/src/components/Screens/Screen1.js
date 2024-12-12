import React, { useEffect, useState } from "react";
import "../../styles/Screens.scss";
import axios from "axios";

const Screen1 = () => {
  const [jobCounts, setJobCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const jobEndpoints = {
    totalJobs: `${process.env.REACT_APP_API_STRING}/get-jobs-overview/24-25`,
    eta_date_pending: `${process.env.REACT_APP_API_STRING}/24-25/jobs/Pending/eta_date_pending?page=1&limit=100&search=`,
    estimated_time_of_arrival: `${process.env.REACT_APP_API_STRING}/24-25/jobs/Pending/estimated_time_of_arrival?page=1&limit=100&search=`,
  };

  useEffect(() => {
    const fetchJobCounts = async () => {
      try {
        // Fetch total jobs overview
        const overviewResponse = await axios.get(jobEndpoints.totalJobs);
        const { totalJobs, pendingJobs, completedJobs, cancelledJobs } =
          overviewResponse.data;

        // Fetch counts for additional fields
        const additionalResponses = await Promise.all(
          Object.entries(jobEndpoints)
            .filter(([key]) => key !== "totalJobs") // Skip overview endpoint
            .map(([key, endpoint]) => axios.get(endpoint))
        );

        const additionalCounts = additionalResponses.reduce(
          (acc, response, index) => {
            const key = Object.keys(jobEndpoints).filter(
              (k) => k !== "totalJobs"
            )[index];
            acc[key] = response.data.total || 0; // Use `total` from the API response
            return acc;
          },
          {}
        );

        setJobCounts({
          totalJobs,
          pendingJobs,
          completedJobs,
          cancelledJobs,
          ...additionalCounts,
        });
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
    { title: "Total Jobs", count: jobCounts.totalJobs },
    { title: "Pending Jobs", count: jobCounts.pendingJobs },
    { title: "Completed Jobs", count: jobCounts.completedJobs },
    { title: "Cancelled Jobs", count: jobCounts.cancelledJobs },
    { title: "ETA Date Pending", count: jobCounts.eta_date_pending },
    { title: "Estimated Time of Arrival", count: jobCounts.estimated_time_of_arrival },
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

export default Screen1;

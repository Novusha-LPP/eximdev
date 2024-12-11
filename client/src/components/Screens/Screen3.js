import React, { useState, useEffect } from "react";
import "../../styles/Screens.scss";
import axios from "axios";

const Screen3 = () => {
  const [jobCounts, setJobCounts] = useState({
    billingPending: 0,
    esanchit: 0,

    documentation: 0,
    submission: 0,
    doPlanning: 0,
    operations: 0,
  });

  // Fetch counts for all modules
  const fetchJobCounts = async () => {
    try {
      const billingPendingResponse = await axios.get(
        `${process.env.REACT_APP_API_STRING}/24-25/jobs/Pending/billing_pending`,

        { params: { page: 1, limit: 100, search: "" } }
      );
      const esanchitResponse = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-esanchit-jobs`,
        { params: { page: 1, limit: 100, search: "" } }
      );

      const documentationResponse = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-documentation-jobs`,
        { params: { page: 1, limit: 100, search: "" } }
      );

      const submissionResponse = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-submission-jobs`,
        { params: { page: 1, limit: 100, search: "" } }
      );

      const doPlanningResponse = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-do-module-jobs`,
        { params: { page: 1, limit: 100, search: "" } }
      );

      const operationsResponse = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-operations-planning-jobs/atul_dev`,
        {
          params: {
            page: 1,
            limit: 100,
            search: "",
            year: "24-25",
            selectedICD: "",
          },
        }
      );

      setJobCounts({
        billingPending: billingPendingResponse.data.total || 0,
        esanchit: esanchitResponse.data.totalJobs || 0,
        documentation: documentationResponse.data.totalJobs || 0,
        submission: submissionResponse.data.totalJobs || 0,
        doPlanning: doPlanningResponse.data.totalJobs || 0,
        operations: operationsResponse.data.totalJobs || 0,
      });
    } catch (error) {
      console.error("Error fetching job counts:", error);
    }
  };

  useEffect(() => {
    fetchJobCounts();
  }, []);

  // Map jobCounts to corresponding titles
  const screen3Data = [
    { title: "Billing Pending", count: jobCounts.billingPending },
    { title: "e-Sanchit", count: jobCounts.esanchit },
    { title: "Documentation", count: jobCounts.documentation },
    { title: "Submission", count: jobCounts.submission },
    { title: "DO Planning", count: jobCounts.doPlanning },
    { title: "Operations", count: jobCounts.operations },
  ];

  return (
    <div className="screen">
      {screen3Data.map((item, index) => (
        <div className="box" key={index}>
          <p className="title">{item.title}</p>
          <p className="count">{item.count}</p>
        </div>
      ))}
    </div>
  );
};

export default Screen3;

import React, { useState, useEffect, useRef } from "react";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useParams } from "react-router-dom";
import axios from "axios";

const DocumentationJob = () => {
  // Extract job_no and year directly from the URL
  const { job_no, year } = useParams(); // Correctly destructure parameters
  const bl_no_ref = useRef();
  const [snackbar, setSnackbar] = useState(false);
  const [data, setData] = useState(null);

  // Fetch data
  useEffect(() => {
    async function getJobDetails() {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-job/${year}/${job_no}` // Use destructured variables
        );
        setData(response.data);
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }

    getJobDetails();
  }, [job_no, year]); // Use destructured variables in dependency array

  return (
    <div>
      {data !== null ? (
        <JobDetailsStaticData
          data={data}
          bl_no_ref={bl_no_ref}
          params={{ job_no, year }} // Pass params object with job_no and year
          setSnackbar={setSnackbar}
        />
      ) : (
        <p>Loading job details...</p> // Add a fallback for loading
      )}
    </div>
  );
};

export default DocumentationJob;

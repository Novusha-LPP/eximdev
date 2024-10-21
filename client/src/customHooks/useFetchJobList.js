import { useEffect, useState } from "react";
import axios from "axios";

function useFetchJobList(detailedStatus, selectedYear, status) {
  const [rows, setRows] = useState([]); // Stores job list data
  const [total, setTotal] = useState(0); // Total number of jobs
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(1); // Total number of pages
  const [loading, setLoading] = useState(false); // Loading state

  const fetchJobs = async (page) => {
    setLoading(true); // Show loading indicator while fetching
    try {
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_STRING
        }/${selectedYear}/jobs/${status}/${detailedStatus
          .toLowerCase()
          .replace(/ /g, "_")
          .replace(/,/g, "")}?page=${page}&limit=100`
      );

      // Set the job list and pagination data
      setRows(response.data.data);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (error) {
      console.error("Error fetching job list:", error);
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  useEffect(() => {
    if (selectedYear) {
      fetchJobs(currentPage);
    }
  }, [detailedStatus, selectedYear, status, currentPage]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return { rows, total, totalPages, currentPage, loading, handlePageChange };
}

export default useFetchJobList;

import { useEffect, useState } from "react";
import axios from "axios";

function useFetchJobList(detailedStatus, selectedYear, status, searchQuery) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async (page) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_STRING
        }/${selectedYear}/jobs/${status}/${detailedStatus
          .toLowerCase()
          .replace(/ /g, "_")
          .replace(/,/g, "")}?page=${page}&limit=100&search=${searchQuery}`
      );
      const { data, total, totalPages, currentPage } = response.data;
      setRows(data);
      setTotal(total);
      setTotalPages(totalPages);
      setCurrentPage(currentPage);
    } catch (error) {
      console.error("Error fetching job list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYear) {
      fetchJobs(currentPage);
    }
  }, [detailedStatus, selectedYear, status, currentPage, searchQuery]);

  const handlePageChange = (newPage) => setCurrentPage(newPage);

  return {
    rows,
    total,
    totalPages,
    currentPage,
    loading,
    handlePageChange,
    fetchJobs,
  };
}

export default useFetchJobList;

import { useEffect, useState, useCallback } from "react";
import axios from "axios";

function useFetchPrJobList(status, searchQuery) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(
    async (page) => {
      setLoading(true);
      try {
        // Properly encode search query
        const formattedSearchQuery = searchQuery
          ? encodeURIComponent(searchQuery)
          : "";

        // Construct API URL
        const apiUrl = `${process.env.REACT_APP_API_STRING}/pr-job-list?status=${status}&search=${formattedSearchQuery}&page=${page}&limit=100`;

        const response = await axios.get(apiUrl);

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
    },
    [status, searchQuery]
  );

  useEffect(() => {
    fetchJobs(currentPage);
  }, [fetchJobs, currentPage]);

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

export default useFetchPrJobList;

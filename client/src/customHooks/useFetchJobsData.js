import { useEffect, useState } from "react";
import axios from "axios";

function useFetchJobsData(
  detailedStatus,
  selectedYear,
  status,
  searchQuery,
  selectedImporter
) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchJobsData = async (page = 1) => {
    setLoading(true);
    try {
      const formattedImporter =
        selectedImporter && selectedImporter.toLowerCase() !== "select importer"
          ? encodeURIComponent(selectedImporter)
          : "all";

      const formattedSearchQuery = searchQuery
        ? encodeURIComponent(searchQuery)
        : "";

      const apiUrl = `${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/${status}/${detailedStatus}/${formattedImporter}?page=${page}&limit=100&search=${formattedSearchQuery}`;

      console.log("fetching jobs:", apiUrl);
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
  };

  // Re-fetch when any filter/search changes
  useEffect(() => {
    if (selectedYear && selectedImporter) {
      setCurrentPage(1);
      fetchJobsData(1);
    }
  }, [detailedStatus, selectedYear, status, searchQuery, selectedImporter]);

  // Handle manual page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchJobsData(newPage);
  };

  return {
    rows,
    total,
    totalPages,
    currentPage,
    loading,
    handlePageChange,
    fetchJobsData,
  };
}

export default useFetchJobsData;

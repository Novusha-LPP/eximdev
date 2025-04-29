import { useEffect, useState } from "react";
import axios from "axios";

function useFetchJobList(
  detailedStatus,
  selectedYearState,
  status,
  selectedICD,
  searchQuery,
  selectedImporter
) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async (page) => {
    setLoading(true);
    try {
      // Properly encode importer
      const formattedImporter =
        selectedImporter && selectedImporter.toLowerCase() !== "select importer"
          ? encodeURIComponent(selectedImporter) // Encodes special characters
          : "all"; // Default to "all" if not selected

      // Properly encode search query
      const formattedSearchQuery = searchQuery
        ? encodeURIComponent(searchQuery)
        : "";

      // Construct API URL
      const apiUrl = `${process.env.REACT_APP_API_STRING}/${selectedYearState}/jobs/${status}/${detailedStatus}/${selectedICD}/${formattedImporter}?page=${page}&limit=100&search=${formattedSearchQuery}`;

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

  useEffect(() => {
    if (selectedYearState) {
      fetchJobs(currentPage);
    }
  }, [
    detailedStatus,
    selectedYearState,
    status,
    selectedICD,
    currentPage,
    searchQuery,
    selectedImporter,
  ]);

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

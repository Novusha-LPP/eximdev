import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";

function useFetchJobList(detailedStatus, selectedYear, status, searchQuery) {
  const { user } = useContext(UserContext);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async (page) => {
    setLoading(true);
    try {
      // Ensure selectedYear is in 'YY-YY' format
      if (!/^\d{2}-\d{2}$/.test(selectedYear)) {
        throw new Error("Selected year must be in 'YY-YY' format.");
      }

      // Ensure assigned_importer_name is an array
      const assignedImporterNames = Array.isArray(user.assigned_importer_name)
        ? user.assigned_importer_name
        : [user.assigned_importer_name];

      const response = await axios.post(
        `${
          process.env.REACT_APP_API_STRING
        }/${selectedYear}/jobs/${status}/${detailedStatus
          .toLowerCase()
          .replace(/ /g, "_")
          .replace(/,/g, "")}`,
        {
          assigned_importer_name: assignedImporterNames,
          page: page,
          limit: 100,
          search: searchQuery,
        }
      );
      const { data, total, totalPages, currentPage } = response.data;
      setRows(data);
      setTotal(total);
      setTotalPages(totalPages);
      setCurrentPage(currentPage);
    } catch (error) {
      if (error.response) {
        // Backend returned an error response
        console.error("Error fetching job list:", error.response.data);
      } else if (error.request) {
        // No response received from backend
        console.error("No response received:", error.request);
      } else {
        // Other errors
        console.error("Error:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYear) {
      fetchJobs(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

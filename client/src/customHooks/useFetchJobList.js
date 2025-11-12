import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";

function useFetchJobList(
  detailedStatus,
  selectedYearState,
  status,
  selectedICD,
  searchQuery,
  selectedImporter,
  unresolvedOnly = false // NEW: unresolvedOnly toggle
) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userImporters, setUserImporters] = useState([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const { user } = useContext(UserContext);

  // Accept unresolvedOnly as an argument to fetchJobs
  const fetchJobs = async (page, unresolved = unresolvedOnly) => {
    setLoading(true);
    try {
      // Validate if user can access the selected importer
      if (user && user.role !== "Admin" && selectedImporter && selectedImporter.toLowerCase() !== "select importer") {
        const userAssignedImporters = user.assigned_importer_name || [];
        const hasAllAccess = userAssignedImporters.some(imp => imp.toUpperCase() === "ALL");
        
        if (!hasAllAccess) {
          const canAccessImporter = userAssignedImporters.some(imp => 
            imp.toLowerCase() === selectedImporter.toLowerCase()
          );
          
          if (!canAccessImporter) {
            console.warn(`User ${user.username} cannot access importer: ${selectedImporter}`);
            // Still proceed with API call - let backend handle the filtering
          }
        }
      }

      // Properly encode importer
      const formattedImporter =
        selectedImporter && selectedImporter.toLowerCase() !== "select importer"
          ? encodeURIComponent(selectedImporter)
          : "all";

      // Properly encode search query
      const formattedSearchQuery = searchQuery
        ? encodeURIComponent(searchQuery)
        : "";

      // Construct API URL
      let apiUrl = `${process.env.REACT_APP_API_STRING}/${selectedYearState}/jobs/${status}/${detailedStatus}/${selectedICD}/${formattedImporter}?page=${page}&limit=100&search=${formattedSearchQuery}`;
      if (unresolved) {
        apiUrl += `&unresolvedOnly=true`;
      }

      const response = await axios.get(apiUrl, {
        headers: {
          ...(user?.username ? { "x-username": user.username } : {}),
        },
      });

      const { data, total, totalPages, currentPage, userImporters: responseUserImporters } = response.data;
      setRows(data);
      setTotal(total);
      setTotalPages(totalPages);
      setCurrentPage(currentPage);
      
      // If this is the Pending status, update unresolved count from the total when unresolvedOnly is true
      if (status === "Pending" && unresolved) {
        setUnresolvedCount(total);
      }
      
      // Store user's allowed importers from response
      if (responseUserImporters) {
        setUserImporters(responseUserImporters);
      }
    } catch (error) {
      console.error("Error fetching job list:", error);
      if (error.response?.status === 404) {
        console.error("User not found");
      } else if (error.response?.status === 403) {
        console.error("Access denied");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial unresolved count for Pending status
  useEffect(() => {
    async function fetchInitialUnresolvedCount() {
      if (status === "Pending" && selectedYearState && user) {
        try {
          const queryParams = new URLSearchParams({
            page: 1,
            limit: 1,
            search: '',
            unresolvedOnly: true
          });

          const response = await axios.get(
            `${process.env.REACT_APP_API_STRING}/${selectedYearState}/jobs/${status}/${detailedStatus}/${selectedICD}/${selectedImporter || 'all'}?${queryParams}`,
            {
              headers: {
                ...(user?.username ? { "x-username": user.username } : {}),
              },
            }
          );
          setUnresolvedCount(response.data.total || 0);
        } catch (error) {
          console.error("Error fetching initial unresolved count:", error);
          setUnresolvedCount(0);
        }
      }
    }
    fetchInitialUnresolvedCount();
  }, [status, selectedYearState, user, detailedStatus, selectedICD, selectedImporter]);

  // Auto-trigger search when filters change (including on page change)
  useEffect(() => {
    if (selectedYearState && user) {
      fetchJobs(currentPage, unresolvedOnly);
    }
  }, [
    detailedStatus,
    selectedYearState,
    status,
    selectedICD,
    currentPage,
    searchQuery,
    selectedImporter,
    user,
    unresolvedOnly,
  ]);

  // Auto-reset to page 1 when search query or major filters change
  // This ensures user doesn't stay on page 5 when filtering changes drastically
  useEffect(() => {
    setCurrentPage(1);
  }, [detailedStatus, selectedICD, selectedImporter, searchQuery, status]);

  const handlePageChange = (newPage) => setCurrentPage(newPage);

  // Helper function to check if user can access an importer
  const canAccessImporter = (importerName) => {
    if (!user || !importerName) return false;
    if (user.role === "Admin") return true;
    
    const userAssignedImporters = user.assigned_importer_name || [];
    const hasAllAccess = userAssignedImporters.some(imp => imp.toUpperCase() === "ALL");
    
    if (hasAllAccess) return true;
    
    return userAssignedImporters.some(imp => 
      imp.toLowerCase() === importerName.toLowerCase()
    );
  };

  return {
    rows,
    setRows,
    total,
    totalPages,
    currentPage,
    loading,
    handlePageChange,
    fetchJobs,
    userImporters, // Available importers for current user
    canAccessImporter, // Helper function to check access
    unresolvedCount, // Add unresolvedCount to the returned object
  };
}

export default useFetchJobList;
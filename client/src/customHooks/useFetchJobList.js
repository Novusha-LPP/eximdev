import { useContext, useEffect, useState, useRef } from "react";
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
  
  // PERFORMANCE: AbortController to cancel previous requests
  // Prevents wasted API calls and stale data when user rapidly changes filters
  const abortControllerRef = useRef(null);
  
  // Simple client-side cache for recent queries
  const queryCacheRef = useRef(new Map());
  const CACHE_MAX = 100; // max entries
  const CACHE_TTL = 1000 * 60 * 2; // 2 minutes

  const makeCacheKey = (page) =>
    `${selectedYearState}|${status}|${detailedStatus}|${selectedICD}|${selectedImporter || 'all'}|${searchQuery}|${page}`;

  const getFromCache = (key) => {
    const e = queryCacheRef.current.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL) {
      queryCacheRef.current.delete(key);
      return null;
    }
    return e.val;
  };

  const setToCache = (key, val) => {
    try {
      if (queryCacheRef.current.size >= CACHE_MAX) {
        const firstKey = queryCacheRef.current.keys().next().value;
        queryCacheRef.current.delete(firstKey);
      }
      queryCacheRef.current.set(key, { val, ts: Date.now() });
    } catch (err) {
      // ignore cache errors
      console.warn('Cache set failed', err);
    }
  };

  // Accept unresolvedOnly as an argument to fetchJobs
  const fetchJobs = async (page, unresolved = unresolvedOnly) => {
    setLoading(true);
    const cacheKey = makeCacheKey(page);
    const cached = getFromCache(cacheKey);
    if (cached) {
      // Use cached results immediately
      setRows(cached.data);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
      setCurrentPage(cached.currentPage);
      setLoading(false);
      return;
    }
    
    // PERFORMANCE: Cancel previous pending request if still in progress
    // This prevents wasted network traffic when user changes filters rapidly
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
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

      const start = performance.now();
      const response = await axios.get(apiUrl, {
        headers: {
          ...(user?.username ? { "x-username": user.username } : {}),
        },
        signal: signal, // Pass abort signal to cancel request if needed
      });
      const duration = Math.round(performance.now() - start);
      // Optionally log timing for monitoring in dev
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[PERF] fetchJobs ${cacheKey} took ${duration}ms`);
      }

      const { data, total, totalPages, currentPage, userImporters: responseUserImporters } = response.data;
      setRows(data);
      setTotal(total);
      setTotalPages(totalPages);
      setCurrentPage(currentPage);

      // Cache page 1 responses for quick repeated access
      try {
        setToCache(cacheKey, { data, total, totalPages, currentPage });
      } catch (e) {
        // ignore
      }
      
      // If this is the Pending status, update unresolved count from the total when unresolvedOnly is true
      if (status === "Pending" && unresolved) {
        setUnresolvedCount(total);
      }
      
      // Store user's allowed importers from response
      if (responseUserImporters) {
        setUserImporters(responseUserImporters);
      }
    } catch (error) {
      // PERFORMANCE: Only log errors if request was not aborted
      // Aborted requests are normal when user changes filters rapidly
      if (error.code !== 'ECONNABORTED' && signal.aborted !== true) {
        console.error("Error fetching job list:", error);
        if (error.response?.status === 404) {
          console.error("User not found");
        } else if (error.response?.status === 403) {
          console.error("Access denied");
        }
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
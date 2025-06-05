import { useState, useCallback } from "react";
import axios from "axios";

const useFetchSrccDsr = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data API call with populate functionality
  const getData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-srcc-dsr`,
        {
          params: {
            page: 1,
            limit: 100,
          },
        }
      );

      if (response.data && response.data.data) {
        setRows(response.data.data);
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error("Error fetching DSR data:", err);
      setError(err.response?.data?.message || "Failed to fetch data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    rows,
    setRows,
    loading,
    error,
    getData,
  };
};

export default useFetchSrccDsr;

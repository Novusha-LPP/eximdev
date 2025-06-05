import { useState, useEffect } from "react";
import axios from "axios";

const useDepots = (API_URL) => {
  const [depots, setDepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDepots = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/get-port-types`);

        if (response.data && response.data.data) {
          // Transform data for dropdown usage
          const formattedDepots = response.data.data.map((depot) => ({
            value: depot._id,
            label: `${depot.name} (${depot.icd_code})`,
            // Keep original data for reference
            _id: depot._id,
            name: depot.name,
            icd_code: depot.icd_code,
            port_icd_code: depot.icd_code,
            port_icd_name: depot.name,
          }));
          setDepots(formattedDepots);
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching depots:", err);
        setError(err.message || "Failed to fetch depots");
        setDepots([]);
      } finally {
        setLoading(false);
      }
    };

    if (API_URL) {
      fetchDepots();
    }
  }, [API_URL]);

  return { depots, loading, error };
};

export default useDepots;

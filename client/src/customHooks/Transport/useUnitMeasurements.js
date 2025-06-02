import { useState, useEffect } from "react";
import axios from "axios";

const useUnitMeasurements = (API_URL) => {
  const [unitMeasurements, setUnitMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUnitMeasurements = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/get-unit-measurements`);
        if (response.data && Array.isArray(response.data)) {
          // Transform data for dropdown usage
          const formattedUnits = response.data.map((unit) => ({
            value: unit._id,
            label: `${unit.name}`,
            // Keep original data for reference
            _id: unit._id,
            unitName: unit.name, // Map 'name' to 'unitName' for frontend consistency
            shortName: unit.name,
            measurements: unit.measurements,
          }));
          setUnitMeasurements(formattedUnits);
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching unit measurements:", err);
        setError(err.message || "Failed to fetch unit measurements");
        setUnitMeasurements([]);
      } finally {
        setLoading(false);
      }
    };

    if (API_URL) {
      fetchUnitMeasurements();
    }
  }, [API_URL]);

  return { unitMeasurements, loading, error };
};

export default useUnitMeasurements;

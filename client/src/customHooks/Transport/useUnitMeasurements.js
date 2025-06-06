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
          // Flatten the measurements from all categories
          const allMeasurements = [];

          response.data.forEach((category) => {
            if (category.measurements && Array.isArray(category.measurements)) {
              category.measurements.forEach((measurement) => {
                allMeasurements.push({
                  value: measurement._id,
                  label: `${measurement.unit} (${measurement.symbol})`,
                  _id: measurement._id,
                  unit: measurement.unit,
                  symbol: measurement.symbol,
                  decimal_places: measurement.decimal_places,
                  categoryName: category.name, // Keep category reference
                  categoryId: category._id,
                });
              });
            }
          });

          setUnitMeasurements(allMeasurements);
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

import { useState, useEffect } from "react";
import axios from "axios";

const useOrganisations = () => {
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  useEffect(() => {
    const fetchOrganisations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/organisations`);

        // Transform the data to include value (ObjectId) and label (name) format
        const transformedData =
          response.data.data?.map((org) => ({
            value: org._id,
            label: org.name,
            _id: org._id,
            name: org.name,
            alias: org.alias,
            type: org.type,
          })) || [];

        setOrganisations(transformedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching organisations:", err);
        setError(err.message);
        setOrganisations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganisations();
  }, [API_URL]);

  return { organisations, loading, error };
};

export default useOrganisations;

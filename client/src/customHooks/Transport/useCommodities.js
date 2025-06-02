import { useState, useEffect } from "react";
import axios from "axios";

const useCommodities = (API_URL) => {
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCommodities = async () => {
      try {
        const response = await axios.get(`${API_URL}/get-commodity-type`);        setCommodities(
          response.data.data.map((item) => ({
            label: `${item.hsn_code} - ${item.name}`,
            value: item._id, // Use ObjectId instead of hsn_code
          }))
        );
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    fetchCommodities();
  }, [API_URL]);

  return { commodities, loading, error };
};

// In useCommodities.js
export default useCommodities;

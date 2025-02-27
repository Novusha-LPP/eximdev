import { useState, useEffect } from "react";
import axios from "axios";

const useVehicleTypes = (API_URL) => {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        const response = await axios.get(`${API_URL}/get-vehicle-type`);
        setVehicleTypes(
          response.data.data.map((item) => ({
            label: `${item.vehicleType} - ${item.shortName}`,
            value: item.vehicleType,
          }))
        );
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    fetchVehicleTypes();
  }, [API_URL]);

  return { vehicleTypes, loading, error };
};

export default useVehicleTypes;

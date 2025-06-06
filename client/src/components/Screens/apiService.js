// apiService.js
import axios from "axios";

const BASE_URL = "http://43.205.59.159:9000/api/24-25/jobs/Pending";

export const fetchJobCount = async (endpoint) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/${endpoint}?page=1&limit=100&search=`
    );
    return response.data.total;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};

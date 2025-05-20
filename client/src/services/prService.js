import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_STRING;

export const getPrData = async (page = 1, limit = 50) => {
  const response = await axios.get(`${API_BASE_URL}/get-pr-data/all`, {
    params: { page, limit },
    timeout: 10000,
  });
  return response.data;
};

export const createPr = async (prData) => {
  return axios.post(`${API_BASE_URL}/create-pr`, prData);
};

export const updatePrData = async (id, data) => {
  return axios.put(`${API_BASE_URL}/update-pr/${id}`, data);
};

export const deletePr = async (id) => {
  return axios.delete(`${API_BASE_URL}/delete-pr/${id}`);
};

export const updateContainerData = async (prId, data) => {
  return axios.put(`${API_BASE_URL}/update-container/${prId}`, data);
};

export const deleteContainer = async (prId, containerId) => {
  return axios.delete(
    `${API_BASE_URL}/delete-container/${prId}/${containerId}`
  );
};

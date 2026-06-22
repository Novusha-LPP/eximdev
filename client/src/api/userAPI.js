import axios from "axios";

const API = process.env.REACT_APP_API_STRING;

export const userAPI = {
  getAll: () => axios.get(`${API}/users`, { withCredentials: true }),

  create: (data) => axios.post(`${API}/users`, data),

  update: (id, data) => axios.put(`${API}/users/${id}`, data),

  remove: (id) => axios.delete(`${API}/users/${id}`),
};
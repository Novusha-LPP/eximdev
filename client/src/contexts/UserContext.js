// contexts/UserContext.js

import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/user`, {
        withCredentials: true, // Send cookies with the request
      });

      setUser(res.data.user); // Set the user if authenticated
    } catch (err) {
      console.error("Failed to fetch user:", err);
      setUser(null); // Clear user state on error
    } finally {
      setLoading(false); // Stop the loading spinner
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_STRING}/logout`, {}, { withCredentials: true });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, logout, loading }}>
      {loading ? <div>Loading...</div> : children}
    </UserContext.Provider>
  );
};

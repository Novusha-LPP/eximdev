// contexts/UserContext.js

import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data
  const fetchUser = async () => {
    console.debug("[UserContext] Fetching user data...");
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/user`, {
        withCredentials: true,
      });
      console.debug("[UserContext] User data fetched successfully:", res.data.user);
      setUser(res.data.user);
    } catch (err) {
      console.error("[UserContext] Failed to fetch user:", err.response || err.message);
      setUser(null);
    } finally {
      setLoading(false);
      console.debug("[UserContext] User fetch process completed. Loading state set to false.");
    }
  };

  // Logout function
  const logout = async () => {
    console.debug("[UserContext] Logout initiated...");
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/logout`,
        {},
        { withCredentials: true }
      );
      console.debug("[UserContext] Logout successful. Clearing user state.");
      setUser(null);
    } catch (err) {
      console.error("[UserContext] Logout failed:", err.response || err.message);
    }
  };

  useEffect(() => {
    console.debug("[UserContext] Initializing user context...");
    fetchUser();
  }, []);

  useEffect(() => {
    console.debug("[UserContext] User state updated:", user);
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser, logout, loading }}>
      {loading ? <div>Loading...</div> : children}
    </UserContext.Provider>
  );
};

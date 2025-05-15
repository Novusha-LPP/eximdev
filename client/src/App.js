// In App.js

import "./App.scss";
import { UserContext } from "./contexts/UserContext";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import axios from "axios";

// Set up axios defaults
// axios.defaults.withCredentials = true;

// Add an axios interceptor to include the token in all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check authentication status when app loads or refreshes
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Get token from localStorage instead of relying on cookies
        const token = localStorage.getItem("access_token");

        if (!token) {
          setUser(null);
          navigate("/login");
          setIsLoading(false);
          return;
        }

        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/verify-session`
        );

        setUser(response.data);
      } catch (error) {
        console.error(
          "Authentication check failed:",
          error.response?.data || error.message
        );
        setUser(null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, [navigate]);

  // Your keyboard navigation handler
  useEffect(() => {
    // Same as before
  }, [navigate]);

  const logout = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_STRING}/logout`);
      // Clear tokens from localStorage on logout
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="app-loading">Loading...</div>;
  }

  return (
    <UserContext.Provider value={{ user, setUser, logout, isLoading }}>
      <div className="App">{user ? <HomePage /> : <LoginPage />}</div>
    </UserContext.Provider>
  );
}

export default React.memo(App);

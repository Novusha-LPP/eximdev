import "./App.scss";
import { UserContext } from "./contexts/UserContext";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import axios from "axios";
axios.defaults.withCredentials = true;
function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check authentication status when app loads or refreshes
  useEffect(() => {
    const checkAuthentication = async () => {
      // console.log("Checking authentication status...");
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/verify-session`,
          { withCredentials: true }
        );
        // console.log("Authentication response:", response.data);
        setUser(response.data);
      } catch (error) {
        console.error(
          "Authentication check failed:",
          error.response?.data || error.message
        );
        setUser(null);
        navigate("/login"); // Redirect to login if not authenticated
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
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/api/logout`,
        {},
        {
          withCredentials: true,
        }
      );
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="app-loading">Loading...</div>;
  }

  // console.log(user);
  return (
    <UserContext.Provider value={{ user, setUser, logout, isLoading }}>
      <div className="App">{user ? <HomePage /> : <LoginPage />}</div>
    </UserContext.Provider>
  );
}

export default React.memo(App);

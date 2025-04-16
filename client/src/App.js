import "./App.scss";
import { UserContext } from "./contexts/UserContext";
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import axios from "axios";
import PrivateRoute from "./page/PrivateRoute.js";

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/verify-session`,
          { withCredentials: true }
        );
        setUser(response.data);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  const logout = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/api/logout`,
        {},
        { withCredentials: true }
      );
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, isLoading }}>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" /> : <LoginPage />
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <HomePage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </UserContext.Provider>
  );
}

export default App;

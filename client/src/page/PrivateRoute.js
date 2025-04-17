// src/routes/PrivateRoute.js
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";

const PrivateRoute = ({ children }) => {
  const { user, isLoading } = useContext(UserContext);

  if (isLoading) return <div className="app-loading">Loading...</div>;

  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;

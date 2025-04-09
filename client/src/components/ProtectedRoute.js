// components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

const ProtectedRoute = ({
  requiredModules,
  redirectPath = "/unauthorized",
  children,
}) => {
  const { user, isLoading, hasModuleAccess } = useUser();

  // If authentication is still checking, show loading
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required module access
  const hasAccess = hasModuleAccess(requiredModules);

  if (!hasAccess) {
    return <Navigate to={redirectPath} replace />;
  }

  // If there are children, render them, otherwise render the outlet for nested routes
  return children ? children : <Outlet />;
};

export default ProtectedRoute;

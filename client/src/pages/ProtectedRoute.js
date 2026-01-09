// components/ProtectedRoute.js
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserContext } from "../contexts/UserContext";

const ProtectedRoute = ({ children, requiredModule, fallbackPath = "/" }) => {
  const { user } = useContext(UserContext);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const userModules = user.modules || [];

  // Check if user has the required module permission
  const hasPermission = userModules.includes(requiredModule);

  if (!hasPermission) {
    // Redirect to fallback path with a message
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{
          from: location,
          message: `Access denied. You don't have permission to access ${requiredModule}.`
        }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;

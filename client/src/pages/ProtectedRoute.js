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
  const hasPermission = Array.isArray(requiredModule)
    ? requiredModule.some(m => userModules.includes(m))
    : userModules.includes(requiredModule);

  if (!hasPermission) {
    const moduleLabel = Array.isArray(requiredModule) ? requiredModule.join(' or ') : requiredModule;
    // Redirect to fallback path with a message
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{
          from: location,
          message: `Access denied. You don't have permission to access ${moduleLabel}.`
        }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;

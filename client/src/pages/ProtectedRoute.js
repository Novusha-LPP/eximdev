// components/ProtectedRoute.js
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserContext } from "../contexts/UserContext";

// Modules that are accessible to all users without explicit module assignment
const PUBLIC_MODULES = [
  "AMC Suppliers Renewal",
  "AMC Visitor Logs",
  "Admin Equipment Checklist",
  "Audit Trail", // ✅ Added: accessible to all logged-in users
];

const ProtectedRoute = ({ children, requiredModule, fallbackPath = "/" }) => {
  const { user } = useContext(UserContext);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const userModules = user.modules || [];

  const isPublicModule = Array.isArray(requiredModule)
    ? requiredModule.some(m => PUBLIC_MODULES.includes(m))
    : PUBLIC_MODULES.includes(requiredModule);

  const hasPermission =
    user.role === "Admin" ||
    isPublicModule ||
    (Array.isArray(requiredModule)
      ? requiredModule.some(m => userModules.includes(m))
      : userModules.includes(requiredModule));

  if (!hasPermission) {
    const moduleLabel = Array.isArray(requiredModule)
      ? requiredModule.join(' or ')
      : requiredModule;

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
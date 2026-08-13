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

  // Restrict Attendance module to RABS employees
  const isRabsUser = user.company && /RABS/i.test(user.company);
  const isAttendanceModule = Array.isArray(requiredModule)
    ? requiredModule.includes("Attendance")
    : requiredModule === "Attendance";

  // The attendance RABS restriction was removed here

  const is5sAuditModule = Array.isArray(requiredModule)
    ? requiredModule.includes("5S Audit")
    : requiredModule === "5S Audit";

  if (is5sAuditModule) {
    const isHod = user.role === 'Head_of_Department' || user.role === 'HOD' || user.isHOD;
    const isAdmin = user.role === 'Admin';
    const has5sAccess = isRabsUser && (isAdmin || isHod);

    if (!has5sAccess) {
      return (
        <Navigate
          to={fallbackPath}
          replace
          state={{
            from: location,
            message: "Access denied. The 5S Audit module is restricted to RABS Admin and HOD users only."
          }}
        />
      );
    }
    return children;
  }

  const isFirstAidModule = Array.isArray(requiredModule)
    ? requiredModule.includes("First Aid")
    : requiredModule === "First Aid";

  if (isFirstAidModule) {
    if (!isRabsUser && user.role !== 'Admin') {
      return (
        <Navigate
          to={fallbackPath}
          replace
          state={{
            from: location,
            message: "Access denied. The First Aid module is restricted to RABS employees only."
          }}
        />
      );
    }
    return children;
  }

  // Check if user has the required module permission
  const hasPermission = user.role === 'Admin' || (Array.isArray(requiredModule)
    ? requiredModule.some(m => userModules.includes(m))
    : userModules.includes(requiredModule));

  const isOwnKycRoute = location.pathname.startsWith('/employee-kyc') || location.pathname.startsWith('/complete-kyc');
  const isOwnKyc = isOwnKycRoute && (requiredModule === "Employee KYC");

  if (!hasPermission && !isOwnKyc && !isAttendanceModule) {
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

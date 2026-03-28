import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

function ProtectedRoute({ requireAdmin = false }) {
  const { isAdmin, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/faq" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;

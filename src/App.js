import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import { adminRoutes, openSupportRoutes, policyRoutes, publicRoutes } from "./config/routes";
import Login from "./pages/Login";
import "./App.css";

function FaqEntryRoute({ Component }) {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <Navigate to="/admin/faq" replace />;
  }

  return <Component />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/faq" replace />} />
            <Route path="/login" element={<Login />} />
            {policyRoutes.map(({ path, component: Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            {openSupportRoutes.map(({ path, component: Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route element={<ProtectedRoute />}>
              {publicRoutes.map(({ path, component: Component }) => (
                <Route
                  key={path}
                  path={path}
                  element={path === "/faq" ? <FaqEntryRoute Component={Component} /> : <Component />}
                />
              ))}
            </Route>
            <Route element={<ProtectedRoute requireAdmin />}>
              {adminRoutes.map(({ path, component: Component, props }) => (
                <Route key={path} path={path} element={<Component {...props} />} />
              ))}
            </Route>
          </Routes>
        </AppShell>
      </Router>
    </AuthProvider>
  );
}

export default App;

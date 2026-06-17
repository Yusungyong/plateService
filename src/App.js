import React from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import AppShell from "./components/AppShell";
import AdminShell from "./admin/components/AdminShell";
import { ADMIN_PERMISSIONS } from "./admin/constants/adminPermissions";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import {
  accountPublicRoutes,
  adminRoutes,
  businessApplicationRoutes,
  businessOwnerRoutes,
  businessPublicRoutes,
  legacyBusinessRedirects,
  openSupportRoutes,
  policyRoutes,
  publicRoutes,
} from "./config/routes";
import Login from "./pages/Login";
import "./App.css";

function FaqEntryRoute({ Component }) {
  const { canAdmin } = useAuth();

  if (canAdmin(ADMIN_PERMISSIONS.SUPPORT_MANAGE)) {
    return <Navigate to="/admin/faq" replace />;
  }

  return <Component />;
}

function ApplicationShell({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const isAdminArea =
    location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  if (isLoginPage) {
    return children;
  }

  if (isAdminArea) {
    return <AdminShell>{children}</AdminShell>;
  }

  return <AppShell>{children}</AppShell>;
}

function LegacyStoreDetailRedirect() {
  const { restaurantId } = useParams();
  return <Navigate to={`/business/stores/${restaurantId}`} replace />;
}

function AdminPermissionRoute({ component: Component, permission, props }) {
  const { canAdmin } = useAuth();

  if (!canAdmin(permission)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Component {...props} />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ApplicationShell>
          <Routes>
            <Route path="/" element={<Navigate to="/faq" replace />} />
            <Route path="/login" element={<Login />} />
            {accountPublicRoutes.map(({ path, component: Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            {policyRoutes.map(({ path, component: Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            {openSupportRoutes.map(({ path, component: Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            {businessPublicRoutes.map(({ path, component: Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="/business/stores/new" element={<Navigate to="/business/signup" replace />} />
            <Route element={<ProtectedRoute />}>
              {businessApplicationRoutes.map(({ path, component: Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
            </Route>
            <Route element={<ProtectedRoute requireBusiness />}>
              {businessOwnerRoutes.map(({ path, component: Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
            </Route>
            <Route element={<ProtectedRoute />}>
              {legacyBusinessRedirects
                .filter(({ path }) => !path.includes(":restaurantId"))
                .map(({ path, to }) => (
                  <Route key={path} path={path} element={<Navigate to={to} replace />} />
                ))}
              <Route
                path="/admin/restaurants/:restaurantId"
                element={<LegacyStoreDetailRedirect />}
              />
              {publicRoutes.map(({ path, component: Component }) => (
                <Route
                  key={path}
                  path={path}
                  element={path === "/faq" ? <FaqEntryRoute Component={Component} /> : <Component />}
                />
              ))}
            </Route>
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              {adminRoutes.map(({ path, component, permission, props }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <AdminPermissionRoute
                      component={component}
                      permission={permission}
                      props={props}
                    />
                  }
                />
              ))}
            </Route>
          </Routes>
        </ApplicationShell>
      </Router>
    </AuthProvider>
  );
}

export default App;

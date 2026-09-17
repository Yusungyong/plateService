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
  getAdminEntryPath,
  accountPublicRoutes,
  adminRoutes,
  businessApplicationRoutes,
  businessOwnerRoutes,
  businessSignupRoutes,
  legacyBusinessRedirects,
  openSupportRoutes,
  policyRoutes,
  publicRoutes,
} from "./config/routes";
import Login from "./pages/Login";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import "./App.css";
import "./styles/brand.css";

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
  const isLegalPage = /^\/(terms-of-service|privacy-policy|location-terms)(\/|$)/.test(location.pathname);
  const isAdminArea =
    location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  if (location.pathname === "/" || isLoginPage || isLegalPage) {
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

function BusinessHomeRedirect() {
  const { isAuthenticated, isBusinessUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/business/signup" replace />;
  }

  return <Navigate to={isBusinessUser ? "/business/dashboard" : "/business/applications"} replace />;
}

function AdminEntryRoute() {
  const { user } = useAuth();
  return <Navigate to={getAdminEntryPath(user)} replace />;
}

function AdminPermissionRoute({ component: Component, permission, props }) {
  const { canAdmin, user } = useAuth();

  if (!canAdmin(permission)) {
    return <Navigate to={getAdminEntryPath(user)} replace />;
  }

  return <Component {...props} />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ApplicationShell>
          <Routes>
            <Route path="*" element={<NotFound />} />
            <Route path="/" element={<Home />} />
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
            <Route path="/business" element={<BusinessHomeRedirect />} />
            {publicRoutes.map(({ path, component: Component }) => (
              <Route
                key={path}
                path={path}
                element={path === "/faq" ? <FaqEntryRoute Component={Component} /> : <Component />}
              />
            ))}
            <Route path="/business/stores/new" element={<Navigate to="/business/signup" replace />} />
            <Route element={<ProtectedRoute />}>
              {businessSignupRoutes.map(({ path, component: Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
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
            </Route>
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="/admin" element={<AdminEntryRoute />} />
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

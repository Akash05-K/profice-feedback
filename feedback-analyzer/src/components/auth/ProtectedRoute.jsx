import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AppLayout from "../layout/AppLayout";

/**
 * Gate a route behind authentication and (optionally) a set of capabilities.
 * - Not logged in -> redirect to /login (preserving intended destination).
 * - Logged in but lacking capability -> friendly 403 rendered INSIDE the app
 *   layout, so the sidebar stays available to navigate somewhere permitted.
 */
function ProtectedRoute({ caps = [], children }) {
  const { isAuthenticated, hasCapability, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <div className="route-loading__spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (caps.length > 0 && !hasCapability(...caps)) {
    return (
      <AppLayout title="Access restricted">
        <div className="route-denied">
          <i className="bi bi-shield-lock" />
          <h2>Access restricted</h2>
          <p>Your role doesn’t have permission to view this page. Use the menu to open a section you have access to.</p>
        </div>
      </AppLayout>
    );
  }

  return children;
}

export default ProtectedRoute;

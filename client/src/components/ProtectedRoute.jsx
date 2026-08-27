import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const auth = localStorage.getItem("auth");

  if (!auth) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly) {
    let role = null;
    try {
      role = JSON.parse(auth)?.role;
    } catch {
      role = null;
    }
    // Administrator has full access. A managed ID can enter areas that were
    // explicitly enabled for it from Settings.
    let permissions = [];
    try { permissions = JSON.parse(auth)?.permissions || []; } catch { permissions = []; }
    if (role !== "admin" && !Array.isArray(permissions) && !permissions.length) {
      return <Navigate to="/employees" replace />;
    }
    if (role !== "admin" && Array.isArray(permissions) && permissions.length === 0) {
      return <Navigate to="/employees" replace />;
    }
  }

  return children;
}
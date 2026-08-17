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
    // Blue Farm / Blue Remounts logins are locked out of Finance, Cash Book,
    // and Ledger — this blocks reaching those pages by typing/bookmarking
    // the URL directly, not just hiding them in the sidebar.
    if (role !== "admin") {
      return <Navigate to="/employees" replace />;
    }
  }

  return children;
}
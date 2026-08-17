import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        background: "#f5f7fa",
      }}
    >
      <h1 style={{ fontSize: "80px", color: "#1565C0", margin: 0 }}>
        404
      </h1>

      <h2>Page Not Found</h2>

      <p>The page you requested doesn't exist.</p>

      <Link
        to="/"
        style={{
          marginTop: "20px",
          background: "#1565C0",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        Back to Login
      </Link>
    </div>
  );
}
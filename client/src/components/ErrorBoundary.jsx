import { Component } from "react";
import { brand, gradients } from "../theme";

// Wraps the whole app. Without this, any render error in any page
// (a bad API response shape, a null value, etc.) unmounts the entire
// React tree and leaves a blank white screen with nothing visible to
// the user — the error only exists in the browser console.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            height: "100vh",
            width: "100vw",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: gradients.brand,
            color: "#fff",
            fontFamily: "Segoe UI, Arial, sans-serif",
            textAlign: "center",
            padding: 24,
          }}
        >
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ opacity: 0.85, maxWidth: 560, marginBottom: 20 }}>
            The page hit an error and couldn't continue. Details below can help
            fix it — please share this message.
          </p>
          <pre
            style={{
              background: "rgba(0,0,0,0.35)",
              padding: "14px 18px",
              borderRadius: 10,
              maxWidth: "80vw",
              overflow: "auto",
              fontSize: 13,
              textAlign: "left",
              marginBottom: 22,
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={this.handleReload}
            style={{
              padding: "12px 28px",
              borderRadius: 10,
              border: "none",
              background: brand.gold,
              color: brand.ink,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Back to Login
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

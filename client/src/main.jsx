import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import ResponsiveScaler from "./components/ResponsiveScaler";
import "./api/axiosSetup";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ResponsiveScaler>
          <App />

          <ToastContainer
            position="top-right"
            autoClose={3000}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="colored"
          />
        </ResponsiveScaler>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
// Side-effect module — import once (in main.jsx) before anything else
// renders. It does two things:
//
// 1. Restores the Authorization header from localStorage on every page
//    load / refresh, so a logged-in session keeps working after F5 instead
//    of every API call silently failing with 401.
// 2. Adds a response interceptor: if the server ever says the session is
//    invalid/expired (401), clear local auth state and send the user back
//    to the Login screen instead of leaving them on a broken page.
import axios from "axios";

const token = localStorage.getItem("token");
if (token) {
  axios.defaults.headers.common.Authorization = `Bearer ${token}`;
}

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401 && !err.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("auth");
      localStorage.removeItem("token");
      delete axios.defaults.headers.common.Authorization;
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(err);
  }
);

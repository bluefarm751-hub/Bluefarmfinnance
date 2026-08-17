import axios from "axios";

const API = "/api/auth";

export const login = (username, password) =>
  axios.post(`${API}/login`, { username, password });

export const logout = () => axios.post(`${API}/logout`).catch(() => {});

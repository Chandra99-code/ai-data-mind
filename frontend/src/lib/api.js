import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("datamind_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

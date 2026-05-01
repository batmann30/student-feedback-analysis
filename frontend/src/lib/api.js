import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ew_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_835b07a9-a4b4-4d08-9e44-599f48bf122b/artifacts/0ubvr0hm_WhatsApp%20Image%202026-05-01%20at%2015.46.34.jpeg";

export function formatApiError(err) {
  const d = err?.response?.data?.detail;
  if (!d) return err?.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(", ");
  return String(d);
}

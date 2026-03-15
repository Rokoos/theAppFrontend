import axios from "axios";

/**
 * Backend base URL. In production set VITE_API_BASE_URL to your Railway URL
 * (e.g. https://theappbackend-production.up.railway.app).
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:4000";

/** Request timeout (ms); prevents infinite "thinking" if backend is down or unreachable. */
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Axios instance with baseURL and credentials for CORS + session cookies.
 * Use this for all API calls so cookies are sent to the Railway backend.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

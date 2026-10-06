import axios from "axios";

// In development, route through Vite proxy ("") to bypass browser CORS origin restrictions.
// In production, use VITE_API_BASE_URL or fallback to the deployed backend URL.
export const baseURL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
    ? ""
    : "https://chatnest-app.duckdns.org";

export const httpClient = axios.create({
  baseURL: baseURL,
});
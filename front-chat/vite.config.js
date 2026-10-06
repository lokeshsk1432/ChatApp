import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Target local Spring Boot backend if available, fallback to remote
const BACKEND_TARGET = process.env.VITE_BACKEND_TARGET || "http://localhost:8080";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
      },
      "/chat": {
        target: BACKEND_TARGET,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
});

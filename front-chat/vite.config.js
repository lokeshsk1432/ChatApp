import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://chatnest-app.duckdns.org",
        changeOrigin: true,
        secure: false,
        headers: {
          Origin: "https://chat-app-the-rock2.vercel.app",
        },
      },
      "/chat": {
        target: "https://chatnest-app.duckdns.org",
        changeOrigin: true,
        ws: true,
        secure: false,
        headers: {
          Origin: "https://chat-app-the-rock2.vercel.app",
        },
      },
    },
  },
});

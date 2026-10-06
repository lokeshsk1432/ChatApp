import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./config/Routes.jsx";
import { Toaster } from "react-hot-toast";
import { ChatProvider } from "./context/ChatContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "#0f172a",
          color: "#f8fafc",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "14px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
          fontSize: "14px",
          fontWeight: 500,
          padding: "12px 16px",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#ffffff",
          },
        },
      }}
    />
    <ChatProvider>
      <AppRoutes />
    </ChatProvider>
  </BrowserRouter>
);

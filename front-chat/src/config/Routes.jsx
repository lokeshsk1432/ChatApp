import { Routes, Route, Navigate } from "react-router-dom";
import App from "../App";
import ChatPage from "../components/ChatPage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
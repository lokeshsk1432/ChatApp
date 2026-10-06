import { useState, useEffect } from "react";
import { ChatContext } from "./ChatContextInstance";

export const ChatProvider = ({ children }) => {
  const [roomId, setRoomIdState] = useState(() => {
    return sessionStorage.getItem("chat_room_id") || "";
  });

  const [currentUser, setCurrentUserState] = useState(() => {
    return sessionStorage.getItem("chat_user_name") || "";
  });

  const [connected, setConnectedState] = useState(() => {
    return sessionStorage.getItem("chat_connected") === "true";
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("chat_sound_enabled") !== "false";
  });

  const setRoomId = (id) => {
    setRoomIdState(id);
    if (id) {
      sessionStorage.setItem("chat_room_id", id);
    } else {
      sessionStorage.removeItem("chat_room_id");
    }
  };

  const setCurrentUser = (user) => {
    setCurrentUserState(user);
    if (user) {
      sessionStorage.setItem("chat_user_name", user);
    } else {
      sessionStorage.removeItem("chat_user_name");
    }
  };

  const setConnected = (status) => {
    setConnectedState(status);
    if (status) {
      sessionStorage.setItem("chat_connected", "true");
    } else {
      sessionStorage.removeItem("chat_connected");
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("chat_sound_enabled", String(next));
      return next;
    });
  };

  const leaveRoom = () => {
    setConnected(false);
    setRoomId("");
    setCurrentUser("");
    sessionStorage.removeItem("chat_room_id");
    sessionStorage.removeItem("chat_user_name");
    sessionStorage.removeItem("chat_connected");
  };

  useEffect(() => {
    if (connected && roomId && currentUser) {
      sessionStorage.setItem("chat_room_id", roomId);
      sessionStorage.setItem("chat_user_name", currentUser);
      sessionStorage.setItem("chat_connected", "true");
    }
  }, [connected, roomId, currentUser]);

  return (
    <ChatContext.Provider
      value={{
        roomId,
        currentUser,
        connected,
        soundEnabled,
        setRoomId,
        setCurrentUser,
        setConnected,
        toggleSound,
        leaveRoom,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

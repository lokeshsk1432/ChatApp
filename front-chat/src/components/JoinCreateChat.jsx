import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiHash,
  FiArrowRight,
  FiPlus,
  FiShuffle,
  FiMessageSquare,
  FiLoader,
  FiZap,
  FiShield,
  FiSmartphone,
} from "react-icons/fi";
import { createRoomApi, joinChatApi } from "../services/RoomService";
import useChatContext from "../context/useChatContext";
import { generateRandomRoomId } from "../config/helper";

const JoinCreateChat = () => {
  const [activeTab, setActiveTab] = useState("join"); // 'join' | 'create'
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(() => ({
    roomId: sessionStorage.getItem("chat_room_id") || "",
    userName: sessionStorage.getItem("chat_user_name") || "",
  }));

  const { setCurrentUser, setRoomId, setConnected } = useChatContext();
  const navigate = useNavigate();

  function handleFormInputChange(event) {
    const { name, value } = event.target;
    setDetail((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleRandomRoom() {
    const randomId = generateRandomRoomId();
    setDetail((prev) => ({
      ...prev,
      roomId: randomId,
    }));
    toast.success("Generated random room code!", { id: "random-room" });
  }

  function validateForm() {
    const trimmedUser = detail.userName.trim();
    const trimmedRoom = detail.roomId.trim();

    if (!trimmedUser) {
      toast.error("Please enter your display name");
      return false;
    }
    if (trimmedUser.length < 2) {
      toast.error("Display name must be at least 2 characters");
      return false;
    }
    if (!trimmedRoom) {
      toast.error("Please enter a Room ID");
      return false;
    }
    return true;
  }

  async function handleJoinChat(e) {
    if (e) e.preventDefault();
    if (!validateForm() || loading) return;

    setLoading(true);
    const trimmedUser = detail.userName.trim();
    const trimmedRoom = detail.roomId.trim();

    try {
      const room = await joinChatApi(trimmedRoom);
      toast.success(`Connected to room: ${room.roomId || trimmedRoom}`);
      setCurrentUser(trimmedUser);
      setRoomId(room.roomId || trimmedRoom);
      setConnected(true);
      navigate("/chat");
    } catch (error) {
      if (
        error?.response?.status === 400 &&
        String(error?.response?.data || "").toLowerCase().includes("not found")
      ) {
        toast("Room not found, creating room automatically...", { icon: "✨" });
        try {
          const newRoom = await createRoomApi(trimmedRoom);
          toast.success(`Created & joined room: ${newRoom.roomId || trimmedRoom}`);
          setCurrentUser(trimmedUser);
          setRoomId(newRoom.roomId || trimmedRoom);
          setConnected(true);
          navigate("/chat");
          return;
        } catch (createErr) {
          console.error("Auto create fallback error:", createErr);
          toast.error("Room not found. Check the ID or create it!");
        }
      } else if (error?.response?.status === 400) {
        toast.error(error.response.data || "Room not found. Check the ID or create it!");
      } else {
        toast.error("Unable to join room. Please check connection.");
      }
      console.error("Join error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRoom(e) {
    if (e) e.preventDefault();
    if (!validateForm() || loading) return;

    setLoading(true);
    const trimmedUser = detail.userName.trim();
    const trimmedRoom = detail.roomId.trim();

    try {
      const response = await createRoomApi(trimmedRoom);
      toast.success("Room created successfully!");
      setCurrentUser(trimmedUser);
      setRoomId(response.roomId || trimmedRoom);
      setConnected(true);
      navigate("/chat");
    } catch (error) {
      if (
        error?.response?.status === 400 &&
        String(error?.response?.data || "").toLowerCase().includes("already exists")
      ) {
        toast("Room already exists, joining now...", { icon: "ℹ️" });
        try {
          const room = await joinChatApi(trimmedRoom);
          toast.success(`Joined room: ${room.roomId || trimmedRoom}`);
          setCurrentUser(trimmedUser);
          setRoomId(room.roomId || trimmedRoom);
          setConnected(true);
          navigate("/chat");
          return;
        } catch (joinErr) {
          console.error("Auto join fallback error:", joinErr);
          toast.error("Room ID already exists! Try joining it instead.");
        }
      } else if (error?.response?.status === 400) {
        toast.error("Room ID already exists! Try joining it instead.");
      } else {
        toast.error("Error creating room. Please try again.");
      }
      console.error("Create room error:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (activeTab === "join") {
      handleJoinChat();
    } else {
      handleCreateRoom();
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 relative">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-64 sm:w-80 h-64 sm:h-80 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* App Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25 mb-3 sm:mb-4">
            <FiMessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            ChatNest
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold tracking-wide uppercase">
              Live
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">
            Lightweight, high-speed room messaging with real-time sync.
          </p>
        </div>

        {/* Glass Card Container */}
        <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          {/* Top subtle border highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          {/* Segmented Tab Switcher */}
          <div className="flex p-1 bg-slate-950/60 rounded-xl mb-6 border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab("join")}
              className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === "join"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <FiArrowRight className="w-4 h-4" />
              Join Room
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === "create"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <FiPlus className="w-4 h-4" />
              Create Room
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-5">
            {/* Display Name Input */}
            <div>
              <label
                htmlFor="userName"
                className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5"
              >
                Your Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiUser className="w-4 h-4" />
                </div>
                <input
                  id="userName"
                  name="userName"
                  type="text"
                  autoComplete="name"
                  value={detail.userName}
                  onChange={handleFormInputChange}
                  placeholder="e.g. Alex Rivera"
                  disabled={loading}
                  className="w-full bg-slate-950/50 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Room ID Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="roomId"
                  className="block text-xs sm:text-sm font-medium text-slate-300"
                >
                  {activeTab === "join" ? "Room ID to Join" : "New Room ID"}
                </label>
                <button
                  type="button"
                  onClick={handleRandomRoom}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors hover:underline"
                >
                  <FiShuffle className="w-3 h-3" />
                  Random ID
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiHash className="w-4 h-4" />
                </div>
                <input
                  id="roomId"
                  name="roomId"
                  type="text"
                  autoComplete="off"
                  value={detail.roomId}
                  onChange={handleFormInputChange}
                  placeholder={
                    activeTab === "join"
                      ? "Enter room code (e.g. team-hub)"
                      : "Name your new room"
                  }
                  disabled={loading}
                  className="w-full bg-slate-950/50 font-mono border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 sm:py-3.5 px-4 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : activeTab === "join" ? (
                <>
                  <span>Join Conversation</span>
                  <FiArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create & Enter Room</span>
                  <FiPlus className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick tips */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-around text-[11px] sm:text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <FiZap className="w-3.5 h-3.5 text-amber-400" /> Real-time STOMP
            </span>
            <span className="flex items-center gap-1.5">
              <FiShield className="w-3.5 h-3.5 text-emerald-400" /> Private Channels
            </span>
            <span className="flex items-center gap-1.5">
              <FiSmartphone className="w-3.5 h-3.5 text-blue-400" /> Any Device
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinCreateChat;
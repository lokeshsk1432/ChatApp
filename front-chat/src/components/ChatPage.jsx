import { useEffect, useRef, useState, useCallback } from "react";
import {
  FiSend,
  FiPaperclip,
  FiCopy,
  FiCheck,
  FiLogOut,
  FiVolume2,
  FiVolumeX,
  FiArrowDown,
  FiSmile,
  FiArrowLeft,
  FiCheckCircle,
  FiCornerUpLeft,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import toast from "react-hot-toast";
import useChatContext from "../context/useChatContext";
import { baseURL } from "../config/AxiosHelper";
import { getMessagess, deleteMessageApi } from "../services/RoomService";
import {
  timeAgo,
  formatMessageTime,
  formatMessageDate,
  getAvatarColor,
  getUserInitials,
  playNotificationSound,
} from "../config/helper";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "🚀", "👏", "✨"];

const ChatPage = () => {
  const {
    roomId,
    currentUser,
    connected,
    soundEnabled,
    toggleSound,
    leaveRoom,
  } = useChatContext();

  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // 'connected' | 'connecting' | 'disconnected'

  // Reply feature state
  const [replyingTo, setReplyingTo] = useState(null); // { id, sender, content }

  // Delete message modal state
  const [messageToDelete, setMessageToDelete] = useState(null); // { id, sender, content }
  const [isDeleting, setIsDeleting] = useState(false);

  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const stompClientRef = useRef(null);
  const isUserScrollingRef = useRef(false);

  // Redirect if not connected and no saved credentials
  useEffect(() => {
    if (!connected || !roomId || !currentUser) {
      navigate("/");
    }
  }, [connected, roomId, currentUser, navigate]);

  // Scroll to bottom smoothly or instantly
  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
      setUnreadCount(0);
      setIsScrolledUp(false);
    }
  }, []);

  // Monitor user scroll position to avoid jerking viewport while reading history
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const userScrolledUp = distanceFromBottom > 120;
    setIsScrolledUp(userScrolledUp);

    if (!userScrolledUp) {
      setUnreadCount(0);
    }
  };

  // Load message history from backend
  useEffect(() => {
    let isMounted = true;
    async function loadMessages() {
      if (!roomId) return;
      try {
        setLoadingMessages(true);
        const data = await getMessagess(roomId, 100);
        if (isMounted) {
          setMessages(Array.isArray(data) ? data : []);
          setTimeout(() => scrollToBottom("auto"), 100);
        }
      } catch (err) {
        console.error("Error loading messages:", err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }

    if (connected && roomId) {
      loadMessages();
    }

    return () => {
      isMounted = false;
    };
  }, [roomId, connected, scrollToBottom]);

  // STOMP WebSocket connection setup
  useEffect(() => {
    if (!connected || !roomId) return;

    let client = null;
    let isSubscribed = false;

    try {
      const socketUrl = baseURL ? `${baseURL}/chat` : `${window.location.origin}/chat`;
      const sock = new SockJS(socketUrl);
      client = Stomp.over(sock);

      // Disable overly noisy Stomp debug logs in console
      client.debug = () => {};

      client.connect(
        {},
        () => {
          stompClientRef.current = client;
          setConnectionStatus("connected");

          client.subscribe(`/topic/room/${roomId}`, (message) => {
            try {
              const payload = JSON.parse(message.body);

              // 1. Handle broadcast delete message event
              if (payload.action === "DELETE" || payload.type === "DELETE") {
                const deletedId = payload.messageId || payload.id;
                if (deletedId) {
                  setMessages((prev) => prev.filter((m) => m.id !== deletedId));
                  setReplyingTo((prev) => (prev?.id === deletedId ? null : prev));
                }
                return;
              }

              // 2. Handle normal incoming message
              setMessages((prev) => {
                // Avoid accidental duplicates
                if (payload.id && prev.some((m) => m.id === payload.id)) {
                  return prev;
                }
                return [...prev, payload];
              });

              // Play audio chime if sent by someone else and sound is enabled
              if (payload.sender !== currentUser && soundEnabled) {
                playNotificationSound();
              }

              // Auto-scroll logic: if user sent it or is already at bottom, scroll down
              if (
                payload.sender === currentUser ||
                !isUserScrollingRef.current
              ) {
                setTimeout(() => scrollToBottom("smooth"), 50);
              } else {
                setUnreadCount((prev) => prev + 1);
              }
            } catch (err) {
              console.error("Failed to parse message:", err);
            }
          });

          isSubscribed = true;
        },
        (error) => {
          console.error("STOMP connection error:", error);
          setConnectionStatus("disconnected");
        }
      );
    } catch (e) {
      console.error("Socket error:", e);
      setTimeout(() => {
        setConnectionStatus("disconnected");
      }, 0);
    }

    return () => {
      if (client && isSubscribed) {
        try {
          client.disconnect();
        } catch {
          // ignore disconnect error on unmount
        }
      }
    };
  }, [roomId, connected, currentUser, soundEnabled, scrollToBottom]);

  // Keep isUserScrollingRef updated with scroll state
  useEffect(() => {
    isUserScrollingRef.current = isScrolledUp;
  }, [isScrolledUp]);

  // Send message handler
  const handleSendMessage = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (!stompClientRef.current || connectionStatus !== "connected") {
      toast.error("Reconnecting to chat server... please wait.", {
        id: "reconnecting-toast",
      });
      return;
    }

    const messagePayload = {
      sender: currentUser,
      content: trimmedInput,
      roomId: roomId,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            sender: replyingTo.sender,
            content: replyingTo.content,
          }
        : null,
    };

    try {
      stompClientRef.current.send(
        `/app/sendMessage/${roomId}`,
        {},
        JSON.stringify(messagePayload)
      );
      setInput("");
      setReplyingTo(null);
      setShowEmojis(false);
      setTimeout(() => scrollToBottom("smooth"), 50);
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Failed to send message. Please retry.");
    }
  };

  // Reply trigger handler
  const handleStartReply = (msg) => {
    setReplyingTo({
      id: msg.id,
      sender: msg.sender,
      content: msg.content,
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Smooth jump to replied message in chat view with pulse highlight
  const handleJumpToMessage = (targetMsgId) => {
    if (!targetMsgId) return;
    const targetEl = document.getElementById(`msg-${targetMsgId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.classList.add("ring-2", "ring-indigo-400", "scale-[1.02]");
      setTimeout(() => {
        targetEl.classList.remove("ring-2", "ring-indigo-400", "scale-[1.02]");
      }, 1400);
    } else {
      toast("Original message is further up in history or was removed.", {
        icon: "ℹ️",
      });
    }
  };

  // Delete message confirmation & execution
  const confirmDeleteMessage = async () => {
    if (!messageToDelete || isDeleting) return;

    const targetId = messageToDelete.id;
    setIsDeleting(true);

    try {
      // 1. Optimistic removal in local view
      setMessages((prev) => prev.filter((m) => m.id !== targetId));
      if (replyingTo?.id === targetId) {
        setReplyingTo(null);
      }

      // 2. Broadcast delete via STOMP WebSocket
      if (stompClientRef.current && connectionStatus === "connected") {
        stompClientRef.current.send(
          `/app/deleteMessage/${roomId}`,
          {},
          JSON.stringify({
            messageId: targetId,
            sender: currentUser,
            roomId: roomId,
          })
        );
      }

      // 3. Delete via REST API for persistence
      await deleteMessageApi(roomId, targetId).catch((err) => {
        console.warn("REST delete fallback warning:", err);
      });

      toast.success("Message deleted", { icon: "🗑️" });
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error("Failed to delete message. Please retry.");
    } finally {
      setIsDeleting(false);
      setMessageToDelete(null);
    }
  };

  // Copy message content to clipboard
  const handleCopyMessageContent = (msgId, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    toast.success("Copied to clipboard!");
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 1500);
  };

  const handleCopyRoomId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast.success("Room ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmLogout = () => {
    if (stompClientRef.current) {
      try {
        stompClientRef.current.disconnect();
      } catch {
        // ignore
      }
    }
    leaveRoom();
    navigate("/");
  };

  const handleQuickEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Group messages by date and render
  const renderMessageList = () => {
    let lastDate = null;

    return messages.map((message, index) => {
      const isSelf = message.sender === currentUser;
      const messageDate = formatMessageDate(message.timeStamp);
      const showDateDivider = messageDate && messageDate !== lastDate;
      if (showDateDivider) {
        lastDate = messageDate;
      }

      const avatarStyles = getAvatarColor(message.sender);
      const initials = getUserInitials(message.sender);
      const timeStr = formatMessageTime(message.timeStamp);
      const relativeTime = timeAgo(message.timeStamp);
      const msgUniqueId = message.id || `temp-${index}`;
      const isCopiedThis = copiedMsgId === msgUniqueId;

      return (
        <div key={msgUniqueId} className="space-y-3">
          {/* Calendar date separator */}
          {showDateDivider && (
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60 shadow-sm backdrop-blur-md">
                {messageDate}
              </span>
            </div>
          )}

          {/* Message Row */}
          <div
            id={`msg-${msgUniqueId}`}
            className={`group relative flex items-end gap-2 sm:gap-2.5 transition-all duration-200 ${
              isSelf ? "justify-end" : "justify-start"
            }`}
          >
            {/* Avatar for other participants */}
            {!isSelf && (
              <div
                className={`flex-none w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr ${avatarStyles.gradient} text-white flex items-center justify-center font-bold text-xs shadow-md shadow-black/20`}
                title={message.sender}
              >
                {initials}
              </div>
            )}

            {/* Bubble Container */}
            <div className="relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%]">
              {/* Quick Actions Floating Toolbar on Hover */}
              <div
                className={`absolute -top-3.5 ${
                  isSelf ? "right-2" : "left-2"
                } opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-20 flex items-center gap-0.5 bg-slate-900/95 border border-slate-700/80 rounded-lg p-0.5 shadow-lg backdrop-blur-md`}
              >
                {/* Reply action button */}
                <button
                  type="button"
                  onClick={() => handleStartReply(message)}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Reply"
                >
                  <FiCornerUpLeft className="w-3.5 h-3.5" />
                </button>

                {/* Copy message text button */}
                <button
                  type="button"
                  onClick={() =>
                    handleCopyMessageContent(msgUniqueId, message.content)
                  }
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Copy text"
                >
                  {isCopiedThis ? (
                    <FiCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <FiCopy className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Delete message button (only for own messages) */}
                {isSelf && (
                  <button
                    type="button"
                    onClick={() => setMessageToDelete(message)}
                    className="p-1 rounded-md text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                    title="Delete message"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Message Bubble Body */}
              <div
                className={`relative rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 transition-all duration-150 ${
                  isSelf
                    ? "bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white rounded-br-xs shadow-lg shadow-indigo-600/20"
                    : "bg-slate-900/90 border border-slate-800 text-slate-100 rounded-bl-xs shadow-sm hover:border-slate-700/80"
                }`}
              >
                {/* Sender name for other users */}
                {!isSelf && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-xs font-bold tracking-wide ${avatarStyles.text}`}
                    >
                      {message.sender}
                    </span>
                  </div>
                )}

                {/* Quoted Reply Block (if this message is replying to another) */}
                {message.replyTo && (
                  <div
                    onClick={() => handleJumpToMessage(message.replyTo.id)}
                    className={`mb-2 p-2 rounded-xl border-l-2 text-left cursor-pointer transition-all duration-150 ${
                      isSelf
                        ? "bg-black/25 hover:bg-black/35 border-indigo-300 text-indigo-100"
                        : "bg-slate-950/60 hover:bg-slate-950/80 border-indigo-500 text-slate-300"
                    }`}
                    title="Click to jump to quoted message"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-300 mb-0.5">
                      <FiCornerUpLeft className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {message.replyTo.sender === currentUser
                          ? "You"
                          : message.replyTo.sender}
                      </span>
                    </div>
                    <p className="text-[12px] opacity-90 line-clamp-2 break-words leading-snug">
                      {message.replyTo.content}
                    </p>
                  </div>
                )}

                {/* Message text content */}
                <p className="text-sm sm:text-[15px] leading-relaxed break-words whitespace-pre-wrap select-text">
                  {message.content}
                </p>

                {/* Accurate Timestamp & status info */}
                <div
                  className={`flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] ${
                    isSelf
                      ? "justify-end text-indigo-200/90"
                      : "justify-end text-slate-400"
                  }`}
                  title={`${timeStr} (${relativeTime})`}
                >
                  <span>{timeStr || relativeTime}</span>
                  {isSelf && (
                    <span title="Delivered">
                      <FiCheckCircle className="w-3 h-3 text-indigo-200 inline" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#070b14] text-slate-100 overflow-hidden font-sans relative">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP NAVBAR / HEADER */}
      <header className="flex-none h-16 glass-header px-3 sm:px-6 flex items-center justify-between z-30 shadow-md">
        {/* Left side: Back & Room Details */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className="p-2 -ml-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition-all duration-200 cursor-pointer"
            title="Leave Room"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  Room
                </span>
                <span className="text-sm sm:text-base font-bold font-mono tracking-tight text-white truncate max-w-[130px] sm:max-w-[200px] md:max-w-xs">
                  {roomId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRoomId}
                  className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150 flex items-center gap-1 text-xs"
                  title="Copy Room ID"
                >
                  {copied ? (
                    <FiCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <FiCopy className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden md:inline text-[11px] text-slate-300">
                    {copied ? "Copied" : "Copy"}
                  </span>
                </button>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-emerald-400 animate-pulse"
                      : connectionStatus === "connecting"
                      ? "bg-amber-400 animate-ping"
                      : "bg-rose-500"
                  }`}
                />
                <span className="text-slate-400 text-[11px] capitalize hidden sm:inline">
                  {connectionStatus === "connected"
                    ? "Live connected"
                    : connectionStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: User Badge, Sound, Leave */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
              soundEnabled
                ? "text-indigo-400 hover:bg-indigo-500/10"
                : "text-slate-500 hover:bg-slate-800"
            }`}
            title={
              soundEnabled
                ? "Mute notification sounds"
                : "Unmute notification sounds"
            }
          >
            {soundEnabled ? (
              <FiVolume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <FiVolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* Current User Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-tr ${
                getAvatarColor(currentUser).gradient
              } text-white flex items-center justify-center font-bold text-xs shadow-sm`}
            >
              {getUserInitials(currentUser)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[100px]">
                {currentUser}
              </p>
              <span className="text-[10px] text-indigo-400 font-medium">You</span>
            </div>
          </div>

          {/* Leave Button */}
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 transition-all duration-200 ml-1 cursor-pointer"
          >
            <FiLogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* CHAT MESSAGES BODY */}
      <main
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 space-y-4 max-w-4xl mx-auto w-full relative z-10 scroll-smooth"
      >
        {/* Loading state shimmer */}
        {loadingMessages ? (
          <div className="space-y-4 py-8 animate-pulse">
            <div className="flex justify-start">
              <div className="h-14 w-48 bg-slate-800/60 rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <div className="h-16 w-60 bg-indigo-950/40 rounded-2xl" />
            </div>
            <div className="flex justify-start">
              <div className="h-12 w-52 bg-slate-800/60 rounded-2xl" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          /* Empty Room State */
          <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
              <FiSmile className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1.5">
              Welcome to #{roomId}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6">
              No messages have been sent in this room yet. Break the ice and send the first message!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {["👋 Hey everyone!", "🚀 Ready to chat!", "🎉 Hello from my device!"].map(
                (starter, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInput(starter);
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    className="px-3 py-1.5 rounded-full text-xs bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-indigo-500/60 transition-all cursor-pointer"
                  >
                    {starter}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          /* Render Messages */
          renderMessageList()
        )}

        <div ref={messagesEndRef} className="h-2" />
      </main>

      {/* FLOATING SCROLL TO BOTTOM BUTTON */}
      {isScrolledUp && (
        <div className="absolute bottom-20 right-4 sm:right-8 z-30 animate-scale-in">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <FiArrowDown className="w-4 h-4 animate-bounce" />
            <span>Latest</span>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* FOOTER & INPUT BAR */}
      <footer className="flex-none glass-header border-t border-slate-800/80 p-2.5 sm:p-4 z-30">
        <div className="max-w-4xl mx-auto w-full">
          {/* Quick Reaction Emojis Panel */}
          {showEmojis && (
            <div className="flex items-center justify-around sm:justify-start gap-1.5 pb-2.5 pt-1 overflow-x-auto no-scrollbar animate-slide-up">
              {QUICK_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuickEmoji(emoji)}
                  className="text-xl sm:text-2xl p-1.5 sm:p-2 hover:bg-slate-800 rounded-xl transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Active Reply Banner Preview */}
          {replyingTo && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl bg-slate-900/95 border border-indigo-500/30 shadow-md backdrop-blur-md animate-slide-up">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1 self-stretch rounded-full bg-indigo-500" />
                <FiCornerUpLeft className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-indigo-300">
                    Replying to{" "}
                    <span className={getAvatarColor(replyingTo.sender).text}>
                      {replyingTo.sender === currentUser
                        ? "yourself"
                        : replyingTo.sender}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md md:max-w-lg">
                    {replyingTo.content}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cancel reply (Esc)"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Input Control Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 bg-slate-950/70 border border-slate-800 rounded-2xl p-1 sm:p-1.5 shadow-inner focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-200">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() =>
                toast("Attachments feature coming in next update!", {
                  icon: "📎",
                })
              }
              className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Attach File"
            >
              <FiPaperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Emoji Toggle Button */}
            <button
              type="button"
              onClick={() => setShowEmojis((prev) => !prev)}
              className={`p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer ${
                showEmojis
                  ? "text-indigo-400 bg-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
              }`}
              title="Quick Reactions"
            >
              <FiSmile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                } else if (e.key === "Escape" && replyingTo) {
                  setReplyingTo(null);
                }
              }}
              placeholder={
                replyingTo
                  ? `Replying to ${replyingTo.sender}...`
                  : `Message #${roomId}...`
              }
              className="flex-1 bg-transparent px-2 sm:px-3 py-2 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none min-w-0"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!input.trim()}
              className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                input.trim()
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 hover:scale-105 active:scale-95"
                  : "bg-slate-800/50 text-slate-500 cursor-not-allowed"
              }`}
              title="Send Message"
            >
              <FiSend className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </footer>

      {/* DELETE MESSAGE CONFIRMATION MODAL */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full border border-slate-700/80 shadow-2xl animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Delete Message?
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              This message will be permanently removed for everyone in this room.
            </p>
            {/* Message preview */}
            <div className="p-2.5 mb-5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs italic line-clamp-3 text-left">
              &ldquo;{messageToDelete.content}&rdquo;
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMessage}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE ROOM CONFIRMATION MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full border border-slate-700/80 shadow-2xl animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <FiLogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Leave #{roomId}?
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Are you sure you want to exit? You can reconnect anytime using the room code.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
// Safe relative time formatter
export function timeAgo(date) {
  if (!date) return "";
  const past = new Date(date);
  if (isNaN(past.getTime())) return "";

  const now = new Date();
  const secondsAgo = Math.max(0, Math.floor((now - past) / 1000));

  if (secondsAgo < 15) return "just now";
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return `${daysAgo}d ago`;
  
  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo < 4) return `${weeksAgo}w ago`;
  
  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) return `${monthsAgo}mo ago`;
  
  const yearsAgo = Math.floor(monthsAgo / 12);
  return `${yearsAgo}y ago`;
}

// Format message time (e.g., "08:30 PM")
export function formatMessageTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Format calendar date header (e.g., "Today", "Yesterday", "Oct 6, 2026")
export function formatMessageDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

// Deterministic gradient palette based on string hash
const AVATAR_GRADIENTS = [
  "from-indigo-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-fuchsia-600",
  "from-teal-400 to-emerald-600",
  "from-sky-500 to-indigo-600",
];

const AVATAR_TEXT_COLORS = [
  "text-indigo-400",
  "text-cyan-400",
  "text-emerald-400",
  "text-pink-400",
  "text-amber-400",
  "text-violet-400",
  "text-teal-400",
  "text-sky-400",
];

export function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return {
    gradient: AVATAR_GRADIENTS[index],
    text: AVATAR_TEXT_COLORS[index],
  };
}

// Extract up to 2 uppercase initials
export function getUserInitials(name = "") {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Generates cool, human-readable room IDs
export function generateRandomRoomId() {
  const adjectives = ["nebula", "cyber", "cosmic", "quantum", "stellar", "matrix", "nexus", "pulse", "sonic", "alpha"];
  const nouns = ["lounge", "orbit", "hub", "station", "portal", "stream", "haven", "lab", "squad", "wave"];
  const num = Math.floor(100 + Math.random() * 900);
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}-${num}`;
}

// Notification sound synthesizer using Web Audio API (zero external assets needed)
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // Silently ignore if blocked by browser autoplay policy
  }
}
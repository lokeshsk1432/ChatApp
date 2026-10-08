// Robust date parser that handles ISO strings, UTC strings, Jackson arrays, and numeric timestamps
export function parseDate(date) {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;

  // Handle Jackson array format: [year, month, day, hour, minute, second, nanos]
  if (Array.isArray(date)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = date;
    // Month in Jackson is 1-based (1 = Jan), JS Date.UTC expects 0-based
    return new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour, minute, second));
  }

  // Handle numeric epoch timestamp (ms or sec)
  if (typeof date === "number") {
    // If timestamp in seconds, convert to milliseconds
    const ms = date < 10000000000 ? date * 1000 : date;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof date === "string") {
    const trimmed = date.trim();
    if (!trimmed) return null;

    // Check if ISO string lacks timezone indicator (e.g. "2026-10-08T14:40:02" or "2026-10-08T14:40:02.123")
    // Servers generate and store timestamps in UTC. If no timezone offset is present, append 'Z'
    // so JavaScript's Date engine parses it as UTC and converts to the user's local timezone.
    const hasTimezone =
      trimmed.endsWith("Z") ||
      trimmed.endsWith("z") ||
      /[+-]\d{2}(:?\d{2})?$/.test(trimmed);

    const dateStrToParse =
      !hasTimezone && trimmed.includes("T") ? `${trimmed}Z` : trimmed;

    const d = new Date(dateStrToParse);
    if (!isNaN(d.getTime())) return d;

    // Fallback if appending Z was invalid
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) return fallback;
  }

  return null;
}

// Format message time in user's local timezone (e.g., "08:30 PM")
export function formatMessageTime(date) {
  const d = parseDate(date);
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Format calendar date header (e.g., "Today", "Yesterday", "Oct 8, 2026")
export function formatMessageDate(date) {
  const d = parseDate(date);
  if (!d) return "";

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

// Safe relative time formatter (e.g., "just now", "2m ago")
export function timeAgo(date) {
  const past = parseDate(date);
  if (!past) return "";

  const now = new Date();
  const secondsAgo = Math.max(0, Math.floor((now.getTime() - past.getTime()) / 1000));

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
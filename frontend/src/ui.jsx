// src/ui.jsx
// Small presentational helpers. No API calls and no app state live here.

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

/** First non-empty value among several possible field names. */
export function pick(obj, keys) {
  for (const key of keys) {
    const value = obj ? obj[key] : undefined;
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function trimNumber(x) {
  return String(Number(x.toFixed(2)));
}

/** 6500000 -> "₹65 L", 12000000 -> "₹1.2 Cr". Returns null for empty values. */
export function formatPrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1e7) return `₹${trimNumber(n / 1e7)} Cr`;
  if (n >= 1e5) return `₹${trimNumber(n / 1e5)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatPriceRange(min, max, fallback = "Price not listed") {
  const a = formatPrice(min);
  const b = formatPrice(max);
  if (a && b) return `${a} – ${b}`;
  if (a) return `From ${a}`;
  if (b) return `Up to ${b}`;
  return fallback;
}

/** "2026-11-15" -> { weekday: "Sun", day: "15", month: "Nov" } */
export function formatDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return { weekday: "", day: String(dateStr || ""), month: "" };
  }
  return {
    weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
    day: String(d.getDate()),
    month: d.toLocaleDateString("en-IN", { month: "short" }),
  };
}

/** "14:30:00" -> "2:30 PM" (falls back to the original text). */
export function formatTime(value) {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value));
  if (!match) return String(value);
  let h = Number(match[1]);
  const m = match[2];
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
}

export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function statusLabel(status) {
  const text = String(status || "").replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
}

export function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (["converted", "attended", "completed", "confirmed", "booked"].includes(s)) return "green";
  if (["lost", "cancelled", "canceled", "no_show", "rejected"].includes(s)) return "red";
  if (["site_visit", "pending", "scheduled"].includes(s)) return "amber";
  if (["contacted", "qualified"].includes(s)) return "teal";
  if (s === "new") return "blue";
  return "neutral";
}

export function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

// ---------------------------------------------------------------------------
// Icons (inline SVG, no dependency)
// ---------------------------------------------------------------------------
const ICONS = {
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  send: (
    <>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-2.5-1.5-4.2-4-5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  shield: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="10" height="18" rx="1" />
      <path d="M14 9h6v12h-6M8 7h2M8 11h2M8 15h2" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  pin: (
    <>
      <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
};

export function Icon({ name, size = 18, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name] || null}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------
export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${statusTone(status)}`}>{statusLabel(status)}</span>
  );
}

export function EmptyState({ icon = "info", title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <h4>{title}</h4>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function TypingDots() {
  return (
    <span className="typing" aria-label="Assistant is typing">
      <i />
      <i />
      <i />
    </span>
  );
}

/** Project illustration. Uses the API image if one exists, else a neutral drawing. */
export function ProjectArt({ index = 0, src, name = "" }) {
  if (src) {
    return (
      <div className="project-art">
        <img src={src} alt={name} loading="lazy" />
      </div>
    );
  }
  return (
    <div className={`project-art art-${index % 3}`} role="img" aria-label={`${name} illustration`}>
      <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <rect x="0" y="118" width="320" height="42" className="art-ground" />
        <rect x="26" y="52" width="58" height="76" rx="3" className="art-b1" />
        <rect x="96" y="22" width="70" height="106" rx="3" className="art-b2" />
        <rect x="178" y="62" width="52" height="66" rx="3" className="art-b1" />
        <rect x="242" y="40" width="54" height="88" rx="3" className="art-b3" />
        {[0, 1, 2, 3, 4].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`w${r}${c}`}
              x={106 + c * 20}
              y={34 + r * 18}
              width="10"
              height="10"
              rx="1.5"
              className="art-win"
            />
          ))
        )}
        {[0, 1, 2].map((r) =>
          [0, 1].map((c) => (
            <rect
              key={`x${r}${c}`}
              x={252 + c * 20}
              y={52 + r * 20}
              width="9"
              height="9"
              rx="1.5"
              className="art-win"
            />
          ))
        )}
      </svg>
    </div>
  );
}
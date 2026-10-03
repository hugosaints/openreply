/** Small inline icon set for the campaigns UI (stroke icons, currentColor). */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type IconProps = { className?: string };

export const IconImage = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
export const IconGrid = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
export const IconClock = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconTag = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </svg>
);
export const IconSparkle = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
  </svg>
);
export const IconCheck = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} strokeWidth={2.4} className={className} aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconArrowLeft = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);
export const IconArrowRight = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconPhone = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <rect x="6" y="2" width="12" height="20" rx="3" />
    <path d="M11 18h2" />
  </svg>
);
export const IconPlus = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} strokeWidth={2.2} className={className} aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconTrash = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
export const IconDots = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);
export const IconSearch = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
export const IconLink = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M10.5 13.5a4 4 0 005.7 0l2.3-2.3a4 4 0 00-5.7-5.7L11.5 6.8" />
    <path d="M13.5 10.5a4 4 0 00-5.7 0l-2.3 2.3a4 4 0 005.7 5.7l1.3-1.3" />
  </svg>
);
export const IconCopy = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 012-2h9" />
  </svg>
);
export const IconEdit = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z" />
  </svg>
);
export const IconPlay = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 001.5.9l10-6.5a1 1 0 000-1.8l-10-6.5A1 1 0 008 5.5z" />
  </svg>
);
export const IconPause = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);
export const IconUpload = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
  </svg>
);
export const IconChart = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const IconSend = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
);
export const IconCursorClick = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M15 15l5 5" />
    <path d="M4 4l7.07 17 2.51-7.39L21 11.07 4 4z" />
  </svg>
);
export const IconTrendingUp = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
export const IconAlertCircle = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
export const IconMessage = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
);
export const IconChevronLeft = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const IconChevronRight = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
export const IconInstagram = ({ className = "h-4 w-4" }: IconProps) => (
  <svg {...base} className={className} aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

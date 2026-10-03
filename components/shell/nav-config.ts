import type { StaticMessageKey } from "@/lib/i18n";
import {
  IconActivityHeartbeat,
  IconChartLine,
  IconInbox,
  IconLayoutDashboard,
  IconListDetails,
  IconSettings,
  IconSpeakerphone,
  type Icon,
} from "@tabler/icons-react";

/**
 * Single source of truth for dashboard navigation. The sidebar, the top bar
 * breadcrumb and the command palette all read from here, so a new page only
 * has to be registered once.
 */
export interface NavItem {
  label: StaticMessageKey;
  href: string;
  icon: Icon;
  /** Extra words the command palette should match on. */
  keywords?: string[];
}

export interface NavGroup {
  title: StaticMessageKey;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: IconLayoutDashboard, keywords: ["home", "stats"] },
      { label: "Overview", href: "/overview", icon: IconChartLine, keywords: ["insights", "posts", "followers"] },
      { label: "Inbox", href: "/inbox", icon: IconInbox, keywords: ["messages", "conversations", "dm"] },
      { label: "Campaigns", href: "/campaigns", icon: IconSpeakerphone, keywords: ["automations", "keywords"] },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "DM Logs", href: "/logs", icon: IconListDetails, keywords: ["activity", "history"] },
      { label: "Diagnostics", href: "/diagnostics", icon: IconActivityHeartbeat, keywords: ["health", "errors", "queue"] },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: IconSettings, keywords: ["workspace", "members", "zernio"] },
    ],
  },
];

/** Sub-pages that are not in the sidebar but still need a breadcrumb label. */
export const SUB_PAGE_TITLES: { match: (path: string) => boolean; label: StaticMessageKey }[] = [
  { match: (p) => p === "/campaigns/new" || p === "/automations/new", label: "New Campaign" },
  { match: (p) => p === "/campaigns/import", label: "Import campaigns" },
  { match: (p) => p.startsWith("/campaigns/") && p.endsWith("/edit"), label: "Edit campaign" },
  { match: (p) => p.startsWith("/campaigns/"), label: "Campaign details" },
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function findNavContext(pathname: string) {
  // /automations is a legacy alias of /campaigns.
  const path = pathname.replace(/^\/automations(?=\/|$)/, "/campaigns");
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isNavItemActive(path, item.href)) {
        const sub = path === item.href ? null : SUB_PAGE_TITLES.find((s) => s.match(path)) ?? null;
        return { group, item, subLabel: sub?.label ?? null };
      }
    }
  }
  return null;
}

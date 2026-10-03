"use client";

import type { NotificationItem } from "@/app/api/notifications/route";
import { useDismiss } from "@/components/shell/use-dismiss";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { useI18n } from "@/lib/i18n/provider";
import { translateServerMessage } from "@/lib/i18n/server-messages";
import {
  IconAlertTriangle,
  IconBell,
  IconCircleX,
  IconInfoCircle,
  IconMessageCircleBolt,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const SEEN_KEY = "openreply:notifications-seen-at";
const POLL_MS = 60_000;

function readSeenAt() {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Bell menu. Unread = newer than the last time the menu was opened; that
 * timestamp is per-browser (localStorage), which is enough for an operator
 * heads-up and keeps the API stateless.
 */
export default function NotificationsMenu() {
  const i18n = useI18n();
  const { t, locale, label } = i18n;
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [seenAt, setSeenAt] = useState<string | null>(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((res) => {
          if (cancelled || !res.success) return;
          setItems(res.data.items);
          setSeenAt(readSeenAt());
        })
        .catch(() => {});
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const unread = (items ?? []).filter((i) => !seenAt || i.createdAt > seenAt).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = new Date().toISOString();
      try {
        window.localStorage.setItem(SEEN_KEY, now);
      } catch {}
      // Keep the "new" dots visible while the menu is open; the badge clears.
      setTimeout(() => setSeenAt(now), 1500);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="topbar-notifications"
        onClick={toggle}
        className="icon-btn"
        aria-label={unread ? t("Notifications ({count} new)", { count: unread }) : t("Notifications")}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <IconBell size={18} stroke={1.5} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="popover animate-pop-in absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-heading text-sm font-semibold text-foreground">{t("Notifications")}</p>
            <span className="text-xs text-muted">{t("Last 7 days")}</span>
          </div>

          <ul className="max-h-[360px] overflow-y-auto">
            {items === null && (
              <li className="px-4 py-10 text-center text-sm text-muted">{t("Loading…")}</li>
            )}
            {items?.length === 0 && (
              <li className="px-4 py-10 text-center">
                <IconMessageCircleBolt size={28} stroke={1.25} className="mx-auto text-accent-muted" />
                <p className="mt-2 text-sm text-muted">{t("You're all caught up")}</p>
              </li>
            )}
            {items?.map((item) => {
              const isNew = !seenAt || item.createdAt > seenAt;
              const Icon =
                item.level === "ERROR" ? IconCircleX : item.level === "WARNING" ? IconAlertTriangle : IconInfoCircle;
              const tone =
                item.level === "ERROR"
                  ? "bg-error-soft text-error"
                  : item.level === "WARNING"
                    ? "bg-warning-soft text-warning"
                    : "bg-accent-soft text-accent";
              return (
                <li key={item.id} className="border-b border-border last:border-0">
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                      <Icon size={16} stroke={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.kind === "dm_failed"
                            ? t("DM failed: {name}", { name: item.title })
                            : translateServerMessage(i18n, item.title)}
                        </span>
                        <span className="shrink-0 text-[11px] text-subtle">
                          {formatRelativeTime(item.createdAt, locale)}
                        </span>
                      </span>
                      {item.detail && (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                          {item.kind === "event" ? label(item.detail) : item.detail}
                        </span>
                      )}
                    </span>
                    {isNew && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href="/diagnostics"
            onClick={close}
            className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-accent hover:bg-surface-hover"
          >
            {t("View diagnostics")}
          </Link>
        </div>
      )}
    </div>
  );
}

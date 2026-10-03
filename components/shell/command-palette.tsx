"use client";

import { NAV_GROUPS } from "@/components/shell/nav-config";
import type { StaticMessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import {
  IconBrandInstagram,
  IconCornerDownLeft,
  IconPlus,
  IconSearch,
  IconSpeakerphone,
  type Icon,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

interface PaletteItem {
  id: string;
  group: "pages" | "campaigns" | "actions";
  label: string;
  hint?: string;
  icon: Icon;
  href: string;
  /** Full page navigation (API routes that redirect, e.g. OAuth). */
  external?: boolean;
}

interface CampaignHit {
  id: string;
  name: string;
  isActive: boolean;
}

const GROUP_LABELS: Record<PaletteItem["group"], StaticMessageKey> = {
  pages: "Pages",
  campaigns: "Campaigns",
  actions: "Actions",
};

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * ⌘K / Ctrl+K command palette. Mounted only while open, so every open starts
 * from a clean query without reset effects.
 */
export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [campaigns, setCampaigns] = useState<CampaignHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced campaign search.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setCampaigns(res.data.campaigns);
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = normalize(query.trim());
    const matches = (...parts: (string | undefined)[]) =>
      !q || parts.some((p) => p && normalize(p).includes(q));

    const pages: PaletteItem[] = NAV_GROUPS.flatMap((group) =>
      group.items
        .filter((item) => matches(t(item.label), item.label, ...(item.keywords ?? [])))
        .map((item) => ({
          id: `page-${item.href}`,
          group: "pages" as const,
          label: t(item.label),
          hint: t(group.title),
          icon: item.icon,
          href: item.href,
        })),
    );

    const actions: PaletteItem[] = [
      { id: "action-new-campaign", group: "actions" as const, label: t("New Campaign"), icon: IconPlus, href: "/campaigns/new" },
      { id: "action-connect-instagram", group: "actions" as const, label: t("Connect Instagram"), icon: IconBrandInstagram, href: "/api/instagram/connect", external: true },
    ].filter((a) => matches(a.label));

    const campaignItems: PaletteItem[] = campaigns.map((c) => ({
      id: `campaign-${c.id}`,
      group: "campaigns" as const,
      label: c.name,
      hint: c.isActive ? t("Active") : t("Paused"),
      icon: IconSpeakerphone,
      href: `/campaigns/${c.id}`,
    }));

    return [...pages, ...campaignItems, ...actions];
  }, [query, campaigns, t]);

  const safeActive = items.length ? Math.min(active, items.length - 1) : 0;

  function select(item: PaletteItem | undefined) {
    if (!item) return;
    onClose();
    if (item.external) window.location.assign(item.href);
    else router.push(item.href);
  }

  function move(delta: number) {
    if (!items.length) return;
    const next = (safeActive + delta + items.length) % items.length;
    setActive(next);
    requestAnimationFrame(() => {
      document.getElementById(`palette-${items[next].id}`)?.scrollIntoView({ block: "nearest" });
    });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(items[safeActive]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-[#1d2630]/30 px-4 pt-[12vh] backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Search")}
        className="popover animate-pop-in w-full max-w-xl overflow-hidden"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <IconSearch size={18} stroke={1.5} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            id="command-palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={items[safeActive] ? `palette-${items[safeActive].id}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setLoading(true);
            }}
            placeholder={t("Search pages, campaigns and actions…")}
            className="h-14 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle focus-visible:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted sm:block">
            Esc
          </kbd>
        </div>

        <ul id="command-palette-list" role="listbox" className="max-h-[360px] overflow-y-auto p-2">
          {items.length === 0 && !loading && (
            <li className="px-3 py-10 text-center text-sm text-muted">{t("No results")}</li>
          )}
          {items.map((item, index) => {
            const header =
              index === 0 || items[index - 1].group !== item.group ? GROUP_LABELS[item.group] : null;
            const Icon = item.icon;
            const selected = index === safeActive;
            return (
              <li key={item.id} role="presentation">
                {header && (
                  <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-subtle first:pt-1">
                    {t(header)}
                  </p>
                )}
                <div
                  id={`palette-${item.id}`}
                  role="option"
                  aria-selected={selected}
                  onPointerMove={() => setActive(index)}
                  onClick={() => select(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    selected ? "bg-accent-soft text-accent" : "text-foreground"
                  }`}
                >
                  <Icon size={18} stroke={1.5} className={selected ? "text-accent" : "text-muted"} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="shrink-0 text-xs text-subtle">{item.hint}</span>}
                  {selected && <IconCornerDownLeft size={14} stroke={1.5} className="shrink-0" />}
                </div>
              </li>
            );
          })}
          {loading && items.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-muted">{t("Searching…")}</li>
          )}
        </ul>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↑</kbd>
            <kbd className="rounded border border-border px-1">↓</kbd>
            {t("to navigate")}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↵</kbd>
            {t("to open")}
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import CommandPalette from "@/components/shell/command-palette";
import { findNavContext } from "@/components/shell/nav-config";
import NotificationsMenu from "@/components/shell/notifications-menu";
import UserMenu from "@/components/shell/user-menu";
import { useI18n } from "@/lib/i18n/provider";
import {
  IconBrandInstagram,
  IconChevronRight,
  IconLayoutSidebarLeftExpand,
  IconSearch,
  IconSun,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState, useSyncExternalStore } from "react";

interface TopBarProps {
  onMenuClick: () => void;
  instagramAccountCount: number;
  userName: string;
  userEmail: string | null;
  userImage: string | null;
  role: string;
}

const noopSubscribe = () => () => {};

function useIsMac() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /mac|iphone|ipad/i.test(navigator.userAgent),
    () => false,
  );
}

export default function TopBar({
  onMenuClick,
  instagramAccountCount,
  userName,
  userEmail,
  userImage,
  role,
}: TopBarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const isMac = useIsMac();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global ⌘K / Ctrl+K.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ctx = findNavContext(pathname);
  const crumbs: { label: string; href?: string }[] = [{ label: t("Home"), href: "/dashboard" }];
  if (ctx) {
    if (ctx.subLabel) {
      crumbs.push({ label: t(ctx.item.label), href: ctx.item.href });
      crumbs.push({ label: t(ctx.subLabel) });
    } else {
      crumbs.push({ label: t(ctx.group.title) });
      crumbs.push({ label: t(ctx.item.label) });
    }
  }

  return (
    <>
      <header
        className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:px-6"
        style={{
          height: "calc(4rem + env(safe-area-inset-top))",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="icon-btn shrink-0 lg:hidden"
            aria-label={t("Expand sidebar")}
            title={t("Expand sidebar")}
            aria-controls="app-sidebar"
          >
            <IconLayoutSidebarLeftExpand size={18} stroke={1.5} />
          </button>

          <nav aria-label={t("Breadcrumb")} className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1.5 text-sm">
              {crumbs.map((crumb, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <Fragment key={i}>
                    {i > 0 && (
                      <li aria-hidden="true" className={`text-subtle ${i < crumbs.length - 1 ? "hidden sm:block" : ""}`}>
                        <IconChevronRight size={14} stroke={1.75} />
                      </li>
                    )}
                    <li className={`min-w-0 ${!last ? "hidden sm:block" : ""}`}>
                      {last ? (
                        <span aria-current="page" className="block truncate font-medium text-accent">
                          {crumb.label}
                        </span>
                      ) : crumb.href ? (
                        <Link href={crumb.href} className="block truncate text-muted hover:text-foreground">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="block truncate text-muted">{crumb.label}</span>
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ol>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            id="topbar-search"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-subtle transition-colors hover:border-border-hover md:flex"
            aria-label={t("Search")}
            aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
          >
            <IconSearch size={16} stroke={1.5} />
            <span className="flex-1 text-left">{t("Search here")}</span>
            <kbd className="rounded border border-border bg-surface-hover px-1.5 py-px font-sans text-[11px] text-muted">
              {isMac ? "⌘ + K" : "Ctrl + K"}
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="icon-btn md:hidden"
            aria-label={t("Search")}
          >
            <IconSearch size={18} stroke={1.5} />
          </button>

          {/* Dark mode is planned; the control is in place so the layout won't shift later. */}
          <button
            type="button"
            id="topbar-theme-toggle"
            className="icon-btn cursor-not-allowed"
            aria-disabled="true"
            aria-label={t("Dark mode (coming soon)")}
            title={t("Dark mode (coming soon)")}
          >
            <IconSun size={18} stroke={1.5} />
          </button>

          <NotificationsMenu />

          {instagramAccountCount === 0 && (
            <a
              href="/api/instagram/connect"
              className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover sm:inline-flex"
            >
              <IconBrandInstagram size={16} stroke={1.75} />
              {t("Connect Instagram")}
            </a>
          )}

          <div className="ml-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

          <UserMenu userName={userName} userEmail={userEmail} userImage={userImage} role={role} />
        </div>
      </header>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}

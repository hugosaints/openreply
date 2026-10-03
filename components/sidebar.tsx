"use client";

import LanguageSwitcher from "@/components/language-switcher";
import { NAV_GROUPS, isNavItemActive } from "@/components/shell/nav-config";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/use-media-query";
import { useI18n } from "@/lib/i18n/provider";
import { displayWorkspaceName } from "@/lib/i18n/server-messages";
import { zernioLink } from "@/lib/zernio-links";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMessageCircleBolt,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  /** Mobile drawer open state. */
  isOpen: boolean;
  onClose: () => void;
  /** Desktop icon-only mode. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  workspaceName: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapsed,
  workspaceName,
}: SidebarProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const pathname = usePathname();
  // The mobile drawer is always full width; "collapsed" only applies on lg+.
  const mini = collapsed;
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  // Desktop: toggles icon-only mode. Mobile: closes the drawer.
  const showExpand = isDesktop && mini;
  const toggleLabel = showExpand ? t("Expand sidebar") : t("Collapse sidebar");

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1d2630]/40 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label={t("Main navigation")}
        className={`
          fixed top-0 left-0 z-50 flex h-dvh w-[264px] max-w-[85vw] shrink-0 flex-col
          border-r border-border bg-surface
          transition-[transform,width] duration-200 ease-out
          lg:static lg:z-auto lg:h-full lg:max-w-none lg:translate-x-0
          ${mini ? "lg:w-[76px]" : "lg:w-[264px]"}
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand row — same height as the top bar so the borders line up. */}
        <div
          className={`flex shrink-0 items-center border-b border-border ${mini ? "lg:justify-center lg:px-0" : ""} justify-between px-5`}
          style={{
            height: "calc(4rem + env(safe-area-inset-top))",
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <Link
            href="/dashboard"
            id="sidebar-brand"
            className={`flex items-center gap-2 ${mini ? "lg:hidden" : ""}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <IconMessageCircleBolt size={18} stroke={2} />
            </span>
            <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
              OpenReply
            </span>
          </Link>

          <button
            type="button"
            id="sidebar-collapse-toggle"
            onClick={isDesktop ? onToggleCollapsed : onClose}
            className="icon-btn"
            aria-label={toggleLabel}
            aria-controls="app-sidebar"
            aria-expanded={!showExpand}
            title={toggleLabel}
          >
            {showExpand ? (
              <IconLayoutSidebarLeftExpand size={18} stroke={1.5} />
            ) : (
              <IconLayoutSidebarLeftCollapse size={18} stroke={1.5} />
            )}
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto py-4 ${mini ? "lg:px-3" : ""} px-3`}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? "mt-5" : ""}>
              <p
                className={`px-3 pb-2 text-xs font-medium text-subtle ${mini ? "lg:sr-only" : ""}`}
              >
                {t(group.title)}
              </p>
              {mini && gi > 0 && <div className="mx-3 mb-3 hidden border-t border-border lg:block" />}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  const Icon = item.icon;
                  const label = t(item.label);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        id={`nav-${item.href.slice(1)}`}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        title={mini ? label : undefined}
                        className={`
                          group flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors
                          ${mini ? "lg:justify-center lg:px-0" : ""}
                          ${active
                            ? "bg-accent-soft font-medium text-accent"
                            : "text-foreground/80 hover:bg-surface-hover hover:text-foreground"}
                        `}
                      >
                        <Icon
                          size={18}
                          stroke={1.5}
                          className={active ? "text-accent" : "text-muted group-hover:text-foreground"}
                        />
                        <span className={mini ? "lg:sr-only" : ""}>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={`shrink-0 border-t border-border px-5 py-4 ${mini ? "lg:hidden" : ""}`}>
          <LanguageSwitcher />
          <div className="mt-4 rounded-lg bg-surface-hover px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{displayWorkspaceName(i18n, workspaceName)}</p>
            <p className="text-xs text-muted">{t("Self-hosted")}</p>
          </div>
          <a
            href={zernioLink({ placement: "sidebar" })}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-xs text-muted hover:text-foreground"
          >
            <span>{t("Supported by")}</span>
            <Image src="/brand/zernio-primary.svg" alt="Zernio" width={64} height={20} />
          </a>
        </div>
      </aside>
    </>
  );
}

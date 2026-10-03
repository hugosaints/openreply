"use client";

import { useDismiss } from "@/components/shell/use-dismiss";
import { signOutAction } from "@/lib/auth-actions";
import { useI18n } from "@/lib/i18n/provider";
import { IconLogout, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

interface UserMenuProps {
  userName: string;
  userEmail: string | null;
  userImage: string | null;
  role: string;
}

export default function UserMenu({ userName, userEmail, userImage, role }: UserMenuProps) {
  const { t, label } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const initial = (userName || userEmail || "?").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="topbar-user-menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface-hover"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary OAuth avatar hosts
          <img src={userImage} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft font-heading text-sm font-semibold text-accent">
            {initial}
          </span>
        )}
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[150px] truncate text-sm font-semibold text-foreground">{userName}</span>
          <span className="block text-xs text-muted">{label(role)}</span>
        </span>
      </button>

      {open && (
        <div className="popover animate-pop-in absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
            {userEmail && <p className="truncate text-xs text-muted">{userEmail}</p>}
          </div>
          <div className="p-1.5">
            <Link
              href="/settings"
              onClick={close}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-hover"
            >
              <IconSettings size={16} stroke={1.5} className="text-muted" />
              {t("Settings")}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                id="topbar-sign-out"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-error hover:bg-error-soft"
              >
                <IconLogout size={16} stroke={1.5} />
                {t("Sign out")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

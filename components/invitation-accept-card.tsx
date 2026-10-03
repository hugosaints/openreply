"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useState } from "react";

interface InvitationAcceptCardProps {
  token: string;
  isSignedIn: boolean;
  invitedEmail: string;
}

export default function InvitationAcceptCard({
  token,
  isSignedIn,
  invitedEmail,
}: InvitationAcceptCardProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function acceptInvite() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/workspace/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json();
    if (payload.success) {
      window.location.assign("/dashboard");
      return;
    }
    setMessage(payload.error ?? t("Could not accept invitation"));
    setBusy(false);
  }

  if (!isSignedIn) {
    return (
      <a
        href="/login"
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgb(79_70_229/0.65)] transition-colors hover:bg-accent-hover"
      >
        {t("Sign in to accept")}
      </a>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={acceptInvite}
        disabled={busy}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgb(79_70_229/0.65)] transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? t("Accepting...") : t("Accept invitation")}
      </button>
      {message && <p className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error">{message}</p>}
      <p className="text-xs text-muted">
        {t("Use the magic link account for")} {invitedEmail}.
      </p>
    </div>
  );
}


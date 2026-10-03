"use client";

import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import { Suspense, useEffect, useState } from "react";
import type { AccountOption } from "@/components/account-select";
import { ZernioConnection } from "@/components/zernio-connection";
import { InstagramConnectNotice } from "@/components/instagram-connect-notice";
import Segmented from "@/components/ui/segmented";

interface SettingsData {
  workspace: {
    name: string;
    dmsSentThisPeriod: number;
  };
  instagramAccount: {
    id: string;
    username: string;
    instagramId: string;
    tokenExpiresAt: string | null;
    webhookSubscribed: boolean;
  } | null;
  instagramAccounts: Array<
    AccountOption & {
      provider?: "META" | "ZERNIO";
      tokenExpiresAt: string | null;
      webhookSubscribed: boolean;
    }
  >;
}

interface WorkspaceMembersData {
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  members: Array<{
    id: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    createdAt: string;
    user: {
      id: string;
      email: string | null;
      name: string | null;
    };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    inviteUrl: string;
    expiresAt: string;
  }>;
}

export default function SettingsPage() {
  const { t, label, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<"general" | "integrations" | "team">("general");
  const [data, setData] = useState<SettingsData | null>(null);
  const [membersData, setMembersData] = useState<WorkspaceMembersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberError, setMemberError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((res) => res.json()),
      fetch("/api/workspace/members").then((res) => res.json()),
    ])
      .then(([statsPayload, membersPayload]) => {
        if (statsPayload.success) setData(statsPayload.data);
        if (membersPayload.success) setMembersData(membersPayload.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function refreshMembers() {
    const res = await fetch("/api/workspace/members");
    const payload = await res.json();
    if (payload.success) setMembersData(payload.data);
  }

  async function disconnectInstagram(instagramAccountId: string) {
    if (!confirm(t("Disconnect Instagram? Campaigns for this account will stop sending DMs."))) {
      return;
    }
    setBusy(`disconnect:${instagramAccountId}`);
    await fetch("/api/instagram/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagramAccountId }),
    });
    window.location.reload();
  }

  async function inviteMember(event: React.FormEvent) {
    event.preventDefault();
    setMemberError(null);
    setBusy("invite");
    const res = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const payload = await res.json();
    if (payload.success) {
      setMembersData(payload.data);
      setInviteEmail("");
    } else {
      setMemberError(payload.error ?? t("Could not invite member"));
    }
    setBusy(null);
  }

  async function removeInvitation(invitationId: string) {
    setBusy(`invite:${invitationId}`);
    await fetch("/api/workspace/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    await refreshMembers();
    setBusy(null);
  }

  if (loading) {
    return <div className="space-y-4 max-w-4xl mx-auto" aria-busy="true"><div className="panel rounded-2xl p-8 h-64 animate-pulse" /></div>;
  }

  const accounts = data?.instagramAccounts ?? [];
  const canManageMembers =
    membersData?.currentUserRole === "OWNER" ||
    membersData?.currentUserRole === "ADMIN";

  const renderGeneral = () => (
    <div className="space-y-6">
      <section className="panel rounded-2xl p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("Interface language")}</h2>
          <p className="mt-1 text-sm text-muted">{t("Saved in this browser. Campaign messages stay unchanged.")}</p>
        </div>
        <div className="pt-2">
          <LanguageSwitcher />
        </div>
      </section>

      <section className="panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold mb-4 text-foreground">{t("Usage")}</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 rounded-xl border border-border bg-surface/50 px-5">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("DMs sent this month")}
            </p>
            <p className="text-xs text-muted mt-1">
              {t("Self-hosted — no plan limits.")}
            </p>
          </div>
          <div className="flex items-center justify-center min-w-[80px]">
            <span className="text-3xl font-semibold text-foreground">
              {data?.workspace.dmsSentThisPeriod ?? 0}
            </span>
          </div>
        </div>
      </section>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-6">
      <section className="panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("Instagram Connection")}</h2>
            <p className="text-sm text-muted mt-1">
              {t("Comment webhooks and private replies depend on this connection.")}
            </p>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              accounts.length > 0
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning"
            }`}
          >
            {accounts.length > 0 ? t("Connected") : t("Not connected")}
          </span>
        </div>

        <div className="space-y-4">
          {accounts.length === 0 && (
            <div className="rounded-xl border border-border bg-surface/50 p-6 text-center">
              <p className="text-sm text-muted">
                {t("Connect an Instagram professional account to launch campaigns.")}
              </p>
            </div>
          )}
          
          {accounts.length > 0 && (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-surface/70 p-5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:border-border-hover"
                >
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      @{account.username}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted items-center">
                      {account.provider === "ZERNIO" ? (
                        <span className="bg-surface border border-border px-2 py-0.5 rounded-md">{t("Connected via Zernio")}</span>
                      ) : (
                        <span className="bg-surface border border-border px-2 py-0.5 rounded-md">
                          {t("Token expires")}{" "}
                          {account.tokenExpiresAt
                            ? new Date(account.tokenExpiresAt).toLocaleDateString(locale)
                            : t("not available")}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md font-medium ${account.webhookSubscribed ? "bg-accent-soft text-accent" : "bg-warning/10 text-warning"}`}>
                        {account.webhookSubscribed ? t("Webhook ready") : t("Webhook pending")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnectInstagram(account.id)}
                    disabled={busy === `disconnect:${account.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-error/20 px-4 py-2 text-sm font-medium text-error transition-all hover:border-error/40 hover:bg-error-soft disabled:opacity-50"
                  >
                    {busy === `disconnect:${account.id}`
                      ? t("Disconnecting...")
                      : t("Disconnect")}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-border flex">
            <a
              href="/api/instagram/connect"
              className="inline-flex px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors bg-accent text-white hover:bg-accent-hover"
            >
              {t("Connect using your own Meta app")}
            </a>
          </div>
        </div>
      </section>

      <div className="[&>section]:rounded-2xl [&>section]:p-6 sm:[&>section]:p-8">
        <ZernioConnection canManage={canManageMembers} />
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-6">
      <section className="panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold mb-6 text-foreground">{t("Team Members")}</h2>
        
        <div className="space-y-3">
          {membersData?.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/50 p-4 transition-colors hover:bg-surface/70"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent font-semibold uppercase shrink-0">
                  {(member.user.name ?? member.user.email ?? "?")[0]}
                </div>
                <div>
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.user.name ?? member.user.email ?? t("Unknown member")}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{member.user.email}</p>
                </div>
              </div>
              <span className="rounded-full bg-surface border border-border px-3 py-1 text-xs font-semibold text-muted">
                {label(member.role)}
              </span>
            </div>
          ))}
        </div>

        {membersData?.invitations.length ? (
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              {t("Pending invites")}
            </h3>
            <div className="space-y-3">
              {membersData.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-surface/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {invitation.email}
                    </p>
                    <p className="truncate text-xs text-muted mt-1">
                      <span className="font-medium">{label(invitation.role)}</span> · {invitation.inviteUrl}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard?.writeText(invitation.inviteUrl)
                      }
                      className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-border-hover hover:bg-surface-hover"
                    >
                      {t("Copy")}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeInvitation(invitation.id)}
                      disabled={busy === `invite:${invitation.id}`}
                      className="rounded-lg border border-error/20 bg-surface px-4 py-2 text-xs font-medium text-error transition-colors hover:bg-error-soft disabled:opacity-50"
                    >
                      {t("Revoke")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {canManageMembers && (
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("Invite a new member")}</h3>
            <form
              onSubmit={inviteMember}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@agency.com"
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                required
              />
              <select
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(event.target.value as "ADMIN" | "MEMBER")
                }
                className="w-full sm:w-36 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="MEMBER">{t("Member")}</option>
                <option value="ADMIN">{t("Admin")}</option>
              </select>
              <button
                type="submit"
                disabled={busy === "invite"}
                className="w-full sm:w-auto rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {busy === "invite" ? t("Inviting...") : t("Invite")}
              </button>
            </form>
            {memberError && (
              <p className="mt-3 text-sm text-error">{memberError}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Suspense fallback={null}>
        <InstagramConnectNotice />
      </Suspense>

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {t("Settings")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("Manage your workspace, connections and team members.")}
          </p>
        </div>

        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <Segmented<string>
            ariaLabel={t("Settings tabs")}
            value={activeTab}
            onChange={(val) => setActiveTab(val as "general" | "integrations" | "team")}
            options={[
              { value: "general", label: t("General") },
              { value: "integrations", label: t("Integrations") },
              { value: "team", label: t("Team") },
            ]}
          />
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "general" && renderGeneral()}
        {activeTab === "integrations" && renderIntegrations()}
        {activeTab === "team" && renderTeam()}
      </div>
    </div>
  );
}

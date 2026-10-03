"use client";

import type { ConversationListItem } from "@/app/api/instagram/conversations/route";
import ContactAvatar from "@/components/inbox/contact-avatar";
import Segmented from "@/components/ui/segmented";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { translateServerMessage } from "@/lib/i18n/server-messages";
import { filterConversations, isAwaitingReply, type ConversationFilter } from "@/lib/inbox/thread";
import { IconAlertTriangle, IconInbox, IconSearch, IconX } from "@tabler/icons-react";
import { useState } from "react";

export function formatListTime(iso: string | null, locale: Locale, now: number): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString(locale, sameYear ? { month: "short", day: "numeric" } : { dateStyle: "short" });
}

/** Zernio's placeholder when Instagram hides the participant's profile. */
const GENERIC_NAMES = new Set(["Instagram User", "Instagram user"]);

/** Primary/secondary labels for a contact: display name and @handle. */
export function useContactLabel() {
  const { t } = useI18n();
  return (conversation: ConversationListItem) => {
    if (conversation.detailsUnavailable) return { primary: t("Details unavailable"), secondary: null };
    const { name, username } = conversation.contact;
    const realName = name && !GENERIC_NAMES.has(name) ? name : null;
    const handle = username ? `@${username}` : null;
    return {
      primary: realName ?? handle ?? t("Instagram user"),
      secondary: realName && handle ? handle : null,
    };
  };
}

interface ConversationListProps {
  conversations: ConversationListItem[];
  loading: boolean;
  error: string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  now: number;
}

export default function ConversationList({
  conversations,
  loading,
  error,
  activeId,
  onSelect,
  now,
}: ConversationListProps) {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const contactLabel = useContactLabel();

  const awaitingCount = conversations.filter(isAwaitingReply).length;
  const visible = filterConversations(conversations, query, filter);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold text-foreground">{t("Conversations")}</h2>
          {!loading && conversations.length > 0 && (
            <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-muted">
              {conversations.length}
            </span>
          )}
        </div>

        <label className="relative block">
          <span className="sr-only">{t("Search conversations")}</span>
          <IconSearch size={16} stroke={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            id="inbox-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search by @username or message")}
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-8 text-sm text-foreground placeholder:text-subtle focus:border-accent/40 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-foreground"
              aria-label={t("Clear search")}
            >
              <IconX size={14} stroke={1.75} />
            </button>
          )}
        </label>

        <Segmented
          id="inbox-filter"
          full
          ariaLabel={t("Filter conversations")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t("All") },
            {
              value: "awaiting",
              label: awaitingCount > 0 ? t("Awaiting reply ({count})", { count: awaitingCount }) : t("Awaiting reply"),
            },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={loading}>
        {loading ? (
          <ListSkeleton />
        ) : error ? (
          <div role="alert" className="m-4 flex items-start gap-2.5 rounded-lg border border-error/20 bg-error-soft px-3 py-2.5 text-sm text-foreground">
            <IconAlertTriangle size={16} stroke={1.75} className="mt-0.5 shrink-0 text-error" />
            <p>{translateServerMessage(i18n, error)}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
              <IconInbox size={20} stroke={1.5} />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">
              {conversations.length === 0
                ? t("No conversations yet.")
                : filter === "awaiting" && !query
                  ? t("You're all caught up.")
                  : t("No conversations match your search.")}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {visible.map((c) => {
              const isActive = c.id === activeId;
              const awaiting = isAwaitingReply(c);
              const label = contactLabel(c);
              const unread = c.unreadCount ?? 0;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    id={`conversation-${c.id}`}
                    onClick={() => onSelect(c.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isActive ? "bg-accent-soft" : "hover:bg-surface-hover"
                    }`}
                  >
                    <ContactAvatar
                      username={c.contact.username}
                      name={c.contact.name}
                      picture={c.contact.picture}
                      seed={c.contact.id || c.id}
                      indicator={awaiting && !isActive && unread === 0}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <span className={`truncate text-sm ${awaiting ? "font-semibold" : "font-medium"} ${isActive ? "text-accent" : "text-foreground"}`}>
                            {label.primary}
                          </span>
                          {label.secondary && (
                            <span className="hidden truncate text-xs text-subtle lg:inline">{label.secondary}</span>
                          )}
                        </span>
                        <span className={`shrink-0 text-[11px] ${awaiting ? "font-medium text-accent" : "text-subtle"}`}>
                          {formatListTime(c.updatedTime, locale, now)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-xs ${awaiting ? "text-foreground" : "text-muted"}`}>
                          {c.detailsUnavailable
                            ? t("Instagram could not load this conversation.")
                            : c.lastMessage
                              ? `${c.lastMessage.fromMe ? t("You: ") : ""}${c.lastMessage.text || t("(no text)")}`
                              : t("No messages.")}
                        </span>
                        {unread > 0 && (
                          <span
                            className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white"
                            aria-label={t("{count} unread", { count: unread })}
                          >
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1 p-2" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 animate-pulse rounded bg-surface-hover" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-surface-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import type { ConversationListItem } from "@/app/api/instagram/conversations/route";
import type { ThreadMessage } from "@/app/api/instagram/conversations/[id]/route";
import ContactAvatar from "@/components/inbox/contact-avatar";
import { useContactLabel } from "@/components/inbox/conversation-list";
import MessageBubble from "@/components/inbox/message-bubble";
import { useI18n } from "@/lib/i18n/provider";
import { translateServerMessage } from "@/lib/i18n/server-messages";
import { describeDay, groupMessagesByDay, messagingWindow } from "@/lib/inbox/thread";
import {
  IconAlertTriangle,
  IconBrandInstagram,
  IconChevronLeft,
  IconClock,
  IconLoader2,
  IconMessageCircleOff,
  IconRefresh,
  IconSend2,
} from "@tabler/icons-react";
import { useEffect, useRef, type RefObject } from "react";

/** Instagram rejects DMs longer than this. */
const MAX_LENGTH = 1000;
/** Meta only exposes the most recent messages of a thread. */
const API_MESSAGE_LIMIT = 20;

interface ThreadViewProps {
  conversation: ConversationListItem;
  messages: ThreadMessage[];
  loading: boolean;
  refreshing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  sending: boolean;
  sendError: string | null;
  onSend: () => void;
  onBack: () => void;
  onRefresh: () => void;
  now: number;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export default function ThreadView({
  conversation,
  messages,
  loading,
  refreshing,
  draft,
  onDraftChange,
  sending,
  sendError,
  onSend,
  onBack,
  onRefresh,
  now,
  scrollRef,
}: ThreadViewProps) {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const unavailable = Boolean(conversation.detailsUnavailable);
  const username = conversation.contact.username;
  const label = useContactLabel()(conversation);
  const instagramUrl = conversation.url ?? (username ? `https://ig.me/m/${encodeURIComponent(username)}` : null);
  const canReply = !unavailable && Boolean(conversation.contact.id);
  const replyWindow = messagingWindow(messages, now);
  const groups = groupMessagesByDay(messages);

  // Grow the composer with its content (capped by max-h).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
    }
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  function closesIn(closesAt: number): string {
    const minutes = Math.max(1, Math.round((closesAt - now) / 60_000));
    return minutes >= 60 ? rtf.format(Math.round(minutes / 60), "hour") : rtf.format(minutes, "minute");
  }

  function dayLabel(day: string): string | null {
    const d = describeDay(day, now);
    if (!d) return null;
    if (d.kind === "today") return t("Today");
    if (d.kind === "yesterday") return t("Yesterday");
    const sameYear = d.date.getFullYear() === new Date(now).getFullYear();
    return d.date.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    });
  }

  return (
    <>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="icon-btn -ml-1 sm:hidden"
          aria-label={t("Back to conversations")}
        >
          <IconChevronLeft size={18} stroke={1.5} />
        </button>
        <ContactAvatar
          username={username}
          name={conversation.contact.name}
          picture={conversation.contact.picture}
          seed={conversation.contact.id || conversation.id}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{label.primary}</span>
            {label.secondary && <span className="truncate text-xs text-subtle">{label.secondary}</span>}
          </p>
          {!unavailable && !replyWindow.unknown && (
            <p className={`flex items-center gap-1 text-xs ${replyWindow.open ? "text-success" : "text-subtle"}`}>
              <IconClock size={12} stroke={1.75} />
              <span className="truncate">
                {replyWindow.open && replyWindow.closesAt
                  ? t("Reply window open · closes {time}", { time: closesIn(replyWindow.closesAt) })
                  : t("Reply window closed")}
              </span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!unavailable && (
            <button
              type="button"
              id="inbox-refresh-thread"
              onClick={onRefresh}
              disabled={refreshing}
              className="icon-btn disabled:opacity-60"
              aria-label={t("Refresh")}
              title={t("Refresh")}
            >
              <IconRefresh size={17} stroke={1.5} className={refreshing ? "animate-spin" : ""} />
            </button>
          )}
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              aria-label={t("Open in Instagram")}
              title={t("Open in Instagram")}
            >
              <IconBrandInstagram size={17} stroke={1.5} />
            </a>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-[#fafbfc] px-4 py-5" aria-live="polite">
        {unavailable ? (
          <EmptyState
            icon={<IconMessageCircleOff size={20} stroke={1.5} />}
            text={t("Instagram could not load the details of this conversation. Other conversations are still available. You can check this chat in Instagram.")}
          />
        ) : loading && messages.length === 0 ? (
          <ThreadSkeleton />
        ) : messages.length === 0 ? (
          <EmptyState icon={<IconMessageCircleOff size={20} stroke={1.5} />} text={t("No messages.")} />
        ) : (
          <div className="space-y-5">
            {messages.length >= API_MESSAGE_LIMIT && (
              <p className="text-center text-xs text-subtle">
                {t("Instagram only shares the {count} most recent messages.", { count: API_MESSAGE_LIMIT })}
              </p>
            )}
            {groups.map((group, gi) => {
              const label = dayLabel(group.day);
              return (
                <section key={`${group.day}-${gi}`} aria-label={label ?? undefined}>
                  {label && (
                    <div className="mb-4 flex items-center gap-3" aria-hidden="true">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <ul className="flex flex-col">
                    {group.messages.map(({ message, continued }) => (
                      <MessageBubble key={message.id} message={message} continued={continued} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-surface p-3 sm:p-4">
        {canReply && !replyWindow.unknown && !replyWindow.open && (
          <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2.5 text-xs text-foreground">
            <IconAlertTriangle size={16} stroke={1.75} className="mt-px shrink-0 text-warning" />
            <p>{t("More than 24 hours have passed since this contact's last message. Instagram may reject replies until they message you again.")}</p>
          </div>
        )}
        {sendError && (
          <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-lg border border-error/20 bg-error-soft px-3 py-2.5 text-xs text-foreground">
            <IconAlertTriangle size={16} stroke={1.75} className="mt-px shrink-0 text-error" />
            <p>{translateServerMessage(i18n, sendError)}</p>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface p-1.5 pl-3 transition-colors focus-within:border-accent/40">
          <label htmlFor="inbox-composer" className="sr-only">{t("Reply")}</label>
          <textarea
            ref={textareaRef}
            id="inbox-composer"
            disabled={!canReply}
            value={draft}
            maxLength={MAX_LENGTH}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={canReply ? t("Write a reply…") : t("Replying is unavailable for this conversation.")}
            className="max-h-36 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-subtle focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="button"
            id="inbox-send"
            onClick={onSend}
            disabled={sending || !draft.trim() || !canReply}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("Send")}
          >
            {sending ? <IconLoader2 size={16} stroke={2} className="animate-spin" /> : <IconSend2 size={16} stroke={1.75} />}
            <span className="hidden sm:inline">{sending ? t("Sending…") : t("Send")}</span>
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-subtle">
          <span className="hidden sm:inline">{t("Enter to send · Shift+Enter for a new line")}</span>
          {draft.length > MAX_LENGTH * 0.8 && (
            <span className={`ml-auto tabular-nums ${draft.length >= MAX_LENGTH ? "text-error" : ""}`}>
              {draft.length}/{MAX_LENGTH}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div role="status" className="mx-auto flex max-w-sm flex-col items-center py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-hover text-muted">{icon}</span>
      <p className="mt-3 text-sm text-muted">{text}</p>
    </div>
  );
}

function ThreadSkeleton() {
  const rows = [
    { mine: false, w: "w-48" },
    { mine: false, w: "w-64" },
    { mine: true, w: "w-56" },
    { mine: false, w: "w-40" },
    { mine: true, w: "w-72" },
  ];
  return (
    <div className="space-y-3" aria-hidden="true">
      {rows.map((r, i) => (
        <div key={i} className={`flex ${r.mine ? "justify-end" : "justify-start"}`}>
          <div className={`h-10 max-w-[70%] animate-pulse rounded-2xl ${r.w} ${r.mine ? "bg-accent-soft" : "bg-surface-hover"}`} />
        </div>
      ))}
    </div>
  );
}

"use client";

/**
 * Inbox
 *
 * Instagram DM conversations for the selected account, with live message
 * history and a reply composer. Messages are read from the Conversations API
 * (Meta only exposes the 20 most recent per thread) and refreshed by polling.
 * Sending is subject to Instagram's 24-hour messaging window — Meta's error is
 * surfaced verbatim when it applies.
 */

import type { ConversationListItem } from "@/app/api/instagram/conversations/route";
import type { ThreadMessage } from "@/app/api/instagram/conversations/[id]/route";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import ConversationList from "@/components/inbox/conversation-list";
import ThreadView from "@/components/inbox/thread-view";
import { readCache, writeCache } from "@/lib/client-cache";
import { useNow } from "@/lib/hooks/use-now";
import { useI18n } from "@/lib/i18n/provider";
import { isAwaitingReply } from "@/lib/inbox/thread";
import { IconBrandInstagram, IconMessages, IconRefresh } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 12_000;
// Cached list/threads are shown instantly on revisit, then revalidated in the
// background. The Instagram Conversations API is slow (often several seconds),
// so this is what makes the inbox feel fast after the first load.
const CACHE_MAX_AGE_MS = 60_000;
const convCacheKey = (accountId: string) => `inbox:convs:${accountId}`;
const msgCacheKey = (conversationId: string) => `inbox:msgs:${conversationId}`;

export default function InboxPage() {
  const { t } = useI18n();
  const now = useNow();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  // Seed from the last-used account so a revisit can paint the cached
  // conversation list immediately, before the account list even loads.
  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem("inbox:selectedAccount") ?? "";
  });

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convRefreshing, setConvRefreshing] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadRefreshing, setThreadRefreshing] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationRequests = useRef(new Set<string>());

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;
  const awaitingCount = conversations.filter(isAwaitingReply).length;

  // Accounts for the selector; default to the first connected account. Uses the
  // lightweight accounts endpoint (one query) rather than the heavy dashboard
  // stats aggregation, so the inbox isn't gated on analytics before it can load.
  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.success) return;
        const next: AccountOption[] = payload.data.instagramAccounts ?? [];
        setAccounts(next);
        setSelectedAccountId((prev) => {
          // Keep the seeded account only if it's still connected; otherwise
          // fall back to the default so a removed account can't wedge the inbox.
          const stillValid = prev && next.some((a) => a.id === prev);
          return stillValid
            ? prev
            : payload.data.selectedInstagramAccountId || next[0]?.id || "";
        });
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoaded(true));
  }, []);

  // Remember the chosen account for the next visit.
  useEffect(() => {
    if (typeof window === "undefined" || !selectedAccountId) return;
    window.sessionStorage.setItem("inbox:selectedAccount", selectedAccountId);
  }, [selectedAccountId]);

  const loadConversations = useCallback(
    async (silent: boolean) => {
      if (!selectedAccountId || conversationRequests.current.has(selectedAccountId)) return;
      conversationRequests.current.add(selectedAccountId);
      if (!silent) setConvLoading(true);
      try {
        const res = await fetch(
          `/api/instagram/conversations?instagramAccountId=${selectedAccountId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.success) {
          setConversations(data.data.conversations);
          writeCache(convCacheKey(selectedAccountId), data.data.conversations);
          setConvError(null);
        } else if (!silent) {
          setConvError(data.error ?? "Failed to load conversations");
        }
      } catch {
        if (!silent) setConvError("Failed to load conversations");
      } finally {
        conversationRequests.current.delete(selectedAccountId);
        if (!silent) setConvLoading(false);
      }
    },
    [selectedAccountId]
  );

  // Load + poll conversations for the selected account. A cached list is shown
  // immediately (so revisits are instant) while a fresh copy loads silently.
  useEffect(() => {
    if (!selectedAccountId) return;
    // Reset the open thread when switching accounts. This is an intentional
    // synchronous reset on a dependency change, not derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveId(null);
    setMessages([]);
    const cached = readCache<ConversationListItem[]>(
      convCacheKey(selectedAccountId),
      CACHE_MAX_AGE_MS
    );
    if (cached.data) {
      setConversations(cached.data);
      setConvLoading(false);
    } else {
      setConversations([]);
      setConvLoading(true);
    }
    void loadConversations(Boolean(cached.data));
    const timer = window.setInterval(() => void loadConversations(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [selectedAccountId, loadConversations]);

  const loadMessages = useCallback(
    async (conversationId: string, silent: boolean) => {
      if (!selectedAccountId) return;
      if (!silent) setThreadLoading(true);
      try {
        const res = await fetch(
          `/api/instagram/conversations/${conversationId}?instagramAccountId=${selectedAccountId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.success) {
          setMessages(data.data.messages);
          writeCache(msgCacheKey(conversationId), data.data.messages);
        }
      } catch {
        // keep whatever is shown
      } finally {
        if (!silent) setThreadLoading(false);
      }
    },
    [selectedAccountId]
  );

  // Load + poll the open thread. Cached messages render instantly while a fresh
  // copy loads silently; opening a thread never shows a blank pane on revisit.
  useEffect(() => {
    if (!activeId || active?.detailsUnavailable) return;
    const cached = readCache<ThreadMessage[]>(
      msgCacheKey(activeId),
      CACHE_MAX_AGE_MS
    );
    if (cached.data) {
      // Paint cached messages instantly on thread change; intentional reset.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(cached.data);
      setThreadLoading(false);
    } else {
      setMessages([]);
      setThreadLoading(true);
    }
    void loadMessages(activeId, Boolean(cached.data));
    const timer = window.setInterval(
      () => void loadMessages(activeId, true),
      POLL_MS
    );
    return () => window.clearInterval(timer);
  }, [activeId, active?.detailsUnavailable, loadMessages]);

  // Keep the thread pinned to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function openConversation(id: string) {
    if (id !== activeId) setDraft("");
    setActiveId(id);
    setSendError(null);
    // Paint any cached thread synchronously so the pane never flashes empty
    // or shows the previously open conversation while the fetch runs.
    const cached = readCache<ThreadMessage[]>(msgCacheKey(id), CACHE_MAX_AGE_MS);
    setMessages(cached.data ?? []);
    setThreadLoading(!cached.data);
  }

  async function refreshConversations() {
    setConvRefreshing(true);
    await loadConversations(true);
    setConvRefreshing(false);
  }

  async function refreshThread() {
    if (!activeId) return;
    setThreadRefreshing(true);
    await loadMessages(activeId, true);
    setThreadRefreshing(false);
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || !active?.contact.id || sending) return;
    setSending(true);
    setSendError(null);

    // Optimistically show the reply immediately, then confirm with the server.
    const optimistic: ThreadMessage = {
      id: `optimistic-${Date.now()}`,
      text,
      fromMe: true,
      fromUsername: null,
      createdTime: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const res = await fetch("/api/instagram/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramAccountId: selectedAccountId,
          recipientId: active.contact.id,
          text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadMessages(active.id, true);
        void loadConversations(true);
      } else {
        // Roll the optimistic message back and restore the draft so it's not lost.
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
        setSendError(data.error ?? "Failed to send message");
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
      setSendError("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const noAccounts = accountsLoaded && accounts.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">{t("Inbox")}</h1>
          <p className="mt-1 text-sm text-muted">
            {selectedAccount ? (
              <>
                {t("Direct messages for")}{" "}
                <span className="font-medium text-foreground">@{selectedAccount.username}</span>
                {!convLoading && awaitingCount > 0 && (
                  <>
                    {" · "}
                    <span className="font-medium text-accent">
                      {t(awaitingCount === 1 ? "{count} awaiting reply" : "{count} awaiting replies", { count: awaitingCount })}
                    </span>
                  </>
                )}
              </>
            ) : (
              t("Reply to your Instagram direct messages.")
            )}
          </p>
        </div>
        {!noAccounts && (
          <div className="flex flex-wrap items-end gap-3">
            {accounts.length > 1 && (
              <AccountSelect
                accounts={accounts}
                value={selectedAccountId}
                onChange={setSelectedAccountId}
                includeAll={false}
              />
            )}
            <button
              type="button"
              id="inbox-refresh"
              onClick={() => void refreshConversations()}
              disabled={convLoading || convRefreshing || !selectedAccountId}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60"
            >
              <IconRefresh size={16} stroke={1.5} className={convRefreshing ? "animate-spin" : ""} />
              {t("Refresh")}
            </button>
          </div>
        )}
      </div>

      {noAccounts ? (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <IconBrandInstagram size={22} stroke={1.5} />
          </span>
          <h2 className="mt-4 font-heading text-lg font-semibold text-foreground">{t("Connect Instagram to use the inbox")}</h2>
          <p className="mt-1 max-w-md text-sm text-muted">
            {t("Once an account is connected, its direct messages show up here and you can reply without leaving OpenReply.")}
          </p>
          <a
            href="/api/instagram/connect"
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <IconBrandInstagram size={16} stroke={1.75} />
            {t("Connect Instagram")}
          </a>
        </div>
      ) : (
        <div className="grid h-[calc(100dvh-13rem)] min-h-[460px] grid-cols-1 overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
          {/* Conversation list. On mobile it takes the full pane and is hidden
              once a thread is open (ManyChat-style); on sm+ it is always shown. */}
          <div className={`min-h-0 flex-col sm:flex sm:border-r sm:border-border ${active ? "hidden" : "flex"}`}>
            <ConversationList
              conversations={conversations}
              loading={convLoading}
              error={convError}
              activeId={activeId}
              onSelect={openConversation}
              now={now}
            />
          </div>

          {/* Thread. On mobile it is only shown once a conversation is open and
              fills the pane; on sm+ it always sits beside the list. */}
          <div className={`min-h-0 flex-col ${active ? "flex" : "hidden sm:flex"}`}>
            {!active ? (
              <div className="flex flex-1 flex-col items-center justify-center bg-[#fafbfc] p-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <IconMessages size={26} stroke={1.5} />
                </span>
                <p className="mt-4 font-heading text-base font-semibold text-foreground">{t("Your messages")}</p>
                <p className="mt-1 max-w-xs text-sm text-muted">{t("Select a conversation to read and reply.")}</p>
              </div>
            ) : (
              <ThreadView
                conversation={active}
                messages={messages}
                loading={threadLoading}
                refreshing={threadRefreshing}
                draft={draft}
                onDraftChange={setDraft}
                sending={sending}
                sendError={sendError}
                onSend={() => void handleSend()}
                onBack={() => setActiveId(null)}
                onRefresh={() => void refreshThread()}
                now={now}
                scrollRef={scrollRef}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

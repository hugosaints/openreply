/**
 * Pure helpers for the inbox UI: conversation filtering, day grouping of
 * thread messages, and Instagram's 24-hour messaging window.
 */

export const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;

interface ConversationLike {
  detailsUnavailable?: boolean;
  contact: { username: string | null; name?: string | null };
  lastMessage: { text: string; fromMe: boolean | null } | null;
  unreadCount?: number | null;
}

interface MessageLike {
  fromMe: boolean;
  createdTime: string | null;
}

/**
 * The contact is waiting on us: they sent the last message, or the provider
 * reports unread messages (Zernio's list doesn't say who sent the last one).
 */
export function isAwaitingReply(conversation: ConversationLike): boolean {
  return conversation.lastMessage?.fromMe === false || (conversation.unreadCount ?? 0) > 0;
}

export type ConversationFilter = "all" | "awaiting";

export function filterConversations<T extends ConversationLike>(
  conversations: T[],
  query: string,
  filter: ConversationFilter,
): T[] {
  const q = query.trim().replace(/^@/, "").toLowerCase();
  return conversations.filter((c) => {
    if (filter === "awaiting" && !isAwaitingReply(c)) return false;
    if (!q) return true;
    return (
      (c.contact.username ?? "").toLowerCase().includes(q) ||
      (c.contact.name ?? "").toLowerCase().includes(q) ||
      (c.lastMessage?.text ?? "").toLowerCase().includes(q)
    );
  });
}

/** Local calendar day key (YYYY-MM-DD) for grouping. */
function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export interface MessageGroup<T> {
  /** YYYY-MM-DD in local time, or "" for messages without a timestamp. */
  day: string;
  messages: { message: T; /** Same sender as the previous message in the group. */ continued: boolean }[];
}

/** Group chronologically ordered messages by local day. */
export function groupMessagesByDay<T extends MessageLike>(messages: T[]): MessageGroup<T>[] {
  const groups: MessageGroup<T>[] = [];
  for (const message of messages) {
    const date = message.createdTime ? new Date(message.createdTime) : null;
    const day = date && !Number.isNaN(date.getTime()) ? dayKey(date) : "";
    let group = groups[groups.length - 1];
    if (!group || group.day !== day) {
      group = { day, messages: [] };
      groups.push(group);
    }
    const prev = group.messages[group.messages.length - 1];
    group.messages.push({ message, continued: Boolean(prev && prev.message.fromMe === message.fromMe) });
  }
  return groups;
}

export type DayLabel = { kind: "today" } | { kind: "yesterday" } | { kind: "date"; date: Date };

export function describeDay(day: string, now: number): DayLabel | null {
  if (!day) return null;
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (day === dayKey(today)) return { kind: "today" };
  if (day === dayKey(yesterday)) return { kind: "yesterday" };
  return { kind: "date", date };
}

export interface MessagingWindow {
  /** No inbound message with a timestamp — the window can't be determined. */
  unknown: boolean;
  open: boolean;
  /** Epoch ms when the window closes (or closed). */
  closesAt: number | null;
}

/**
 * Instagram only allows replies within 24 hours of the contact's latest
 * message. Derived from the loaded thread (newest inbound message).
 */
export function messagingWindow(messages: MessageLike[], now: number): MessagingWindow {
  let latest = -Infinity;
  for (const m of messages) {
    if (m.fromMe || !m.createdTime) continue;
    const ts = new Date(m.createdTime).getTime();
    if (!Number.isNaN(ts) && ts > latest) latest = ts;
  }
  if (latest === -Infinity) return { unknown: true, open: false, closesAt: null };
  const closesAt = latest + MESSAGING_WINDOW_MS;
  return { unknown: false, open: now < closesAt, closesAt };
}

/** Up to two initials from an Instagram handle ("john.doe" → "JD"). */
export function handleInitials(username: string | null): string {
  if (!username) return "?";
  const parts = username.replace(/^@/, "").split(/[._\-\s]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

/** Stable palette index for a seed string. */
export function toneIndex(seed: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash) % size;
}

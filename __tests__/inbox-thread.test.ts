import { describe, expect, it } from "vitest";
import {
  MESSAGING_WINDOW_MS,
  describeDay,
  filterConversations,
  groupMessagesByDay,
  handleInitials,
  isAwaitingReply,
  messagingWindow,
  toneIndex,
} from "@/lib/inbox/thread";

const conv = (username: string | null, text: string | null, fromMe = false) => ({
  contact: { username },
  lastMessage: text === null ? null : { text, fromMe },
});

describe("isAwaitingReply", () => {
  it("is true only when the contact sent the last message", () => {
    expect(isAwaitingReply(conv("a", "hi"))).toBe(true);
    expect(isAwaitingReply(conv("a", "hi", true))).toBe(false);
    expect(isAwaitingReply(conv("a", null))).toBe(false);
  });
});

describe("filterConversations", () => {
  const list = [conv("john.doe", "Price?"), conv("maria", "thanks!", true), conv(null, "Hello there")];

  it("matches username (with or without @) and message text, case-insensitively", () => {
    expect(filterConversations(list, "@JOHN", "all")).toHaveLength(1);
    expect(filterConversations(list, "hello", "all")[0].contact.username).toBeNull();
    expect(filterConversations(list, "  ", "all")).toHaveLength(3);
  });

  it("keeps only conversations awaiting a reply", () => {
    const result = filterConversations(list, "", "awaiting");
    expect(result.map((c) => c.contact.username)).toEqual(["john.doe", null]);
  });
});

describe("groupMessagesByDay", () => {
  it("groups by local day and flags consecutive messages from the same sender", () => {
    const groups = groupMessagesByDay([
      { fromMe: false, createdTime: new Date(2026, 9, 1, 9).toISOString() },
      { fromMe: false, createdTime: new Date(2026, 9, 1, 9, 1).toISOString() },
      { fromMe: true, createdTime: new Date(2026, 9, 1, 10).toISOString() },
      { fromMe: true, createdTime: new Date(2026, 9, 2, 8).toISOString() },
      { fromMe: true, createdTime: null },
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-10-01", "2026-10-02", ""]);
    expect(groups[0].messages.map((m) => m.continued)).toEqual([false, true, false]);
    // A new day starts a fresh run even for the same sender.
    expect(groups[1].messages[0].continued).toBe(false);
  });
});

describe("describeDay", () => {
  const now = new Date(2026, 9, 3, 12).getTime();
  it("labels today, yesterday and older dates", () => {
    expect(describeDay("2026-10-03", now)).toEqual({ kind: "today" });
    expect(describeDay("2026-10-02", now)).toEqual({ kind: "yesterday" });
    expect(describeDay("2026-09-20", now)).toEqual({ kind: "date", date: new Date(2026, 8, 20) });
    expect(describeDay("", now)).toBeNull();
  });
});

describe("messagingWindow", () => {
  const now = Date.UTC(2026, 9, 3, 12);
  const at = (hoursAgo: number) => new Date(now - hoursAgo * 3_600_000).toISOString();

  it("is open within 24h of the contact's latest message, ignoring our own", () => {
    const w = messagingWindow(
      [
        { fromMe: false, createdTime: at(30) },
        { fromMe: false, createdTime: at(5) },
        { fromMe: true, createdTime: at(1) },
      ],
      now,
    );
    expect(w).toEqual({ unknown: false, open: true, closesAt: now - 5 * 3_600_000 + MESSAGING_WINDOW_MS });
  });

  it("is closed after 24h", () => {
    expect(messagingWindow([{ fromMe: false, createdTime: at(25) }], now).open).toBe(false);
  });

  it("is unknown without inbound messages", () => {
    expect(messagingWindow([{ fromMe: true, createdTime: at(1) }], now)).toEqual({
      unknown: true,
      open: false,
      closesAt: null,
    });
  });
});

describe("handleInitials / toneIndex", () => {
  it("derives initials from the handle", () => {
    expect(handleInitials("john.doe")).toBe("JD");
    expect(handleInitials("@maria")).toBe("MA");
    expect(handleInitials(null)).toBe("?");
    expect(handleInitials("__")).toBe("?");
  });

  it("is stable and within range", () => {
    expect(toneIndex("abc", 6)).toBe(toneIndex("abc", 6));
    for (const seed of ["", "x", "1789234", "conversation-id"]) {
      const i = toneIndex(seed, 6);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(6);
    }
  });
});

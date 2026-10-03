import { describe, expect, it } from "vitest";
import {
  calculateChangePct,
  localDayKey,
  localMonthKey,
  normalizeReferrer,
  rankRows,
} from "../lib/tracking/analytics";
import { formatRelativeTime } from "../lib/utils/relative-time";

describe("calculateChangePct", () => {
  it("returns the percentage change with one decimal", () => {
    expect(calculateChangePct(120, 100)).toBe(20);
    expect(calculateChangePct(80, 100)).toBe(-20);
    expect(calculateChangePct(1, 3)).toBe(-66.7);
  });

  it("returns 0 when both periods are empty", () => {
    expect(calculateChangePct(0, 0)).toBe(0);
  });

  it("returns null when there is no baseline but there is new activity", () => {
    expect(calculateChangePct(5, 0)).toBeNull();
  });
});

describe("normalizeReferrer", () => {
  it("treats empty referrers as direct", () => {
    expect(normalizeReferrer(null)).toBeNull();
    expect(normalizeReferrer("")).toBeNull();
    expect(normalizeReferrer("   ")).toBeNull();
  });

  it("reduces URLs to a bare host", () => {
    expect(normalizeReferrer("https://www.google.com/search?q=x")).toBe("google.com");
    expect(normalizeReferrer("news.ycombinator.com/item?id=1")).toBe("news.ycombinator.com");
  });

  it("collapses Instagram and Facebook link shims", () => {
    expect(normalizeReferrer("https://l.instagram.com/?u=https%3A%2F%2Fx.com")).toBe("instagram.com");
    expect(normalizeReferrer("https://lm.facebook.com/l.php?u=x")).toBe("facebook.com");
    expect(normalizeReferrer("https://www.instagram.com/")).toBe("instagram.com");
  });

  it("returns null for unparseable values", () => {
    expect(normalizeReferrer("http://")).toBeNull();
  });
});

describe("rankRows", () => {
  it("merges duplicate labels, drops zeros, sorts and limits", () => {
    const rows = rankRows(
      [
        { label: "b", count: 2 },
        { label: "a", count: 2 },
        { label: "c", count: 5 },
        { label: "b", count: 1 },
        { label: "z", count: 0 },
      ],
      3,
    );
    expect(rows).toEqual([
      { label: "c", count: 5 },
      { label: "b", count: 3 },
      { label: "a", count: 2 },
    ]);
  });
});

describe("local bucket keys", () => {
  it("formats day and month keys in local time", () => {
    const d = new Date(2026, 0, 5, 23, 30);
    expect(localDayKey(d)).toBe("2026-01-05");
    expect(localMonthKey(d)).toBe("2026-01");
  });
});

describe("formatRelativeTime", () => {
  it("formats past times relative to now", () => {
    const now = Date.parse("2026-10-03T12:00:00Z");
    expect(formatRelativeTime("2026-10-03T11:55:00Z", "en", now)).toBe("5 min. ago");
    expect(formatRelativeTime("2026-10-01T12:00:00Z", "en", now)).toBe("2 days ago");
  });
});

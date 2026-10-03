import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma, mockAuth } = vi.hoisted(() => ({
  mockPrisma: {
    automation: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    dmLog: {
      groupBy: vi.fn(),
    },
    linkClick: {
      groupBy: vi.fn(),
    },
  },
  mockAuth: {
    getCurrentWorkspaceId: vi.fn(),
  },
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentWorkspaceId: mockAuth.getCurrentWorkspaceId,
}));

import { GET } from "../app/api/automations/route";

const sampleAutomations = [
  {
    id: "auto_1",
    workspaceId: "workspace_1",
    instagramAccountId: "acc_1",
    name: "Alpha Campaign",
    dmMessage: "Check our new product {link}",
    keywords: ["alpha", "buy"],
    isActive: true,
    reportShareSlug: "slug_1",
    createdAt: new Date("2026-06-01T10:00:00Z"),
    instagramAccount: { username: "brand_one", instagramId: "ig_1" },
    _count: { dmLogs: 10 },
    trackedLinks: [],
  },
  {
    id: "auto_2",
    workspaceId: "workspace_1",
    instagramAccountId: "acc_1",
    name: "Beta Campaign",
    dmMessage: "Here is your guide",
    keywords: ["guide", "free"],
    isActive: false,
    reportShareSlug: "slug_2",
    createdAt: new Date("2026-06-02T10:00:00Z"),
    instagramAccount: { username: "brand_one", instagramId: "ig_1" },
    _count: { dmLogs: 5 },
    trackedLinks: [],
  },
  {
    id: "auto_3",
    workspaceId: "workspace_1",
    instagramAccountId: "acc_2",
    name: "Gamma Campaign",
    dmMessage: "Special discount code",
    keywords: ["discount"],
    isActive: true,
    reportShareSlug: "slug_3",
    createdAt: new Date("2026-06-03T10:00:00Z"),
    instagramAccount: { username: "brand_two", instagramId: "ig_2" },
    _count: { dmLogs: 0 },
    trackedLinks: [],
  },
];

describe("GET /api/automations - Backend Pagination & Filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getCurrentWorkspaceId.mockResolvedValue("workspace_1");
    mockPrisma.automation.findMany.mockResolvedValue(sampleAutomations);
    mockPrisma.dmLog.groupBy.mockImplementation(({ by }: { by: string[] }) => {
      if (by.includes("status")) {
        return Promise.resolve([
          { automationId: "auto_1", status: "SENT", _count: { _all: 8 } },
          { automationId: "auto_1", status: "FAILED", _count: { _all: 1 } },
          { automationId: "auto_2", status: "SENT", _count: { _all: 3 } },
        ]);
      }
      return Promise.resolve([]);
    });
    mockPrisma.linkClick.groupBy.mockResolvedValue([
      { automationId: "auto_1", _count: { _all: 4 } },
      { automationId: "auto_2", _count: { _all: 1 } },
    ]);
  });

  it("returns paginated data with limit and page", async () => {
    const req = new NextRequest("http://localhost/api/automations?page=1&limit=2");
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    expect(json.counts).toEqual({
      all: 3,
      active: 2,
      paused: 1,
    });
    expect(json.summary.total).toBe(3);
    expect(json.summary.active).toBe(2);
    expect(json.summary.paused).toBe(1);
    expect(json.summary.sent).toBe(11); // 8 + 3
    expect(json.summary.clicks).toBe(5); // 4 + 1
  });

  it("returns page 2 correctly", async () => {
    const req = new NextRequest("http://localhost/api/automations?page=2&limit=2");
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.page).toBe(2);
  });

  it("filters by status (active only)", async () => {
    const req = new NextRequest("http://localhost/api/automations?page=1&limit=10&status=active");
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data.every((c: { isActive: boolean }) => c.isActive)).toBe(true);
    expect(json.pagination.total).toBe(2);
  });

  it("filters by status (paused only)", async () => {
    const req = new NextRequest("http://localhost/api/automations?page=1&limit=10&status=paused");
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe("auto_2");
    expect(json.pagination.total).toBe(1);
  });

  it("filters by search query", async () => {
    const req = new NextRequest("http://localhost/api/automations?page=1&limit=10&search=guide");
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe("auto_2");
  });

  it("sorts by name", async () => {
    const req = new NextRequest("http://localhost/api/automations?page=1&limit=10&sort=name");
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.map((c: { name: string }) => c.name)).toEqual([
      "Alpha Campaign",
      "Beta Campaign",
      "Gamma Campaign",
    ]);
  });

  it("sorts by sent count descending", async () => {
    const req = new NextRequest("http://localhost/api/automations?page=1&limit=10&sort=sent");
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    // auto_1 has 8 sent, auto_2 has 3 sent, auto_3 has 0 sent
    expect(json.data.map((c: { id: string }) => c.id)).toEqual(["auto_1", "auto_2", "auto_3"]);
  });

  it("returns all campaigns when page parameter is omitted (backward compatibility)", async () => {
    const req = new NextRequest("http://localhost/api/automations");
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(3);
  });
});

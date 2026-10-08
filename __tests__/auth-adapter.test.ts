import { describe, it, expect, vi } from "vitest";
import { createCustomPrismaAdapter } from "@/lib/auth-adapter";

describe("createCustomPrismaAdapter", () => {
  it("returns null when deleteSession hits Prisma P2025 (record not found)", async () => {
    const mockPrisma = {
      session: {
        delete: vi.fn().mockRejectedValue({
          code: "P2025",
          message: "An operation failed because it depends on one or more records that were required but not found.",
        }),
      },
      user: {},
      account: {},
      verificationToken: {},
    } as any;

    const adapter = createCustomPrismaAdapter(mockPrisma);
    expect(adapter.deleteSession).toBeDefined();

    const result = await adapter.deleteSession!("stale-token-123");
    expect(result).toBeNull();
    expect(mockPrisma.session.delete).toHaveBeenCalledWith({
      where: { sessionToken: "stale-token-123" },
    });
  });

  it("returns the deleted session when it exists", async () => {
    const existingSession = {
      id: "sess_1",
      sessionToken: "active-token-456",
      userId: "user_1",
      expires: new Date(),
    };

    const mockPrisma = {
      session: {
        delete: vi.fn().mockResolvedValue(existingSession),
      },
      user: {},
      account: {},
      verificationToken: {},
    } as any;

    const adapter = createCustomPrismaAdapter(mockPrisma);
    const result = await adapter.deleteSession!("active-token-456");
    expect(result).toEqual(existingSession);
  });

  it("rethrows unexpected database errors", async () => {
    const dbError = new Error("Database connection lost");
    const mockPrisma = {
      session: {
        delete: vi.fn().mockRejectedValue(dbError),
      },
      user: {},
      account: {},
      verificationToken: {},
    } as any;

    const adapter = createCustomPrismaAdapter(mockPrisma);
    await expect(adapter.deleteSession!("any-token")).rejects.toThrow("Database connection lost");
  });
});

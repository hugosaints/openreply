import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "@auth/core/adapters";

export type AdapterPrismaClient = Parameters<typeof PrismaAdapter>[0];

export function isRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2025"
  );
}

/**
 * PrismaAdapter throws a P2025 error ("Record to delete does not exist") when
 * deleteSession is called for a session that has already been removed or expired.
 * Auth.js expects adapters to handle this gracefully (returning null / no-op)
 * rather than throwing an unhandled AdapterError during sign-in or sign-out.
 */
export function createCustomPrismaAdapter(client: AdapterPrismaClient): Adapter {
  const baseAdapter = PrismaAdapter(client);

  return {
    ...baseAdapter,
    async deleteSession(sessionToken: string) {
      try {
        return (await baseAdapter.deleteSession?.(sessionToken)) ?? null;
      } catch (error: unknown) {
        if (isRecordNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },
  };
}

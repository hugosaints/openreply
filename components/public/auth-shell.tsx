import Link from "next/link";
import { Logo, heroGlow } from "@/components/public/ui";

/**
 * Centered card layout for the signed-out flows (login, email check, invitations).
 * Sits under the localized layout's language switcher, hence the reduced min-height.
 */
export default function AuthShell({
  children,
  footer,
  maxWidth = "max-w-md",
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <main className="relative isolate flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center px-5 py-10">
      <div aria-hidden="true" className={heroGlow} />
      <div className={`w-full ${maxWidth}`}>
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="OpenReply">
            <Logo />
          </Link>
        </div>
        {children}
        {footer && <div className="mt-6 text-center text-xs text-subtle">{footer}</div>}
      </div>
    </main>
  );
}

/** White card with a soft lift, used for the main content of AuthShell. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel rounded-2xl p-7 shadow-[0_24px_60px_-28px_rgb(29_38_48/0.25)] sm:p-8">{children}</div>
  );
}

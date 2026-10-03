import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import InvitationAcceptCard from "@/components/invitation-accept-card";
import AuthShell, { AuthCard } from "@/components/public/auth-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("Accept Workspace Invitation - OpenReply"),
    robots: { index: false, follow: false },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { t, label } = await getI18n();
  const { token } = await params;
  const [session, invitation] = await Promise.all([
    auth(),
    prisma.workspaceInvitation.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true } },
      },
    }),
  ]);

  if (!invitation || invitation.status !== "PENDING") {
    notFound();
  }

  const expired = invitation.expiresAt <= new Date();

  return (
    <AuthShell maxWidth="max-w-lg">
      <AuthCard>
        <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t("Workspace invitation")}
        </p>
        <h1 className="mt-4 font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {t("Join {workspace}", { workspace: invitation.workspace.name })}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("You were invited as {role} for {email}.", { role: label(invitation.role), email: invitation.email })}
        </p>
        <div className="mt-7">
          {expired ? (
            <p className="rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-sm text-error">
              {t("This invitation has expired. Ask the workspace owner to resend it.")}
            </p>
          ) : (
            <InvitationAcceptCard
              token={token}
              isSignedIn={Boolean(session?.user?.id)}
              invitedEmail={invitation.email}
            />
          )}
        </div>
      </AuthCard>
    </AuthShell>
  );
}


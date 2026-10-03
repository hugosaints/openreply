import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";
import AuthShell, { AuthCard } from "@/components/public/auth-shell";
import { IconMailCheck } from "@tabler/icons-react";

export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: t("Check your email - OpenReply"),
    description: t("A sign-in link was sent to your email."),
  };
}

export default async function VerifyRequestPage() {
  const { t } = await getI18n();
  return (
    <AuthShell>
      <AuthCard>
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <IconMailCheck size={24} stroke={1.75} />
          </span>
          <h1 className="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground">
            {t("Check your email")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("We sent you a secure sign-in link. Open it on this device to continue.")}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex text-sm font-medium text-accent transition-colors hover:text-accent-hover hover:underline"
          >
            {t("Back to sign in")}
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  );
}

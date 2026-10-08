import { EMAIL_PROVIDER_ID, auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getCampaignTemplate } from "@/lib/templates/campaign-templates";
import { DemoNotice } from "@/components/demo-notice";
import AuthShell, { AuthCard } from "@/components/public/auth-shell";
import { primaryButton } from "@/components/public/ui";
import { isPublicDemoHost } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo/site";
import { IconMailCheck, IconTemplate } from "@tabler/icons-react";

const GITHUB_URL = "https://github.com/diwenne/openreply";
const SETUP_DOCS_URL = `${GITHUB_URL}/blob/main/docs/setup.md`;

export async function generateMetadata() {
  const { t, locale } = await getI18n();
  return buildPageMetadata({
    title: t("Login - OpenReply"),
    description: t("Sign in to manage Instagram comment-to-DM campaigns."),
    path: "/login",
    locale,
    noindex: true,
  });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkEmail?: string;
    callbackUrl?: string;
    template?: string;
    error?: string;
  }>;
}) {
  const { t, locale } = await getI18n();
  if (await isPublicDemoHost()) {
    return (
      <AuthShell>
        <AuthCard>
          <h1 className="text-center font-heading text-xl font-semibold tracking-tight text-foreground">
            {t("Sign-in is off on this demo")}
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-muted">
            {t("This is the public demo — it doesn’t create real accounts or send DMs. To use OpenReply for real, clone it and run your own instance with your own Meta app and domain.")}
          </p>
          <a
            href={SETUP_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className={`${primaryButton} mt-6 w-full`}
          >
            {t("Clone it yourself")} <span aria-hidden="true">↗</span>
          </a>
        </AuthCard>
      </AuthShell>
    );
  }

  const params = await searchParams;
  const checkEmail = params.checkEmail === "1";
  const authError = params.error;
  const selectedTemplate = getCampaignTemplate(params.template);
  const templateCallbackUrl = selectedTemplate
    ? `/campaigns/new?template=${selectedTemplate.slug}`
    : null;
  const callbackUrl = params.callbackUrl ?? templateCallbackUrl ?? "/dashboard";

  let errorMessage: string | null = null;
  if (authError === "Verification") {
    errorMessage =
      locale === "pt-BR"
        ? "O link de login expirou ou já foi usado. Solicite um novo link."
        : locale === "zh-TW"
          ? "登入連結已過期或已使用過，請重新索取。"
          : "The sign-in link is no longer valid or has expired. Please request a new one.";
  } else if (authError === "AccessDenied") {
    errorMessage =
      locale === "pt-BR"
        ? "Acesso negado. Verifique suas permissões ou entre em contato com o suporte."
        : locale === "zh-TW"
          ? "存取遭拒，請確認你的權限或聯絡支援團隊。"
          : "Access denied. Please check your credentials or contact support.";
  } else if (authError) {
    errorMessage =
      locale === "pt-BR"
        ? "Não foi possível entrar. Tente novamente."
        : locale === "zh-TW"
          ? "無法登入，請重試。"
          : "Unable to sign in. Please try again.";
  }

  // Already signed in (a real session, not just a leftover cookie): skip the form.
  const session = await auth();
  if (session?.user?.id) {
    redirect(callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard");
  }

  async function sendMagicLink(formData: FormData) {
    "use server";
    await signIn(EMAIL_PROVIDER_ID, {
      email: String(formData.get("email") ?? ""),
      redirectTo: callbackUrl,
    });
  }

  return (
    <AuthShell>
      <DemoNotice variant="panel" />

      <AuthCard>
        {checkEmail ? (
          <div className="py-2 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <IconMailCheck size={24} stroke={1.75} />
            </span>
            <h1 className="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground">
              {t("Check your email")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("We sent you a secure sign-in link. Open it on this device to continue.")}
            </p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">OpenReply</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {selectedTemplate
                  ? t("Sign in to use the {name} template.", { name: selectedTemplate.title })
                  : t("Sign in by email, then connect your Instagram professional account.")}
              </p>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-error/20 bg-error-soft p-3 text-center text-sm text-error">
                {errorMessage}
              </div>
            )}

            {selectedTemplate && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-accent-muted/60 bg-accent-soft p-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-accent ring-1 ring-accent-muted/60">
                  <IconTemplate size={16} stroke={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-accent">{t("Template selected")}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{selectedTemplate.title}</p>
                </div>
              </div>
            )}

            <form action={sendMagicLink} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  {t("Work email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground transition-colors placeholder:text-subtle hover:border-border-hover focus:border-accent focus:outline-none"
                />
              </div>

              <button type="submit" className={`${primaryButton} w-full`}>
                {t("Email me a magic link")}
              </button>
            </form>
          </>
        )}
      </AuthCard>
    </AuthShell>
  );
}

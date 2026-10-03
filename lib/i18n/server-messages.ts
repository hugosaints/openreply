import type { I18n, StaticMessageKey } from "./index";

/**
 * Translate copy that originates on the server (API errors, limitation notes,
 * operational event messages, default names) at display time.
 *
 * The server keeps writing English — it is also what lands in logs and the
 * database — and the UI maps the known phrases here. Anything unrecognised
 * (e.g. raw errors from the Meta API) is shown verbatim.
 */

const STATIC_MESSAGES: readonly StaticMessageKey[] = [
  // /api/instagram/overview
  "Instagram account not connected. Please connect your account first.",
  "Failed to load Instagram overview",
  "Failed to load overview",
  "Post reporting covers the 25 most recent Instagram posts.",
  "Insights and follower history require the Zernio Analytics add-on and reflect its last sync. Missing metrics remain unavailable.",
  // /api/instagram/conversations
  "Unauthorized",
  "Instagram account not connected.",
  "Failed to load conversations",
  "Failed to send message",
  "Invalid request body",
  "A recipient and message are required.",
  // /api/automations validation
  "Choose which post(s) trigger the campaign",
  "Add at least one keyword, or match any word",
  "Opening DM needs a message and a button label",
  // OperationalEvent.message
  "Follow gate rejected a button tap",
  "Follower snapshot failed",
  "Instagram connection failed",
  "Webhook signature verification failed",
];

const STATIC_SET = new Set<string>(STATIC_MESSAGES);

export function translateServerMessage(i18n: Pick<I18n, "t">, message: string): string {
  const { t } = i18n;
  if (STATIC_SET.has(message)) return t(message as StaticMessageKey);

  let m: RegExpMatchArray | null;
  if ((m = message.match(/^Token refresh failed for @(\S+): ([\s\S]*)$/))) {
    return t("Token refresh failed for @{username}: {error}", { username: m[1], error: m[2] });
  }
  if ((m = message.match(/^DM worker job (\S+) failed: ([\s\S]*)$/))) {
    return t("DM worker job {id} failed: {error}", { id: m[1], error: m[2] });
  }
  if ((m = message.match(/^DM worker process error: ([\s\S]*)$/))) {
    return t("DM worker process error: {error}", { error: m[1] });
  }
  if ((m = message.match(/^Comment sweep "(.*)" \[(.*)\]: (\d+) enqueued, (\d+) matched, (\d+) already replied$/))) {
    return t('Comment sweep "{campaign}" [{keywords}]: {enqueued} enqueued, {matched} matched, {replied} already replied', {
      campaign: m[1],
      keywords: m[2],
      enqueued: m[3],
      matched: m[4],
      replied: m[5],
    });
  }
  return message;
}

/**
 * Workspaces are created as "<email-user>'s workspace" / "My workspace"
 * (lib/workspace.ts). Localize those defaults; custom names pass through.
 */
export function displayWorkspaceName(i18n: Pick<I18n, "t">, name: string): string {
  if (name === "My workspace") return i18n.t("My workspace");
  const m = name.match(/^(.+)'s workspace$/);
  return m ? i18n.t("{name}'s workspace", { name: m[1] }) : name;
}

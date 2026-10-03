/**
 * Normalize Zernio inbox message payloads (GET /inbox/conversations/{id}/messages)
 * into text + MessageExtras. Zernio keeps Meta's structures mostly intact:
 *
 * - Template messages arrive with an empty `message` and the content in
 *   `attachments[].payload` (e.g. `{ generic: { elements: [{ title, buttons }] } }`).
 * - Buttons sent with a text message are in `metadata.metaInteractive`.
 * - A contact tapping a postback button is an incoming message whose
 *   `metadata.postbackTitle` is the button title.
 */

import type {
  DeliveryStatus,
  InboxAttachment,
  InboxAttachmentKind,
  InboxButton,
  InboxCard,
  MessageExtras,
} from "@/lib/inbox/types";

type Json = Record<string, unknown>;

export interface ZernioAttachment {
  type?: string;
  originalType?: string;
  url?: string | null;
  previewUrl?: string | null;
  filename?: string | null;
  payload?: unknown;
}

export interface ZernioInboxMessage {
  id: string;
  message?: string | null;
  senderId?: string;
  senderName?: string | null;
  direction?: string;
  createdAt?: string;
  attachments?: ZernioAttachment[];
  storyReply?: { storyId?: string; storyUrl?: string } | null;
  isStoryMention?: boolean;
  noRenderableContent?: boolean;
  deliveryStatus?: string | null;
  metadata?: Json | null;
}

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

function toButton(raw: unknown): InboxButton | null {
  if (!isObject(raw)) return null;
  const title = str(raw.title);
  if (!title) return null;
  const url = str(raw.url);
  const type = String(raw.type ?? "");
  if (url && (type === "url" || type === "web_url" || type === "")) return { type: "url", title, url };
  return { type: "postback", title };
}

function toButtons(raw: unknown): InboxButton[] {
  return Array.isArray(raw) ? raw.map(toButton).filter((b): b is InboxButton => b !== null) : [];
}

function toCard(raw: unknown): InboxCard | null {
  if (!isObject(raw)) return null;
  const card: InboxCard = {
    title: str(raw.title) ?? str(raw.text),
    subtitle: str(raw.subtitle),
    imageUrl: str(raw.image_url) ?? str(raw.imageUrl),
    buttons: toButtons(raw.buttons),
  };
  return card.title || card.subtitle || card.imageUrl || card.buttons.length ? card : null;
}

/**
 * Template payloads come in a few shapes depending on how they were sent:
 * `{ generic: { elements } }`, `{ button: { text, buttons } }`,
 * Meta's `{ template_type, elements | text, buttons }`, or a flat card.
 */
export function templateCards(payload: unknown): InboxCard[] {
  if (!isObject(payload)) return [];
  const cards: InboxCard[] = [];
  const pushElements = (elements: unknown) => {
    if (Array.isArray(elements)) for (const el of elements) {
      const card = toCard(el);
      if (card) cards.push(card);
    }
  };

  for (const key of Object.keys(payload)) {
    const value = payload[key];
    if (!isObject(value)) continue;
    if (Array.isArray(value.elements)) pushElements(value.elements);
    else if (value.text || value.buttons || value.title) {
      const card = toCard(value);
      if (card) cards.push(card);
    }
  }
  if (cards.length) return cards;

  if (Array.isArray(payload.elements)) pushElements(payload.elements);
  else {
    const card = toCard(payload);
    if (card) cards.push(card);
  }
  return cards;
}

const MEDIA_KINDS = new Set<InboxAttachmentKind>(["image", "video", "audio", "file", "sticker", "share"]);

function toAttachment(raw: ZernioAttachment): InboxAttachment {
  const type = String(raw.type ?? "");
  let kind: InboxAttachmentKind = MEDIA_KINDS.has(type as InboxAttachmentKind)
    ? (type as InboxAttachmentKind)
    : "unsupported";
  if (raw.originalType === "story_mention") kind = "story_mention";
  return {
    kind,
    url: str(raw.url),
    previewUrl: str(raw.previewUrl),
    filename: str(raw.filename),
  };
}

const STATUSES = new Set<DeliveryStatus>(["sent", "delivered", "read", "failed"]);

export function normalizeZernioMessage(m: ZernioInboxMessage): { text: string; extras: MessageExtras } {
  const attachments: InboxAttachment[] = [];
  const cards: InboxCard[] = [];
  for (const a of m.attachments ?? []) {
    if (a.type === "template") cards.push(...templateCards(a.payload));
    else attachments.push(toAttachment(a));
  }

  const metadata = isObject(m.metadata) ? m.metadata : {};
  const interactive = isObject(metadata.metaInteractive) ? metadata.metaInteractive : {};
  const buttons = [...toButtons(interactive.buttons), ...toButtons(interactive.quickReplies)];
  if (isObject(interactive.template)) cards.push(...templateCards(interactive.template));

  const status = m.deliveryStatus && STATUSES.has(m.deliveryStatus as DeliveryStatus)
    ? (m.deliveryStatus as DeliveryStatus)
    : null;

  const extras: MessageExtras = {};
  if (attachments.length) extras.attachments = attachments;
  if (cards.length) extras.cards = cards;
  if (buttons.length) extras.buttons = buttons;
  const postback = str(metadata.postbackTitle);
  if (postback) extras.postback = postback;
  if (m.storyReply) extras.storyReply = { url: str(m.storyReply.storyUrl) };
  if (m.isStoryMention && !attachments.some((a) => a.kind === "story_mention")) {
    attachments.push({ kind: "story_mention", url: null, previewUrl: null, filename: null });
    extras.attachments = attachments;
  }
  if (m.noRenderableContent) extras.unsupported = true;
  if (status) extras.status = status;

  return { text: m.message ?? "", extras };
}

/** One-line preview for lists/notifications. */
export function previewText(text: string, extras: MessageExtras | undefined): string {
  if (text.trim()) return text;
  const card = extras?.cards?.[0];
  return card?.title ?? card?.subtitle ?? extras?.postback ?? "";
}

/**
 * Provider-agnostic shapes for inbox message content beyond plain text.
 * Client-safe (no server imports): shared by the API routes and the UI.
 */

export interface InboxButton {
  type: "url" | "postback";
  title: string;
  url?: string;
}

/** A structured template message (generic/button template). */
export interface InboxCard {
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  buttons: InboxButton[];
}

export type InboxAttachmentKind =
  | "image"
  | "video"
  | "audio"
  | "file"
  | "sticker"
  | "share"
  | "story_mention"
  | "unsupported";

export interface InboxAttachment {
  kind: InboxAttachmentKind;
  /** Direct media URL. Meta CDN URLs expire — render, don't store. */
  url: string | null;
  previewUrl: string | null;
  filename: string | null;
}

export type DeliveryStatus = "sent" | "delivered" | "read" | "failed";

/** Rich content carried alongside a message's text. All optional. */
export interface MessageExtras {
  attachments?: InboxAttachment[];
  cards?: InboxCard[];
  /** Buttons sent together with the text (link/postback buttons). */
  buttons?: InboxButton[];
  /** Incoming tap on a postback button: the button title. */
  postback?: string | null;
  /** Reply to one of the account's stories. */
  storyReply?: { url: string | null } | null;
  /** Meta withheld the content (unsupported message type). */
  unsupported?: boolean;
  status?: DeliveryStatus | null;
}

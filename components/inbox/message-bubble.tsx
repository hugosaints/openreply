"use client";

import type { ThreadMessage } from "@/app/api/instagram/conversations/[id]/route";
import { useI18n } from "@/lib/i18n/provider";
import type { InboxAttachment, InboxButton, InboxCard } from "@/lib/inbox/types";
import {
  IconAlertCircle,
  IconCheck,
  IconChecks,
  IconExternalLink,
  IconFile,
  IconHandFinger,
  IconPhotoOff,
  IconShare3,
} from "@tabler/icons-react";
import { useState } from "react";

interface MessageBubbleProps {
  message: ThreadMessage;
  /** Same sender as the previous message: tighten spacing. */
  continued: boolean;
}

/**
 * One chat message: text, template cards, link/postback buttons, media
 * attachments, story replies and delivery status. Every part is optional —
 * Instagram template messages, for example, have no text of their own.
 */
export default function MessageBubble({ message: m, continued }: MessageBubbleProps) {
  const { t, locale } = useI18n();
  const mine = m.fromMe;
  const pending = m.id.startsWith("optimistic-");
  const time = m.createdTime
    ? new Date(m.createdTime).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
    : "";

  const attachments = m.attachments ?? [];
  const cards = m.cards ?? [];
  const buttons = m.buttons ?? [];
  const hasText = m.text.trim().length > 0;
  const empty = !hasText && !cards.length && !attachments.length && !m.unsupported && !m.storyReply;

  const bubble = mine
    ? "rounded-2xl rounded-br-md bg-accent text-white"
    : "rounded-2xl rounded-bl-md border border-border bg-surface text-foreground";

  return (
    <li className={`flex flex-col ${mine ? "items-end" : "items-start"} ${continued ? "mt-1" : "mt-3 first:mt-0"}`}>
      <div className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[70%] ${mine ? "items-end" : "items-start"}`}>
        {m.postback && (
          <Caption icon={<IconHandFinger size={12} stroke={1.75} />}>{t("Tapped a button")}</Caption>
        )}

        {m.storyReply && (
          <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
            <Caption icon={<IconShare3 size={12} stroke={1.75} />}>{t("Replied to your story")}</Caption>
            {m.storyReply.url && <Media kind="image" url={m.storyReply.url} className="w-28 rounded-xl" />}
          </div>
        )}

        {attachments.map((a, i) => (
          <AttachmentView key={i} attachment={a} mine={mine} />
        ))}

        {(hasText || buttons.length > 0) && (
          <div className={`overflow-hidden shadow-[0_1px_2px_rgb(29_38_48/0.04)] ${bubble} ${pending ? "opacity-70" : ""}`}>
            {hasText && (
              <p className="whitespace-pre-wrap break-words px-3.5 py-2 text-sm leading-relaxed">{m.text}</p>
            )}
            <ButtonRows buttons={buttons} mine={mine} />
          </div>
        )}

        {cards.map((card, i) => (
          <CardView key={i} card={card} mine={mine} bubble={bubble} />
        ))}

        {m.unsupported && (
          <div className={`px-3.5 py-2 text-sm italic opacity-80 ${bubble}`}>
            {t("Instagram doesn't share the content of this message.")}
          </div>
        )}

        {empty && <div className={`px-3.5 py-2 text-sm italic opacity-80 ${bubble}`}>{t("(no text)")}</div>}
      </div>

      <p className="mt-1 flex items-center gap-1 px-1 text-[10px] text-subtle">
        {pending ? (
          t("Sending…")
        ) : (
          <>
            <span>{time}</span>
            {mine && m.status === "read" && <IconChecks size={12} stroke={2} className="text-accent" aria-label={t("Read")} />}
            {mine && m.status === "delivered" && <IconChecks size={12} stroke={2} aria-label={t("Delivered")} />}
            {mine && m.status === "sent" && <IconCheck size={12} stroke={2} aria-label={t("Sent")} />}
            {mine && m.status === "failed" && (
              <span className="flex items-center gap-0.5 text-error">
                <IconAlertCircle size={12} stroke={2} />
                {t("Failed")}
              </span>
            )}
          </>
        )}
      </p>
    </li>
  );
}

function Caption({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 px-1 text-[11px] font-medium text-subtle">
      {icon}
      {children}
    </span>
  );
}

function ButtonRows({ buttons, mine }: { buttons: InboxButton[]; mine: boolean }) {
  if (!buttons.length) return null;
  const row = `flex w-full items-center justify-center gap-1.5 border-t px-3.5 py-2 text-sm font-medium ${
    mine ? "border-white/20 text-white" : "border-border text-accent"
  }`;
  return (
    <div>
      {buttons.map((b, i) =>
        b.type === "url" && b.url ? (
          <a
            key={i}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${row} transition-colors ${mine ? "hover:bg-white/10" : "hover:bg-surface-hover"}`}
          >
            {b.title}
            <IconExternalLink size={13} stroke={1.75} className="opacity-70" />
          </a>
        ) : (
          <span key={i} className={row}>
            {b.title}
          </span>
        ),
      )}
    </div>
  );
}

function CardView({ card, mine, bubble }: { card: InboxCard; mine: boolean; bubble: string }) {
  return (
    <div className={`w-full min-w-[220px] overflow-hidden shadow-[0_1px_2px_rgb(29_38_48/0.04)] ${bubble}`}>
      {card.imageUrl && <Media kind="image" url={card.imageUrl} className="max-h-48 w-full" />}
      {(card.title || card.subtitle) && (
        <div className="px-3.5 py-2">
          {card.title && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{card.title}</p>}
          {card.subtitle && (
            <p className={`mt-0.5 whitespace-pre-wrap break-words text-xs ${mine ? "text-white/80" : "text-muted"}`}>
              {card.subtitle}
            </p>
          )}
        </div>
      )}
      <ButtonRows buttons={card.buttons} mine={mine} />
    </div>
  );
}

function AttachmentView({ attachment: a, mine }: { attachment: InboxAttachment; mine: boolean }) {
  const { t } = useI18n();
  const src = a.url ?? a.previewUrl;

  if (a.kind === "image" || a.kind === "sticker") {
    return src ? (
      <Media kind="image" url={src} className={a.kind === "sticker" ? "w-24" : "max-h-72 max-w-[260px] rounded-2xl"} />
    ) : (
      <Chip icon={<IconPhotoOff size={14} stroke={1.75} />} mine={mine}>{t("Attachment unavailable")}</Chip>
    );
  }
  if (a.kind === "video" && a.url) {
    return <video src={a.url} poster={a.previewUrl ?? undefined} controls preload="metadata" className="max-h-80 max-w-[260px] rounded-2xl bg-black" />;
  }
  if (a.kind === "audio" && a.url) {
    return <audio src={a.url} controls preload="metadata" className="h-10 max-w-[260px]" />;
  }
  if (a.kind === "story_mention") {
    return (
      <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
        <Caption icon={<IconShare3 size={12} stroke={1.75} />}>{t("Mentioned you in their story")}</Caption>
        {src && <Media kind="image" url={src} className="w-28 rounded-xl" />}
      </div>
    );
  }
  if (a.kind === "share") {
    return (
      <Chip icon={<IconShare3 size={14} stroke={1.75} />} href={a.url} mine={mine} preview={a.previewUrl}>
        {t("Shared a post")}
      </Chip>
    );
  }
  return (
    <Chip icon={<IconFile size={14} stroke={1.75} />} href={a.url} mine={mine}>
      {a.filename ?? (a.kind === "unsupported" ? t("Attachment unavailable") : t("Attachment"))}
    </Chip>
  );
}

function Chip({
  icon,
  href,
  mine,
  preview,
  children,
}: {
  icon: React.ReactNode;
  href?: string | null;
  mine: boolean;
  preview?: string | null;
  children: React.ReactNode;
}) {
  const cls = `inline-flex max-w-[260px] items-center gap-2 overflow-hidden rounded-2xl border text-sm ${
    mine ? "border-accent/30 bg-accent-soft text-accent" : "border-border bg-surface text-foreground"
  }`;
  const body = (
    <>
      {preview && <Media kind="image" url={preview} className="h-12 w-12 shrink-0" />}
      <span className={`flex min-w-0 items-center gap-1.5 py-2 ${preview ? "pr-3.5" : "px-3.5"}`}>
        {icon}
        <span className="truncate">{children}</span>
        {href && <IconExternalLink size={13} stroke={1.75} className="shrink-0 opacity-60" />}
      </span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} transition-colors hover:border-border-hover`}>
      {body}
    </a>
  ) : (
    <span className={cls}>{body}</span>
  );
}

/** Remote image with a quiet fallback — Meta CDN links expire. */
function Media({ url, className }: { kind: "image"; url: string; className: string }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === url) {
    return (
      <span className={`flex items-center justify-center gap-1.5 bg-surface-hover p-3 text-xs text-subtle ${className}`}>
        <IconPhotoOff size={14} stroke={1.75} />
        <span className="sr-only">{t("Attachment unavailable")}</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote, expiring CDN URL
    <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(url)} className={`object-cover ${className}`} />
  );
}

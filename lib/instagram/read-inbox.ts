import * as meta from "@/lib/meta/client";
import { zernioRequest } from "@/lib/zernio/client";
import type { InstagramContext } from "./context";
import { normalizeZernioMessage, type ZernioInboxMessage } from "./zernio-inbox";

export async function getConversations({
  context,
  igUserId,
}: {
  context: InstagramContext;
  igUserId: string;
}): Promise<meta.InstagramConversation[]> {
  if (context.provider === "META")
    return meta.getConversations(context.accessToken, igUserId);
  const result = await zernioRequest<{
    data: {
      id: string;
      participantId?: string;
      participantUsername?: string | null;
      participantName?: string | null;
      participantPicture?: string | null;
      updatedTime: string;
      lastMessage?: string | null;
      unreadCount?: number | null;
      url?: string | null;
    }[];
  }>({
    apiKey: context.apiKey,
    path: `/inbox/conversations?accountId=${encodeURIComponent(context.accountId)}&limit=50`,
  });
  // The list has no sender for lastMessage: expose the preview text without a
  // `from`, so it is never attributed to the wrong person.
  return result.data.map((c) => ({
    id: c.id,
    updated_time: c.updatedTime,
    unread_count: c.unreadCount ?? null,
    link: c.url ?? null,
    participants: {
      data: c.participantId
        ? [
            {
              id: c.participantId,
              username: c.participantUsername ?? undefined,
              name: c.participantName ?? undefined,
              picture: c.participantPicture ?? null,
            },
            { id: igUserId },
          ]
        : [],
    },
    messages: c.lastMessage
      ? { data: [{ id: `${c.id}:last`, message: c.lastMessage, created_time: c.updatedTime }] }
      : undefined,
  }));
}

export async function getConversationMessages({
  context,
  conversationId,
}: {
  context: InstagramContext;
  conversationId: string;
}): Promise<meta.InstagramMessage[]> {
  if (context.provider === "META")
    return meta.getConversationMessages(context.accessToken, conversationId);
  const result = await zernioRequest<{ messages: ZernioInboxMessage[] }>({
    apiKey: context.apiKey,
    path: `/inbox/conversations/${encodeURIComponent(conversationId)}/messages?accountId=${encodeURIComponent(context.accountId)}&limit=20&sortOrder=desc`,
  });
  return result.messages.map((m) => {
    const { text, extras } = normalizeZernioMessage(m);
    return {
      id: m.id,
      message: text,
      created_time: m.createdAt,
      from:
        m.direction === "outgoing"
          ? { id: context.instagramId }
          : m.senderId
            ? { id: m.senderId, name: m.senderName ?? undefined }
            : undefined,
      extras,
    };
  });
}

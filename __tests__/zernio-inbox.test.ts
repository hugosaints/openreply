import { describe, expect, it } from "vitest";
import { normalizeZernioMessage, previewText, templateCards } from "@/lib/instagram/zernio-inbox";

// Shapes taken from real GET /v1/inbox/conversations/{id}/messages responses.
describe("normalizeZernioMessage", () => {
  it("extracts the text and button of a generic template (empty `message`)", () => {
    const { text, extras } = normalizeZernioMessage({
      id: "m1",
      message: "",
      direction: "outgoing",
      deliveryStatus: "read",
      attachments: [
        {
          type: "template",
          payload: {
            generic: {
              elements: [
                {
                  title: "Oii, basta clicar no botão abaixo que vou te enviar o link",
                  buttons: [{ type: "postback", title: "Enviar Link", payload: "reveal:x:open" }],
                },
              ],
            },
          },
        },
      ],
    });
    expect(text).toBe("");
    expect(extras.cards).toEqual([
      {
        title: "Oii, basta clicar no botão abaixo que vou te enviar o link",
        subtitle: null,
        imageUrl: null,
        buttons: [{ type: "postback", title: "Enviar Link" }],
      },
    ]);
    expect(extras.attachments).toBeUndefined();
    expect(extras.status).toBe("read");
  });

  it("reads link buttons sent with a text message from metadata.metaInteractive", () => {
    const { text, extras } = normalizeZernioMessage({
      id: "m2",
      message: "Segue abaixo o link",
      attachments: [],
      metadata: {
        sentVia: "api",
        metaInteractive: { buttons: [{ url: "https://example.com/r/abc", type: "url", title: "Abrir link" }] },
      },
    });
    expect(text).toBe("Segue abaixo o link");
    expect(extras.buttons).toEqual([{ type: "url", title: "Abrir link", url: "https://example.com/r/abc" }]);
  });

  it("flags an incoming postback tap with the button title", () => {
    const { extras } = normalizeZernioMessage({
      id: "postback_1",
      message: "Enviar Link",
      direction: "incoming",
      metadata: { postbackTitle: "Enviar Link", postbackPayload: "reveal:x:open" },
    });
    expect(extras.postback).toBe("Enviar Link");
  });

  it("maps media, story mentions, story replies and withheld content", () => {
    const { extras } = normalizeZernioMessage({
      id: "m3",
      message: "",
      attachments: [
        { type: "image", url: "https://cdn/img.jpg" },
        { type: "share", originalType: "story_mention", url: "https://cdn/story.jpg" },
        { type: "weird" },
      ],
      storyReply: { storyId: "s1", storyUrl: "https://cdn/s1.jpg" },
      noRenderableContent: true,
      deliveryStatus: "bogus",
    });
    expect(extras.attachments?.map((a) => a.kind)).toEqual(["image", "story_mention", "unsupported"]);
    expect(extras.storyReply).toEqual({ url: "https://cdn/s1.jpg" });
    expect(extras.unsupported).toBe(true);
    expect(extras.status).toBeUndefined();
  });

  it("returns empty extras for a plain message", () => {
    expect(normalizeZernioMessage({ id: "m4", message: "oi", attachments: [] })).toEqual({ text: "oi", extras: {} });
  });
});

describe("templateCards", () => {
  it("handles Meta's button template and generic elements shapes", () => {
    expect(
      templateCards({ template_type: "button", text: "Pick one", buttons: [{ type: "web_url", url: "https://x", title: "Go" }] }),
    ).toEqual([{ title: "Pick one", subtitle: null, imageUrl: null, buttons: [{ type: "url", title: "Go", url: "https://x" }] }]);

    expect(
      templateCards({ template_type: "generic", elements: [{ title: "A", subtitle: "B", image_url: "https://i" }] }),
    ).toEqual([{ title: "A", subtitle: "B", imageUrl: "https://i", buttons: [] }]);

    expect(templateCards({ button: { text: "Hi", buttons: [] } })[0].title).toBe("Hi");
    expect(templateCards(null)).toEqual([]);
  });
});

describe("previewText", () => {
  it("falls back to the template title or postback", () => {
    expect(previewText("hello", undefined)).toBe("hello");
    expect(previewText("", { cards: [{ title: "Card", subtitle: null, imageUrl: null, buttons: [] }] })).toBe("Card");
    expect(previewText("", { postback: "Tap" })).toBe("Tap");
    expect(previewText("", {})).toBe("");
  });
});

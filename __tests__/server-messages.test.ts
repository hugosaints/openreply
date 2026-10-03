import { describe, expect, it } from "vitest";
import { createI18n } from "../lib/i18n";
import { displayWorkspaceName, translateServerMessage } from "../lib/i18n/server-messages";

describe("server message translation", () => {
  const pt = createI18n("pt-BR");
  const en = createI18n("en");

  it("translates known static server messages", () => {
    expect(translateServerMessage(pt, "Post reporting covers the 25 most recent Instagram posts.")).toBe(
      "Os relatórios de posts cobrem os 25 posts mais recentes do Instagram.",
    );
    expect(translateServerMessage(en, "Follower snapshot failed")).toBe("Follower snapshot failed");
  });

  it("translates interpolated event messages and keeps dynamic parts verbatim", () => {
    expect(translateServerMessage(pt, "Token refresh failed for @acme: Invalid OAuth access token")).toBe(
      "Falha ao renovar o token de @acme: Invalid OAuth access token",
    );
    expect(
      translateServerMessage(pt, 'Comment sweep "Promo" [link, eu quero]: 3 enqueued, 5 matched, 2 already replied'),
    ).toBe('Varredura de comentários "Promo" [link, eu quero]: 3 na fila, 5 correspondentes, 2 já respondidos');
  });

  it("passes unknown messages through unchanged", () => {
    expect(translateServerMessage(pt, "(#10) Application does not have permission")).toBe(
      "(#10) Application does not have permission",
    );
  });

  it("localizes default workspace names only", () => {
    expect(displayWorkspaceName(pt, "hugo's workspace")).toBe("Workspace de hugo");
    expect(displayWorkspaceName(pt, "My workspace")).toBe("Meu workspace");
    expect(displayWorkspaceName(pt, "Agência Nova")).toBe("Agência Nova");
  });

  it("labels operational event sources", () => {
    expect(pt.label("TOKEN_REFRESH")).toBe("Renovação de token");
  });
});

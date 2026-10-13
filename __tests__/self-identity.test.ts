import { describe, expect, it } from "vitest";
import { isOwnAccount, unknownOwnId } from "@/lib/instagram/self-identity";

// Real ids from the loop this guards against: a Zernio connection stores the
// app-scoped id, while the account's comments carry its professional id.
const account = {
  instagramId: "28610062558658619",
  username: "achadosdanina.oficial",
  instagramUserIds: [] as string[],
};

describe("isOwnAccount", () => {
  it("matches the stored instagramId", () => {
    expect(isOwnAccount(account, { id: "28610062558658619" })).toBe(true);
  });

  it("matches an alternate id the account is known by", () => {
    expect(
      isOwnAccount(
        { ...account, instagramUserIds: ["17841450754756865"] },
        { id: "17841450754756865" }
      )
    ).toBe(true);
  });

  it("matches the username when the id is not known yet, ignoring case and @", () => {
    expect(
      isOwnAccount(account, { id: "17841450754756865", username: "@AchadosDanina.Oficial" })
    ).toBe(true);
  });

  it("does not match anyone else", () => {
    expect(isOwnAccount(account, { id: "1640175194357692", username: "_ohugosantos" })).toBe(false);
  });

  it("never matches on an empty username", () => {
    expect(isOwnAccount({ ...account, username: "" }, { id: "x", username: "" })).toBe(false);
  });
});

describe("unknownOwnId", () => {
  it("returns the id to learn when the username matches but the id is new", () => {
    expect(
      unknownOwnId(account, { id: "17841450754756865", username: "achadosdanina.oficial" })
    ).toBe("17841450754756865");
  });

  it("returns null for ids already known or for other people", () => {
    expect(unknownOwnId(account, { id: "28610062558658619", username: "achadosdanina.oficial" })).toBeNull();
    expect(
      unknownOwnId({ ...account, instagramUserIds: ["17841450754756865"] }, { id: "17841450754756865", username: "achadosdanina.oficial" })
    ).toBeNull();
    expect(unknownOwnId(account, { id: "1640175194357692", username: "_ohugosantos" })).toBeNull();
  });
});

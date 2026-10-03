import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

// Default share card for every page that does not ship its own. Crawlers such as
// WhatsApp send no locale or cookie, so the card is static English.
export const alt = `${SITE_NAME} - ${SITE_TAGLINE}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: "Free & open source",
    title: "Turn Instagram comments",
    highlight: "into private replies.",
    subtitle: "A self-hosted ManyChat alternative built on the official Instagram API.",
    footer: ["MIT licensed", "Self-hosted", "Official API"],
    preview: {
      comment: "GUIDE! need this",
      reply: "Hey Maya! Here's the link you asked for.",
      linkLabel: "Shop the new drop",
      keyword: "GUIDE",
    },
    labels: { campaign: "Campaign", active: "Active", matched: "Matched" },
  });
}

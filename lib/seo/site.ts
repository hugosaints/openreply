import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/env";
import type { Locale } from "@/lib/i18n";

export const SITE_NAME = "OpenReply";

/** Short product line reused by titles, JSON-LD and the OG image. */
export const SITE_TAGLINE = "Open source Instagram comment-to-DM automation";

export const SITE_DESCRIPTION =
  "A free, self-hosted ManyChat alternative. Turn Instagram keyword comments into automatic private replies. Connect through your own Meta app or optional paid provider Zernio.";

export const SITE_KEYWORDS = [
  "instagram automation",
  "comment to DM",
  "instagram private replies",
  "instagram DM automation",
  "manychat alternative",
  "open source",
  "self-hosted",
];

/** Canonical origin of this deployment, without a trailing slash. */
export function getSiteUrl(): string {
  return getBaseUrl().replace(/\/+$/, "");
}

export function absoluteUrl(path = "/"): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

const OG_LOCALES: Record<Locale, string> = {
  en: "en_US",
  "pt-BR": "pt_BR",
  "zh-TW": "zh_TW",
};

interface PageMetadataInput {
  title: string;
  description: string;
  /** Path the page lives at, used for the canonical URL and og:url. */
  path: string;
  keywords?: string[];
  locale?: Locale;
  /** Keep the page out of search results (private or transactional pages). */
  noindex?: boolean;
  type?: "website" | "article";
  /**
   * Share image path. Defaults to the site card; pass `false` when the page's own
   * segment ships an `opengraph-image` file that Next injects by itself.
   */
  image?: string | false;
}

/** Share card used by every page that does not ship its own. */
export const DEFAULT_OG_IMAGE = "/opengraph-image";

/**
 * One place that builds the title / canonical / Open Graph / Twitter block.
 * A page that sets `openGraph` replaces the parent's object instead of merging
 * into it, so every page has to carry the full set; this keeps them consistent.
 * The share image itself comes from the nearest `opengraph-image` file.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  locale = "en",
  noindex = false,
  type = "website",
  image = DEFAULT_OG_IMAGE,
}: PageMetadataInput): Metadata {
  const images = image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined;

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: OG_LOCALES[locale],
      url: path,
      title,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images: [image as string] } : {}),
    },
  };
}

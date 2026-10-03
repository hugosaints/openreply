import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/templates"],
        // The authenticated app, API and redirect routes carry nothing worth
        // crawling. Login, invite and report pages are intentionally NOT listed:
        // they use a noindex meta tag, which crawlers can only see if they may
        // fetch the page.
        disallow: [
          "/api/",
          "/dashboard",
          "/overview",
          "/campaigns",
          "/inbox",
          "/logs",
          "/diagnostics",
          "/settings",
          "/automations",
          "/r/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

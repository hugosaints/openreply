import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import { getCampaignTemplateSlugs } from "@/lib/templates/campaign-templates";

type Entry = { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" };

const PAGES: Entry[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/templates", priority: 0.9, changeFrequency: "weekly" },
  { path: "/manychat-alternative", priority: 0.8, changeFrequency: "monthly" },
  { path: "/comment-link-automation", priority: 0.8, changeFrequency: "monthly" },
  { path: "/instagram-comment-to-dm-templates", priority: 0.8, changeFrequency: "monthly" },
  { path: "/instagram-dm-automation-agencies", priority: 0.8, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/data-deletion", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const templates: Entry[] = getCampaignTemplateSlugs().map((slug) => ({
    path: `/templates/${slug}`,
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  return [...PAGES, ...templates].map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}

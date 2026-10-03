import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/site";
import SeoPageShell from "@/components/seo-page-shell";
import { templatesSeoPage } from "@/lib/seo-pages";

export const metadata: Metadata = buildPageMetadata({
  title: "Instagram Comment-to-DM Templates for Campaigns - OpenReply",
  description:
    "Browse Instagram comment-to-DM templates for lead magnets, product links, price replies, launch waitlists, creators, and agencies.",
  path: "/instagram-comment-to-dm-templates",
});

export default function InstagramCommentToDmTemplatesPage() {
  return <SeoPageShell config={templatesSeoPage} />;
}


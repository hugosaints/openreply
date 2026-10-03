import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/site";
import SeoPageShell from "@/components/seo-page-shell";
import { commentLinkSeoPage } from "@/lib/seo-pages";

export const metadata: Metadata = buildPageMetadata({
  title: "Comment LINK Automation for Instagram - OpenReply",
  description:
    "Automate Instagram comment LINK replies with keyword matching, Meta-compliant private replies, tracked links, and campaign analytics.",
  path: "/comment-link-automation",
});

export default function CommentLinkAutomationPage() {
  return <SeoPageShell config={commentLinkSeoPage} />;
}


import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/site";
import SeoPageShell from "@/components/seo-page-shell";
import { agenciesSeoPage } from "@/lib/seo-pages";

export const metadata: Metadata = buildPageMetadata({
  title: "Instagram DM Automation for Agencies - OpenReply",
  description:
    "Instagram DM automation for agencies with multi-account workspaces, comment-to-DM campaigns, tracked links, and shareable client reports.",
  path: "/instagram-dm-automation-agencies",
});

export default function InstagramDmAutomationAgenciesPage() {
  return <SeoPageShell config={agenciesSeoPage} />;
}


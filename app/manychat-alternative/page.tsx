import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/site";
import SeoPageShell from "@/components/seo-page-shell";
import { manychatAlternativePage } from "@/lib/seo-pages";

export const metadata: Metadata = buildPageMetadata({
  title: "Manychat Alternative for Instagram Comment-to-DM Campaigns - OpenReply",
  description:
    "A focused Manychat alternative for Instagram keyword comments, private replies, tracked links, analytics, and agency client reports.",
  path: "/manychat-alternative",
});

export default function ManychatAlternativePage() {
  return <SeoPageShell config={manychatAlternativePage} />;
}


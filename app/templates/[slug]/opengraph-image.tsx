import { notFound } from "next/navigation";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";
import { SITE_NAME } from "@/lib/seo/site";
import {
  getCampaignTemplate,
  getCampaignTemplateSlugs,
} from "@/lib/templates/campaign-templates";

export const alt = `${SITE_NAME} Instagram comment-to-DM template`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getCampaignTemplateSlugs().map((slug) => ({ slug }));
}

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = getCampaignTemplate(slug);
  if (!template) notFound();

  return renderOgImage({
    eyebrow: template.category,
    title: template.title,
    subtitle: clip(template.summary, 120),
    footer: [`${template.setupMinutes} min setup`, "Comment-to-DM template", "OpenReply"],
    preview: {
      comment: clip(template.triggerExample, 28),
      reply: clip(template.privateReplyPreview, 70),
      linkLabel: template.goal,
      keyword: template.keywords[0] ?? "KEYWORD",
    },
    labels: { campaign: "Campaign", active: "Active", matched: "Matched" },
  });
}

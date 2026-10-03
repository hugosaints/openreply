import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import type { StaticMessageKey } from "@/lib/i18n";

/**
 * `generateMetadata` for a dashboard section. The pages themselves are client
 * components and cannot export metadata, so each section gets a tiny layout
 * that sets a localized tab title ("Campaigns - OpenReply").
 */
export function sectionMetadata(label: StaticMessageKey) {
  return async function generateMetadata(): Promise<Metadata> {
    const { t } = await getI18n();
    return { title: `${t(label)} - OpenReply` };
  };
}

import WizardShell from "@/components/campaigns/wizard-shell";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  return <WizardShell templateSlug={template} />;
}

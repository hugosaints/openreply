"use client";

import { useParams } from "next/navigation";
import CampaignEditor from "@/components/campaigns/campaign-editor";

export default function EditCampaignPage() {
  const params = useParams<{ id: string }>();
  return <CampaignEditor campaignId={params.id} />;
}

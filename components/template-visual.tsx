import type { CampaignTemplate } from "@/lib/templates/campaign-templates";
import { Chip } from "@/components/public/ui";

interface TemplateVisualProps {
  template: CampaignTemplate;
  compact?: boolean;
}

/** Mini campaign card: trigger, keywords and the private-reply preview. */
export default function TemplateVisual({
  template,
  compact = false,
}: TemplateVisualProps) {
  return (
    <div className="panel overflow-hidden rounded-2xl shadow-[0_18px_40px_-24px_rgb(29_38_48/0.22)]">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-subtle">Comment trigger</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{template.triggerExample}</p>
        </div>
        <Chip tone="accent">{template.category}</Chip>
      </div>

      <div className={`grid gap-3 p-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div className="rounded-xl bg-surface-hover/70 p-3">
          <p className="text-xs font-medium text-subtle">Keywords</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {template.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-md bg-surface px-2 py-1 text-xs font-semibold text-foreground ring-1 ring-border"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-accent-soft p-3">
          <p className="text-xs font-medium text-accent">Private reply</p>
          <p className="mt-2.5 text-sm leading-relaxed text-foreground/85">{template.privateReplyPreview}</p>
        </div>
      </div>
    </div>
  );
}

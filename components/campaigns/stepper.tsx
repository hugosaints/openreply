"use client";

import { useI18n } from "@/lib/i18n/provider";
import { IconCheck } from "@/components/campaigns/icons";

export interface StepperItem {
  id: string;
  title: string;
  description: string;
}

interface StepperProps {
  steps: StepperItem[];
  current: number;
  /** Furthest step the user may jump to (inclusive). */
  maxReached: number;
  /** Steps that currently have validation errors. */
  invalid?: ReadonlySet<number>;
  onSelect: (index: number) => void;
}

/**
 * Vertical list on desktop, compact "Step n of N" + progress bar on mobile.
 * Steps beyond `maxReached` are disabled so nobody skips validation.
 */
export default function Stepper({ steps, current, maxReached, invalid, onSelect }: StepperProps) {
  const { t } = useI18n();
  const total = steps.length;
  const percent = Math.round(((current + 1) / total) * 100);

  return (
    <nav aria-label={t("Campaign steps")}>
      {/* Mobile */}
      <div className="panel p-4 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">{steps[current].title}</p>
          <p className="text-xs tabular-nums text-muted">
            {t("Step {current} of {total}", { current: current + 1, total })}
          </p>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-hover"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Desktop */}
      <ol className="panel hidden p-3 lg:block">
        {steps.map((step, index) => {
          const done = index < current || (index <= maxReached && index !== current && !invalid?.has(index));
          const active = index === current;
          const hasError = invalid?.has(index) && !active;
          const locked = index > maxReached;
          return (
            <li key={step.id} className="relative">
              {index < total - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[1.625rem] top-11 h-[calc(100%-2.25rem)] w-px ${
                    index < current ? "bg-accent" : "bg-border"
                  }`}
                />
              )}
              <button
                type="button"
                disabled={locked}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(index)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                  active ? "bg-accent-soft" : locked ? "cursor-not-allowed" : "hover:bg-surface-hover"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors ${
                    hasError
                      ? "border-error bg-error-soft text-error"
                      : active
                        ? "border-accent bg-accent text-white"
                        : done
                          ? "border-accent bg-accent text-white"
                          : "border-border-hover bg-surface text-subtle"
                  }`}
                >
                  {hasError ? "!" : done && !active ? <IconCheck className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-medium ${
                      locked ? "text-subtle" : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-subtle">{step.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

"use client";

import { useRef } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Stretch to the container width with equal-width segments. */
  full?: boolean;
  id?: string;
  className?: string;
}

/**
 * Segmented control styled after the reference tabs (bordered group, lavender
 * active segment). Implements the ARIA tabs keyboard model: arrows move and
 * select, Home/End jump.
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  full = false,
  id,
  className = "",
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusAt(index: number) {
    const next = (index + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowRight") focusAt(index + 1);
    else if (event.key === "ArrowLeft") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(options.length - 1);
    else return;
    event.preventDefault();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      id={id}
      className={`segmented ${full ? "flex w-full" : ""} ${className}`}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={id ? `${id}-${option.value}` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`segmented-item ${full ? "flex-1 text-center" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

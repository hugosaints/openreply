"use client";

/**
 * Shared form primitives for the campaign wizard / editor, styled after the
 * admin theme (hairline borders, indigo accent). All strings come in through
 * props so the components stay i18n-agnostic, except for the few generic
 * labels that use `t()` directly.
 */

import { useId, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { normalizeKeywords, splitKeywordInput, MAX_KEYWORDS } from "@/lib/campaigns/wizard";

export const inputClass = (invalid = false) =>
  `w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle transition-colors focus:outline-none ${
    invalid
      ? "border-error focus:border-error"
      : "border-border hover:border-border-hover focus:border-accent"
  }`;

/* -------------------------------- Card -------------------------------- */

export function SectionCard({
  id,
  title,
  description,
  aside,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/* -------------------------------- Field -------------------------------- */

export function InlineError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-error">
      {children}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {optional && <span className="ml-1.5 font-normal text-subtle">{t("(optional)")}</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
      <InlineError id={htmlFor ? `${htmlFor}-error` : undefined}>{error}</InlineError>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  optional,
  maxLength,
  type = "text",
  onBlur,
  fieldId,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  maxLength?: number;
  type?: "text" | "url";
  onBlur?: () => void;
  fieldId?: string;
  prefix?: ReactNode;
}) {
  const generated = useId();
  const id = fieldId ?? generated;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} optional={optional}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-subtle">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputClass(Boolean(error))} ${prefix ? "pl-9" : ""}`}
        />
      </div>
    </Field>
  );
}

/* ------------------------------- TextArea ------------------------------- */

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  optional,
  maxLength = 1000,
  rows = 4,
  tokens = [],
  fieldId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  maxLength?: number;
  rows?: number;
  /** Placeholder tokens that get an "insert" button, e.g. `{username}`. */
  tokens?: { token: string; label: string }[];
  fieldId?: string;
}) {
  const { t } = useI18n();
  const generated = useId();
  const id = fieldId ?? generated;
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert(token: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`.slice(0, maxLength);
    onChange(next);
    const caret = Math.min(start + token.length, maxLength);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  }

  const near = value.length > maxLength * 0.9;

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} optional={optional}>
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClass(Boolean(error))} resize-none`}
      />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {tokens.length > 0 && <span className="text-xs text-subtle">{t("Insert")}</span>}
          {tokens.map((item) => (
            <button
              key={item.token}
              type="button"
              onClick={() => insert(item.token)}
              title={item.label}
              className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-xs text-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
            >
              {item.token}
            </button>
          ))}
        </div>
        <span className={`text-xs tabular-nums ${near ? "text-warning" : "text-subtle"}`}>
          {value.length}/{maxLength}
        </span>
      </div>
    </Field>
  );
}

/* --------------------------------- Toggle --------------------------------- */

export function Toggle({
  on,
  onChange,
  label,
  id,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-accent" : "bg-border-hover"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

/** Bordered row with a switch; its children reveal when the switch is on. */
export function ToggleRow({
  title,
  description,
  on,
  onChange,
  children,
  id,
}: {
  title: string;
  description?: ReactNode;
  on: boolean;
  onChange: (next: boolean) => void;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        on ? "border-accent-muted bg-accent-soft/40" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        <Toggle on={on} onChange={onChange} label={title} id={id} />
      </div>
      {on && children && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}

/* ------------------------------ Option cards ------------------------------ */

export interface OptionCardItem<T extends string> {
  value: T;
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function OptionCards<T extends string>({
  label,
  value,
  onChange,
  options,
  columns = "sm:grid-cols-3",
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: OptionCardItem<T>[];
  columns?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-3 ${columns}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
              selected
                ? "border-accent bg-accent-soft"
                : "border-border hover:border-border-hover hover:bg-surface-hover"
            }`}
          >
            {option.icon && (
              <span
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  selected ? "bg-accent text-white" : "bg-surface-hover text-muted"
                }`}
              >
                {option.icon}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{option.title}</span>
              {option.description && (
                <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
              )}
            </span>
            <span
              aria-hidden="true"
              className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                selected ? "border-accent" : "border-border-hover"
              }`}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-accent" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ Keyword chips ------------------------------ */

export function KeywordChips({
  label,
  value,
  onChange,
  placeholder,
  error,
  fieldId,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  error?: string;
  fieldId?: string;
  hint?: ReactNode;
}) {
  const { t } = useI18n();
  const generated = useId();
  const id = fieldId ?? generated;
  const [text, setText] = useState("");
  const full = value.length >= MAX_KEYWORDS;

  function commit(raw: string) {
    const words = splitKeywordInput(raw);
    if (words.length > 0) onChange(normalizeKeywords([...value, ...words]));
    setText("");
  }

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border bg-surface p-2 transition-colors focus-within:border-accent ${
          error ? "border-error" : "border-border hover:border-border-hover"
        }`}
      >
        {value.map((word) => (
          <span
            key={word}
            className="inline-flex items-center gap-1 rounded-md bg-accent-soft py-1 pl-2.5 pr-1.5 text-sm font-medium text-accent"
          >
            {word}
            <button
              type="button"
              onClick={() => onChange(value.filter((w) => w !== word))}
              aria-label={t("Remove {word}", { word })}
              className="grid h-4 w-4 place-items-center rounded text-accent/70 hover:bg-accent/10 hover:text-accent"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          disabled={full}
          onChange={(e) => {
            const next = e.target.value;
            if (/[,;\n]/.test(next)) commit(next);
            else setText(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(text);
            } else if (e.key === "Backspace" && !text && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => commit(text)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (/[,;\n]/.test(pasted)) {
              e.preventDefault();
              commit(`${text}${pasted}`);
            }
          }}
          placeholder={full ? t("Keyword limit reached") : value.length === 0 ? placeholder : ""}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          maxLength={50}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-foreground placeholder:text-subtle focus:outline-none"
        />
      </div>
      <p className="mt-1.5 text-xs tabular-nums text-subtle">
        {value.length}/{MAX_KEYWORDS}
      </p>
    </Field>
  );
}

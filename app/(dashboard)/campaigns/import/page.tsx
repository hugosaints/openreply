"use client";

/**
 * Import campaigns — paste or upload a CSV with one row per campaign (everything
 * except the post). Rows are queued and opened one at a time in the campaign
 * wizard, prefilled and editable, so each reel is picked and reviewed.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Field, SectionCard, inputClass } from "@/components/campaigns/fields";
import { Pill } from "@/components/campaigns/status-pill";
import { IconArrowLeft, IconUpload } from "@/components/campaigns/icons";
import { useCampaignAccounts } from "@/components/campaigns/use-campaign-data";
import { csvToImportRows } from "@/lib/campaigns/import";
import { IMPORT_ACCOUNT_KEY, IMPORT_QUEUE_KEY } from "@/lib/import-queue";

const SAMPLE = `keywords,dm_message,public_reply,tracked_url,opening_dm,opening_dm_button
"yc","here it is: {link}","sent. check dms","https://events.ycombinator.com/startup-school-2026","hey! click below for the referral","send link"
"LINK,SHOP","grab it here: {link}","dmed u",,,`;

export default function ImportCampaignsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { accounts } = useCampaignAccounts();
  const [accountChoice, setAccountChoice] = useState("");
  const [csv, setCsv] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const accountId = accountChoice || accounts[0]?.id || "";
  const result = useMemo(() => (csv.trim() ? csvToImportRows(csv) : null), [csv]);

  const columns: { name: string; required: boolean; description: string }[] = [
    { name: "keywords", required: true, description: t("Trigger words in one cell, separated by commas.") },
    { name: "dm_message", required: true, description: t("The DM sent to the commenter.") },
    { name: "name", required: false, description: t("Campaign name.") },
    { name: "public_reply", required: false, description: t("A public reply posted under the comment.") },
    { name: "tracked_url", required: false, description: t("Destination of the tracked link.") },
    { name: "opening_dm", required: false, description: t("Opening message sent before the DM.") },
    { name: "opening_dm_button", required: false, description: t("Label of the opening message button.") },
  ];

  let status: { tone: "ok" | "error"; text: string } | null = null;
  if (result?.ok) {
    status = {
      tone: "ok",
      text: t(result.rows.length === 1 ? "{count} campaign ready to import" : "{count} campaigns ready to import", {
        count: result.rows.length,
      }),
    };
  } else if (result && !result.ok) {
    status = {
      tone: "error",
      text:
        result.reason === "empty"
          ? t("Paste a CSV with a header row and at least one campaign.")
          : t("Row {row} is missing keywords or a message.", { row: result.row }),
    };
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setCsv(await file.text());
    setSubmitError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function startImport() {
    setSubmitError(null);
    const parsed = csvToImportRows(csv);
    if (!parsed.ok) {
      setSubmitError(
        parsed.reason === "empty"
          ? t("Paste a CSV with a header row and at least one campaign.")
          : t("Row {row} is missing keywords or a message.", { row: parsed.row })
      );
      return;
    }
    try {
      window.localStorage.setItem(IMPORT_QUEUE_KEY, JSON.stringify(parsed.rows));
      if (accountId) window.localStorage.setItem(IMPORT_ACCOUNT_KEY, accountId);
    } catch {
      setSubmitError(t("Could not stage the import in this browser."));
      return;
    }
    router.push("/campaigns/new");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="h-3.5 w-3.5" />
          {t("Back to campaigns")}
        </Link>
        <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
          {t("Import campaigns")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t("Each row opens in the campaign wizard prefilled and editable, so you can review it and pick the reel before saving.")}
        </p>
      </div>

      <SectionCard title={t("Columns")} description={t("The first row of your CSV must be a header with these names.")}>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {columns.map((column) => (
            <li key={column.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
              <code className="rounded-md bg-surface-hover px-2 py-0.5 font-mono text-xs text-foreground">
                {column.name}
              </code>
              <Pill tone={column.required ? "accent" : "neutral"}>
                {column.required ? t("Required") : t("Optional")}
              </Pill>
              <span className="min-w-0 flex-1 text-sm text-muted">{column.description}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-subtle">
          {t("Add the link token where the tracked link should appear in a message:")}{" "}
          <code className="font-mono text-accent">{"{link}"}</code>
        </p>
      </SectionCard>

      <SectionCard title={t("Your data")}>
        {accounts.length > 1 && (
          <Field label={t("Instagram account")} htmlFor="import-account">
            <select
              id="import-account"
              value={accountId}
              onChange={(e) => setAccountChoice(e.target.value)}
              className={inputClass()}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  @{account.username}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="CSV" htmlFor="import-csv">
          <textarea
            id="import-csv"
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setSubmitError(null);
            }}
            placeholder={SAMPLE}
            rows={10}
            className={`${inputClass()} resize-y font-mono`}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <IconUpload />
            {t("Choose a CSV file")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            aria-label={t("Choose a CSV file")}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => {
              setCsv(SAMPLE);
              setSubmitError(null);
            }}
            className="text-sm font-medium text-accent hover:underline"
          >
            {t("Fill with a sample")}
          </button>
          {status && (
            <p
              role={status.tone === "error" ? "alert" : "status"}
              className={`ml-auto text-sm font-medium ${status.tone === "ok" ? "text-success" : "text-error"}`}
            >
              {status.text}
            </p>
          )}
        </div>
      </SectionCard>

      {submitError && (
        <div role="alert" className="rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-sm text-error">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/campaigns"
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {t("Cancel")}
        </Link>
        <button
          type="button"
          onClick={startImport}
          disabled={!result?.ok}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {t("Review and import")}
        </button>
      </div>
    </div>
  );
}

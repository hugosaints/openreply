import type { Locale } from "@/lib/i18n";

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    notation: n >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatPercent(n: number, locale: Locale, digits = 1): string {
  return `${n.toLocaleString(locale, { maximumFractionDigits: digits })}%`;
}

/** 10033 ms → "10.0 s"; 125000 ms → "2m 5s"; 3.7e6 ms → "1h 2m". */
export function formatDuration(ms: number, locale: Locale): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60)
    return `${totalSeconds.toLocaleString(locale, { maximumFractionDigits: 1 })} s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m ${Math.round(totalSeconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Region display name for an ISO country code, falling back to the code. */
export function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

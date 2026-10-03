"use client";

import StatusBadge from "@/components/status-badge";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { useI18n } from "@/lib/i18n/provider";
import { IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";

export interface RecentLog {
  id: string;
  commenterName: string | null;
  commentText: string;
  status: string;
  createdAt: string;
  automation: { name: string };
  instagramAccount?: { username: string };
}

export default function RecentActivity({ logs, showAccount }: { logs: RecentLog[]; showAccount: boolean }) {
  const { t, locale } = useI18n();

  return (
    <section className="panel overflow-hidden" aria-labelledby="recent-activity-title">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 id="recent-activity-title" className="font-heading text-[15px] font-semibold text-foreground">
            {t("Recent Activity")}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{t("Latest comments that triggered a campaign.")}</p>
        </div>
        <Link
          href="/logs"
          id="recent-activity-view-all"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
        >
          {t("View all")}
          <IconArrowRight size={14} stroke={2} />
        </Link>
      </div>

      {logs.length === 0 ? (
        <p className="border-t border-border px-5 py-12 text-center text-sm text-muted">{t("No activity yet")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-border bg-surface-hover/60 text-left text-xs font-medium text-muted">
                <th scope="col" className="px-5 py-2.5 font-medium">{t("Contact")}</th>
                <th scope="col" className="px-3 py-2.5 font-medium">{t("Comment")}</th>
                <th scope="col" className="px-3 py-2.5 font-medium">{t("Campaign")}</th>
                <th scope="col" className="px-3 py-2.5 font-medium">{t("Status")}</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">{t("When")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-hover/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">
                      {log.commenterName ? `@${log.commenterName}` : t("Unknown contact")}
                    </p>
                    {showAccount && log.instagramAccount && (
                      <p className="text-xs text-subtle">@{log.instagramAccount.username}</p>
                    )}
                  </td>
                  <td className="max-w-[280px] px-3 py-3">
                    <p className="truncate text-muted" title={log.commentText}>{log.commentText}</p>
                  </td>
                  <td className="max-w-[200px] px-3 py-3">
                    <p className="truncate text-foreground">{log.automation.name}</p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={log.status} variant="pill" />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-xs text-subtle">
                    <time dateTime={log.createdAt} title={new Date(log.createdAt).toLocaleString(locale)}>
                      {formatRelativeTime(log.createdAt, locale)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/status-badge";
import Segmented from "@/components/ui/segmented";
import Pagination, { type BackendPagination } from "@/components/ui/pagination";

type TabType = "overview" | "dm-failures" | "webhook-failures" | "token-refresh" | "operational-events";

interface OverviewData {
  queueCounts: Record<string, number>;
  workerHealth: {
    healthy: boolean;
    ageMs: number | null;
    heartbeat: {
      checkedAt: string;
      hostname?: string;
      pid: number;
      startedAt?: string;
    } | null;
  };
  workerAlerts: Array<{
    level: string;
    message: string;
    jobId?: string;
    commentId?: string;
    createdAt: string;
  }>;
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-10 text-center text-sm text-muted">{label}</p>;
}

export default function DiagnosticsPage() {
  const { t, label, locale } = useI18n();
  
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  const [overview, setOverview] = useState<OverviewData | null>(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<BackendPagination | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Fetch overview data
  const fetchOverview = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/admin/diagnostics");
      const data = await res.json();
      if (data.success) {
        setOverview(data.data);
      }
    } catch {
      // Handle error implicitly
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fetch paginated logs
  const fetchLogs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({
        type: activeTab,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/diagnostics/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setPagination(data.pagination);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      void fetchOverview(true);
    } else {
      void fetchLogs(true);
    }
  }, [activeTab, page, limit]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
    setPage(1); // Reset page on tab change
  };

  const workerAgeSeconds =
    overview?.workerHealth.ageMs == null
      ? null
      : Math.round(overview.workerHealth.ageMs / 1000);

  const renderOverview = () => {
    if (!overview) return null;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          <div className="panel rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase text-muted">
              {t("Worker health")}
            </p>
            <p
              className={`mt-3 text-2xl font-bold ${
                overview.workerHealth.healthy ? "text-success" : "text-warning"
              }`}
            >
              {overview.workerHealth.healthy ? t("Healthy") : t("Needs attention")}
            </p>
            <p className="mt-2 text-xs text-muted">
              {workerAgeSeconds == null
                ? t("No heartbeat found")
                : t("Last heartbeat {seconds}s ago", { seconds: workerAgeSeconds })}
            </p>
          </div>
          {["waiting", "active", "delayed", "failed"].map((key) => (
            <div key={key} className="panel rounded-2xl p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase text-muted">
                {t("Queue")} {label(key)}
              </p>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {overview.queueCounts[key] ?? 0}
              </p>
            </div>
          ))}
        </div>

        <section className="panel rounded-2xl p-4 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">{t("Recent Worker Alerts")}</h2>
          <div className="mt-4">
            {overview.workerAlerts.length ? (
              <div className="space-y-3">
                {overview.workerAlerts.map((alert) => (
                  <div
                    key={`${alert.createdAt}-${alert.jobId ?? alert.message}`}
                    className="rounded-xl border border-border bg-surface/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">
                        {alert.message}
                      </p>
                      <span className="shrink-0 rounded-full bg-error-soft px-2 py-1 text-xs font-semibold text-error">
                        {alert.level}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {formatDate(alert.createdAt, locale)}
                      {alert.commentId ? ` · ${alert.commentId}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label={t("No worker alerts recorded.")} />
            )}
          </div>
        </section>
      </div>
    );
  };

  const renderLogs = () => {
    if (loading) {
      return (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel h-20 animate-pulse rounded-2xl" />
          ))}
        </div>
      );
    }
    
    if (loadError) {
      return <EmptyState label={t("Could not load data.")} />;
    }

    if (!logs.length) {
      return <EmptyState label={t("No events found.")} />;
    }

    return (
      <div className="space-y-4">
        {activeTab === "dm-failures" && logs.map((item) => (
          <div key={item.id} className="panel rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {item.automation?.name || t("Unknown Campaign")}
              </p>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-1 truncate text-sm text-muted">
              {item.commentText}
            </p>
            {item.errorMessage && (
              <p className="mt-1 text-xs text-error">{item.errorMessage}</p>
            )}
            <p className="mt-2 text-xs text-subtle">{formatDate(item.updatedAt, locale)}</p>
          </div>
        ))}

        {activeTab === "webhook-failures" && logs.map((event) => (
          <div key={event.id} className="panel rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground">
              {event.object ?? t("Instagram webhook")}
            </p>
            <p className="mt-1 text-sm text-error">
              {event.errorMessage ?? t("Unknown error")}
            </p>
            <p className="mt-2 text-xs text-subtle">
              {formatDate(event.createdAt, locale)}
            </p>
          </div>
        ))}

        {activeTab === "token-refresh" && logs.map((event) => (
          <div key={event.id} className="panel rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground">
              {event.message}
            </p>
            <p className="mt-2 text-xs text-subtle">
              {formatDate(event.createdAt, locale)}
            </p>
          </div>
        ))}

        {activeTab === "operational-events" && logs.map((event) => (
          <div key={event.id} className="panel rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <p className="text-xs font-semibold text-muted uppercase">{event.source}</p>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${event.level === 'ERROR' ? 'bg-error-soft text-error' : 'bg-surface-hover text-foreground'}`}>
                {event.level}
              </span>
            </div>
            <p className="mt-2 text-sm text-foreground">{event.message}</p>
            <p className="mt-2 text-xs text-subtle">{formatDate(event.createdAt, locale)}</p>
          </div>
        ))}

        <Pagination 
          pagination={pagination} 
          onPageChange={setPage} 
          onLimitChange={setLimit} 
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {t("Diagnostics")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("System health, operational logs, and event failures.")}
          </p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "overview") void fetchOverview(true);
            else void fetchLogs(true);
          }}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:border-border-hover hover:bg-surface-hover"
        >
          {t("Refresh")}
        </button>
      </div>

      <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <Segmented<string>
          ariaLabel={t("Diagnostics tabs")}
          value={activeTab}
          onChange={handleTabChange}
          options={[
            { value: "overview", label: t("Overview") },
            { value: "dm-failures", label: t("DM Failures") },
            { value: "webhook-failures", label: t("Webhooks") },
            { value: "token-refresh", label: t("Token Refreshes") },
            { value: "operational-events", label: t("System Events") },
          ]}
        />
      </div>

      {activeTab === "overview" ? renderOverview() : renderLogs()}
    </div>
  );
}

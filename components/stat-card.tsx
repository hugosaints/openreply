"use client";

/**
 * Stat Card
 *
 * Metric panel with label, value, and optional trend.
 */

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ label, value, trend, trendUp }: StatCardProps) {
  return (
    <div className="panel rounded-2xl p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-semibold text-foreground mt-1">{value}</p>
      {trend && (
        <p className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${trendUp ? "bg-success-soft text-success" : "bg-error-soft text-error"}`}>
          {trendUp ? "↑" : "↓"} {trend}
        </p>
      )}
    </div>
  );
}

import { useI18n } from "@/lib/i18n/provider";
import { IconChevronLeft, IconChevronRight } from "@/components/campaigns/icons";

export interface BackendPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationProps {
  pagination: BackendPagination | null;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function Pagination({ pagination, onPageChange, onLimitChange }: PaginationProps) {
  const { t } = useI18n();

  if (!pagination || pagination.total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 pb-2 border-t border-border/80 mt-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="text-xs text-muted">
          {t("Showing {start}–{end} of {total}", {
            start: (pagination.page - 1) * pagination.limit + 1,
            end: Math.min(pagination.page * pagination.limit, pagination.total),
            total: pagination.total,
          })}
        </p>
        <span className="text-subtle text-xs">·</span>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <select
            value={pagination.limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label={t("Items per page")}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-border-hover focus:border-accent focus:outline-none"
          >
            <option value={5}>5 {t("per page")}</option>
            <option value={10}>10 {t("per page")}</option>
            <option value={20}>20 {t("per page")}</option>
            <option value={50}>50 {t("per page")}</option>
          </select>
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover hover:border-border-hover disabled:opacity-30 disabled:pointer-events-none"
            aria-label={t("Previous")}
          >
            <IconChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("Previous")}</span>
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers(pagination.page, pagination.totalPages).map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-subtle">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p as number)}
                  className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                    p === pagination.page
                      ? "bg-accent text-white shadow-xs font-semibold"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                  aria-current={p === pagination.page ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover hover:border-border-hover disabled:opacity-30 disabled:pointer-events-none"
            aria-label={t("Next")}
          >
            <span className="hidden sm:inline">{t("Next")}</span>
            <IconChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

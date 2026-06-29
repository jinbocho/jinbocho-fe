import { StarRating } from "@/components/ui/StarRating";
import type { FamilyRatingStats } from "@/types/api";

interface FamilyRatingSummaryProps {
  stats: FamilyRatingStats;
}

export function FamilyRatingSummary({ stats }: FamilyRatingSummaryProps) {
  if (stats.total === 0) {
    return <p className="text-sm text-ink-soft">Nessuna recensione ancora.</p>;
  }

  const max = Math.max(...Object.values(stats.distribution));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex flex-col items-center gap-1">
        <span className="font-display text-3xl font-bold text-ink">
          {stats.average?.toFixed(1) ?? "—"}
        </span>
        <StarRating value={Math.round(stats.average ?? 0)} readOnly size="sm" />
        <span className="text-xs text-ink-soft">{stats.total} {stats.total === 1 ? "voto" : "voti"}</span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.distribution[star] ?? 0;
          const pct = max > 0 ? (count / max) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-ink-soft">
              <span className="w-4 text-right">{star}</span>
              <span className="text-amber text-sm leading-none">★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                <div
                  className="h-full rounded-full bg-amber transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-4 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

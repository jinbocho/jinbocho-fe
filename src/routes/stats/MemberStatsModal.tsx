import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Avatar } from "@/components/ui/Avatar";
import { BookCover } from "@/components/ui/BookCover";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useBookViews, useFamilyReads } from "@/features/books/hooks";
import { computeMemberStats } from "@/features/stats/useLibraryStats";
import { useUsers } from "@/features/users/hooks";
import { genreLabel } from "@/lib/format";
import type { User } from "@/types/api";

interface MemberStatsModalProps {
  user: User | null;
  onClose: () => void;
}

export function MemberStatsModal({ user, onClose }: MemberStatsModalProps) {
  const { t, i18n } = useTranslation();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const books = useBookViews();
  const reads = useFamilyReads();
  const users = useUsers();

  const stats = useMemo(() => {
    if (!user || !reads.data || !books.data || !users.data) return null;
    return computeMemberStats(user.id, reads.data, books.data, users.data);
  }, [user, reads.data, books.data, users.data]);

  const histogramYears = stats?.readingHistogram.map((h) => h.year) ?? [];
  const defaultYear = histogramYears[histogramYears.length - 1] ?? null;
  const activeYear = selectedYear ?? defaultYear;
  const activeHistogram = stats?.readingHistogram.find((h) => h.year === activeYear);
  const histogramMax = activeHistogram ? Math.max(...activeHistogram.months, 1) : 1;

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={user?.full_name ?? ""}
      size="xl"
    >
      {user && stats && (
        <div className="space-y-6">

          {/* Header: avatar + role + counts */}
          <div className="flex items-center gap-4">
            <Avatar name={user.full_name} src={user.avatar_url} className="h-14 w-14 text-lg" />
            <div>
              <p className="text-xs text-stone capitalize">{user.role}</p>
              <p className="mt-1 text-sm text-ink-soft">
                <span className="font-semibold text-ink">{stats.totalReads}</span>{" "}
                {t("stats.memberModal.totalReads")}
              </p>
            </div>
          </div>

          {/* Annual goal */}
          {stats.goalProgress && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("stats.goalsSection")}
              </p>
              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{t("stats.goalBooksLabel")}</span>
                  <span className={`font-semibold ${stats.goalProgress.readThisYear >= stats.goalProgress.goal ? "text-sage" : "text-ink"}`}>
                    {stats.goalProgress.readThisYear}/{stats.goalProgress.goal}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stats.goalProgress.readThisYear >= stats.goalProgress.goal ? "bg-sage" : "bg-brand"}`}
                    style={{ width: `${Math.min(100, Math.round((stats.goalProgress.readThisYear / stats.goalProgress.goal) * 100))}%` }}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Currently reading */}
          {stats.currentlyReading.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("stats.currentlyReadingSection")}
              </p>
              <Card className="p-4">
                <ul className="space-y-3">
                  {stats.currentlyReading.map(({ book, record }) => (
                    <li key={book.id} className="flex min-w-0 items-center gap-3">
                      <BookCover url={record?.cover_url} title={record?.title} className="h-10 w-8 shrink-0" />
                      <Link to={`/books/${book.id}`} onClick={onClose} className="block truncate text-sm font-medium text-ink hover:text-brand">
                        {record?.title ?? t("common.untitled")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {/* Reading histogram */}
          {stats.readingHistogram.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("stats.readingHistogramSection")}
              </p>
              <Card className="p-4">
                {histogramYears.length > 1 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {[...histogramYears].reverse().map((year) => (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          year === activeYear
                            ? "bg-brand text-paper"
                            : "bg-line text-ink-soft hover:text-ink"
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
                {activeHistogram ? (
                  <div className="flex items-end gap-1 h-28">
                    {activeHistogram.months.map((count, monthIndex) => {
                      const label = new Date(activeYear!, monthIndex).toLocaleString(i18n.language, { month: "short" });
                      const barHeight = Math.round((count / histogramMax) * 96);
                      return (
                        <div key={monthIndex} className="flex flex-1 flex-col items-center gap-1">
                          {count > 0 && (
                            <span className="text-[9px] font-medium text-brand leading-none">{count}</span>
                          )}
                          <div className="w-full flex items-end" style={{ height: "96px" }}>
                            <div
                              className="w-full rounded-t bg-brand transition-all duration-500"
                              style={{ height: barHeight > 0 ? `${barHeight}px` : "2px", opacity: barHeight > 0 ? 1 : 0.15 }}
                            />
                          </div>
                          <span className="text-[9px] text-ink-soft capitalize leading-none">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">{t("stats.readingHistogramNoReads")}</p>
                )}
              </Card>
            </div>
          )}

          {/* Recently read */}
          {stats.recentlyRead.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("stats.memberModal.recentlyRead")}
              </p>
              <Card className="p-4">
                <ul className="space-y-3">
                  {stats.recentlyRead.map(({ view, readAt }) => (
                    <li key={view.book.id} className="flex min-w-0 items-center gap-3">
                      <BookCover url={view.record?.cover_url} title={view.record?.title} className="h-10 w-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/books/${view.book.id}`} onClick={onClose} className="block truncate text-sm font-medium text-ink hover:text-brand">
                          {view.record?.title ?? t("common.untitled")}
                        </Link>
                        <p className="text-xs text-ink-soft">
                          {new Date(readAt).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {stats.totalReads === 0 && (
            <p className="text-sm text-ink-soft">{t("stats.memberModal.noReads")}</p>
          )}

          {/* Favorite genres */}
          {stats.favoriteGenres.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("stats.genreSection")}
              </p>
              <Card className="p-4">
                <div className="space-y-3">
                  {stats.favoriteGenres.map(({ genre, count, pct }) => (
                    <div key={genre}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-ink">{genreLabel(genre, t)}</span>
                        <span className="text-ink-soft">{count} · {pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-brand transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Top authors */}
          {stats.topAuthors.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("stats.topAuthorsSection")}
              </p>
              <Card className="p-4">
                <div className="space-y-2">
                  {stats.topAuthors.map(({ author, count }, idx) => (
                    <div key={author} className="flex items-center gap-3 text-sm">
                      <span className="w-4 shrink-0 text-center font-display text-base text-ink-soft/50">{idx + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{author}</span>
                      <span className="shrink-0 text-ink-soft">{count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Link to full list */}
          <div className="pt-1 text-center">
            <Link
              to={`/stats/books?filter=read&user=${user.id}`}
              onClick={onClose}
              className="text-sm text-brand hover:underline"
            >
              {t("stats.memberModal.viewAll")} →
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

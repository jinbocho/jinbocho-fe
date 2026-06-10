import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { BookCover } from "@/components/ui/BookCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReadingStatusControl } from "@/components/books/ReadingStatusControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLibraryStats } from "@/features/stats/useLibraryStats";
import { useActiveLoans, useBookViews } from "@/features/books/hooks";
import { useUsers } from "@/features/users/hooks";
import { useAuthStore } from "@/features/auth/store";
import { formatDate, READING_STATUS_CLASS, readingStatusLabel } from "@/lib/format";
import type { ReadingStatus } from "@/types/api";

const STATUS_ORDER: ReadingStatus[] = ["to_read", "reading", "read"];

export function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useLibraryStats();
  const loans = useActiveLoans();
  const bookViews = useBookViews();
  const users = useUsers();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";
  const [pickSeed, setPickSeed] = useState(() => Math.floor(Math.random() * 1000));

  if (isLoading) {
    return (
      <>
        <PageHeader title={t("dashboard.title")} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </>
    );
  }

  if (data.total === 0) {
    return (
      <>
        <PageHeader title={t("dashboard.title")} />
        <EmptyState
          icon="📚"
          title={t("dashboard.emptyTitle")}
          description={canEdit ? t("dashboard.emptyDescEditor") : t("dashboard.emptyDescViewer")}
          action={
            canEdit && (
              <Link to="/books/add">
                <Button>{t("dashboard.emptyAction")}</Button>
              </Link>
            )
          }
        />
      </>
    );
  }

  const userMap = new Map((users.data ?? []).map((u) => [u.id, u]));
  const bookViewMap = new Map(bookViews.data.map((v) => [v.book.id, v]));
  const activeLoans = (loans.data ?? []).filter((l) => !l.returned_at);
  const now = new Date();
  const toRead = data.toReadBooks;
  const pick = toRead.length > 0 ? toRead[pickSeed % toRead.length] : null;

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          canEdit && (
            <Link to="/books/add">
              <Button>{t("dashboard.addBookButton")}</Button>
            </Link>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("dashboard.totalBooksLabel")} value={data.total} />
        {STATUS_ORDER.map((s) => (
          <StatCard
            key={s}
            label={readingStatusLabel(s, t)}
            value={data.byStatus[s]}
            tone={READING_STATUS_CLASS[s]}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Currently Reading */}
        <Card className="min-w-0 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.currentlyReadingTitle")}</h2>
          {data.currentlyReading.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("dashboard.currentlyReadingEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {data.currentlyReading.map((v) => (
                <li key={v.book.id} className="flex min-w-0 items-center gap-3">
                  <BookCover url={v.record?.cover_url} title={v.record?.title} className="h-12 w-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/books/${v.book.id}`} className="block truncate font-medium text-ink hover:text-brand">
                      {v.record?.title ?? t("common.untitled")}
                    </Link>
                    {v.record?.main_author && (
                      <p className="truncate text-sm text-ink-soft">{v.record.main_author}</p>
                    )}
                    {v.book.current_reader_id && (
                      <p className="truncate text-xs text-brand">
                        {userMap.get(v.book.current_reader_id)?.full_name}
                      </p>
                    )}
                  </div>
                  <ReadingStatusControl bookId={v.book.id} status={v.book.reading_status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* On Loan */}
        <Card className="min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t("dashboard.onLoanTitle")}</h2>
            {activeLoans.length > 0 && (
              <Link to="/loans" className="text-xs text-brand hover:underline">
                {t("dashboard.onLoanViewAll")} →
              </Link>
            )}
          </div>
          {activeLoans.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("dashboard.onLoanEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {activeLoans.slice(0, 5).map((loan) => {
                const view = bookViewMap.get(loan.owned_book_id);
                const isOverdue = loan.due_date && new Date(loan.due_date) < now;
                return (
                  <li key={loan.id} className="flex min-w-0 items-center gap-3">
                    <BookCover url={view?.record?.cover_url} title={view?.record?.title} className="h-12 w-9 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/books/${loan.owned_book_id}`} className="block truncate font-medium text-ink hover:text-brand">
                        {view?.record?.title ?? t("common.untitled")}
                      </Link>
                      <p className="truncate text-sm text-ink-soft">{loan.borrower_name}</p>
                      {loan.due_date && (
                        <p className={`text-xs ${isOverdue ? "font-medium text-amber" : "text-ink-soft"}`}>
                          {isOverdue ? t("dashboard.onLoanOverdue") : t("dashboard.onLoanDue")}: {formatDate(loan.due_date)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Recently Added */}
        <Card className="min-w-0 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.recentlyAddedTitle")}</h2>
          <ul className="space-y-3">
            {data.recentlyAdded.map((v) => (
              <li key={v.book.id} className="flex min-w-0 items-center gap-3">
                <BookCover url={v.record?.cover_url} title={v.record?.title} className="h-12 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link to={`/books/${v.book.id}`} className="block truncate font-medium text-ink hover:text-brand">
                    {v.record?.title ?? t("common.untitled")}
                  </Link>
                  {v.record?.main_author && (
                    <p className="truncate text-sm text-ink-soft">{v.record.main_author}</p>
                  )}
                </div>
                <ReadingStatusControl bookId={v.book.id} status={v.book.reading_status} />
              </li>
            ))}
          </ul>
        </Card>

        {/* What to read next */}
        <Card className="min-w-0 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.nextReadTitle")}</h2>
          {pick ? (
            <div className="flex gap-4">
              <BookCover url={pick.record?.cover_url} title={pick.record?.title} className="h-28 w-20 shrink-0" />
              <div className="min-w-0 flex-1">
                <Link to={`/books/${pick.book.id}`} className="block font-medium leading-snug text-ink hover:text-brand">
                  {pick.record?.title ?? t("common.untitled")}
                </Link>
                {pick.record?.main_author && (
                  <p className="mt-1 text-sm text-ink-soft">{pick.record.main_author}</p>
                )}
                {pick.record?.genre && (
                  <p className="mt-1 text-xs text-ink-soft/70">{pick.record.genre}</p>
                )}
                <button
                  onClick={() => setPickSeed((s) => s + 1)}
                  className="mt-3 text-xs text-brand hover:underline"
                >
                  🎲 {t("dashboard.nextReadShuffle")}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">{t("dashboard.nextReadEmpty")}</p>
          )}
        </Card>

        {/* Unread by anyone */}
        <Card className="min-w-0 p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">{t("dashboard.unreadByAnyoneTitle")}</h2>
          <Link
            to="/stats/books?filter=unread"
            className="block font-display text-3xl font-semibold text-amber hover:underline"
          >
            {data.unreadByAnyone}
          </Link>
          <p className="mt-1 text-sm text-ink-soft">
            {data.unreadByAnyone === 1 ? t("dashboard.bookLabel") : t("dashboard.booksLabel")}{" "}
            {t("dashboard.unreadByAnyoneDesc")}
          </p>
        </Card>

        {/* Family Favorites */}
        <Card className="min-w-0 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.familyFavoritesTitle")}</h2>
          {data.sharedFavorites.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("dashboard.familyFavoritesEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {data.sharedFavorites.map(({ view, readCount }) => (
                <li key={view.book.id} className="flex min-w-0 items-center gap-3">
                  <BookCover url={view.record?.cover_url} title={view.record?.title} className="h-12 w-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/books/${view.book.id}`} className="block truncate font-medium text-ink hover:text-brand">
                      {view.record?.title ?? t("common.untitled")}
                    </Link>
                    {view.record?.main_author && (
                      <p className="truncate text-sm text-ink-soft">{view.record.main_author}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-sage">
                    {readCount} {t("dashboard.familyFavoritesReadBy")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Reading Goals */}
        {data.goalProgress.length > 0 && (
          <Card className="min-w-0 p-5 lg:col-span-2">
            <h2 className="mb-4 font-display text-lg font-semibold">
              {t("dashboard.readingGoalsTitle")} {new Date().getFullYear()}
            </h2>
            <ul className="space-y-4">
              {data.goalProgress.map((g) => {
                const pct = Math.min(100, Math.round((g.readThisYear / g.goal) * 100));
                return (
                  <li key={g.userId}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink">{g.name}</span>
                      <span className="text-ink-soft">
                        {g.readThisYear} / {g.goal} {t("dashboard.goalBooksLabel")} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-paper">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-sage" : "bg-brand"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${tone ? "" : "text-ink"}`}>
        {tone ? (
          <span className={`inline-block rounded-md px-2 py-1 ${tone}`}>{value}</span>
        ) : (
          value
        )}
      </p>
    </Card>
  );
}

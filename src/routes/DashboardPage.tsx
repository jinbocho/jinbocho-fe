import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AiPickCard } from "@/components/books/AiPickCard";
import { BookCover } from "@/components/ui/BookCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { NextToReadCard } from "@/components/books/NextToReadCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReadingStatusControl } from "@/components/books/ReadingStatusControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLibraryStats } from "@/features/stats/useLibraryStats";
import { sortLoansByDueDate, useActiveLoans, useBookViews, useFamilyReads } from "@/features/books/hooks";
import { useUsers } from "@/features/users/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useWishlist } from "@/features/wishlist/hooks";
import { formatDate, loanUrgency, LOAN_URGENCY_CLASS, READING_STATUS_CLASS, readingStatusLabel } from "@/lib/format";
import { Bookmark, BookOpen, EyeOff } from "lucide-react";

export function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useLibraryStats();
  const loans = useActiveLoans();
  const bookViews = useBookViews();
  const reads = useFamilyReads();
  const users = useUsers();
  const wishlist = useWishlist();
  const role = useAuthStore((s) => s.user?.role);
  const myId = useAuthStore((s) => s.user?.id);
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
        <Skeleton className="mt-3 h-16" />
      </>
    );
  }

  if (data.total === 0) {
    return (
      <>
        <PageHeader title={t("dashboard.title")} />
        <EmptyState
          icon={<BookOpen size={44} strokeWidth={1.5} />}
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
  const activeLoans = sortLoansByDueDate((loans.data ?? []).filter((l) => !l.returned_at));

  // "Feeling lucky" draws from books the CURRENT user personally hasn't read —
  // not the shared OwnedBook.reading_status field, which reflects whoever set
  // it last and says nothing about this specific member's own history.
  const myReadBookIds = new Set(
    (reads.data ?? []).filter((r) => r.user_id === myId).map((r) => r.owned_book_id),
  );
  const unreadByMe = bookViews.data.filter((v) => !myReadBookIds.has(v.book.id) && v.record);
  const pick = unreadByMe.length > 0 ? unreadByMe[pickSeed % unreadByMe.length] ?? null : null;

  function readerLabel(readerId: string | null): string | null {
    if (!readerId) return null;
    if (readerId === myId) return t("common.you");
    return userMap.get(readerId)?.full_name ?? null;
  }

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          canEdit && (
            <Link to="/books/add">
              <Button size="sm">{t("dashboard.addBookButton")}</Button>
            </Link>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("dashboard.totalBooksLabel")} value={data.total} />
        <StatCard
          label={readingStatusLabel("to_read", t)}
          value={data.byStatus.to_read}
          tone={READING_STATUS_CLASS.to_read}
        />
        <StatCard
          label={readingStatusLabel("reading", t)}
          value={data.byStatus.reading}
          tone={READING_STATUS_CLASS.reading}
        />
        <StatCard
          label={readingStatusLabel("read", t)}
          value={data.byStatus.read}
          tone={READING_STATUS_CLASS.read}
        />
      </div>

      {/* Distinct from the tiles above on purpose: this is a family-wide insight
          (derived from everyone's BookRead history), not another book-status count —
          a bare number tile next to "Read" invited reading it as the same kind of
          thing ("read by me" vs "read by anyone"). */}
      <Link
        to="/stats/books?filter=unread"
        className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:bg-paper"
      >
        <div className="flex items-center gap-3">
          <EyeOff size={22} className="shrink-0 text-ink-soft/50" aria-hidden="true" />
          <p className="text-sm text-ink">
            <span className="font-display text-lg font-semibold">{data.unreadByAnyone}</span>{" "}
            {data.unreadByAnyone === 1 ? t("dashboard.unreadInsightOne") : t("dashboard.unreadInsightMany")}
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-brand">{t("dashboard.unreadInsightCta")} →</span>
      </Link>

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
                    {readerLabel(v.book.current_reader_id) && (
                      <p className="truncate text-xs text-brand">
                        {readerLabel(v.book.current_reader_id)}
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
                const urgency = loanUrgency(loan.due_date);
                return (
                  <li key={loan.id} className="flex min-w-0 items-center gap-3">
                    <BookCover url={view?.record?.cover_url} title={view?.record?.title} className="h-12 w-9 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/books/${loan.owned_book_id}`} className="block truncate font-medium text-ink hover:text-brand">
                        {view?.record?.title ?? t("common.untitled")}
                      </Link>
                      <p className="truncate text-sm text-ink-soft">{loan.borrower_name}</p>
                      {loan.due_date && (
                        <p className={`text-xs ${LOAN_URGENCY_CLASS[urgency]}`}>
                          {urgency === "overdue" ? t("dashboard.onLoanOverdue") : t("dashboard.onLoanDue")}: {formatDate(loan.due_date)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Wishlist */}
        <Card className="min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t("dashboard.wishlistTitle")}</h2>
            {(wishlist.data?.length ?? 0) > 0 && (
              <Link to="/wishlist" className="text-xs text-brand hover:underline">
                {t("dashboard.wishlistViewAll")} →
              </Link>
            )}
          </div>
          {(wishlist.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-soft">{t("dashboard.wishlistEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {(wishlist.data ?? []).slice(0, 5).map((item) => (
                <li key={item.id} className="flex min-w-0 items-center gap-3">
                  <BookCover url={item.record.cover_url} title={item.record.title} className="h-12 w-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="block truncate font-medium text-ink">{item.record.title}</p>
                    {item.record.main_author && (
                      <p className="truncate text-sm text-ink-soft">{item.record.main_author}</p>
                    )}
                    <p className="truncate text-xs text-stone">
                      <span className="inline-flex items-center gap-1"><Bookmark size={11} />{userMap.get(item.user_id)?.full_name ?? "…"}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* AI picks — separate, manually-triggered card; never fetched automatically */}
        <AiPickCard />

        {/* What to read next — random pick + "I'm feeling lucky" */}
        <NextToReadCard pick={pick} onShuffle={() => setPickSeed(Math.floor(Math.random() * 1000))} />

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

function StatCard({ label, value, tone, to }: { label: string; value: number; tone?: string; to?: string }) {
  const content = (
    <>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${tone ? "" : "text-ink"}`}>
        {tone ? (
          <span className={`inline-block rounded-md px-2 py-1 ${tone}`}>{value}</span>
        ) : (
          value
        )}
      </p>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:bg-paper"
      >
        {content}
      </Link>
    );
  }

  return <Card className="p-4">{content}</Card>;
}

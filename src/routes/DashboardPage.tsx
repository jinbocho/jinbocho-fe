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
import { useAuthStore } from "@/features/auth/store";
import { READING_STATUS_CLASS, readingStatusLabel } from "@/lib/format";
import type { ReadingStatus } from "@/types/api";

const STATUS_ORDER: ReadingStatus[] = ["to_read", "reading", "read"];

export function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useLibraryStats();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";

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

  const maxRoom = Math.max(...data.byRoom.map((r) => r.count), 1);

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
        <StatCard label={t("dashboard.totalBooksLabel")} value={data.total} tone="bg-brand/15 text-brand" />
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
        <Card className="min-w-0 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.byRoomTitle")}</h2>
          {data.byRoom.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("dashboard.noRoomsYet")}</p>
          ) : (
            <ul className="space-y-3">
              {data.byRoom.map((r) => (
                <li key={r.roomId ?? "unassigned"}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink">{r.roomName}</span>
                    <span className="text-ink-soft">{r.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(r.count / maxRoom) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-w-0 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.recentlyAddedTitle")}</h2>
          <ul className="space-y-3">
            {data.recentlyAdded.map((v) => (
              <li key={v.book.id} className="flex min-w-0 items-center gap-3">
                <BookCover url={v.record?.cover_url} title={v.record?.title} className="h-12 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link to={`/books/${v.book.id}`} className="block truncate font-medium text-ink hover:text-brand">
                    {v.record?.title ?? "Untitled"}
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

        {data.ownedByMember.length > 0 && (
          <Card className="min-w-0 p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.ownedByMemberTitle")}</h2>
            <ul className="space-y-2 text-sm">
              {data.ownedByMember.map((m) => (
                <li key={m.userId} className="flex justify-between">
                  <span className="text-ink">{m.name}</span>
                  <Link
                    to={`/stats/books?filter=owned&user=${m.userId}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {m.count}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data.readByMember.length > 0 && (
          <Card className="min-w-0 p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.readByMemberTitle")}</h2>
            <ul className="space-y-2 text-sm">
              {data.readByMember.map((m) => (
                <li key={m.userId} className="flex justify-between">
                  <span className="text-ink">{m.name}</span>
                  <Link
                    to={`/stats/books?filter=read&user=${m.userId}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {m.count}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="min-w-0 p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">{t("dashboard.unreadByAnyoneTitle")}</h2>
          <Link
            to="/stats/books?filter=unread"
            className="block font-display text-3xl font-semibold text-amber hover:underline"
          >
            {data.unreadByAnyone}
          </Link>
          <p className="mt-1 text-sm text-ink-soft">
            {data.unreadByAnyone === 1 ? t("dashboard.bookLabel") : t("dashboard.booksLabel")} {t("dashboard.unreadByAnyoneDesc")}
          </p>
        </Card>

        {data.goalProgress.length > 0 && (
          <Card className="min-w-0 p-5 lg:col-span-2">
            <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.readingGoalsTitle")} {new Date().getFullYear()}</h2>
            <ul className="space-y-4">
              {data.goalProgress.map((g) => {
                const pct = Math.min(100, Math.round((g.readThisYear / g.goal) * 100));
                return (
                  <li key={g.userId}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink">{g.name}</span>
                      <span className="text-ink-soft">{g.readThisYear} / {g.goal} {t("dashboard.goalBooksLabel")} ({pct}%)</span>
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

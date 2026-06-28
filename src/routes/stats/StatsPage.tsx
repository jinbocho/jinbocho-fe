import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Avatar } from "@/components/ui/Avatar";
import { BookCover } from "@/components/ui/BookCover";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLibraryStats } from "@/features/stats/useLibraryStats";
import { useUsers } from "@/features/users/hooks";
import { genreLabel } from "@/lib/format";

function decadeLabel(decade: number, lang: string): string {
  const short = String(decade % 100).padStart(2, "0");
  if (lang === "it") return `Anni '${short}`;
  if (lang === "fr") return `Années ${short}`;
  if (lang === "es") return `Años ${short}`;
  return `${decade}s`;
}

export function StatsPage() {
  const { t, i18n } = useTranslation();
  const { data: stats, isLoading, isError } = useLibraryStats();
  const users = useUsers();

  if (isError) return <ErrorState message={t("stats.loadError")} />;

  if (isLoading) {
    return (
      <>
        <PageHeader title={t("stats.pageTitle")} />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </>
    );
  }

  const maxAuthorCount = stats.topAuthors[0]?.count ?? 1;
  const maxPaceCount = Math.max(...stats.readingPaceByMonth.map((m) => m.count), 1);

  // Join readByMember + ownedByMember by userId for the member cards
  const memberCards = (users.data ?? []).map((u) => {
    const readEntry = stats.readByMember.find((m) => m.userId === u.id);
    const ownedEntry = stats.ownedByMember.find((m) => m.userId === u.id);
    const favoriteGenre = stats.favoriteGenreByMember.find((g) => g.userId === u.id)?.genre ?? null;
    return {
      user: u,
      readCount: readEntry?.count ?? 0,
      ownedCount: ownedEntry?.count ?? 0,
      favoriteGenre,
    };
  }).sort((a, b) => b.readCount - a.readCount);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("stats.pageTitle")}
        description={t("stats.pageDescription")}
      />

      {/* % library read — prominent single stat */}
      {stats.total > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.pctReadSection")}</h2>
          <Card className="p-5">
            <div className="flex items-end gap-4">
              <span className="font-display text-5xl font-bold text-brand">{stats.pctLibraryRead}%</span>
              <p className="mb-1.5 text-sm text-ink-soft">{t("stats.pctReadLabel")}</p>
            </div>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand transition-all duration-700"
                style={{ width: `${stats.pctLibraryRead}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-ink-soft">
              <span>{stats.total - stats.unreadByAnyone} {t("stats.pctReadDone")}</span>
              <span>{stats.unreadByAnyone} {t("stats.pctReadLeft")}</span>
            </div>
          </Card>
        </section>
      )}

      {/* Reading pace by month */}
      {stats.readingPaceByMonth.some((m) => m.count > 0) && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.monthlyPaceSection")}</h2>
          <Card className="p-4">
            <div className="space-y-2">
              {stats.readingPaceByMonth.map(({ year, month, count }) => {
                const label = new Date(year, month).toLocaleString(i18n.language, {
                  month: "short",
                  year: "numeric",
                });
                return (
                  <div key={`${year}-${month}`} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-right text-xs text-ink-soft capitalize">{label}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-line h-2">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${Math.round((count / maxPaceCount) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs font-medium text-ink">{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* Reading goals */}
      {stats.goalProgress.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.goalsSection")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.goalProgress.map(({ userId, name, goal, readThisYear }) => {
              const pct = Math.min(100, Math.round((readThisYear / goal) * 100));
              const done = readThisYear >= goal;
              return (
                <Card key={userId} className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-medium text-ink">{name}</span>
                    <span className={`text-sm font-semibold ${done ? "text-sage" : "text-ink-soft"}`}>
                      {readThisYear}/{goal} {t("stats.goalBooksLabel")}
                    </span>
                  </div>
                  <div className="w-full overflow-hidden rounded-full bg-line h-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${done ? "bg-sage" : "bg-brand"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-right text-xs text-ink-soft">{pct}%</p>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Shared favorites */}
      {stats.sharedFavorites.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.sharedFavoritesSection")}</h2>
          <Card className="p-4">
            <ul className="space-y-3">
              {stats.sharedFavorites.map(({ view, readCount }) => (
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
                    {readCount} {t("stats.sharedFavoritesReadBy")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Per-member cards */}
      {memberCards.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.membersSection")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberCards.map(({ user, readCount, ownedCount, favoriteGenre }) => (
              <Card key={user.id} className="flex flex-col p-4">
                <div className="mb-4 flex items-center gap-3">
                  <Avatar name={user.full_name} className="h-11 w-11 text-base" />
                  <div>
                    <p className="font-medium text-ink">{user.full_name}</p>
                    <p className="text-xs text-stone capitalize">{user.role}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{t("stats.booksReadLabel")}</span>
                    <span className="font-semibold text-sage">{readCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{t("stats.booksOwnedLabel")}</span>
                    <span className="font-semibold text-ink">{ownedCount}</span>
                  </div>
                  {favoriteGenre && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">{t("stats.favoriteGenreLabel")}</span>
                      <span className="font-semibold text-ink">{genreLabel(favoriteGenre, t)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-3 text-xs">
                  <Link
                    to={`/stats/books?filter=read&user=${user.id}`}
                    className="text-brand hover:underline"
                  >
                    {t("stats.viewRead")} →
                  </Link>
                  <Link
                    to={`/stats/books?filter=owned&user=${user.id}`}
                    className="text-brand hover:underline"
                  >
                    {t("stats.viewOwned")} →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Genre distribution */}
      {stats.byGenre.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.genreSection")}</h2>
          <Card className="p-4">
            <div className="space-y-3">
              {stats.byGenre.map(({ genre, count, pct }) => (
                <div key={genre}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-ink">{genreLabel(genre, t)}</span>
                    <span className="text-ink-soft">
                      {count} {count === 1 ? t("stats.bookSingular") : t("stats.bookPlural")} · {pct}%
                    </span>
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
        </section>
      )}

      {/* Language distribution */}
      {stats.byLanguage.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.byLanguageSection")}</h2>
          <Card className="p-4">
            <div className="space-y-3">
              {stats.byLanguage.map(({ language, count, pct }) => (
                <div key={language}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-ink capitalize">{language}</span>
                    <span className="text-ink-soft">
                      {count} {count === 1 ? t("stats.bookSingular") : t("stats.bookPlural")} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-amber transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Top authors */}
      {stats.topAuthors.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.topAuthorsSection")}</h2>
          <Card className="p-4">
            <div className="space-y-4">
              {stats.topAuthors.map(({ author, count }, idx) => (
                <div key={author} className="flex items-center gap-4">
                  <span className="w-6 shrink-0 text-center font-display text-2xl text-ink-soft/50">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="truncate font-medium text-ink">{author}</span>
                      <span className="ml-2 shrink-0 text-ink-soft">
                        {count} {count === 1 ? t("stats.bookSingular") : t("stats.bookPlural")}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-sage transition-all duration-500"
                        style={{ width: `${Math.round((count / maxAuthorCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Books by room */}
      {stats.byRoom.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.byRoomSection")}</h2>
          <Card className="p-4">
            <div className="space-y-3">
              {stats.byRoom.map(({ roomId, roomName, count }) => {
                const pct = Math.round((count / (stats.total || 1)) * 100);
                return (
                  <div key={roomId ?? "unassigned"}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-ink">{roomName}</span>
                      <span className="text-ink-soft">
                        {count} {count === 1 ? t("stats.bookSingular") : t("stats.bookPlural")} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-amber transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* Publication decade */}
      {stats.byDecade.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-medium text-ink">{t("stats.byDecadeSection")}</h2>
          <Card className="p-4">
            <div className="space-y-3">
              {stats.byDecade.map(({ decade, count }) => {
                const pct = Math.round((count / (stats.total || 1)) * 100);
                return (
                  <div key={decade}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-ink">{decadeLabel(decade, i18n.language)}</span>
                      <span className="text-ink-soft">
                        {count} {count === 1 ? t("stats.bookSingular") : t("stats.bookPlural")} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-stone transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

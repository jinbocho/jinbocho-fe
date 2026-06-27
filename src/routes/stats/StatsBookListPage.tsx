import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SearchX } from "lucide-react";

import { BookListItem } from "@/components/books/BookListItem";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { buildReadersByBook, useBookViews, useFamilyReads } from "@/features/books/hooks";
import { useUsers } from "@/features/users/hooks";

type Filter = "unread" | "read" | "owned";

export function StatsBookListPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const filter = (params.get("filter") ?? "unread") as Filter;
  const userId = params.get("user");

  const books = useBookViews();
  const reads = useFamilyReads();
  const users = useUsers();

  const userName = useMemo(
    () => (userId ? (users.data?.find((u) => u.id === userId)?.full_name ?? null) : null),
    [userId, users.data],
  );

  const readersByBook = useMemo(
    () => buildReadersByBook(reads.data ?? [], users.data ?? []),
    [reads.data, users.data],
  );

  const filtered = useMemo(() => {
    if (!books.data || !reads.data) return [];

    if (filter === "unread") {
      const readBookIds = new Set(reads.data.map((r) => r.owned_book_id));
      return books.data.filter(({ book }) => !readBookIds.has(book.id));
    }

    if (filter === "read" && userId) {
      const readBookIds = new Set(
        reads.data.filter((r) => r.user_id === userId).map((r) => r.owned_book_id),
      );
      return books.data.filter(({ book }) => readBookIds.has(book.id));
    }

    if (filter === "owned" && userId) {
      return books.data.filter(({ book }) => book.owner_id === userId);
    }

    return [];
  }, [books.data, reads.data, filter, userId]);

  const isLoading = books.isLoading || reads.isLoading || users.isLoading;
  const isError = books.isError || reads.isError;

  if (isError) return <ErrorState message="Couldn't load books." onRetry={books.refetch} />;

  function pageTitle(): string {
    if (filter === "unread") return t("stats.unreadTitle");
    if (filter === "read") return userName ? `${t("stats.readByTitle")} ${userName}` : t("stats.readByMemberTitle");
    return userName ? `${t("stats.ownedByTitle")} ${userName}` : t("stats.ownedByMemberTitle");
  }

  const title = pageTitle();

  return (
    <>
      <Link to="/stats" className="mb-4 inline-block text-sm text-brand hover:underline">
        {t("stats.backLink")}
      </Link>

      <PageHeader
        title={title}
        description={isLoading ? undefined : `${filtered.length} ${filtered.length === 1 ? t("stats.bookLabel") : t("stats.booksLabel")}`}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX size={44} strokeWidth={1.5} />}
          title={t("stats.noMatchesTitle")}
          description={t("stats.noMatchesDescription")}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((view) => (
            <li key={view.book.id}>
              <BookListItem view={view} readers={readersByBook.get(view.book.id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

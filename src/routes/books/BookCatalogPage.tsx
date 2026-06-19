import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { BookListItem } from "@/components/books/BookListItem";
import { ExportMenu } from "@/components/books/ExportMenu";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { buildReadersByBook, useActiveLoans, useBookViews, useFamilyReads } from "@/features/books/hooks";
import { useRooms } from "@/features/locations/hooks";
import { useUsers } from "@/features/users/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useDebounce } from "@/hooks/useDebounce";
import { genreLabel, READING_STATUSES, readingStatusLabel } from "@/lib/format";

export function BookCatalogPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, isError, refetch } = useBookViews();
  const rooms = useRooms();
  const users = useUsers();
  const activeLoans = useActiveLoans();
  const reads = useFamilyReads();
  const onLoanIds = useMemo(
    () => new Set((activeLoans.data ?? []).map((l) => l.owned_book_id)),
    [activeLoans.data],
  );
  const readersByBook = useMemo(
    () => buildReadersByBook(reads.data ?? [], users.data ?? []),
    [reads.data, users.data],
  );
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";

  const roomFilter = params.get("room") ?? "";
  const statusFilter = params.get("status") ?? "";
  const ownerFilter = params.get("owner") ?? "";
  const genreFilter = params.get("genre") ?? "";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const debouncedQuery = useDebounce(query, 250);

  const roomNames = useMemo(
    () => new Map((rooms.data ?? []).map((r) => [r.id, r.name])),
    [rooms.data],
  );

  // Genres actually present in the library, sorted by translated label.
  const genreOptions = useMemo(() => {
    const present = new Set<string>();
    for (const { record } of data) {
      if (record?.genre) present.add(record.genre);
    }
    return [...present]
      .map((g) => ({ value: g, label: genreLabel(g, t) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data, t]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return data.filter(({ book, record }) => {
      if (roomFilter && book.room_id !== roomFilter) return false;
      if (statusFilter && book.reading_status !== statusFilter) return false;
      if (ownerFilter && book.owner_id !== ownerFilter) return false;
      if (genreFilter && record?.genre !== genreFilter) return false;
      if (q) {
        const hay = `${record?.title ?? ""} ${record?.main_author ?? ""} ${record?.isbn ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, roomFilter, statusFilter, ownerFilter, genreFilter, debouncedQuery]);

  function setParam(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  return (
    <>
      <PageHeader
        title={t("books.catalog.title")}
        description={data.length ? `${data.length} ${t("books.catalog.countDesc")}` : undefined}
        actions={
          <>
            <ExportMenu disabled={data.length === 0} />
            {canEdit && (
              <>
                <Link to="/books/add/shelf">
                  <Button size="sm" variant="secondary">{t("books.catalog.shelfModeButton")}</Button>
                </Link>
                <Link to="/books/add">
                  <Button size="sm">{t("books.catalog.addButton")}</Button>
                </Link>
              </>
            )}
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <SearchInput
          label={t("books.catalog.searchPlaceholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setParam("q", e.target.value);
          }}
        />
        <Select
          aria-label="Filter by room"
          placeholder={t("books.catalog.filterRooms")}
          value={roomFilter}
          options={(rooms.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
          onChange={(e) => setParam("room", e.target.value)}
        />
        <Select
          aria-label="Filter by status"
          placeholder={t("books.catalog.filterStatuses")}
          value={statusFilter}
          options={READING_STATUSES.map((s) => ({ value: s, label: readingStatusLabel(s, t) }))}
          onChange={(e) => setParam("status", e.target.value)}
        />
        <Select
          aria-label="Filter by owner"
          placeholder={t("books.catalog.filterOwners")}
          value={ownerFilter}
          options={(users.data ?? []).map((u) => ({ value: u.id, label: u.full_name }))}
          onChange={(e) => setParam("owner", e.target.value)}
        />
        <Select
          aria-label="Filter by genre"
          placeholder={t("books.catalog.filterGenres")}
          value={genreFilter}
          options={genreOptions}
          onChange={(e) => setParam("genre", e.target.value)}
        />
      </div>

      {isError ? (
        <ErrorState message={t("books.catalog.loadError")} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.5rem]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon="📚"
          title={t("books.catalog.emptyTitle")}
          description={canEdit ? t("books.catalog.emptyDescEditor") : t("books.catalog.emptyDescViewer")}
          action={
            canEdit && (
              <Link to="/books/add">
                <Button>{t("books.catalog.emptyAction")}</Button>
              </Link>
            )
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title={t("books.catalog.noMatchesTitle")} description={t("books.catalog.noMatchesDesc")} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((view) => (
            <li key={view.book.id}>
              <BookListItem
                view={view}
                roomName={view.book.room_id ? roomNames.get(view.book.room_id) : undefined}
                onLoan={onLoanIds.has(view.book.id)}
                readers={readersByBook.get(view.book.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

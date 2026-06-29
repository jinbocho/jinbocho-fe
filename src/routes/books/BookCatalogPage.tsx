import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { BookListItem } from "@/components/books/BookListItem";
import { ExportMenu } from "@/components/books/ExportMenu";
import { Badge } from "@/components/ui/Badge";
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
import { Library } from "lucide-react";

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
  const loanBorrowerByBook = useMemo(
    () => new Map((activeLoans.data ?? []).map((l) => [l.owned_book_id, l.borrower_name])),
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
  const loanFilter = params.get("loan") ?? "";
  // "loc" is a deep-link-only filter set from the Rooms & Bookcases page
  // (bookcase/section/shelf granularity isn't exposed as a dropdown here).
  const locFilter = params.get("loc") ?? "";
  const locType = params.get("locType") ?? "";
  const locName = params.get("locName") ?? "";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const debouncedQuery = useDebounce(query, 250);
  const [filtersOpen, setFiltersOpen] = useState(
    () => Boolean(roomFilter || statusFilter || ownerFilter || genreFilter || loanFilter),
  );
  const activeFilterCount = [roomFilter, statusFilter, ownerFilter, genreFilter, loanFilter].filter(Boolean).length;

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
      if (loanFilter && !onLoanIds.has(book.id)) return false;
      if (locFilter && locType === "bookcase" && book.bookcase_id !== locFilter) return false;
      if (locFilter && locType === "section" && book.section_id !== locFilter) return false;
      if (locFilter && locType === "shelf" && book.shelf_id !== locFilter) return false;
      if (q) {
        const hay = `${record?.title ?? ""} ${record?.main_author ?? ""} ${record?.isbn ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, roomFilter, statusFilter, ownerFilter, genreFilter, loanFilter, onLoanIds, locFilter, locType, debouncedQuery]);

  function setParam(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  function clearFilters() {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("room");
      next.delete("status");
      next.delete("owner");
      next.delete("genre");
      next.delete("loan");
      return next;
    });
  }

  function clearLocationFilter() {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      // "Mostra libri qui" always sets room together with loc/locType/locName,
      // so clearing the banner should undo that whole navigation context.
      next.delete("room");
      next.delete("loc");
      next.delete("locType");
      next.delete("locName");
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
            <ExportMenu disabled={data.length === 0} align="left" />
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

      {locFilter && locName && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-brand/30 bg-brand/5 px-4 py-2.5">
          <span className="text-sm text-ink">
            {t("books.catalog.locationFilterActive")} <strong className="font-medium">{locName}</strong>
          </span>
          <button
            type="button"
            onClick={clearLocationFilter}
            className="shrink-0 text-sm font-medium text-brand hover:underline"
          >
            {t("books.catalog.clearLocationFilter")}
          </button>
        </div>
      )}

      <div className="mb-4 space-y-3">
        <div className="flex gap-3">
          <SearchInput
            label={t("books.catalog.searchPlaceholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setParam("q", e.target.value);
            }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
            className="shrink-0"
          >
            {t("books.catalog.filtersToggle")} {filtersOpen ? "▴" : "▾"}
            {activeFilterCount > 0 && (
              <Badge tone="bg-brand/10 text-brand">{activeFilterCount}</Badge>
            )}
          </Button>
        </div>

        {filtersOpen && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink-soft hover:border-brand-soft">
              <input
                type="checkbox"
                className="accent-brand"
                checked={loanFilter === "1"}
                onChange={(e) => setParam("loan", e.target.checked ? "1" : "")}
              />
              {t("books.catalog.filterOnLoan")}
            </label>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-brand hover:underline sm:col-span-2 lg:col-span-4"
              >
                {t("books.catalog.clearFilters")}
              </button>
            )}
          </div>
        )}
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
          icon={<Library size={44} strokeWidth={1.5} />}
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
                loanBorrower={loanBorrowerByBook.get(view.book.id)}
                readers={readersByBook.get(view.book.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

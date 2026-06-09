import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { BookListItem } from "@/components/books/BookListItem";
import { ExportMenu } from "@/components/books/ExportMenu";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBookViews } from "@/features/books/hooks";
import { useRooms } from "@/features/locations/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useDebounce } from "@/hooks/useDebounce";
import { READING_STATUS_LABEL, READING_STATUSES } from "@/lib/format";

export function BookCatalogPage() {
  const [params, setParams] = useSearchParams();
  const { data, isLoading, isError, refetch } = useBookViews();
  const rooms = useRooms();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";

  const roomFilter = params.get("room") ?? "";
  const statusFilter = params.get("status") ?? "";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const debouncedQuery = useDebounce(query, 250);

  const roomNames = useMemo(
    () => new Map((rooms.data ?? []).map((r) => [r.id, r.name])),
    [rooms.data],
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return data.filter(({ book, record }) => {
      if (roomFilter && book.room_id !== roomFilter) return false;
      if (statusFilter && book.reading_status !== statusFilter) return false;
      if (q) {
        const hay = `${record?.title ?? ""} ${record?.main_author ?? ""} ${record?.isbn ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, roomFilter, statusFilter, debouncedQuery]);

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
        title="Books"
        description={data.length ? `${data.length} in your library` : undefined}
        actions={
          <>
            <ExportMenu disabled={data.length === 0} />
            {canEdit && (
              <Link to="/books/add">
                <Button size="sm">Add book</Button>
              </Link>
            )}
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SearchInput
          label="Search title, author, ISBN"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setParam("q", e.target.value);
          }}
        />
        <Select
          aria-label="Filter by room"
          placeholder="All rooms"
          value={roomFilter}
          options={(rooms.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
          onChange={(e) => setParam("room", e.target.value)}
        />
        <Select
          aria-label="Filter by status"
          placeholder="All statuses"
          value={statusFilter}
          options={READING_STATUSES.map((s) => ({ value: s, label: READING_STATUS_LABEL[s] }))}
          onChange={(e) => setParam("status", e.target.value)}
        />
      </div>

      {isError ? (
        <ErrorState message="Couldn't load your books." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.5rem]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No books yet"
          description={canEdit ? "Add your first book to start your catalog." : "No books have been added yet."}
          action={
            canEdit && (
              <Link to="/books/add">
                <Button>Add a book</Button>
              </Link>
            )
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" description="Try adjusting your search or filters." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((view) => (
            <li key={view.book.id}>
              <BookListItem
                view={view}
                roomName={view.book.room_id ? roomNames.get(view.book.room_id) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

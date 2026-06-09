import { Link, useNavigate, useParams } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBookcaseMap } from "@/features/map/hooks";
import { READING_STATUS_LABEL } from "@/lib/format";
import type { BookOnShelf } from "@/types/api";

const SPINE_COLOR: Record<string, string> = {
  to_read: "bg-stone",
  reading: "bg-amber",
  read: "bg-sage",
};

export function BookcaseMapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const map = useBookcaseMap(id);

  if (map.isError) return <ErrorState message="Couldn't load this bookcase." onRetry={map.refetch} />;
  if (map.isLoading || !map.data) {
    return (
      <>
        <PageHeader title="Bookcase" />
        <Skeleton className="h-64" />
      </>
    );
  }

  const data = map.data;
  const empty = data.sections.every((s) => s.shelves.every((sh) => sh.books.length === 0));

  return (
    <>
      <Link to="/locations" className="mb-4 inline-block text-sm text-brand hover:underline">
        ← Back to rooms
      </Link>
      <PageHeader title={data.bookcase_name} description="Visual map of this bookcase." />

      {data.sections.length === 0 ? (
        <EmptyState
          title="No sections"
          description="Add sections and shelves to this bookcase from the rooms page."
          action={
            <Link to="/locations" className="text-brand hover:underline">
              Go to rooms
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            {(["to_read", "reading", "read"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-ink-soft">
                <span className={`inline-block h-3 w-3 rounded-sm ${SPINE_COLOR[s]}`} />
                {READING_STATUS_LABEL[s]}
              </span>
            ))}
          </div>

          {empty && <p className="mb-4 text-sm text-ink-soft">This bookcase has no books yet.</p>}

          <div className="space-y-4">
            {data.sections
              .slice()
              .sort((a, b) => a.section_index - b.section_index)
              .map((section) => (
                <Card key={section.section_id} className="p-4">
                  <h2 className="mb-3 text-sm font-semibold text-ink-soft">
                    Section {section.section_index + 1}
                  </h2>
                  <div className="space-y-3">
                    {section.shelves
                      .slice()
                      .sort((a, b) => a.shelf_index - b.shelf_index)
                      .map((shelf) => (
                        <div key={shelf.shelf_id}>
                          <div className="flex items-end gap-1 overflow-x-auto border-b-2 border-line pb-1">
                            {shelf.books.length === 0 ? (
                              <span className="py-4 text-xs text-stone">Empty shelf</span>
                            ) : (
                              shelf.books.map((book) => (
                                <Spine key={book.id} book={book} onClick={() => navigate(`/books/${book.id}`)} />
                              ))
                            )}
                          </div>
                          <p className="mt-1 text-xs text-stone">Shelf {shelf.shelf_index + 1}</p>
                        </div>
                      ))}
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}
    </>
  );
}

function Spine({ book, onClick }: { book: BookOnShelf; onClick: () => void }) {
  const title = book.title ?? "Untitled";
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${title}${book.main_author ? ` — ${book.main_author}` : ""}`}
      className={`group relative h-24 w-7 shrink-0 rounded-sm ${SPINE_COLOR[book.reading_status] ?? "bg-stone"} transition-transform hover:-translate-y-1`}
    >
      <span className="absolute inset-0 flex items-center justify-center overflow-hidden px-0.5 text-[9px] font-medium text-white [writing-mode:vertical-rl]">
        {title}
      </span>
    </button>
  );
}

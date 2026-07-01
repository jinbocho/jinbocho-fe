import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBookcaseMap } from "@/features/map/hooks";
import { shelfLocationSearch } from "@/features/shelfscan/deeplink";
import { useAiUsable } from "@/features/system/hooks";
import { readingStatusLabel } from "@/lib/format";
import type { BookOnShelf } from "@/types/api";

const SPINE_COLOR: Record<string, string> = {
  to_read: "bg-stone",
  reading: "bg-amber",
  read: "bg-sage",
};

export function BookcaseMapPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const map = useBookcaseMap(id);
  const aiUsable = useAiUsable();

  if (map.isError) return <ErrorState message="Couldn't load this bookcase." onRetry={map.refetch} />;
  if (map.isLoading || !map.data) {
    return (
      <>
        <PageHeader title={t("locations.bookcaseTitle")} />
        <Skeleton className="h-64" />
      </>
    );
  }

  const data = map.data;
  const empty = data.sections.every((s) => s.shelves.every((sh) => sh.books.length === 0));

  return (
    <>
      <Link to="/locations" className="mb-4 inline-block text-sm text-brand hover:underline">
        {t("locations.backLink")}
      </Link>
      <PageHeader title={data.bookcase_name} description={t("locations.mapDescription")} />

      {data.sections.length === 0 ? (
        <EmptyState
          title={t("locations.noSectionsTitle")}
          description={t("locations.noSectionsDescription")}
          action={
            <Link to="/locations" className="text-brand hover:underline">
              {t("locations.goToRoomsLink")}
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            {(["to_read", "reading", "read"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-ink-soft">
                <span className={`inline-block h-3 w-3 rounded-sm ${SPINE_COLOR[s]}`} />
                {readingStatusLabel(s, t)}
              </span>
            ))}
          </div>

          {empty && <p className="mb-4 text-sm text-ink-soft">{t("locations.bookcaseEmpty")}</p>}

          <div className="space-y-4">
            {data.sections
              .slice()
              .sort((a, b) => a.section_index - b.section_index)
              .map((section) => (
                <Card key={section.section_id} className="p-4">
                  <h2 className="mb-3 text-sm font-semibold text-ink-soft">
                    {section.label ?? `${t("locations.sectionLabel")} ${section.section_index + 1}`}
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
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="text-xs text-stone">{t("locations.shelfLabel")} {shelf.shelf_index + 1}</p>
                            {aiUsable && (() => {
                              const q = shelfLocationSearch({
                                room_id: data.room_id,
                                bookcase_id: data.bookcase_id,
                                section_id: section.section_id,
                                shelf_id: shelf.shelf_id,
                              });
                              return (
                                <div className="flex shrink-0 gap-3">
                                  <Link
                                    to={`/books/add/shelf-scan?${q}`}
                                    className="text-xs text-brand hover:underline"
                                  >
                                    {t("books.shelfScan.scanThisShelf")}
                                  </Link>
                                  {shelf.books.length > 0 && (
                                    <Link
                                      to={`/books/audit/shelf?${q}`}
                                      className="text-xs text-brand hover:underline"
                                    >
                                      {t("books.shelfAudit.auditThisShelf")}
                                    </Link>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
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

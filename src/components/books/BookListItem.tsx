import { Link } from "react-router-dom";

import { ReadingStatusControl } from "@/components/books/ReadingStatusControl";
import { BookCover } from "@/components/ui/BookCover";
import { useReaderName } from "@/features/users/hooks";
import type { BookView } from "@/types/api";

export function BookListItem({
  view,
  roomName,
  onLoan,
  readers,
}: {
  view: BookView;
  roomName?: string;
  onLoan?: boolean;
  // Family members who have read this book — only relevant for reading_status "read".
  readers?: string[];
}) {
  const { book, record } = view;
  const title = record?.title ?? "Untitled";
  const author = record?.main_author;
  const reader = useReaderName(book.reading_status === "reading" ? book.current_reader_id : null);
  // Independent of book.reading_status (that's this copy's own state) — shows
  // whichever family members have personally finished this book.
  const readBy = readers && readers.length > 0 ? readers.join(", ") : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-brand-soft">
      <Link
        to={`/books/${book.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <BookCover url={record?.cover_url} title={record?.title} className="h-16 w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{title}</p>
          {author && <p className="truncate text-sm text-ink-soft">{author}</p>}
          {roomName && <p className="mt-0.5 truncate text-xs text-stone">📍 {roomName}</p>}
          {reader && <p className="mt-0.5 truncate text-xs text-amber">📖 {reader}</p>}
          {readBy && <p className="mt-0.5 truncate text-xs text-sage" title={readBy}>✓ {readBy}</p>}
          {onLoan && <p className="mt-0.5 truncate text-xs text-amber">📤 In prestito</p>}
        </div>
      </Link>
      <div className="shrink-0">
        <ReadingStatusControl bookId={book.id} status={book.reading_status} />
      </div>
    </div>
  );
}

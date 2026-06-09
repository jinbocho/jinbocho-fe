import { Link } from "react-router-dom";

import { ReadingStatusControl } from "@/components/books/ReadingStatusControl";
import { BookCover } from "@/components/ui/BookCover";
import { useReaderName } from "@/features/users/hooks";
import type { BookView } from "@/types/api";

export function BookListItem({ view, roomName }: { view: BookView; roomName?: string }) {
  const { book, record } = view;
  const title = record?.title ?? "Untitled";
  const author = record?.main_author;
  const reader = useReaderName(book.reading_status === "reading" ? book.current_reader_id : null);

  return (
    <Link
      to={`/books/${book.id}`}
      className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-brand-soft"
    >
      <BookCover url={record?.cover_url} title={record?.title} className="h-16 w-12 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{title}</p>
        {author && <p className="truncate text-sm text-ink-soft">{author}</p>}
        {roomName && <p className="mt-0.5 truncate text-xs text-stone">📍 {roomName}</p>}
        {reader && <p className="mt-0.5 truncate text-xs text-amber">📖 {reader}</p>}
      </div>
      <div className="shrink-0">
        <ReadingStatusControl bookId={book.id} status={book.reading_status} />
      </div>
    </Link>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ReadingStatusControl } from "@/components/books/ReadingStatusControl";
import { LocationPicker, type LocationSelection } from "@/components/locations/LocationPicker";
import { BookCover } from "@/components/ui/BookCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  useBook,
  useBookHistory,
  useDeleteBook,
  useUpdateBook,
  useUpdateBookPosition,
} from "@/features/books/hooks";
import { useRecord, useUpdateRecord } from "@/features/records/hooks";
import { useRooms } from "@/features/locations/hooks";
import { useReaderName } from "@/features/users/hooks";
import { useAuthStore } from "@/features/auth/store";
import { BOOK_CONDITIONS, BOOK_SOURCES, formatDate, formatDateTime } from "@/lib/format";
import type { BibliographicRecord, BookCondition, BookSource, OwnedBook } from "@/types/api";

interface HistoryEntry {
  event_type?: string;
  created_at?: string;
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";

  const book = useBook(id);
  const record = useRecord(book.data?.bibliographic_record_id);
  const history = useBookHistory(id);
  const rooms = useRooms();
  const reader = useReaderName(
    book.data?.reading_status === "reading" ? book.data.current_reader_id : null,
  );

  const del = useDeleteBook();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  if (book.isError) return <ErrorState message="Couldn't load this book." onRetry={book.refetch} />;
  if (book.isLoading || !book.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const b = book.data;
  const r = record.data;
  const roomName = b.room_id ? rooms.data?.find((x) => x.id === b.room_id)?.name : null;

  async function onDelete() {
    try {
      await del.mutateAsync(b.id);
      toast.success("Book deleted.");
      navigate("/books");
    } catch {
      toast.error("Couldn't delete the book.");
    }
  }

  return (
    <>
      <Link to="/books" className="mb-4 inline-block text-sm text-brand hover:underline">
        ← Back to books
      </Link>

      <Card className="p-5">
        <div className="flex gap-4">
          <BookCover url={r?.cover_url} title={r?.title} className="h-36 w-24 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold text-ink">{r?.title ?? "Untitled"}</h1>
            {r?.main_author && <p className="mt-0.5 text-ink-soft">{r.main_author}</p>}
            <div className="mt-3 flex items-center gap-2">
              <ReadingStatusControl bookId={b.id} status={b.reading_status} />
              {reader && <span className="text-sm text-amber">📖 {reader}</span>}
            </div>
            {canEdit && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setMoveOpen(true)}>
                  Move
                </Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmOpen(true)}>
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="ISBN" value={r?.isbn} />
          <Field label="Publisher" value={r?.publisher} />
          <Field label="Year" value={r?.publication_year?.toString()} />
          <Field label="Genre" value={r?.genre} />
          <Field label="Language" value={r?.language} />
          <Field label="Condition" value={b.condition} />
          <Field label="Source" value={b.source} />
          <Field label="Purchase date" value={b.purchase_date ? formatDate(b.purchase_date) : null} />
          <Field label="Location" value={roomName ?? (b.room_id ? "Assigned" : "Not placed")} />
          <Field label="Added" value={formatDate(b.created_at)} />
        </dl>

        {b.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {b.tags.map((t) => (
              <span key={t} className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-ink-soft">
                {t}
              </span>
            ))}
          </div>
        )}

        {b.notes && (
          <div className="mt-4 rounded-md bg-paper p-3 text-sm text-ink">
            <p className="mb-1 text-xs font-medium uppercase text-ink-soft">Notes</p>
            {b.notes}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">History</h2>
        {history.isLoading ? (
          <Skeleton className="h-16" />
        ) : !history.data || history.data.length === 0 ? (
          <p className="text-sm text-ink-soft">No history yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(history.data as HistoryEntry[]).map((e, i) => (
              <li key={i} className="flex justify-between gap-3 border-b border-line pb-2 last:border-0">
                <span className="capitalize text-ink">{(e.event_type ?? "event").replace(/_/g, " ")}</span>
                <span className="text-ink-soft">{formatDateTime(e.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editOpen && <EditBookModal book={b} record={r} onClose={() => setEditOpen(false)} />}
      {moveOpen && (
        <MoveModal
          bookId={b.id}
          initial={{
            room_id: b.room_id ?? undefined,
            bookcase_id: b.bookcase_id ?? undefined,
            section_id: b.section_id ?? undefined,
            shelf_id: b.shelf_id ?? undefined,
          }}
          onClose={() => setMoveOpen(false)}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this book?"
        message="This permanently removes the book from your library."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-ink">{value || "—"}</dd>
    </div>
  );
}

interface EditForm {
  title: string;
  main_author: string;
  other_authors: string;
  isbn: string;
  publisher: string;
  publication_year: string;
  language: string;
  genre: string;
  cover_url: string;
  condition: string;
  source: string;
  purchase_date: string;
  purchase_price: string;
  tags: string;
  notes: string;
}

const splitCsv = (s: string): string[] => s.split(",").map((t) => t.trim()).filter(Boolean);

// Edits both the shared bibliographic record (title, author, ISBN…) and this
// copy's own attributes (condition, source, tags, notes). Location and reading
// status keep their dedicated controls.
function EditBookModal({
  book,
  record,
  onClose,
}: {
  book: OwnedBook;
  record: BibliographicRecord | null | undefined;
  onClose: () => void;
}) {
  const updateBook = useUpdateBook();
  const updateRecord = useUpdateRecord();
  const toast = useToast();

  const { register, handleSubmit } = useForm<EditForm>({
    defaultValues: {
      title: record?.title ?? "",
      main_author: record?.main_author ?? "",
      other_authors: (record?.other_authors ?? []).join(", "),
      isbn: record?.isbn ?? "",
      publisher: record?.publisher ?? "",
      publication_year: record?.publication_year?.toString() ?? "",
      language: record?.language ?? "",
      genre: record?.genre ?? "",
      cover_url: record?.cover_url ?? "",
      condition: book.condition ?? "",
      source: book.source ?? "",
      purchase_date: book.purchase_date ?? "",
      purchase_price: book.purchase_price ?? "",
      tags: (book.tags ?? []).join(", "),
      notes: book.notes ?? "",
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      if (record) {
        await updateRecord.mutateAsync({
          id: record.id,
          body: {
            title: v.title.trim() || undefined,
            main_author: v.main_author.trim() || null,
            other_authors: splitCsv(v.other_authors),
            isbn: v.isbn.trim() || null,
            publisher: v.publisher.trim() || null,
            publication_year: v.publication_year.trim() ? Number(v.publication_year) : null,
            language: v.language.trim() || null,
            genre: v.genre.trim() || null,
            cover_url: v.cover_url.trim() || null,
          },
        });
      }
      await updateBook.mutateAsync({
        id: book.id,
        body: {
          condition: (v.condition || null) as BookCondition | null,
          source: (v.source || null) as BookSource | null,
          purchase_date: v.purchase_date || null,
          purchase_price: v.purchase_price.trim() ? Number(v.purchase_price) : null,
          tags: splitCsv(v.tags),
          notes: v.notes.trim() || null,
        },
      });
      toast.success("Saved.");
      onClose();
    } catch {
      toast.error("Couldn't save.");
    }
  });

  const saving = updateBook.isPending || updateRecord.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit book"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={saving} onClick={onSubmit}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Book details
          </h3>
          {record === null && (
            <p className="text-xs text-stone">
              This copy has no bibliographic record, so title/author can't be edited here.
            </p>
          )}
          <Input label="Title" disabled={!record} {...register("title")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Author" disabled={!record} {...register("main_author")} />
            <Input label="Other authors" hint="Separate with commas" disabled={!record} {...register("other_authors")} />
            <Input label="ISBN" disabled={!record} {...register("isbn")} />
            <Input label="Publisher" disabled={!record} {...register("publisher")} />
            <Input label="Year" type="number" disabled={!record} {...register("publication_year")} />
            <Input label="Language" disabled={!record} {...register("language")} />
            <Input label="Genre" disabled={!record} {...register("genre")} />
            <Input label="Cover URL" disabled={!record} {...register("cover_url")} />
          </div>
          {record && (
            <p className="text-xs text-stone">
              These fields are shared by every copy of this book.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">This copy</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Condition" placeholder="—" options={BOOK_CONDITIONS} {...register("condition")} />
            <Select label="Source" placeholder="—" options={BOOK_SOURCES} {...register("source")} />
            <Input label="Purchase date" type="date" {...register("purchase_date")} />
            <Input label="Purchase price" type="number" step="0.01" {...register("purchase_price")} />
          </div>
          <Input label="Tags" hint="Separate with commas" {...register("tags")} />
          <Textarea label="Notes" rows={3} {...register("notes")} />
        </section>
      </div>
    </Modal>
  );
}

function MoveModal({
  bookId,
  initial,
  onClose,
}: {
  bookId: string;
  initial: LocationSelection;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState<LocationSelection>(initial);
  const move = useUpdateBookPosition();
  const toast = useToast();

  async function onSave() {
    try {
      await move.mutateAsync({ id: bookId, position: selection });
      toast.success("Location updated.");
      onClose();
    } catch {
      toast.error("Couldn't update location.");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Move book"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={move.isPending} onClick={onSave}>
            Save
          </Button>
        </>
      }
    >
      <LocationPicker value={selection} onChange={setSelection} />
    </Modal>
  );
}

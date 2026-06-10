import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
  useBookLoans,
  useBookReads,
  useDeleteBook,
  useLendBook,
  useMarkBookRead,
  useReturnBook,
  useUnmarkBookRead,
  useUpdateBook,
  useUpdateBookPosition,
} from "@/features/books/hooks";
import { useRecord, useUpdateRecord } from "@/features/records/hooks";
import { useRooms } from "@/features/locations/hooks";
import { useReaderName, useUsers } from "@/features/users/hooks";
import { useAuthStore } from "@/features/auth/store";
import { bookConditions, bookSources, formatDate, formatDateTime } from "@/lib/format";
import type { BibliographicRecord, BookCondition, BookLoan, BookSource, OwnedBook } from "@/types/api";

interface HistoryEntry {
  event_type?: string;
  created_at?: string;
}

export function BookDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";

  const book = useBook(id);
  const record = useRecord(book.data?.bibliographic_record_id);
  const history = useBookHistory(id);
  const reads = useBookReads(id);
  const loans = useBookLoans(id);
  const rooms = useRooms();
  const users = useUsers();
  const reader = useReaderName(
    book.data?.reading_status === "reading" ? book.data.current_reader_id : null,
  );
  const markRead = useMarkBookRead();
  const unmarkRead = useUnmarkBookRead();
  const lendBook = useLendBook();
  const returnBook = useReturnBook();

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
  const activeLoan = loans.data?.find((l) => l.returned_at === null) ?? null;

  async function onDelete() {
    try {
      await del.mutateAsync(b.id);
      toast.success(t("books.detail.deleted"));
      navigate("/books");
    } catch {
      toast.error(t("books.detail.deleteFailed"));
    }
  }

  return (
    <>
      <Link to="/books" className="mb-4 inline-block text-sm text-brand hover:underline">
        {t("books.detail.backLink")}
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
              {activeLoan && <span className="text-sm text-amber">📤 {t("books.detail.onLoanTo")} {activeLoan.borrower_name}</span>}
            </div>
            {canEdit && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  {t("common.edit")}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setMoveOpen(true)}>
                  {t("books.detail.moveButton")}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmOpen(true)}>
                  {t("common.delete")}
                </Button>
              </div>
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label={t("books.detail.isbn")} value={r?.isbn} />
          <Field label={t("books.detail.publisher")} value={r?.publisher} />
          <Field label={t("books.detail.year")} value={r?.publication_year?.toString()} />
          <Field label={t("books.detail.genre")} value={r?.genre} />
          <Field label={t("books.detail.language")} value={r?.language} />
          <Field label={t("books.detail.condition")} value={b.condition} />
          <Field label={t("books.detail.source")} value={b.source} />
          <Field label={t("books.detail.purchaseDate")} value={b.purchase_date ? formatDate(b.purchase_date) : null} />
          <Field label={t("books.detail.location")} value={roomName ?? (b.room_id ? t("books.detail.locationAssigned") : t("books.detail.locationNotPlaced"))} />
          <Field label={t("books.detail.added")} value={formatDate(b.created_at)} />
          <Field
            label={t("books.detail.owner")}
            value={b.owner_id ? (users.data?.find((u) => u.id === b.owner_id)?.full_name ?? "Unknown") : null}
          />
        </dl>

        {b.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {b.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-ink-soft">
                {tag}
              </span>
            ))}
          </div>
        )}

        {b.notes && (
          <div className="mt-4 rounded-md bg-paper p-3 text-sm text-ink">
            <p className="mb-1 text-xs font-medium uppercase text-ink-soft">{t("books.detail.notes")}</p>
            {b.notes}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">{t("books.detail.history")}</h2>
        {history.isLoading ? (
          <Skeleton className="h-16" />
        ) : !history.data || history.data.length === 0 ? (
          <p className="text-sm text-ink-soft">{t("books.detail.noHistory")}</p>
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

      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">{t("books.detail.readBy")}</h2>
        {reads.isLoading ? (
          <Skeleton className="h-16" />
        ) : (
          <ul className="space-y-2">
            {(users.data ?? []).map((u) => {
              const readEntry = (reads.data ?? []).find((r) => r.user_id === u.id);
              const hasRead = Boolean(readEntry);
              return (
                <li key={u.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className={hasRead ? "font-medium text-ink" : "text-ink-soft"}>
                    {u.full_name}
                    {hasRead && readEntry && (
                      <span className="ml-1 text-xs text-ink-soft">
                        · {formatDate(readEntry.read_at)}
                      </span>
                    )}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        hasRead
                          ? "bg-sage/15 text-sage hover:bg-danger/15 hover:text-danger"
                          : "bg-paper text-ink-soft hover:bg-brand/10 hover:text-brand"
                      }`}
                      disabled={markRead.isPending || unmarkRead.isPending}
                      onClick={() => {
                        if (hasRead) {
                          void unmarkRead.mutate({ bookId: b.id, userId: u.id });
                        } else {
                          void markRead.mutate({ bookId: b.id, userId: u.id });
                        }
                      }}
                    >
                      {hasRead ? t("books.detail.markUnread") : t("books.detail.markRead")}
                    </button>
                  )}
                </li>
              );
            })}
            {(users.data ?? []).length === 0 && (
              <p className="text-sm text-ink-soft">{t("books.detail.noFamilyMembers")}</p>
            )}
          </ul>
        )}
      </Card>

      <LoanCard bookId={b.id} activeLoan={activeLoan} loans={loans.data ?? []} canEdit={canEdit} lendBook={lendBook} returnBook={returnBook} />

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
        title={t("books.detail.deleteConfirmTitle")}
        message={t("books.detail.deleteConfirmMessage")}
        confirmLabel={t("books.detail.deleteConfirmButton")}
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
  owner_id: string;
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
  const { t } = useTranslation();
  const updateBook = useUpdateBook();
  const updateRecord = useUpdateRecord();
  const users = useUsers();
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
      owner_id: book.owner_id ?? "",
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
          owner_id: v.owner_id || null,
          tags: splitCsv(v.tags),
          notes: v.notes.trim() || null,
        },
      });
      toast.success(t("common.saved"));
      onClose();
    } catch {
      toast.error(t("common.saveFailed"));
    }
  });

  const saving = updateBook.isPending || updateRecord.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title={t("books.detail.editModalTitle")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" loading={saving} onClick={onSubmit}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {t("books.detail.editSection.bookDetails")}
          </h3>
          {record === null && (
            <p className="text-xs text-stone">
              {t("books.detail.editSection.noRecordNote")}
            </p>
          )}
          <Input label={t("common.title")} disabled={!record} {...register("title")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t("books.add.author")} disabled={!record} {...register("main_author")} />
            <Input label={t("books.detail.editSection.otherAuthors")} hint={t("books.detail.editSection.separateCommas")} disabled={!record} {...register("other_authors")} />
            <Input label={t("books.detail.isbn")} disabled={!record} {...register("isbn")} />
            <Input label={t("books.detail.publisher")} disabled={!record} {...register("publisher")} />
            <Input label={t("books.detail.year")} type="number" disabled={!record} {...register("publication_year")} />
            <Input label={t("books.detail.language")} disabled={!record} {...register("language")} />
            <Input label={t("books.detail.genre")} disabled={!record} {...register("genre")} />
            <Input label={t("books.add.coverUrl")} disabled={!record} {...register("cover_url")} />
          </div>
          {record && (
            <p className="text-xs text-stone">
              {t("books.detail.editSection.sharedNote")}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("books.detail.editSection.thisCopy")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label={t("books.detail.condition")} placeholder="—" options={bookConditions(t)} {...register("condition")} />
            <Select label={t("books.detail.source")} placeholder="—" options={bookSources(t)} {...register("source")} />
            <Input label={t("books.detail.purchaseDate")} type="date" {...register("purchase_date")} />
            <Input label={t("books.detail.editSection.purchasePrice")} type="number" step="0.01" {...register("purchase_price")} />
            <Select
              label={t("books.detail.owner")}
              placeholder={t("books.detail.editSection.noOwner")}
              options={(users.data ?? []).map((u) => ({ value: u.id, label: u.full_name }))}
              className="sm:col-span-2"
              {...register("owner_id")}
            />
          </div>
          <Input label={t("books.detail.editSection.tags")} hint={t("books.detail.editSection.separateCommas")} {...register("tags")} />
          <Textarea label={t("books.detail.notes")} rows={3} {...register("notes")} />
        </section>
      </div>
    </Modal>
  );
}

function LoanCard({
  bookId,
  activeLoan,
  loans,
  canEdit,
  lendBook,
  returnBook,
}: {
  bookId: string;
  activeLoan: BookLoan | null;
  loans: BookLoan[];
  canEdit: boolean;
  lendBook: ReturnType<typeof useLendBook>;
  returnBook: ReturnType<typeof useReturnBook>;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [borrowerName, setBorrowerName] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function onLend() {
    if (!borrowerName.trim()) return;
    try {
      await lendBook.mutateAsync({ bookId, body: { borrower_name: borrowerName.trim(), due_date: dueDate || null } });
      setBorrowerName("");
      setDueDate("");
      toast.success(t("books.detail.lendSuccess"));
    } catch {
      toast.error(t("books.detail.lendFailed"));
    }
  }

  async function onReturn() {
    try {
      await returnBook.mutateAsync({ bookId });
      toast.success(t("books.detail.returnSuccess"));
    } catch {
      toast.error(t("books.detail.returnFailed"));
    }
  }

  return (
    <Card className="mt-6 p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">{t("books.detail.loans")}</h2>

      {activeLoan ? (
        <div className="mb-4 rounded-md bg-amber/10 p-3 text-sm">
          <p className="font-medium text-ink">
            {t("books.detail.onLoanTo")} <span className="text-amber">{activeLoan.borrower_name}</span>
          </p>
          <p className="text-ink-soft">{t("books.detail.since")} {formatDate(activeLoan.loaned_at)}</p>
          {activeLoan.due_date && (
            <p className={new Date(activeLoan.due_date) < new Date() ? "text-danger" : "text-ink-soft"}>
              {t("books.detail.due")} {formatDate(activeLoan.due_date)}
            </p>
          )}
          {canEdit && (
            <Button size="sm" className="mt-2" loading={returnBook.isPending} onClick={onReturn}>
              {t("books.detail.markReturned")}
            </Button>
          )}
        </div>
      ) : canEdit ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            label={t("books.detail.borrowerName")}
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            className="flex-1"
          />
          <Input
            label={t("books.detail.dueDate")}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1"
          />
          <div className="flex w-full items-end">
            <Button size="sm" disabled={!borrowerName.trim()} loading={lendBook.isPending} onClick={onLend}>
              {t("books.detail.lendButton")}
            </Button>
          </div>
        </div>
      ) : null}

      {loans.length > 0 && (
        <>
          <p className="mb-2 text-xs font-medium uppercase text-ink-soft">{t("books.detail.loanHistory")}</p>
          <ul className="space-y-2 text-sm">
            {loans.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 border-b border-line pb-2 last:border-0">
                <span className="text-ink">{l.borrower_name}</span>
                <span className="text-ink-soft">
                  {formatDate(l.loaned_at)}
                  {l.returned_at ? ` → ${formatDate(l.returned_at)}` : ` · ${t("books.detail.onLoanLabel")}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {loans.length === 0 && !activeLoan && !canEdit && (
        <p className="text-sm text-ink-soft">{t("books.detail.noLoanHistory")}</p>
      )}
    </Card>
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
  const { t } = useTranslation();
  const [selection, setSelection] = useState<LocationSelection>(initial);
  const move = useUpdateBookPosition();
  const toast = useToast();

  async function onSave() {
    try {
      await move.mutateAsync({ id: bookId, position: selection });
      toast.success(t("books.detail.moveSuccess"));
      onClose();
    } catch {
      toast.error(t("books.detail.moveFailedError"));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t("books.detail.moveModalTitle")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" loading={move.isPending} onClick={onSave}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <LocationPicker value={selection} onChange={setSelection} />
    </Modal>
  );
}

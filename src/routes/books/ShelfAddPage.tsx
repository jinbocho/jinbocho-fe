import { lazy, Suspense, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LocationPicker, type LocationSelection } from "@/components/locations/LocationPicker";
import { BookCover } from "@/components/ui/BookCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useExtractBookCover } from "@/features/books/hooks";
import { useShelfAddSession } from "@/features/books/useShelfAddSession";
import { useBookcases, useRooms, useSections, useShelves } from "@/features/locations/hooks";
import { useUsers } from "@/features/users/hooks";
import {
  isValidIsbn,
  metadataToRecordDraft,
  normalizeIsbn,
  useIsbnLookup,
} from "@/features/records/isbn";
import type { BibliographicRecordCreate } from "@/types/api";

const IsbnScanner = lazy(() =>
  import("@/components/books/IsbnScanner").then((m) => ({ default: m.IsbnScanner })),
);

type Phase = "setup" | "scan";
type ScanTab = "scan" | "type";

const EMPTY_DRAFT: BibliographicRecordCreate = { title: "", other_authors: [] };

// ── Position breadcrumb ───────────────────────────────────────────────────────────────────

function useLocationLabel(loc: LocationSelection) {
  const rooms = useRooms();
  const bookcases = useBookcases(loc.room_id);
  const sections = useSections(loc.bookcase_id);
  const shelves = useShelves(loc.section_id);

  const room = (rooms.data ?? []).find((r) => r.id === loc.room_id);
  const bookcase = (bookcases.data ?? []).find((b) => b.id === loc.bookcase_id);
  const section = (sections.data ?? []).find((s) => s.id === loc.section_id);
  const shelf = (shelves.data ?? []).find((s) => s.id === loc.shelf_id);

  if (!room || !bookcase || !section || !shelf) return null;
  return [
    room.name,
    bookcase.name,
    section.label ?? `Section ${section.section_index + 1}`,
    `Shelf ${shelf.shelf_index + 1}`,
  ].join(" › ");
}

// ── Quick-review card ───────────────────────────────────────────────────────────────

interface ReviewCardProps {
  draft: BibliographicRecordCreate;
  isSaving: boolean;
  onAdd: (draft: BibliographicRecordCreate) => void;
  onSkip: () => void;
}

function ReviewCard({ draft, isSaving, onAdd, onSkip }: ReviewCardProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const form = useForm<BibliographicRecordCreate>({ values: draft });

  if (editing) {
    return (
      <Card className="space-y-4 p-5">
        <h3 className="font-display text-base font-semibold">{t("books.shelfAdd.reviewCardEditButton")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t("common.title")} {...form.register("title", { required: true })} />
          <Input label={t("books.add.author")} {...form.register("main_author")} />
          <Input label={t("books.add.isbn")} inputMode="numeric" {...form.register("isbn")} />
          <Input label={t("books.add.publisher")} {...form.register("publisher")} />
          <Input label={t("books.add.year")} type="number" {...form.register("publication_year")} />
          <Input label={t("books.add.genre")} {...form.register("genre")} />
          <Input label={t("books.add.coverUrl")} {...form.register("cover_url")} className="sm:col-span-2" />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            loading={isSaving}
            onClick={form.handleSubmit((values) => onAdd(values))}
          >
            {t("common.add")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            {t("common.back")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex gap-4">
        <BookCover url={draft.cover_url} title={draft.title} className="h-20 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold leading-snug">{draft.title || "—"}</p>
          {draft.main_author && (
            <p className="mt-0.5 text-sm text-ink-soft">{draft.main_author}</p>
          )}
          {draft.isbn && (
            <p className="mt-1 font-mono text-xs text-ink-soft">{draft.isbn}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" loading={isSaving} onClick={() => onAdd(draft)}>
          {t("common.add")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
          {t("books.shelfAdd.reviewCardEditButton")}
        </Button>
        <Button type="button" variant="secondary" onClick={onSkip}>
          {t("books.shelfAdd.skipButton")}
        </Button>
      </div>
    </Card>
  );
}

// ── Manual entry card (no ISBN match) ─────────────────────────────────────────────────

interface ManualCardProps {
  initialDraft: BibliographicRecordCreate;
  isSaving: boolean;
  onAdd: (draft: BibliographicRecordCreate) => void;
  onSkip: () => void;
}

function ManualCard({ initialDraft, isSaving, onAdd, onSkip }: ManualCardProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const form = useForm<BibliographicRecordCreate>({ values: initialDraft });
  const extractCover = useExtractBookCover();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const result = await extractCover.mutateAsync(file);
      if (result.title) form.setValue("title", result.title);
      if (result.author) form.setValue("main_author", result.author);
      toast.success(t("books.shelfAdd.ocrSuccess"));
    } catch {
      toast.error(t("books.shelfAdd.ocrFailed"));
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <p className="text-sm text-ink-soft">{t("books.shelfAdd.noMatch")}</p>
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
        <Button
          type="button"
          variant="secondary"
          loading={extractCover.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {t("books.shelfAdd.ocrScanButton")}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("common.title")}
          error={form.formState.errors.title ? t("validation.titleRequired") : undefined}
          {...form.register("title", { required: true })}
        />
        <Input label={t("books.add.author")} {...form.register("main_author")} />
        <Input label={t("books.add.isbn")} inputMode="numeric" {...form.register("isbn")} />
        <Input label={t("books.add.publisher")} {...form.register("publisher")} />
        <Input label={t("books.add.year")} type="number" {...form.register("publication_year")} />
        <Input label={t("books.add.genre")} {...form.register("genre")} />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          loading={isSaving}
          onClick={form.handleSubmit((values) => onAdd(values))}
        >
          {t("common.add")}
        </Button>
        <Button type="button" variant="secondary" onClick={onSkip}>
          {t("books.shelfAdd.skipButton")}
        </Button>
      </div>
    </Card>
  );
}

// ── Session list ──────────────────────────────────────────────────────────────────────

interface SessionListProps {
  books: { book: { id: string }; record: { title: string; main_author: string | null; cover_url: string | null } }[];
  isRemoving: boolean;
  onRemove: (bookId: string) => void;
}

function SessionList({ books, isRemoving, onRemove }: SessionListProps) {
  const { t } = useTranslation();
  if (books.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-ink-soft">{t("books.shelfAdd.sessionListTitle")}</h3>
      <ul className="space-y-2">
        {books.map(({ book, record }) => (
          <li key={book.id} className="flex items-center gap-3 rounded-md bg-surface px-3 py-2 shadow-card">
            <BookCover url={record.cover_url} title={record.title} className="h-10 w-7 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{record.title}</p>
              {record.main_author && (
                <p className="truncate text-xs text-ink-soft">{record.main_author}</p>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isRemoving}
              onClick={() => onRemove(book.id)}
            >
              {t("books.shelfAdd.undoButton")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── TabButton (same as AddBookPage) ─────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
        active ? "bg-surface text-ink shadow-card" : "text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────────

export function ShelfAddPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const lookup = useIsbnLookup();

  const users = useUsers();

  const [phase, setPhase] = useState<Phase>("setup");
  const [location, setLocation] = useState<LocationSelection>({});
  const [lockedLocation, setLockedLocation] = useState<LocationSelection>({});
  const [ownerId, setOwnerId] = useState<string>("");
  const [tab, setTab] = useState<ScanTab>("scan");
  const [isbn, setIsbn] = useState("");

  // scanKey forces IsbnScanner remount after each book (one-shot scanner pattern).
  const [scanKey, setScanKey] = useState(0);
  const [draft, setDraft] = useState<BibliographicRecordCreate | null>(null);
  const [notFound, setNotFound] = useState(false);

  const { sessionBooks, addToShelf, removeFromShelf, isSaving, isRemoving } =
    useShelfAddSession(lockedLocation, ownerId || undefined);

  const label = useLocationLabel(lockedLocation);

  async function runLookup(code: string) {
    const normalized = normalizeIsbn(code);
    if (!isValidIsbn(normalized)) {
      toast.error(t("books.shelfAdd.invalidIsbn"));
      return;
    }
    try {
      const result = await lookup.mutateAsync(normalized);
      setDraft(metadataToRecordDraft(result.metadata));
      setNotFound(false);
    } catch {
      setDraft({ ...EMPTY_DRAFT, isbn: normalized });
      setNotFound(true);
    }
  }

  async function handleAdd(d: BibliographicRecordCreate) {
    try {
      await addToShelf(d);
      toast.success(t("books.shelfAdd.bookAdded"));
    } catch {
      toast.error(t("books.shelfAdd.addFailed"));
    }
    resetScan();
  }

  function resetScan() {
    setDraft(null);
    setNotFound(false);
    setIsbn("");
    setScanKey((k) => k + 1);
  }

  // ── Phase 1: setup ──────────────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <>
        <PageHeader
          title={t("books.shelfAdd.title")}
          description={t("books.shelfAdd.subtitle")}
        />
        <Card className="space-y-5 p-5">
          <div>
            <h2 className="mb-3 font-display text-base font-semibold">{t("books.shelfAdd.setupSelectShelf")}</h2>
            <LocationPicker value={location} onChange={setLocation} />
          </div>
          <Select
            label={t("books.shelfAdd.setupOwner")}
            placeholder={t("books.shelfAdd.setupNoOwner")}
            value={ownerId}
            options={(users.data ?? []).map((u) => ({ value: u.id, label: u.full_name }))}
            onChange={(e) => setOwnerId(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={!location.shelf_id}
              onClick={() => {
                setLockedLocation(location);
                setPhase("scan");
              }}
            >
              {t("books.shelfAdd.setupStartButton")}
            </Button>
            <Link to="/books/add">
              <Button type="button" variant="secondary">
                {t("common.cancel")}
              </Button>
            </Link>
          </div>
          {!location.shelf_id && (
            <p className="text-xs text-ink-soft">
              {t("books.shelfAdd.setupHint")}
            </p>
          )}
        </Card>
      </>
    );
  }

  // ── Phase 2: scan loop ─────────────────────────────────────────────────────────────────

  const reviewOpen = draft !== null;

  return (
    <>
      <PageHeader
        title={t("books.shelfAdd.title")}
        actions={
          <Link to="/books/add" className="text-sm text-brand hover:underline">
            {t("books.shelfAdd.backLink")}
          </Link>
        }
      />

      {/* Sticky context bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-4 py-2 shadow-card">
        <div className="min-w-0">
          {label ? (
            <p className="truncate text-sm font-medium text-ink">{label}</p>
          ) : (
            <p className="text-sm text-ink-soft">{t("books.shelfAdd.loadingPosition")}</p>
          )}
          <p className="text-xs text-ink-soft">
            {sessionBooks.length === 0
              ? t("books.shelfAdd.noBooksAdded")
              : `${sessionBooks.length} ${sessionBooks.length > 1 ? t("books.shelfAdd.booksLabel") : t("books.shelfAdd.bookLabel")} ${t("books.shelfAdd.addedLabel")}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPhase("setup");
              resetScan();
            }}
          >
            {t("books.shelfAdd.changePositionButton")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              sessionBooks.length > 0 && lockedLocation.bookcase_id
                ? navigate(`/locations/bookcase/${lockedLocation.bookcase_id}`)
                : navigate("/books")
            }
          >
            {t("books.shelfAdd.doneButton")}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* ISBN input — hidden while a review card is open */}
        {!reviewOpen && (
          <Card className="p-5">
            <div className="mb-4 flex gap-1 rounded-md bg-paper p-1">
              <TabButton active={tab === "scan"} onClick={() => setTab("scan")}>
                {t("books.shelfAdd.scanTab")}
              </TabButton>
              <TabButton active={tab === "type"} onClick={() => setTab("type")}>
                {t("books.shelfAdd.typeTab")}
              </TabButton>
            </div>

            {tab === "scan" ? (
              <div className="space-y-3">
                <Suspense
                  fallback={
                    <div className="grid h-48 place-items-center rounded-md bg-paper">
                      <Spinner />
                    </div>
                  }
                >
                  {/* scanKey remounts scanner after each book */}
                  <IsbnScanner key={scanKey} onDetected={(code) => void runLookup(code)} />
                </Suspense>
                {lookup.isPending && (
                  <p className="flex items-center gap-2 text-sm text-ink-soft">
                    <Spinner className="h-4 w-4" /> {t("books.shelfAdd.lookingUp")}
                  </p>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runLookup(isbn);
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <Input
                  label={t("books.shelfAdd.isbnInput")}
                  placeholder={t("books.shelfAdd.isbnPlaceholder")}
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  inputMode="numeric"
                  className="flex-1"
                />
                <Button
                  type="submit"
                  loading={lookup.isPending}
                  className="shrink-0 whitespace-nowrap"
                >
                  {t("books.shelfAdd.lookupButton")}
                </Button>
              </form>
            )}
          </Card>
        )}

        {/* Review card */}
        {reviewOpen && !notFound && draft && (
          <ReviewCard
            draft={draft}
            isSaving={isSaving}
            onAdd={(d) => void handleAdd(d)}
            onSkip={resetScan}
          />
        )}

        {/* Manual entry (no match) */}
        {reviewOpen && notFound && draft && (
          <ManualCard
            initialDraft={draft}
            isSaving={isSaving}
            onAdd={(d) => void handleAdd(d)}
            onSkip={resetScan}
          />
        )}

        {/* Session list */}
        <SessionList
          books={sessionBooks}
          isRemoving={isRemoving}
          onRemove={(id) => void removeFromShelf(id)}
        />
      </div>
    </>
  );
}

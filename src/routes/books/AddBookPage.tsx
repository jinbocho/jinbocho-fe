import { lazy, Suspense, useEffect, useState } from "react";
// import { useRef } from "react"; // re-add when cover OCR scan is resumed
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LocationPicker, type LocationSelection } from "@/components/locations/LocationPicker";
import { DuplicateBookDialog } from "@/components/books/DuplicateBookDialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useAddBookWithDuplicateCheck } from "@/features/books/hooks";
// import { useExtractBookCover } from "@/features/books/hooks"; // OCR paused, see hooks.ts
import { useUsers } from "@/features/users/hooks";
import { useCreateRecord, useRecord } from "@/features/records/hooks";
import { useRemoveFromWishlist } from "@/features/wishlist/hooks";
import {
  isValidIsbn,
  metadataToRecordDraft,
  normalizeIsbn,
  useIsbnLookup,
  useSearchBooks,
} from "@/features/records/isbn";
import { genreOptions, READING_STATUSES, readingStatusLabel } from "@/lib/format";
import type { BibliographicRecordCreate, ReadingStatus } from "@/types/api";

// Code-split the camera scanner (@zxing is large) — only loaded on the Scan tab.
const IsbnScanner = lazy(() =>
  import("@/components/books/IsbnScanner").then((m) => ({ default: m.IsbnScanner })),
);

type Tab = "scan" | "type" | "search";
const EMPTY_DRAFT: BibliographicRecordCreate = { title: "", other_authors: [] };

export function AddBookPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const lookup = useIsbnLookup();
  const search = useSearchBooks();
  const createRecord = useCreateRecord();
  const addBook = useAddBookWithDuplicateCheck();
  const removeFromWishlist = useRemoveFromWishlist();
  // const extractCover = useExtractBookCover(); // OCR paused

  const users = useUsers();
  // const fileInputRef = useRef<HTMLInputElement>(null); // OCR paused

  const prefilledRecordId = searchParams.get("record_id") ?? undefined;
  const fromWishlistId = searchParams.get("from_wishlist") ?? undefined;
  const prefilledRecord = useRecord(prefilledRecordId);

  const [tab, setTab] = useState<Tab>("type");
  const [isbn, setIsbn] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchAuthor, setSearchAuthor] = useState("");
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[] | null>(null);
  const [draft, setDraft] = useState<BibliographicRecordCreate | null>(null);
  const [location, setLocation] = useState<LocationSelection>({});
  const [status, setStatus] = useState<ReadingStatus>("to_read");
  const [ownerId, setOwnerId] = useState<string>("");

  useEffect(() => {
    if (prefilledRecord.data && draft === null) {
      const { title, main_author, isbn: recIsbn, publisher, publication_year, genre, cover_url, language, other_authors } = prefilledRecord.data;
      setDraft({ title, main_author, isbn: recIsbn, publisher, publication_year, genre, cover_url, language, other_authors: other_authors ?? [] });
    }
  }, [prefilledRecord.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const form = useForm<BibliographicRecordCreate>({ values: draft ?? EMPTY_DRAFT });

  async function runLookup(code: string) {
    const normalized = normalizeIsbn(code);
    if (!isValidIsbn(normalized)) {
      toast.error(t("books.add.invalidIsbn"));
      return;
    }
    try {
      const result = await lookup.mutateAsync(normalized);
      setDraft(metadataToRecordDraft(result.metadata));
      toast.success(t("books.add.isbnFound"));
    } catch {
      // Not found or upstream error: let the user fill it in manually.
      setDraft({ ...EMPTY_DRAFT, isbn: normalized });
      toast.show(t("books.add.isbnNotFound"));
    }
  }

  async function runSearch() {
    if (!searchTitle.trim() && !searchAuthor.trim()) {
      toast.error(t("books.add.searchMissingQuery"));
      return;
    }
    try {
      const result = await search.mutateAsync({
        title: searchTitle.trim() || undefined,
        author: searchAuthor.trim() || undefined,
      });
      setSearchResults(result.results);
    } catch {
      setSearchResults([]);
    }
  }

  // OCR paused — inadequate accuracy, revisit later.
  // async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
  //   const file = e.target.files?.[0];
  //   if (!file) return;
  //   e.target.value = "";
  //   try {
  //     const result = await extractCover.mutateAsync(file);
  //     if (result.title) form.setValue("title", result.title);
  //     if (result.author) form.setValue("main_author", result.author);
  //     toast.success(t("books.add.ocrSuccess"));
  //   } catch {
  //     toast.error(t("books.add.ocrFailed"));
  //   }
  // }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const recordId = prefilledRecordId ?? (await createRecord.mutateAsync({
        ...values,
        publication_year: values.publication_year ? Number(values.publication_year) : null,
      })).id;
      const book = await addBook.submit({
        bibliographic_record_id: recordId,
        reading_status: status,
        ...(ownerId ? { owner_id: ownerId } : {}),
        ...location,
      });
      // null means a duplicate conflict is pending confirmation in the
      // dialog below — stay on the form until the user resolves it.
      if (book) {
        if (fromWishlistId) {
          try { await removeFromWishlist.mutateAsync(fromWishlistId); } catch { /* non-blocking */ }
        }
        toast.success("Book added.");
        navigate("/books");
      }
    } catch {
      toast.error("Couldn't add the book.");
    }
  });

  async function handleConfirmDuplicate() {
    try {
      const book = await addBook.confirmDuplicate();
      if (book) {
        if (fromWishlistId) {
          try { await removeFromWishlist.mutateAsync(fromWishlistId); } catch { /* non-blocking */ }
        }
        toast.success("Book added.");
        navigate("/books");
      }
    } catch {
      toast.error("Couldn't add the book.");
    }
  }

  const saving = createRecord.isPending || addBook.isPending;

  return (
    <>
      <Link to="/books" className="mb-4 inline-block text-sm text-brand hover:underline">
        {t("books.add.backLink")}
      </Link>

      <PageHeader
        title={t("books.add.pageTitle")}
        description={t("books.add.subtitle")}
        actions={
          <Link to="/books/add/shelf" className="text-sm text-brand hover:underline">
            {t("books.add.shelfModeLink")}
          </Link>
        }
      />

      {!draft ? (
        <Card className="p-5">
          <div className="mb-4 flex gap-1 rounded-md bg-paper p-1">
            <TabButton active={tab === "type"} onClick={() => setTab("type")}>
              {t("books.add.typeTab")}
            </TabButton>
            <TabButton active={tab === "scan"} onClick={() => setTab("scan")}>
              {t("books.add.scanTab")}
            </TabButton>
            <TabButton active={tab === "search"} onClick={() => setTab("search")}>
              {t("books.add.searchTab")}
            </TabButton>
          </div>

          {tab === "type" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runLookup(isbn);
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <Input
                label={t("books.add.isbn")}
                placeholder={t("books.add.isbnPlaceholder")}
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                inputMode="numeric"
                className="flex-1"
              />
              <Button type="submit" loading={lookup.isPending} className="shrink-0 whitespace-nowrap">
                {t("books.add.lookupButton")}
              </Button>
            </form>
          ) : tab === "search" ? (
            <div className="space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runSearch();
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <Input
                  label={t("books.add.searchTitleLabel")}
                  placeholder={t("books.add.searchTitlePlaceholder")}
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  className="flex-1"
                />
                <Input
                  label={t("books.add.searchAuthorLabel")}
                  placeholder={t("books.add.searchAuthorPlaceholder")}
                  value={searchAuthor}
                  onChange={(e) => setSearchAuthor(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" loading={search.isPending} className="shrink-0 whitespace-nowrap">
                  {t("books.add.searchButton")}
                </Button>
              </form>

              {search.isPending && (
                <p className="flex items-center gap-2 text-sm text-ink-soft">
                  <Spinner className="h-4 w-4" /> {t("books.add.searching")}
                </p>
              )}

              {searchResults && searchResults.length === 0 && !search.isPending && (
                <p className="text-sm text-ink-soft">{t("books.add.searchNoResults")}</p>
              )}

              {searchResults && searchResults.length > 0 && !search.isPending && (
                <div className="space-y-2">
                  <p className="text-sm text-ink-soft">{t("books.add.searchResultsHint")}</p>
                  <ul className="divide-y divide-line rounded-md border border-line">
                    {searchResults.map((result, index) => (
                      <li key={index} className="flex items-center gap-3 p-3">
                        {typeof result.cover_url === "string" ? (
                          <img
                            src={result.cover_url}
                            alt=""
                            className="h-14 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-14 w-10 shrink-0 rounded bg-paper" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{String(result.title ?? "")}</p>
                          <p className="truncate text-sm text-ink-soft">
                            {[result.main_author, result.publication_year]
                              .filter((v) => v !== null && v !== undefined)
                              .join(" · ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="shrink-0"
                          onClick={() => setDraft(metadataToRecordDraft(result))}
                        >
                          {t("books.add.searchSelect")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Suspense fallback={<div className="grid h-48 place-items-center rounded-md bg-paper"><Spinner /></div>}>
                <IsbnScanner onDetected={(code) => void runLookup(code)} />
              </Suspense>
              {lookup.isPending && (
                <p className="flex items-center gap-2 text-sm text-ink-soft">
                  <Spinner className="h-4 w-4" /> {t("books.add.lookingUp")}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="mt-4 text-sm text-brand hover:underline"
            onClick={() => setDraft({ ...EMPTY_DRAFT })}
          >
            {t("books.add.manualEntry")}
          </button>
        </Card>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-semibold">{t("books.add.bookDetailsSection")}</h2>
              {/* OCR cover-scan paused — inadequate accuracy, revisit later.
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => void handleCoverFile(e)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={extractCover.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("books.add.ocrScanButton")}
                </Button>
              </div>
              */}
            </div>
            <Input
              label={t("common.title")}
              error={form.formState.errors.title ? t("validation.titleRequired") : undefined}
              {...form.register("title", { required: true })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t("books.add.author")} {...form.register("main_author")} />
              <Input label={t("books.add.isbn")} inputMode="numeric" {...form.register("isbn")} />
              <Input label={t("books.add.publisher")} {...form.register("publisher")} />
              <Input label={t("books.add.year")} type="number" {...form.register("publication_year")} />
              <Select label={t("books.add.genre")} placeholder="—" options={genreOptions(t)} {...form.register("genre")} />
              <Input label={t("books.add.coverUrl")} {...form.register("cover_url")} />
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold">{t("books.add.placementSection")}</h2>
            <LocationPicker value={location} onChange={setLocation} />
            <Select
              label={t("books.add.readingStatus")}
              value={status}
              options={READING_STATUSES.map((s) => ({ value: s, label: readingStatusLabel(s, t) }))}
              onChange={(e) => setStatus(e.target.value as ReadingStatus)}
              className="sm:max-w-xs"
            />
            <Select
              label={t("books.add.owner")}
              placeholder={t("books.add.noOwner")}
              value={ownerId}
              options={(users.data ?? []).map((u) => ({ value: u.id, label: u.full_name }))}
              onChange={(e) => setOwnerId(e.target.value)}
              className="sm:max-w-xs"
            />
          </Card>

          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              {t("books.add.submitButton")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
              {t("common.back")}
            </Button>
          </div>
        </form>
      )}

      <DuplicateBookDialog
        conflict={addBook.conflict}
        loading={addBook.isPending}
        onConfirm={() => void handleConfirmDuplicate()}
        onCancel={() => addBook.cancelDuplicate()}
      />
    </>
  );
}

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
      className={`flex-1 truncate rounded px-1.5 py-1.5 text-xs font-medium sm:px-3 sm:text-sm ${
        active ? "bg-surface text-ink shadow-card" : "text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

import { lazy, Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LocationPicker, type LocationSelection } from "@/components/locations/LocationPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useAddBook } from "@/features/books/hooks";
import { useUsers } from "@/features/users/hooks";
import { useCreateRecord } from "@/features/records/hooks";
import {
  isValidIsbn,
  metadataToRecordDraft,
  normalizeIsbn,
  useIsbnLookup,
} from "@/features/records/isbn";
import { READING_STATUSES, readingStatusLabel } from "@/lib/format";
import type { BibliographicRecordCreate, ReadingStatus } from "@/types/api";

// Code-split the camera scanner (@zxing is large) — only loaded on the Scan tab.
const IsbnScanner = lazy(() =>
  import("@/components/books/IsbnScanner").then((m) => ({ default: m.IsbnScanner })),
);

type Tab = "scan" | "type";
const EMPTY_DRAFT: BibliographicRecordCreate = { title: "", other_authors: [] };

export function AddBookPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const lookup = useIsbnLookup();
  const createRecord = useCreateRecord();
  const addBook = useAddBook();

  const users = useUsers();

  const [tab, setTab] = useState<Tab>("type");
  const [isbn, setIsbn] = useState("");
  const [draft, setDraft] = useState<BibliographicRecordCreate | null>(null);
  const [location, setLocation] = useState<LocationSelection>({});
  const [status, setStatus] = useState<ReadingStatus>("to_read");
  const [ownerId, setOwnerId] = useState<string>("");

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

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const record = await createRecord.mutateAsync({
        ...values,
        publication_year: values.publication_year ? Number(values.publication_year) : null,
      });
      await addBook.mutateAsync({
        bibliographic_record_id: record.id,
        reading_status: status,
        ...(ownerId ? { owner_id: ownerId } : {}),
        ...location,
      });
      toast.success("Book added.");
      navigate("/books");
    } catch {
      toast.error("Couldn't add the book.");
    }
  });

  const saving = createRecord.isPending || addBook.isPending;

  return (
    <>
      <PageHeader
        title={t("books.add.pageTitle")}
        description={t("books.add.subtitle")}
        actions={
          <Link to="/books/add/shelf">
            <button
              type="button"
              className="text-sm text-brand hover:underline"
            >
              {t("books.add.shelfModeLink")}
            </button>
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
            <h2 className="font-display text-lg font-semibold">{t("books.add.bookDetailsSection")}</h2>
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
              <Input label={t("books.add.genre")} {...form.register("genre")} />
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
      className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
        active ? "bg-surface text-ink shadow-card" : "text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useAddToWishlist } from "@/features/wishlist/hooks";
import {
  isValidIsbn,
  metadataToRecordDraft,
  normalizeIsbn,
  useIsbnLookup,
  useSearchBooks,
} from "@/features/records/isbn";
import type { BibliographicRecordCreate, WishlistItemCreate } from "@/types/api";

type Tab = "type" | "search";

// Fields the user edits in the confirm form.
interface WishlistDraft {
  title: string;
  main_author: string;
  isbn: string;
  notes: string;
  priority: string;
}

// Hidden bibliographic metadata preserved from the lookup — not shown in the form.
type HiddenMeta = Pick<
  BibliographicRecordCreate,
  "publisher" | "publication_year" | "language" | "genre" | "cover_url" | "other_authors"
>;

const EMPTY_DRAFT: WishlistDraft = {
  title: "",
  main_author: "",
  isbn: "",
  notes: "",
  priority: "",
};

export function AddWishlistPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const lookup = useIsbnLookup();
  const search = useSearchBooks();
  const addItem = useAddToWishlist();

  const [tab, setTab] = useState<Tab>("type");
  const [isbn, setIsbn] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchAuthor, setSearchAuthor] = useState("");
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[] | null>(null);
  const [draft, setDraft] = useState<WishlistDraft | null>(null);
  const [hiddenMeta, setHiddenMeta] = useState<HiddenMeta>({});

  const form = useForm<WishlistDraft>({ values: draft ?? EMPTY_DRAFT });

  function applyMetadata(rec: ReturnType<typeof metadataToRecordDraft>, fallbackIsbn?: string) {
    setDraft({
      title: rec.title ?? "",
      main_author: rec.main_author ?? "",
      isbn: rec.isbn ?? fallbackIsbn ?? "",
      notes: "",
      priority: "",
    });
    setHiddenMeta({
      publisher: rec.publisher ?? null,
      publication_year: rec.publication_year ?? null,
      language: rec.language ?? null,
      genre: rec.genre ?? null,
      cover_url: rec.cover_url ?? null,
      other_authors: rec.other_authors ?? [],
    });
  }

  async function runLookup(code: string) {
    const normalized = normalizeIsbn(code);
    if (!isValidIsbn(normalized)) {
      toast.error(t("books.add.invalidIsbn"));
      return;
    }
    try {
      const result = await lookup.mutateAsync(normalized);
      applyMetadata(metadataToRecordDraft(result.metadata), normalized);
      toast.success(t("books.add.isbnFound"));
    } catch {
      setDraft({ ...EMPTY_DRAFT, isbn: normalized });
      setHiddenMeta({});
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

  const onSubmit = form.handleSubmit(async (values) => {
    const body: WishlistItemCreate = {
      title: values.title.trim(),
      isbn: values.isbn.trim() || undefined,
      main_author: values.main_author.trim() || undefined,
      // Preserve all bibliographic metadata gathered during lookup/search
      other_authors: hiddenMeta.other_authors ?? [],
      publisher: hiddenMeta.publisher ?? undefined,
      publication_year: hiddenMeta.publication_year ?? undefined,
      language: hiddenMeta.language ?? undefined,
      genre: hiddenMeta.genre ?? undefined,
      cover_url: hiddenMeta.cover_url ?? undefined,
      notes: values.notes.trim() || undefined,
      priority: values.priority ? Number(values.priority) : undefined,
    };
    try {
      await addItem.mutateAsync(body);
      toast.success(t("wishlist.addSuccess"));
      navigate("/wishlist");
    } catch {
      toast.error(t("wishlist.addFailed"));
    }
  });

  return (
    <>
      <Link to="/wishlist" className="mb-4 inline-block text-sm text-brand hover:underline">
        {t("wishlist.backLink")}
      </Link>

      <PageHeader
        title={t("wishlist.addPageTitle")}
        description={t("wishlist.addPageSubtitle")}
      />

      {!draft ? (
        <Card className="p-5">
          {/* Tab switcher */}
          <div className="mb-4 flex gap-1 rounded-md bg-paper p-1">
            <TabButton active={tab === "type"} onClick={() => setTab("type")}>
              {t("books.add.typeTab")}
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
          ) : (
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
                          onClick={() => {
                            applyMetadata(metadataToRecordDraft(result));
                          }}
                        >
                          {t("books.add.searchSelect")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="mt-4 text-sm text-brand hover:underline"
            onClick={() => { setDraft({ ...EMPTY_DRAFT }); setHiddenMeta({}); }}
          >
            {t("books.add.manualEntry")}
          </button>
        </Card>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold">{t("books.add.bookDetailsSection")}</h2>
            <Input
              label={`${t("common.title")} *`}
              error={form.formState.errors.title ? t("validation.titleRequired") : undefined}
              {...form.register("title", { required: true })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t("wishlist.authorLabel")} {...form.register("main_author")} />
              <Input label={t("books.add.isbn")} inputMode="numeric" {...form.register("isbn")} />
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold">{t("wishlist.wishlistDetails")}</h2>
            <Select
              label={t("wishlist.priorityLabel")}
              options={[
                { value: "1", label: t("wishlist.priorityHigh") },
                { value: "2", label: t("wishlist.priorityMedium") },
                { value: "3", label: t("wishlist.priorityLow") },
              ]}
              placeholder={t("wishlist.priorityNone")}
              className="sm:max-w-xs"
              {...form.register("priority")}
            />
            <Textarea
              label={t("wishlist.notesLabel")}
              placeholder={t("wishlist.notesPlaceholder")}
              rows={2}
              {...form.register("notes")}
            />
          </Card>

          <div className="flex gap-2">
            <Button type="submit" loading={addItem.isPending}>
              {t("wishlist.addButton")}
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
      className={`flex-1 truncate rounded px-1.5 py-1.5 text-xs font-medium sm:px-3 sm:text-sm ${
        active ? "bg-surface text-ink shadow-card" : "text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

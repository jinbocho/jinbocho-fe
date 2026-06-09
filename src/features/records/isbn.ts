import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { INGESTION } from "@/lib/paths";
import type { BibliographicRecordCreate, IsbnLookupResponse } from "@/types/api";

// Strips non-alphanumeric characters (keeps the trailing X some ISBN-10s use).
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn(isbn: string): boolean {
  const v = normalizeIsbn(isbn);
  return v.length === 10 || v.length === 13;
}

// The backend already normalizes Google Books / Open Library responses into
// record-shaped fields, so we just pick the ones we know.
export function metadataToRecordDraft(
  metadata: Record<string, unknown>,
): BibliographicRecordCreate {
  const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  return {
    title: str(metadata.title) ?? "",
    main_author: str(metadata.main_author),
    other_authors: arr(metadata.other_authors),
    isbn: str(metadata.isbn),
    publisher: str(metadata.publisher),
    publication_year: num(metadata.publication_year),
    language: str(metadata.language),
    genre: str(metadata.genre),
    cover_url: str(metadata.cover_url),
  };
}

export function useIsbnLookup() {
  return useMutation({
    mutationFn: (isbn: string) =>
      api
        .get(`${INGESTION}/isbn/${normalizeIsbn(isbn)}`)
        .json<IsbnLookupResponse>(),
  });
}

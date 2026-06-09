import { describe, expect, it } from "vitest";

import { joinBooksToRecords } from "@/features/books/hooks";
import type { BibliographicRecord, OwnedBook } from "@/types/api";

function book(id: string, recordId: string): OwnedBook {
  return {
    id,
    family_id: "fam",
    bibliographic_record_id: recordId,
    room_id: null,
    bookcase_id: null,
    section_id: null,
    shelf_id: null,
    shelf_position: null,
    condition: null,
    purchase_date: null,
    purchase_price: null,
    source: null,
    reading_status: "to_read",
    current_reader_id: null,
    notes: null,
    tags: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function record(id: string, title: string): BibliographicRecord {
  return {
    id,
    family_id: "fam",
    title,
    main_author: "Author",
    other_authors: [],
    isbn: null,
    publisher: null,
    publication_year: null,
    language: null,
    genre: null,
    cover_url: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("joinBooksToRecords", () => {
  it("attaches the matching record to each book", () => {
    const records = new Map([["r1", record("r1", "Dune")]]);
    const result = joinBooksToRecords([book("b1", "r1")], records);
    expect(result[0]!.record?.title).toBe("Dune");
  });

  it("yields a null record for an orphan book (missing record)", () => {
    const result = joinBooksToRecords([book("b1", "missing")], new Map());
    expect(result[0]!.record).toBeNull();
  });

  it("preserves book order and count", () => {
    const result = joinBooksToRecords([book("b1", "x"), book("b2", "y")], new Map());
    expect(result.map((v) => v.book.id)).toEqual(["b1", "b2"]);
  });
});

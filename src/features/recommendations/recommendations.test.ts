import { describe, expect, it } from "vitest";

import { buildRecommendationsRequest } from "@/features/recommendations/hooks";
import type { BibliographicRecord, BookRead, BookView, OwnedBook, User } from "@/types/api";

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
    owner_id: null,
    notes: null,
    tags: [],
    is_intentional_duplicate: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function record(id: string, title: string, genre: string | null = null): BibliographicRecord {
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
    genre,
    genre_raw: null,
    cover_url: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function user(id: string, name: string): User {
  return {
    id,
    family_id: "fam",
    email: `${id}@example.com`,
    full_name: name,
    role: "viewer",
    is_active: true,
    annual_reading_goal: null,
    language: null,
    theme_name: null,
    theme_mode: null,
    password_set_at: null,
      avatar_url: null,
  };
}

function read(userId: string, bookId: string, readAt: string): BookRead {
  return { owned_book_id: bookId, user_id: userId, read_at: readAt };
}

describe("buildRecommendationsRequest", () => {
  const views: BookView[] = [
    { book: book("b1", "r1"), record: record("r1", "Dune", "sci-fi") },
    { book: book("b2", "r2"), record: record("r2", "Foundation", "sci-fi") },
    { book: book("b3", "r3"), record: record("r3", "Pride and Prejudice", "romance") },
  ];
  const users = [user("u1", "Alice")];

  it("derives the member's top genre and recently read titles from their own BookRead rows", () => {
    const reads: BookRead[] = [
      read("u1", "b1", "2026-01-01T00:00:00Z"),
      read("u1", "b2", "2026-02-01T00:00:00Z"),
    ];
    const req = buildRecommendationsRequest(views, reads, users);
    expect(req.members[0]!.favorite_genres).toEqual(["sci-fi"]);
    expect(req.members[0]!.recently_read_titles).toEqual(["Foundation", "Dune"]);
  });

  it("excludes from a member's unread_catalog only books that member has read", () => {
    const reads: BookRead[] = [read("u1", "b1", "2026-01-01T00:00:00Z")];
    const req = buildRecommendationsRequest(views, reads, users);
    expect(req.members[0]!.unread_catalog.map((c) => c.owned_book_id)).toEqual(["b2", "b3"]);
  });

  it("does not exclude a book from a member's unread_catalog just because another member read it", () => {
    const twoUsers = [user("u1", "Alice"), user("u2", "Bob")];
    const reads: BookRead[] = [read("u2", "b1", "2026-01-01T00:00:00Z")];
    const req = buildRecommendationsRequest(views, reads, twoUsers);
    const alice = req.members.find((m) => m.user_id === "u1")!;
    expect(alice.unread_catalog.map((c) => c.owned_book_id)).toEqual(["b1", "b2", "b3"]);
  });

  it("returns an empty favorite_genres/recently_read_titles and full unread_catalog for a member with no reads", () => {
    const req = buildRecommendationsRequest(views, [], users);
    expect(req.members[0]!.favorite_genres).toEqual([]);
    expect(req.members[0]!.recently_read_titles).toEqual([]);
    expect(req.members[0]!.unread_catalog).toHaveLength(3);
  });
});

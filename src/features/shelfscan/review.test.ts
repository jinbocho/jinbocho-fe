import { describe, expect, it } from "vitest";

import type { ShelfScanCandidate } from "@/types/api";

import { toConfirmItem, toReviewItem } from "./review";

function candidate(overrides: Partial<ShelfScanCandidate> = {}): ShelfScanCandidate {
  return {
    spine_title: "Dune",
    spine_author: "Herbert",
    position: 0,
    status: "matched",
    already_owned: false,
    metadata: null,
    ...overrides,
  };
}

describe("toReviewItem", () => {
  it("prefers provider metadata over the raw spine transcription", () => {
    const item = toReviewItem(
      candidate({ metadata: { title: "Dune (Deluxe)", main_author: "Frank Herbert" } }),
      0,
    );
    expect(item.title).toBe("Dune (Deluxe)");
    expect(item.author).toBe("Frank Herbert");
  });

  it("falls back to the spine text when there is no metadata", () => {
    const item = toReviewItem(candidate({ metadata: null }), 2);
    expect(item.title).toBe("Dune");
    expect(item.author).toBe("Herbert");
    expect(item.key).toBe("2-Dune");
  });

  it("pre-selects confident matches", () => {
    expect(toReviewItem(candidate({ status: "matched" }), 0).selected).toBe(true);
    expect(toReviewItem(candidate({ status: "uncertain" }), 0).selected).toBe(true);
  });

  it("does not pre-select unread spines or already-owned copies", () => {
    expect(toReviewItem(candidate({ status: "not_found", metadata: null }), 0).selected).toBe(false);
    expect(toReviewItem(candidate({ status: "matched", already_owned: true }), 0).selected).toBe(false);
  });
});

describe("toConfirmItem", () => {
  it("carries edited title/author and pulls the rest from metadata", () => {
    const review = toReviewItem(
      candidate({
        position: 3,
        metadata: {
          title: "Dune",
          main_author: "Frank Herbert",
          isbn: "9780441013593",
          publisher: "Ace",
          publication_year: 1965,
          language: "en",
          genre: "sci-fi",
          cover_url: "https://example.test/dune.jpg",
        },
      }),
      0,
    );
    review.title = "Dune (edited)";
    review.author = "F. Herbert";

    const confirm = toConfirmItem(review);
    expect(confirm).toEqual({
      title: "Dune (edited)",
      main_author: "F. Herbert",
      isbn: "9780441013593",
      publisher: "Ace",
      publication_year: 1965,
      language: "en",
      genre: "sci-fi",
      cover_url: "https://example.test/dune.jpg",
      position: 3,
    });
  });

  it("emits nulls for missing metadata and a blank author", () => {
    const review = toReviewItem(candidate({ spine_author: null, metadata: null }), 0);
    const confirm = toConfirmItem(review);
    expect(confirm.main_author).toBeNull();
    expect(confirm.isbn).toBeNull();
    expect(confirm.publication_year).toBeNull();
    expect(confirm.title).toBe("Dune");
  });
});

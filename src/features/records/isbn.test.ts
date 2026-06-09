import { describe, expect, it } from "vitest";

import { isValidIsbn, metadataToRecordDraft, normalizeIsbn } from "@/features/records/isbn";

describe("normalizeIsbn", () => {
  it("strips hyphens and spaces", () => {
    expect(normalizeIsbn("978-0-441-01359-3")).toBe("9780441013593");
    expect(normalizeIsbn(" 0 441 01359 X ")).toBe("044101359X");
  });
});

describe("isValidIsbn", () => {
  it("accepts ISBN-10 and ISBN-13 lengths", () => {
    expect(isValidIsbn("9780441013593")).toBe(true);
    expect(isValidIsbn("044101359X")).toBe(true);
  });
  it("rejects other lengths", () => {
    expect(isValidIsbn("123")).toBe(false);
  });
});

describe("metadataToRecordDraft", () => {
  it("maps known fields and ignores unexpected types", () => {
    const draft = metadataToRecordDraft({
      title: "Dune",
      main_author: "Frank Herbert",
      other_authors: ["X", 5, "Y"],
      publication_year: 1965,
      cover_url: "http://x/c.jpg",
      isbn: "9780441013593",
      junk: { nope: true },
    });
    expect(draft.title).toBe("Dune");
    expect(draft.main_author).toBe("Frank Herbert");
    expect(draft.other_authors).toEqual(["X", "Y"]);
    expect(draft.publication_year).toBe(1965);
  });

  it("defaults missing title to empty string and nulls unknown fields", () => {
    const draft = metadataToRecordDraft({});
    expect(draft.title).toBe("");
    expect(draft.main_author).toBeNull();
    expect(draft.other_authors).toEqual([]);
  });
});

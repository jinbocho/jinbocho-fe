import { describe, expect, it } from "vitest";

import { parseBackupFile } from "@/features/export/useExport";

const VALID_BACKUP = {
  schema_version: 1,
  exported_at: "2026-06-20T00:00:00Z",
  family: { id: "f1", name: "The Smiths", description: null },
  users: [],
  rooms: [],
  bookcases: [],
  sections: [],
  shelves: [],
  bibliographic_records: [],
  owned_books: [],
  book_reads: [],
  book_loans: [],
  book_history: [],
};

describe("parseBackupFile", () => {
  it("parses a well-formed backup", () => {
    const backup = parseBackupFile(JSON.stringify(VALID_BACKUP));
    expect(backup.family.name).toBe("The Smiths");
    expect(backup.schema_version).toBe(1);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseBackupFile("not json")).toThrow(/valid JSON/);
  });

  it("rejects a file missing the expected shape", () => {
    expect(() => parseBackupFile(JSON.stringify({ foo: "bar" }))).toThrow(/doesn't look like/);
  });

  it("rejects an unsupported schema version", () => {
    expect(() => parseBackupFile(JSON.stringify({ ...VALID_BACKUP, schema_version: 99 }))).toThrow(/Unsupported/);
  });
});

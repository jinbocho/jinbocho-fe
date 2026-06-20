import { describe, expect, it } from "vitest";

import { buildUsersImportPayload, parseBackupFile } from "@/features/export/useExport";
import type { FullBackupExport } from "@/types/api";

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
  removed_members: [],
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

describe("buildUsersImportPayload", () => {
  function backupWith(overrides: Partial<FullBackupExport>): FullBackupExport {
    return { ...VALID_BACKUP, ...overrides } as FullBackupExport;
  }

  it("passes the roster through untouched when every reference is already known", () => {
    const backup = backupWith({
      users: [{ id: "u1" }] as FullBackupExport["users"],
      owned_books: [{ owner_id: "u1", current_reader_id: null }] as FullBackupExport["owned_books"],
    });
    const { users, restoredFromSnapshot } = buildUsersImportPayload(backup);
    expect(users).toEqual([{ id: "u1" }]);
    expect(restoredFromSnapshot).toBe(0);
  });

  it("drops an owner_id with no roster entry and no snapshot — no placeholder is invented", () => {
    const backup = backupWith({
      users: [],
      owned_books: [{ owner_id: "ghost-1", current_reader_id: null }] as FullBackupExport["owned_books"],
    });
    const { users, restoredFromSnapshot } = buildUsersImportPayload(backup);
    expect(users).toEqual([]);
    expect(restoredFromSnapshot).toBe(0);
  });

  it("recovers a removed member's real identity from their snapshot", () => {
    const backup = backupWith({
      users: [],
      owned_books: [{ owner_id: "ghost-1", current_reader_id: null }] as FullBackupExport["owned_books"],
      removed_members: [
        { id: "ghost-1", full_name: "Giuseppe Bianchi", email: "giuseppe@example.com", role: "viewer", removed_at: "2026-06-01T00:00:00Z" },
      ] as FullBackupExport["removed_members"],
    });
    const { users, restoredFromSnapshot } = buildUsersImportPayload(backup);
    expect(restoredFromSnapshot).toBe(1);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ id: "ghost-1", email: "giuseppe@example.com", full_name: "Giuseppe Bianchi", role: "viewer" });
  });

  it("checks current_reader_id, book_reads.user_id and book_history.changed_by too", () => {
    const backup = backupWith({
      users: [],
      owned_books: [{ owner_id: null, current_reader_id: "ghost-reader" }] as FullBackupExport["owned_books"],
      book_reads: [{ user_id: "ghost-read" }] as FullBackupExport["book_reads"],
      book_history: [{ changed_by: "ghost-history" }] as FullBackupExport["book_history"],
      removed_members: [
        { id: "ghost-reader", full_name: "A", email: "a@example.com", role: "viewer", removed_at: "2026-06-01T00:00:00Z" },
        { id: "ghost-read", full_name: "B", email: "b@example.com", role: "viewer", removed_at: "2026-06-01T00:00:00Z" },
        { id: "ghost-history", full_name: "C", email: "c@example.com", role: "viewer", removed_at: "2026-06-01T00:00:00Z" },
      ] as FullBackupExport["removed_members"],
    });
    const { restoredFromSnapshot } = buildUsersImportPayload(backup);
    expect(restoredFromSnapshot).toBe(3);
  });

  it("deduplicates the same referenced id seen multiple times", () => {
    const backup = backupWith({
      users: [],
      owned_books: [{ owner_id: "ghost-1", current_reader_id: "ghost-1" }] as FullBackupExport["owned_books"],
      removed_members: [
        { id: "ghost-1", full_name: "A", email: "a@example.com", role: "viewer", removed_at: "2026-06-01T00:00:00Z" },
      ] as FullBackupExport["removed_members"],
    });
    const { restoredFromSnapshot } = buildUsersImportPayload(backup);
    expect(restoredFromSnapshot).toBe(1);
  });
});

import { useState } from "react";

import { api } from "@/lib/api";
import { CATALOG_IMPORT, EXPORT, USERS } from "@/lib/paths";
import type {
  FamilyDataExport,
  FullBackupExport,
  FullLibraryExport,
  ImportFullLibraryRequest,
  ImportFullLibraryResponse,
  ImportUsersResponse,
} from "@/types/api";

type ExportFormat = "csv" | "json";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// The export endpoints require the bearer token, so a plain <a href> can't be
// used — we fetch the blob through the authenticated client and trigger a
// download from an object URL.
//
// This is a lightweight, books-only, spreadsheet-friendly export — NOT a
// restore format. For a complete backup, see useExportFullBackup below.
export function useExport() {
  const [isExporting, setIsExporting] = useState(false);

  async function exportBooks(format: ExportFormat) {
    setIsExporting(true);
    try {
      const blob = await api.get(`${EXPORT}/books.${format}`).blob();
      downloadBlob(blob, `books.${format}`);
    } finally {
      setIsExporting(false);
    }
  }

  return { exportBooks, isExporting };
}

const BACKUP_SCHEMA_VERSION = 1;

// Calls auth-service (family + roster) and catalog-service (everything else)
// in parallel and merges them into one downloadable JSON document — the
// gateway is a dumb proxy with no cross-service orchestration of its own, so
// the frontend is where these two calls come together, same as the existing
// OwnedBook/BibliographicRecord join elsewhere in this app.
export function useExportFullBackup() {
  const [isExporting, setIsExporting] = useState(false);

  async function exportFullBackup() {
    setIsExporting(true);
    try {
      const [familyData, library] = await Promise.all([
        api.get(`${USERS}/export`).json<FamilyDataExport>(),
        api.get(`${EXPORT}/full`).json<FullLibraryExport>(),
      ]);

      const backup: FullBackupExport = {
        schema_version: BACKUP_SCHEMA_VERSION,
        exported_at: library.exported_at,
        family: familyData.family,
        users: familyData.users,
        rooms: library.rooms,
        bookcases: library.bookcases,
        sections: library.sections,
        shelves: library.shelves,
        bibliographic_records: library.bibliographic_records,
        owned_books: library.owned_books,
        book_reads: library.book_reads,
        book_loans: library.book_loans,
        book_history: library.book_history,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      downloadBlob(blob, `jinbocho-backup-${new Date().toISOString().slice(0, 10)}.json`);
    } finally {
      setIsExporting(false);
    }
  }

  return { exportFullBackup, isExporting };
}

// Which of the two sequential import calls failed — surfaced so the UI can
// tell the user exactly what happened (the auth step is safe to redo; the
// catalog step is not, since it always inserts rooms/books fresh).
export class ImportStepError extends Error {
  constructor(public readonly step: "users" | "library", public readonly cause: unknown) {
    super(`Restore failed during the ${step === "users" ? "user" : "library"} step`);
  }
}

// Parses and minimally validates an uploaded backup file before it's shown
// to the user for confirmation. Exported as a pure function for testing.
export function parseBackupFile(raw: string): FullBackupExport {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Not a valid JSON file.");
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("schema_version" in data) ||
    !("family" in data) ||
    !("users" in data) ||
    !("owned_books" in data)
  ) {
    throw new Error("This doesn't look like a Jinbocho backup file.");
  }
  const backup = data as FullBackupExport;
  if (backup.schema_version !== BACKUP_SCHEMA_VERSION) {
    throw new Error(`Unsupported backup version: ${String(backup.schema_version)}`);
  }
  return backup;
}

// Restores a backup: users first (so the catalog import can remap owner_id /
// current_reader_id / etc. to real ids), then the library. Merges into
// whatever the current family already has rather than requiring it empty —
// bibliographic records are deduplicated by ISBN, everything else is
// inserted fresh (see the catalog-service import use case for the full
// merge-semantics rationale).
export function useImportFullBackup() {
  const [isImporting, setIsImporting] = useState(false);

  async function importFullBackup(backup: FullBackupExport): Promise<ImportFullLibraryResponse> {
    setIsImporting(true);
    try {
      let usersResult: ImportUsersResponse;
      try {
        usersResult = await api
          .post(`${USERS}/import`, { json: { users: backup.users } })
          .json<ImportUsersResponse>();
      } catch (err) {
        throw new ImportStepError("users", err);
      }

      const libraryPayload: ImportFullLibraryRequest = {
        rooms: backup.rooms,
        bookcases: backup.bookcases,
        sections: backup.sections,
        shelves: backup.shelves,
        bibliographic_records: backup.bibliographic_records,
        owned_books: backup.owned_books,
        book_reads: backup.book_reads,
        book_loans: backup.book_loans,
        book_history: backup.book_history,
        user_id_map: usersResult.user_id_map,
      };

      try {
        return await api
          .post(`${CATALOG_IMPORT}/full`, { json: libraryPayload })
          .json<ImportFullLibraryResponse>();
      } catch (err) {
        throw new ImportStepError("library", err);
      }
    } finally {
      setIsImporting(false);
    }
  }

  return { importFullBackup, isImporting };
}

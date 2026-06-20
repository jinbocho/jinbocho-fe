import { useState } from "react";

import { useAddBookWithDuplicateCheck, useDeleteBook } from "@/features/books/hooks";
import { useCreateRecord } from "@/features/records/hooks";
import type { LocationSelection } from "@/components/locations/LocationPicker";
import type { BibliographicRecord, BibliographicRecordCreate, OwnedBook } from "@/types/api";

export interface SessionBook {
  book: OwnedBook;
  record: BibliographicRecord;
}

export function useShelfAddSession(location: LocationSelection, ownerId?: string) {
  const [sessionBooks, setSessionBooks] = useState<SessionBook[]>([]);
  const createRecord = useCreateRecord();
  const addBook = useAddBookWithDuplicateCheck();
  const deleteBook = useDeleteBook();
  // Held onto across the duplicate-confirmation roundtrip so a confirmed
  // retry doesn't need to recreate the bibliographic record.
  const [pendingRecord, setPendingRecord] = useState<BibliographicRecord | null>(null);

  // Returns false when a duplicate conflict is now pending confirmation
  // (see duplicateConflict/confirmPendingDuplicate/cancelPendingDuplicate) —
  // the caller should not advance the scan loop until that resolves.
  async function addToShelf(draft: BibliographicRecordCreate): Promise<boolean> {
    const record = await createRecord.mutateAsync(draft);
    const book = await addBook.submit({
      bibliographic_record_id: record.id,
      reading_status: "to_read",
      room_id: location.room_id,
      bookcase_id: location.bookcase_id,
      section_id: location.section_id,
      shelf_id: location.shelf_id,
      ...(ownerId ? { owner_id: ownerId } : {}),
    });
    if (!book) {
      setPendingRecord(record);
      return false;
    }
    setSessionBooks((prev) => [{ book, record }, ...prev]);
    return true;
  }

  async function confirmPendingDuplicate(): Promise<void> {
    const book = await addBook.confirmDuplicate();
    if (book && pendingRecord) {
      setSessionBooks((prev) => [{ book, record: pendingRecord }, ...prev]);
    }
    setPendingRecord(null);
  }

  function cancelPendingDuplicate() {
    addBook.cancelDuplicate();
    setPendingRecord(null);
  }

  async function removeFromShelf(bookId: string): Promise<void> {
    await deleteBook.mutateAsync(bookId);
    setSessionBooks((prev) => prev.filter((sb) => sb.book.id !== bookId));
  }

  return {
    sessionBooks,
    addToShelf,
    removeFromShelf,
    duplicateConflict: addBook.conflict,
    confirmPendingDuplicate,
    cancelPendingDuplicate,
    isSaving: createRecord.isPending || addBook.isPending,
    isRemoving: deleteBook.isPending,
  };
}

import { useState } from "react";

import { useAddBook, useDeleteBook } from "@/features/books/hooks";
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
  const addBook = useAddBook();
  const deleteBook = useDeleteBook();

  async function addToShelf(draft: BibliographicRecordCreate): Promise<void> {
    const record = await createRecord.mutateAsync(draft);
    const book = await addBook.mutateAsync({
      bibliographic_record_id: record.id,
      reading_status: "to_read",
      room_id: location.room_id,
      bookcase_id: location.bookcase_id,
      section_id: location.section_id,
      shelf_id: location.shelf_id,
      ...(ownerId ? { owner_id: ownerId } : {}),
    });
    setSessionBooks((prev) => [{ book, record }, ...prev]);
  }

  async function removeFromShelf(bookId: string): Promise<void> {
    await deleteBook.mutateAsync(bookId);
    setSessionBooks((prev) => prev.filter((sb) => sb.book.id !== bookId));
  }

  return {
    sessionBooks,
    addToShelf,
    removeFromShelf,
    isSaving: createRecord.isPending || addBook.isPending,
    isRemoving: deleteBook.isPending,
  };
}

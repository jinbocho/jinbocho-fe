import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { HTTPError } from "ky";
import { useState } from "react";
import { useMemo } from "react";

import { api } from "@/lib/api";
import { authStore } from "@/features/auth/store";
import { fetchAllPages } from "@/lib/paginate";
import { BOOKS, RECORDS } from "@/lib/paths";
import type {
  BibliographicRecord,
  BookLoan,
  BookLoanCreate,
  BookRead,
  BookView,
  // CoverExtractResponse, // unused while cover OCR scan is paused, see useExtractBookCover below
  DuplicateBookConflict,
  OwnedBook,
  OwnedBookCreate,
  OwnedBookUpdate,
  ReadingStatus,
  User,
} from "@/types/api";

export const bookKeys = {
  all: ["books"] as const,
  list: () => [...bookKeys.all, "list"] as const,
  detail: (id: string) => [...bookKeys.all, "detail", id] as const,
};

export const recordMapKey = ["records", "map"] as const;

// Owned books carry no title/author — only `bibliographic_record_id`. So every
// list view joins books to their records. Both sides are fetched in full
// (home-library scale) and merged in memory.

// Pure join — exported for testing.
export function joinBooksToRecords(
  books: OwnedBook[],
  records: Map<string, BibliographicRecord>,
): BookView[] {
  return books.map((book) => ({
    book,
    record: records.get(book.bibliographic_record_id) ?? null,
  }));
}

// Pure grouping — exported for testing. Maps each read book to the names of
// the family members who have read it, for display in list views.
export function buildReadersByBook(reads: BookRead[], users: User[]): Map<string, string[]> {
  const names = new Map(users.map((u) => [u.id, u.full_name]));
  const map = new Map<string, string[]>();
  for (const r of reads) {
    const name = names.get(r.user_id);
    if (!name) continue;
    map.set(r.owned_book_id, [...(map.get(r.owned_book_id) ?? []), name]);
  }
  return map;
}

export function useAllBooks() {
  return useQuery({
    queryKey: bookKeys.list(),
    queryFn: () => fetchAllPages<OwnedBook>(api, `${BOOKS}/`),
  });
}

// Records indexed by id, for O(1) joining.
export function useRecordMap() {
  return useQuery({
    queryKey: recordMapKey,
    queryFn: async () => {
      const records = await fetchAllPages<BibliographicRecord>(api, `${RECORDS}/`);
      return new Map(records.map((r) => [r.id, r]));
    },
  });
}

// The primary catalog hook: a fully joined, render-ready list.
export function useBookViews(): {
  data: BookView[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const books = useAllBooks();
  const records = useRecordMap();

  const data = useMemo<BookView[]>(() => {
    if (!books.data || !records.data) return [];
    return joinBooksToRecords(books.data, records.data);
  }, [books.data, records.data]);

  return {
    data,
    isLoading: books.isLoading || records.isLoading,
    isError: books.isError || records.isError,
    refetch: () => {
      void books.refetch();
      void records.refetch();
    },
  };
}

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: bookKeys.detail(id ?? ""),
    queryFn: () => api.get(`${BOOKS}/${id}`).json<OwnedBook>(),
    enabled: Boolean(id),
  });
}

export function useAddBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OwnedBookCreate) =>
      api.post(`${BOOKS}/`, { json: body }).json<OwnedBook>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}

// Wraps useAddBook with the duplicate-detection roundtrip: the backend
// rejects with 409 when the new book looks like one already owned by the
// same owner (same ISBN, or same title+author under a different ISBN).
// submit() returns null and stores the conflict instead of throwing, so the
// caller can show it and either confirmDuplicate() (resubmits with
// is_intentional_duplicate: true) or cancelDuplicate() (drops it, per spec
// the book must not be added).
export function useAddBookWithDuplicateCheck() {
  const addBook = useAddBook();
  const [pending, setPending] = useState<{ body: OwnedBookCreate; conflict: DuplicateBookConflict } | null>(null);

  async function submit(body: OwnedBookCreate): Promise<OwnedBook | null> {
    try {
      return await addBook.mutateAsync(body);
    } catch (err) {
      if (err instanceof HTTPError && err.response.status === 409) {
        const conflict = await err.response.json<DuplicateBookConflict>().catch(() => null);
        if (conflict?.error === "duplicate_book") {
          setPending({ body, conflict });
          return null;
        }
      }
      throw err;
    }
  }

  async function confirmDuplicate(): Promise<OwnedBook | null> {
    if (!pending) return null;
    const { body } = pending;
    setPending(null);
    return await addBook.mutateAsync({ ...body, is_intentional_duplicate: true });
  }

  function cancelDuplicate() {
    setPending(null);
  }

  return {
    submit,
    conflict: pending?.conflict ?? null,
    confirmDuplicate,
    cancelDuplicate,
    isPending: addBook.isPending,
  };
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: OwnedBookUpdate }) =>
      api.patch(`${BOOKS}/${id}`, { json: body }).json<OwnedBook>(),
    onSuccess: (book) => {
      qc.setQueryData(bookKeys.detail(book.id), book);
      void qc.invalidateQueries({ queryKey: bookKeys.list() });
    },
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${BOOKS}/${id}`).then(() => id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}

// Position update — backend expects QUERY PARAMS, not a JSON body.
export interface BookPositionInput {
  room_id?: string;
  bookcase_id?: string;
  section_id?: string;
  shelf_id?: string;
  shelf_position?: number;
}

export function useUpdateBookPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, position }: { id: string; position: BookPositionInput }) => {
      const searchParams: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(position)) {
        if (v !== undefined && v !== null) searchParams[k] = v;
      }
      return api
        .post(`${BOOKS}/${id}/position`, { searchParams })
        .json<OwnedBook>();
    },
    onSuccess: (book) => {
      qc.setQueryData(bookKeys.detail(book.id), book);
      void qc.invalidateQueries({ queryKey: bookKeys.list() });
    },
  });
}

export function useBookHistory(id: string | undefined) {
  return useQuery({
    queryKey: [...bookKeys.detail(id ?? ""), "history"],
    queryFn: () => api.get(`${BOOKS}/${id}/history`).json<unknown[]>(),
    enabled: Boolean(id),
  });
}

export const bookReadKeys = {
  family: ["book-reads", "family"] as const,
  book: (id: string) => ["book-reads", "book", id] as const,
};

export function useFamilyReads() {
  return useQuery({
    queryKey: bookReadKeys.family,
    queryFn: () => api.get(`${BOOKS}/reads`).json<BookRead[]>(),
  });
}

export function useBookReads(bookId: string | undefined) {
  return useQuery({
    queryKey: bookReadKeys.book(bookId ?? ""),
    queryFn: () => api.get(`${BOOKS}/${bookId}/reads`).json<BookRead[]>(),
    enabled: Boolean(bookId),
  });
}

export function useMarkBookRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, userId }: { bookId: string; userId: string }) =>
      api.post(`${BOOKS}/${bookId}/reads`, { json: { user_id: userId } }).json<BookRead>(),
    onSuccess: (_data, { bookId }) => {
      void qc.invalidateQueries({ queryKey: bookReadKeys.book(bookId) });
      void qc.invalidateQueries({ queryKey: bookReadKeys.family });
      void qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) });
      void qc.invalidateQueries({ queryKey: bookKeys.list() });
    },
  });
}

export function useUnmarkBookRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, userId }: { bookId: string; userId: string }) =>
      api.delete(`${BOOKS}/${bookId}/reads/${userId}`),
    onSuccess: (_data, { bookId }) => {
      void qc.invalidateQueries({ queryKey: bookReadKeys.book(bookId) });
      void qc.invalidateQueries({ queryKey: bookReadKeys.family });
      void qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) });
      void qc.invalidateQueries({ queryKey: bookKeys.list() });
    },
  });
}

// ----- Book loans (external lending) -----

export const bookLoanKeys = {
  active: ["books", "loans", "active"] as const,
  all: ["books", "loans", "all"] as const,
  book: (id: string) => ["books", "loans", "book", id] as const,
};

// Pure sort — exported for testing. Orders active loans by nearest due date
// first; loans without a due date sort last.
export function sortLoansByDueDate(loans: BookLoan[]): BookLoan[] {
  return [...loans].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

export function useActiveLoans() {
  return useQuery({
    queryKey: bookLoanKeys.active,
    queryFn: () => api.get(`${BOOKS}/loans/active`).json<BookLoan[]>(),
  });
}

// All loans for the family, active and returned — powers the loan-history section.
export function useAllLoans() {
  return useQuery({
    queryKey: bookLoanKeys.all,
    queryFn: () => api.get(`${BOOKS}/loans/all`).json<BookLoan[]>(),
  });
}

export function useBookLoans(bookId: string | undefined) {
  return useQuery({
    queryKey: bookLoanKeys.book(bookId ?? ""),
    queryFn: () => api.get(`${BOOKS}/${bookId}/loans`).json<BookLoan[]>(),
    enabled: Boolean(bookId),
  });
}

export function useLendBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, body }: { bookId: string; body: BookLoanCreate }) =>
      api.post(`${BOOKS}/${bookId}/loans`, { json: body }).json<BookLoan>(),
    onSuccess: (_data, { bookId }) => {
      void qc.invalidateQueries({ queryKey: bookLoanKeys.book(bookId) });
      void qc.invalidateQueries({ queryKey: bookLoanKeys.active });
      void qc.invalidateQueries({ queryKey: bookLoanKeys.all });
      void qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) });
    },
  });
}

export function useReturnBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId }: { bookId: string }) =>
      api.post(`${BOOKS}/${bookId}/loans/return`).json<BookLoan>(),
    onSuccess: (_data, { bookId }) => {
      void qc.invalidateQueries({ queryKey: bookLoanKeys.book(bookId) });
      void qc.invalidateQueries({ queryKey: bookLoanKeys.active });
      void qc.invalidateQueries({ queryKey: bookLoanKeys.all });
      void qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) });
    },
  });
}

// ----- C3: reading-status with optimistic update + rollback -----
// Endpoint takes the status as a QUERY PARAM.

export function useUpdateReadingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReadingStatus }) =>
      api
        .post(`${BOOKS}/${id}/reading-status`, {
          searchParams: { reading_status: status },
        })
        .json<OwnedBook>(),

    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: bookKeys.list() });
      await qc.cancelQueries({ queryKey: bookKeys.detail(id) });

      // Mirror the backend rule: reader is set on "reading", cleared otherwise.
      const reader = status === "reading" ? (authStore.get().user?.id ?? null) : null;

      const prevList = qc.getQueryData<OwnedBook[]>(bookKeys.list());
      const prevDetail = qc.getQueryData<OwnedBook>(bookKeys.detail(id));

      if (prevList) {
        qc.setQueryData<OwnedBook[]>(
          bookKeys.list(),
          prevList.map((b) =>
            b.id === id ? { ...b, reading_status: status, current_reader_id: reader } : b,
          ),
        );
      }
      if (prevDetail) {
        qc.setQueryData<OwnedBook>(bookKeys.detail(id), {
          ...prevDetail,
          reading_status: status,
          current_reader_id: reader,
        });
      }
      return { prevList, prevDetail };
    },

    onError: (_err, { id }, ctx) => {
      if (ctx?.prevList) qc.setQueryData(bookKeys.list(), ctx.prevList);
      if (ctx?.prevDetail) qc.setQueryData(bookKeys.detail(id), ctx.prevDetail);
    },

    onSettled: (_data, _err, { id }) => {
      void qc.invalidateQueries({ queryKey: bookKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: bookKeys.list() });
    },
  });
}

// ----- AI: Cover OCR -----
// Paused: OCR accuracy is currently inadequate. Revisit before re-enabling
// the scan button in AddBookPage.tsx / ShelfAddPage.tsx.

// export function useExtractBookCover() {
//   return useMutation({
//     mutationFn: async (file: File) => {
//       const formData = new FormData();
//       formData.append("image", file);
//       return api.post("v1/ai/cover/extract", { body: formData }).json<CoverExtractResponse>();
//     },
//   });
// }

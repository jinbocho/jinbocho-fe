import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";

import { api } from "@/lib/api";
import { authStore } from "@/features/auth/store";
import { fetchAllPages } from "@/lib/paginate";
import { BOOKS, RECORDS } from "@/lib/paths";
import type {
  BibliographicRecord,
  BookView,
  OwnedBook,
  OwnedBookCreate,
  OwnedBookUpdate,
  ReadingStatus,
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

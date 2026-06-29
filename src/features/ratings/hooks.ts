import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { BOOKS, RATINGS } from "@/lib/paths";
import type { BookRating, BookRatingCreate, BookRatingUpdate, FamilyRatingStats } from "@/types/api";

export const ratingKeys = {
  all: ["ratings", "family"] as const,
  list: (bookId: string) => ["ratings", bookId, "list"] as const,
  stats: (bookId: string) => ["ratings", bookId, "stats"] as const,
};

export function useFamilyRatings() {
  return useQuery({
    queryKey: ratingKeys.all,
    queryFn: () => api.get(`${RATINGS}/`).json<BookRating[]>(),
  });
}

export function useBookRatings(bookId: string | undefined) {
  return useQuery({
    queryKey: ratingKeys.list(bookId ?? ""),
    queryFn: () => api.get(`${BOOKS}/${bookId}/ratings`).json<BookRating[]>(),
    enabled: Boolean(bookId),
  });
}

export function useBookRatingStats(bookId: string | undefined) {
  return useQuery({
    queryKey: ratingKeys.stats(bookId ?? ""),
    queryFn: () => api.get(`${BOOKS}/${bookId}/ratings/stats`).json<FamilyRatingStats>(),
    enabled: Boolean(bookId),
  });
}

export function useCreateBookRating(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BookRatingCreate) =>
      api.post(`${BOOKS}/${bookId}/ratings`, { json: body }).json<BookRating>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ratingKeys.list(bookId) });
      void qc.invalidateQueries({ queryKey: ratingKeys.stats(bookId) });
    },
  });
}

export function useUpdateBookRating(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ratingId, body }: { ratingId: string; body: BookRatingUpdate }) =>
      api.patch(`${BOOKS}/${bookId}/ratings/${ratingId}`, { json: body }).json<BookRating>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ratingKeys.list(bookId) });
      void qc.invalidateQueries({ queryKey: ratingKeys.stats(bookId) });
    },
  });
}

export function useDeleteBookRating(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ratingId: string) => api.delete(`${BOOKS}/${bookId}/ratings/${ratingId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ratingKeys.list(bookId) });
      void qc.invalidateQueries({ queryKey: ratingKeys.stats(bookId) });
    },
  });
}

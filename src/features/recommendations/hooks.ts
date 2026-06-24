import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AI_REQUEST_TIMEOUT_MS, api } from "@/lib/api";
import { AI } from "@/lib/paths";
import { useBookViews, useFamilyReads } from "@/features/books/hooks";
import { useUsers } from "@/features/users/hooks";
import type { BookRead, BookView, RecommendationsRequest, RecommendationsResponse, User } from "@/types/api";

const RECENT_READS_LIMIT = 5;

// Pure — exported for testing. Builds the AI recommendations request from
// already-loaded data: each member's favorite genre (same formula as
// favoriteGenreByMember in features/stats/useLibraryStats.ts), their most
// recently read titles, and their own unread_catalog — books that specific
// member hasn't read yet. Unread is per-member, not family-wide: a book
// already read by one member can still be a valid candidate for another.
export function buildRecommendationsRequest(
  views: BookView[],
  reads: BookRead[],
  users: User[],
): RecommendationsRequest {
  const titleByBookId = new Map<string, string>();
  const genreByBookId = new Map<string, string>();
  for (const { book, record } of views) {
    if (record?.title) titleByBookId.set(book.id, record.title);
    if (record?.genre) genreByBookId.set(book.id, record.genre);
  }

  const readsByUser = new Map<string, BookRead[]>();
  for (const r of reads) {
    readsByUser.set(r.user_id, [...(readsByUser.get(r.user_id) ?? []), r]);
  }

  const members = users.map((u) => {
    const userReads = readsByUser.get(u.id) ?? [];
    const readBookIds = new Set(userReads.map((r) => r.owned_book_id));

    const genreCounts = new Map<string, number>();
    for (const r of userReads) {
      const genre = genreByBookId.get(r.owned_book_id);
      if (genre) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
    const topGenre = [...genreCounts.entries()].sort(([, a], [, b]) => b - a)[0]?.[0];

    const recentlyReadTitles = [...userReads]
      .sort((a, b) => b.read_at.localeCompare(a.read_at))
      .slice(0, RECENT_READS_LIMIT)
      .map((r) => titleByBookId.get(r.owned_book_id))
      .filter((title): title is string => Boolean(title));

    const unreadCatalog = views
      .filter(({ book, record }) => !readBookIds.has(book.id) && record)
      .map(({ book, record }) => ({
        owned_book_id: book.id,
        title: record!.title,
        main_author: record!.main_author,
        genre: record!.genre,
      }));

    return {
      user_id: u.id,
      favorite_genres: topGenre ? [topGenre] : [],
      recently_read_titles: recentlyReadTitles,
      unread_catalog: unreadCatalog,
    };
  });

  return { members };
}

export const recommendationsKeys = {
  all: ["ai", "recommendations"] as const,
};

// Personalized "what to read next" — see buildRecommendationsRequest above
// for how the request is derived. `requested` gates the actual network call:
// this hits an LLM, so it must never fire just because the dashboard mounted —
// only once the user has explicitly asked (e.g. clicked a button). Also
// disabled until books/reads/users have all loaded at least once, so the
// fetch — once requested — reflects real data.
export function useRecommendations(requested: boolean) {
  const books = useBookViews();
  const reads = useFamilyReads();
  const users = useUsers();

  const ready = !books.isLoading && !reads.isLoading && !users.isLoading && (users.data?.length ?? 0) > 0;

  const body = useMemo(
    () => buildRecommendationsRequest(books.data, reads.data ?? [], users.data ?? []),
    [books.data, reads.data, users.data],
  );

  return useQuery({
    queryKey: recommendationsKeys.all,
    queryFn: () =>
      api
        .post(`${AI}/recommendations`, { json: body, timeout: AI_REQUEST_TIMEOUT_MS })
        .json<RecommendationsResponse>(),
    enabled: ready && requested,
    staleTime: 10 * 60 * 1000,
  });
}

// Records the member's reaction to a single AI pick — feeds back into the
// next request via the backend's suggestion history (excluded from future
// candidates, and rejections shape the `disliked_genres` signal).
export function useMarkRecommendationAccepted() {
  return useMutation({
    mutationFn: ({ suggestionId, accepted }: { suggestionId: string; accepted: boolean }) =>
      api.patch(`${AI}/recommendations/${suggestionId}`, { json: { accepted } }).json(),
  });
}

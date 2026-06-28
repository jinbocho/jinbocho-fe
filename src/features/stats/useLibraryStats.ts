import { useMemo } from "react";

import { useBookViews, useFamilyReads } from "@/features/books/hooks";
import { useRooms } from "@/features/locations/hooks";
import { useUsers } from "@/features/users/hooks";
import type { BookRead, BookView, ReadingStatus, Room, User } from "@/types/api";

export interface MemberCount {
  userId: string | null;
  name: string;
  count: number;
}

export interface GoalProgress {
  userId: string;
  name: string;
  goal: number;
  readThisYear: number;
}

export interface SharedFavorite {
  view: BookView;
  readCount: number;
}

export interface MemberFavoriteGenre {
  userId: string;
  genre: string;
}

export interface MonthlyPace {
  year: number;
  month: number; // 0-indexed (JS Date.getMonth())
  count: number;
}

export interface LibraryStats {
  total: number;
  byStatus: Record<ReadingStatus, number>;
  byRoom: { roomId: string | null; roomName: string; count: number }[];
  byGenre: { genre: string; count: number; pct: number }[];
  byLanguage: { language: string; count: number; pct: number }[];
  byDecade: { decade: number; count: number }[];
  topAuthors: { author: string; count: number }[];
  recentlyAdded: BookView[];
  currentlyReading: BookView[];
  sharedFavorites: SharedFavorite[];
  ownedByMember: MemberCount[];
  readByMember: MemberCount[];
  favoriteGenreByMember: MemberFavoriteGenre[];
  unreadByAnyone: number;
  pctLibraryRead: number;
  goalProgress: GoalProgress[];
  readingPaceByMonth: MonthlyPace[];
}

const EMPTY_STATUS: Record<ReadingStatus, number> = {
  to_read: 0,
  reading: 0,
  read: 0,
};

function memberName(userId: string | null, users: User[]): string {
  if (!userId) return "Unassigned";
  return users.find((u) => u.id === userId)?.full_name ?? "Unknown";
}

// Pure aggregation — exported for testing.
export function computeLibraryStats(
  views: BookView[],
  rooms: Room[],
  reads: BookRead[],
  users: User[],
  currentYear: number = new Date().getFullYear(),
  currentMonth: number = new Date().getMonth(),
): LibraryStats {
  const roomNames = new Map(rooms.map((r) => [r.id, r.name]));

  const byStatus: Record<ReadingStatus, number> = { ...EMPTY_STATUS };
  const roomCounts = new Map<string | null, number>();
  const ownerCounts = new Map<string | null, number>();

  for (const { book } of views) {
    byStatus[book.reading_status] = (byStatus[book.reading_status] ?? 0) + 1;
    const roomKey = book.room_id ?? null;
    roomCounts.set(roomKey, (roomCounts.get(roomKey) ?? 0) + 1);
    const ownerKey = book.owner_id ?? null;
    ownerCounts.set(ownerKey, (ownerCounts.get(ownerKey) ?? 0) + 1);
  }

  const byRoom = [...roomCounts.entries()]
    .map(([roomId, count]) => ({
      roomId,
      roomName: roomId ? (roomNames.get(roomId) ?? "Unknown room") : "Unassigned",
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const recentlyAdded = [...views]
    .sort((a, b) => b.book.created_at.localeCompare(a.book.created_at))
    .slice(0, 5);

  // Books owned per member (from owner_id on each book).
  const ownedByMember = [...ownerCounts.entries()]
    .filter(([userId]) => userId !== null)
    .map(([userId, count]) => ({ userId, name: memberName(userId, users), count }))
    .sort((a, b) => b.count - a.count);

  // Books read per member (from book_reads table).
  const readCounts = new Map<string, number>();
  for (const r of reads) {
    readCounts.set(r.user_id, (readCounts.get(r.user_id) ?? 0) + 1);
  }
  const readByMember = [...readCounts.entries()]
    .map(([userId, count]) => ({ userId, name: memberName(userId, users), count }))
    .sort((a, b) => b.count - a.count);

  // Favorite genre per member, based on the genre of the books they've read.
  const genreByBookId = new Map<string, string>();
  for (const { book, record } of views) {
    if (record?.genre) genreByBookId.set(book.id, record.genre);
  }
  const genreCountsByMember = new Map<string, Map<string, number>>();
  for (const r of reads) {
    const genre = genreByBookId.get(r.owned_book_id);
    if (!genre) continue;
    const counts = genreCountsByMember.get(r.user_id) ?? new Map<string, number>();
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
    genreCountsByMember.set(r.user_id, counts);
  }
  const favoriteGenreByMember: MemberFavoriteGenre[] = [...genreCountsByMember.entries()].map(
    ([userId, counts]) => {
      const [topGenre] = [...counts.entries()].sort(([, a], [, b]) => b - a)[0]!;
      return { userId, genre: topGenre };
    },
  );

  // Books not read by any family member + % of library read.
  const readBookIds = new Set(reads.map((r) => r.owned_book_id));
  const unreadByAnyone = views.filter(({ book }) => !readBookIds.has(book.id)).length;
  const pctLibraryRead =
    views.length > 0 ? Math.round((readBookIds.size / views.length) * 100) : 0;

  // Annual reading goal progress per member (only members with a goal set).
  const thisYearReads = new Map<string, number>();
  for (const r of reads) {
    if (new Date(r.read_at).getFullYear() === currentYear) {
      thisYearReads.set(r.user_id, (thisYearReads.get(r.user_id) ?? 0) + 1);
    }
  }
  const goalProgress: GoalProgress[] = users
    .filter((u) => u.annual_reading_goal !== null && u.annual_reading_goal > 0)
    .map((u) => ({
      userId: u.id,
      name: u.full_name,
      goal: u.annual_reading_goal!,
      readThisYear: thisYearReads.get(u.id) ?? 0,
    }));

  const totalForPct = views.length || 1;

  // Genre distribution (from bibliographic records).
  const genreCounts = new Map<string, number>();
  for (const { record } of views) {
    if (record?.genre) {
      genreCounts.set(record.genre, (genreCounts.get(record.genre) ?? 0) + 1);
    }
  }
  const byGenre = [...genreCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([genre, count]) => ({ genre, count, pct: Math.round((count / totalForPct) * 100) }));

  // Language distribution — normalise to lowercase so "IT", "It", "it" merge.
  const languageCounts = new Map<string, number>();
  for (const { record } of views) {
    if (record?.language) {
      const lang = record.language.trim().toLowerCase();
      languageCounts.set(lang, (languageCounts.get(lang) ?? 0) + 1);
    }
  }
  const byLanguage = [...languageCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([language, count]) => ({ language, count, pct: Math.round((count / totalForPct) * 100) }));

  // Publication decade distribution.
  const decadeCounts = new Map<number, number>();
  for (const { record } of views) {
    if (record?.publication_year) {
      const decade = Math.floor(record.publication_year / 10) * 10;
      decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    }
  }
  const byDecade = [...decadeCounts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([decade, count]) => ({ decade, count }));

  // Top 5 authors by number of owned books.
  const authorCounts = new Map<string, number>();
  for (const { record } of views) {
    if (record?.main_author) {
      authorCounts.set(record.main_author, (authorCounts.get(record.main_author) ?? 0) + 1);
    }
  }
  const topAuthors = [...authorCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([author, count]) => ({ author, count }));

  const currentlyReading = views.filter((v) => v.book.reading_status === "reading");

  const readUsersByBook = new Map<string, Set<string>>();
  for (const r of reads) {
    const s = readUsersByBook.get(r.owned_book_id) ?? new Set<string>();
    s.add(r.user_id);
    readUsersByBook.set(r.owned_book_id, s);
  }
  const sharedFavorites: SharedFavorite[] = views
    .filter((v) => (readUsersByBook.get(v.book.id)?.size ?? 0) >= 2)
    .map((v) => ({ view: v, readCount: readUsersByBook.get(v.book.id)!.size }))
    .sort((a, b) => b.readCount - a.readCount)
    .slice(0, 5);

  // Books read per month for the last 12 months (including current month).
  const paceCounts = new Map<string, number>();
  for (const r of reads) {
    const d = new Date(r.read_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    paceCounts.set(key, (paceCounts.get(key) ?? 0) + 1);
  }
  const readingPaceByMonth: MonthlyPace[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - 11 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    return { year: y, month: m, count: paceCounts.get(`${y}-${m}`) ?? 0 };
  });

  return {
    total: views.length,
    byStatus,
    byRoom,
    byGenre,
    byLanguage,
    byDecade,
    topAuthors,
    recentlyAdded,
    currentlyReading,
    sharedFavorites,
    ownedByMember,
    readByMember,
    favoriteGenreByMember,
    unreadByAnyone,
    pctLibraryRead,
    goalProgress,
    readingPaceByMonth,
  };
}

// The backend has no stats endpoint — derive everything from loaded data.
// Fine at home-library scale.
export function useLibraryStats(): {
  data: LibraryStats;
  isLoading: boolean;
  isError: boolean;
} {
  const books = useBookViews();
  const rooms = useRooms();
  const reads = useFamilyReads();
  const users = useUsers();

  const data = useMemo<LibraryStats>(
    () => computeLibraryStats(books.data, rooms.data ?? [], reads.data ?? [], users.data ?? []),
    [books.data, rooms.data, reads.data, users.data],
  );

  return {
    data,
    isLoading: books.isLoading || rooms.isLoading || reads.isLoading || users.isLoading,
    isError: books.isError || rooms.isError || reads.isError || users.isError,
  };
}

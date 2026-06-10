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

export interface LibraryStats {
  total: number;
  byStatus: Record<ReadingStatus, number>;
  byRoom: { roomId: string | null; roomName: string; count: number }[];
  recentlyAdded: BookView[];
  ownedByMember: MemberCount[];
  readByMember: MemberCount[];
  unreadByAnyone: number;
  goalProgress: GoalProgress[];
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

  // Books not read by any family member.
  const readBookIds = new Set(reads.map((r) => r.owned_book_id));
  const unreadByAnyone = views.filter(({ book }) => !readBookIds.has(book.id)).length;

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

  return { total: views.length, byStatus, byRoom, recentlyAdded, ownedByMember, readByMember, unreadByAnyone, goalProgress };
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

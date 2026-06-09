import { useMemo } from "react";

import { useBookViews } from "@/features/books/hooks";
import { useRooms } from "@/features/locations/hooks";
import type { BookView, ReadingStatus, Room } from "@/types/api";

export interface LibraryStats {
  total: number;
  byStatus: Record<ReadingStatus, number>;
  byRoom: { roomId: string | null; roomName: string; count: number }[];
  recentlyAdded: BookView[];
}

const EMPTY_STATUS: Record<ReadingStatus, number> = {
  to_read: 0,
  reading: 0,
  read: 0,
};

// Pure aggregation — exported for testing.
export function computeLibraryStats(views: BookView[], rooms: Room[]): LibraryStats {
  const roomNames = new Map(rooms.map((r) => [r.id, r.name]));

  const byStatus: Record<ReadingStatus, number> = { ...EMPTY_STATUS };
  const roomCounts = new Map<string | null, number>();

  for (const { book } of views) {
    byStatus[book.reading_status] = (byStatus[book.reading_status] ?? 0) + 1;
    const key = book.room_id ?? null;
    roomCounts.set(key, (roomCounts.get(key) ?? 0) + 1);
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

  return { total: views.length, byStatus, byRoom, recentlyAdded };
}

// The backend has no stats endpoint — derive everything from the loaded
// books + rooms. Fine at home-library scale.
export function useLibraryStats(): {
  data: LibraryStats;
  isLoading: boolean;
  isError: boolean;
} {
  const books = useBookViews();
  const rooms = useRooms();

  const data = useMemo<LibraryStats>(
    () => computeLibraryStats(books.data, rooms.data ?? []),
    [books.data, rooms.data],
  );

  return {
    data,
    isLoading: books.isLoading || rooms.isLoading,
    isError: books.isError || rooms.isError,
  };
}

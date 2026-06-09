import { describe, expect, it } from "vitest";

import { computeLibraryStats } from "@/features/stats/useLibraryStats";
import type { BookView, OwnedBook, ReadingStatus, Room } from "@/types/api";

function view(
  id: string,
  status: ReadingStatus,
  roomId: string | null,
  createdAt: string,
): BookView {
  const book: OwnedBook = {
    id,
    family_id: "fam",
    bibliographic_record_id: "r",
    room_id: roomId,
    bookcase_id: null,
    section_id: null,
    shelf_id: null,
    shelf_position: null,
    condition: null,
    purchase_date: null,
    purchase_price: null,
    source: null,
    reading_status: status,
    current_reader_id: null,
    notes: null,
    tags: [],
    created_at: createdAt,
    updated_at: createdAt,
  };
  return { book, record: null };
}

const rooms: Room[] = [
  { id: "living", family_id: "fam", name: "Living Room", description: null, created_at: "", updated_at: "" },
];

describe("computeLibraryStats", () => {
  it("counts totals and reading status", () => {
    const stats = computeLibraryStats(
      [
        view("1", "to_read", "living", "2026-01-01"),
        view("2", "reading", "living", "2026-01-02"),
        view("3", "read", null, "2026-01-03"),
      ],
      rooms,
    );
    expect(stats.total).toBe(3);
    expect(stats.byStatus).toEqual({ to_read: 1, reading: 1, read: 1 });
  });

  it("groups by room name and labels unassigned books", () => {
    const stats = computeLibraryStats(
      [view("1", "to_read", "living", "2026-01-01"), view("2", "to_read", null, "2026-01-02")],
      rooms,
    );
    const living = stats.byRoom.find((r) => r.roomId === "living");
    const unassigned = stats.byRoom.find((r) => r.roomId === null);
    expect(living?.roomName).toBe("Living Room");
    expect(unassigned?.roomName).toBe("Unassigned");
  });

  it("returns recently added newest-first, capped at 5", () => {
    const views = Array.from({ length: 7 }, (_, i) =>
      view(`${i}`, "to_read", null, `2026-01-0${i + 1}`),
    );
    const stats = computeLibraryStats(views, rooms);
    expect(stats.recentlyAdded).toHaveLength(5);
    expect(stats.recentlyAdded[0]!.book.id).toBe("6");
  });

  it("is empty-safe", () => {
    const stats = computeLibraryStats([], []);
    expect(stats.total).toBe(0);
    expect(stats.byRoom).toEqual([]);
  });
});

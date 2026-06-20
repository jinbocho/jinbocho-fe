import { describe, expect, it } from "vitest";

import { computeLibraryStats } from "@/features/stats/useLibraryStats";
import type { BookRead, BookView, OwnedBook, ReadingStatus, Room, User } from "@/types/api";

function view(
  id: string,
  status: ReadingStatus,
  roomId: string | null,
  createdAt: string,
  ownerId?: string,
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
    owner_id: ownerId ?? null,
    notes: null,
    tags: [],
    is_intentional_duplicate: false,
    created_at: createdAt,
    updated_at: createdAt,
  };
  return { book, record: null };
}

function read(ownedBookId: string, userId: string): BookRead {
  return { owned_book_id: ownedBookId, user_id: userId, read_at: "2026-01-01T00:00:00Z" };
}

function user(id: string, name: string, annualGoal?: number): User {
  return {
    id,
    family_id: "fam",
    email: `${id}@test.com`,
    full_name: name,
    role: "viewer",
    is_active: true,
    annual_reading_goal: annualGoal ?? null,
    language: null,
    theme_name: null,
    theme_mode: null,
  };
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
      [],
      [],
    );
    expect(stats.total).toBe(3);
    expect(stats.byStatus).toEqual({ to_read: 1, reading: 1, read: 1 });
  });

  it("groups by room name and labels unassigned books", () => {
    const stats = computeLibraryStats(
      [view("1", "to_read", "living", "2026-01-01"), view("2", "to_read", null, "2026-01-02")],
      rooms,
      [],
      [],
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
    const stats = computeLibraryStats(views, rooms, [], []);
    expect(stats.recentlyAdded).toHaveLength(5);
    expect(stats.recentlyAdded[0]!.book.id).toBe("6");
  });

  it("is empty-safe", () => {
    const stats = computeLibraryStats([], [], [], []);
    expect(stats.total).toBe(0);
    expect(stats.byRoom).toEqual([]);
    expect(stats.ownedByMember).toEqual([]);
    expect(stats.readByMember).toEqual([]);
    expect(stats.unreadByAnyone).toBe(0);
    expect(stats.goalProgress).toEqual([]);
  });

  it("counts books owned per member", () => {
    const alice = user("u1", "Alice");
    const bob = user("u2", "Bob");
    const stats = computeLibraryStats(
      [
        view("1", "to_read", null, "2026-01-01", "u1"),
        view("2", "to_read", null, "2026-01-02", "u1"),
        view("3", "to_read", null, "2026-01-03", "u2"),
      ],
      [],
      [],
      [alice, bob],
    );
    expect(stats.ownedByMember).toHaveLength(2);
    expect(stats.ownedByMember[0]).toMatchObject({ userId: "u1", name: "Alice", count: 2 });
    expect(stats.ownedByMember[1]).toMatchObject({ userId: "u2", name: "Bob", count: 1 });
  });

  it("counts books read per member", () => {
    const alice = user("u1", "Alice");
    const stats = computeLibraryStats(
      [view("b1", "read", null, "2026-01-01"), view("b2", "read", null, "2026-01-02")],
      [],
      [read("b1", "u1"), read("b2", "u1")],
      [alice],
    );
    expect(stats.readByMember).toHaveLength(1);
    expect(stats.readByMember[0]).toMatchObject({ userId: "u1", name: "Alice", count: 2 });
  });

  it("counts books not read by anyone", () => {
    const stats = computeLibraryStats(
      [view("b1", "to_read", null, "2026-01-01"), view("b2", "to_read", null, "2026-01-02")],
      [],
      [read("b1", "u1")],
      [],
    );
    expect(stats.unreadByAnyone).toBe(1);
  });

  it("computes reading goal progress for current year only", () => {
    const alice = user("u1", "Alice", 12);
    const bob = user("u2", "Bob"); // no goal
    // alice read 2 this year and 1 last year
    const thisYear = new Date().getFullYear();
    const readsData = [
      { owned_book_id: "b1", user_id: "u1", read_at: `${thisYear}-03-01T00:00:00Z` },
      { owned_book_id: "b2", user_id: "u1", read_at: `${thisYear}-06-01T00:00:00Z` },
      { owned_book_id: "b3", user_id: "u1", read_at: `${thisYear - 1}-12-01T00:00:00Z` },
    ];
    const stats = computeLibraryStats([], [], readsData, [alice, bob]);
    expect(stats.goalProgress).toHaveLength(1);
    expect(stats.goalProgress[0]).toMatchObject({ userId: "u1", name: "Alice", goal: 12, readThisYear: 2 });
  });
});

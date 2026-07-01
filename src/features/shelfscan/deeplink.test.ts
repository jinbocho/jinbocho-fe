import { describe, expect, it } from "vitest";

import { readShelfLocation, shelfLocationSearch } from "./deeplink";

describe("shelfLocationSearch", () => {
  it("serializes the full chain", () => {
    const q = shelfLocationSearch({ room_id: "r", bookcase_id: "b", section_id: "s", shelf_id: "h" });
    expect(q).toBe("room_id=r&bookcase_id=b&section_id=s&shelf_id=h");
  });

  it("omits undefined levels instead of emitting empty params", () => {
    const q = shelfLocationSearch({ shelf_id: "h", section_id: "s" });
    expect(q).toBe("section_id=s&shelf_id=h");
  });
});

describe("readShelfLocation", () => {
  it("round-trips a full chain", () => {
    const loc = readShelfLocation(new URLSearchParams(shelfLocationSearch({
      room_id: "r", bookcase_id: "b", section_id: "s", shelf_id: "h",
    })));
    expect(loc).toEqual({ room_id: "r", bookcase_id: "b", section_id: "s", shelf_id: "h" });
  });

  it("returns empty when no shelf is present", () => {
    expect(readShelfLocation(new URLSearchParams("room_id=r"))).toEqual({});
  });

  it("treats the literal 'undefined' string as absent", () => {
    const loc = readShelfLocation(new URLSearchParams("room_id=undefined&bookcase_id=undefined&section_id=s&shelf_id=h"));
    expect(loc).toEqual({ room_id: undefined, bookcase_id: undefined, section_id: "s", shelf_id: "h" });
  });
});

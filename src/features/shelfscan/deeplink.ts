import type { LocationSelection } from "@/components/locations/LocationPicker";

// Shared query-string plumbing for deep-linking a shelf into the scan/audit
// pages with the whole room → bookcase → section → shelf chain pre-selected.

export function shelfLocationSearch(loc: LocationSelection): string {
  const params = new URLSearchParams();
  if (loc.room_id) params.set("room_id", loc.room_id);
  if (loc.bookcase_id) params.set("bookcase_id", loc.bookcase_id);
  if (loc.section_id) params.set("section_id", loc.section_id);
  if (loc.shelf_id) params.set("shelf_id", loc.shelf_id);
  return params.toString();
}

// Treats a missing param the same as the literal strings "undefined"/"null",
// so a stale link built from an absent id never seeds a broken selection.
function clean(value: string | null): string | undefined {
  return value && value !== "undefined" && value !== "null" ? value : undefined;
}

export function readShelfLocation(params: URLSearchParams): LocationSelection {
  const shelf_id = clean(params.get("shelf_id"));
  if (!shelf_id) return {};
  return {
    shelf_id,
    section_id: clean(params.get("section_id")),
    bookcase_id: clean(params.get("bookcase_id")),
    room_id: clean(params.get("room_id")),
  };
}

import { Select } from "@/components/ui/Select";
import { useBookcases, useRooms, useSections, useShelves } from "@/features/locations/hooks";

export interface LocationSelection {
  room_id?: string;
  bookcase_id?: string;
  section_id?: string;
  shelf_id?: string;
}

// Cascading room → bookcase → section → shelf. All levels optional; selecting a
// parent resets its descendants.
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationSelection;
  onChange: (next: LocationSelection) => void;
}) {
  const rooms = useRooms();
  const bookcases = useBookcases(value.room_id);
  const sections = useSections(value.bookcase_id);
  const shelves = useShelves(value.section_id);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Select
        label="Room"
        placeholder="— Select —"
        value={value.room_id ?? ""}
        options={(rooms.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
        onChange={(e) =>
          onChange({ room_id: e.target.value || undefined })
        }
      />
      <Select
        label="Bookcase"
        placeholder="— Select —"
        value={value.bookcase_id ?? ""}
        disabled={!value.room_id}
        options={(bookcases.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
        onChange={(e) =>
          onChange({ room_id: value.room_id, bookcase_id: e.target.value || undefined })
        }
      />
      <Select
        label="Section"
        placeholder="— Select —"
        value={value.section_id ?? ""}
        disabled={!value.bookcase_id}
        options={(sections.data ?? []).map((s) => ({
          value: s.id,
          label: s.label ?? `Section ${s.section_index + 1}`,
        }))}
        onChange={(e) =>
          onChange({
            room_id: value.room_id,
            bookcase_id: value.bookcase_id,
            section_id: e.target.value || undefined,
          })
        }
      />
      <Select
        label="Shelf"
        placeholder="— Select —"
        value={value.shelf_id ?? ""}
        disabled={!value.section_id}
        options={(shelves.data ?? []).map((s) => ({
          value: s.id,
          label: `Shelf ${s.shelf_index + 1}`,
        }))}
        onChange={(e) =>
          onChange({
            room_id: value.room_id,
            bookcase_id: value.bookcase_id,
            section_id: value.section_id,
            shelf_id: e.target.value || undefined,
          })
        }
      />
    </div>
  );
}

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { LocationSelection } from "@/components/locations/LocationPicker";
import { BOOKCASES, ROOMS, SECTIONS, SHELVES } from "@/lib/paths";
import type {
  Bookcase,
  BookcaseCreate,
  BookcaseUpdate,
  Room,
  RoomCreate,
  RoomUpdate,
  Section,
  SectionCreate,
  SectionUpdate,
  Shelf,
  ShelfCreate,
  ShelfUpdate,
} from "@/types/api";

export const locationKeys = {
  rooms: ["rooms"] as const,
  bookcases: (roomId?: string) => ["bookcases", { roomId: roomId ?? null }] as const,
  sections: (bookcaseId?: string) =>
    ["sections", { bookcaseId: bookcaseId ?? null }] as const,
  shelves: (sectionId?: string) =>
    ["shelves", { sectionId: sectionId ?? null }] as const,
};

// ----- Rooms -----

export function useRooms() {
  return useQuery({
    queryKey: locationKeys.rooms,
    queryFn: () => api.get(`${ROOMS}/`).json<Room[]>(),
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RoomCreate) => api.post(`${ROOMS}/`, { json: body }).json<Room>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: locationKeys.rooms }),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RoomUpdate }) =>
      api.patch(`${ROOMS}/${id}`, { json: body }).json<Room>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: locationKeys.rooms }),
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${ROOMS}/${id}`).then(() => id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: locationKeys.rooms }),
  });
}

// ----- Bookcases (filtered by room) -----

export function useBookcases(roomId?: string) {
  return useQuery({
    queryKey: locationKeys.bookcases(roomId),
    queryFn: () =>
      api
        .get(`${BOOKCASES}/`, roomId ? { searchParams: { room_id: roomId } } : undefined)
        .json<Bookcase[]>(),
  });
}

export function useCreateBookcase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BookcaseCreate) =>
      api.post(`${BOOKCASES}/`, { json: body }).json<Bookcase>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["bookcases"] }),
  });
}

export function useUpdateBookcase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: BookcaseUpdate }) =>
      api.patch(`${BOOKCASES}/${id}`, { json: body }).json<Bookcase>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["bookcases"] }),
  });
}

export function useDeleteBookcase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${BOOKCASES}/${id}`).then(() => id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["bookcases"] }),
  });
}

// ----- Sections (filtered by bookcase) -----

export function useSections(bookcaseId?: string) {
  return useQuery({
    queryKey: locationKeys.sections(bookcaseId),
    queryFn: () =>
      api
        .get(
          `${SECTIONS}/`,
          bookcaseId ? { searchParams: { bookcase_id: bookcaseId } } : undefined,
        )
        .json<Section[]>(),
    enabled: Boolean(bookcaseId),
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SectionCreate) =>
      api.post(`${SECTIONS}/`, { json: body }).json<Section>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["sections"] }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SectionUpdate }) =>
      api.patch(`${SECTIONS}/${id}`, { json: body }).json<Section>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["sections"] }),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${SECTIONS}/${id}`).then(() => id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["sections"] }),
  });
}

// ----- Shelves (filtered by section) -----

export function useShelves(sectionId?: string) {
  return useQuery({
    queryKey: locationKeys.shelves(sectionId),
    queryFn: () =>
      api
        .get(
          `${SHELVES}/`,
          sectionId ? { searchParams: { section_id: sectionId } } : undefined,
        )
        .json<Shelf[]>(),
    enabled: Boolean(sectionId),
  });
}

export function useCreateShelf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ShelfCreate) => api.post(`${SHELVES}/`, { json: body }).json<Shelf>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["shelves"] }),
  });
}

export function useUpdateShelf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ShelfUpdate }) =>
      api.patch(`${SHELVES}/${id}`, { json: body }).json<Shelf>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["shelves"] }),
  });
}

export function useDeleteShelf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${SHELVES}/${id}`).then(() => id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["shelves"] }),
  });
}

// Resolves a room/bookcase/section/shelf id tuple to a "Room › Bookcase ›
// Section › Shelf" breadcrumb, or null if any level is missing/unresolved.
// Shared by ShelfAddPage (position breadcrumb) and the duplicate-book dialog
// (showing where an existing copy already lives).
export function useLocationLabel(loc: LocationSelection) {
  const rooms = useRooms();
  const bookcases = useBookcases(loc.room_id);
  const sections = useSections(loc.bookcase_id);
  const shelves = useShelves(loc.section_id);

  const room = (rooms.data ?? []).find((r) => r.id === loc.room_id);
  const bookcase = (bookcases.data ?? []).find((b) => b.id === loc.bookcase_id);
  const section = (sections.data ?? []).find((s) => s.id === loc.section_id);
  const shelf = (shelves.data ?? []).find((s) => s.id === loc.shelf_id);

  if (!room || !bookcase || !section || !shelf) return null;
  return [
    room.name,
    bookcase.name,
    section.label ?? `Section ${section.section_index + 1}`,
    `Shelf ${shelf.shelf_index + 1}`,
  ].join(" › ");
}

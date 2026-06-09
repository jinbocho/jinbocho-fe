import type { BookCondition, BookSource, ReadingStatus } from "@/types/api";

export const READING_STATUS_LABEL: Record<ReadingStatus, string> = {
  to_read: "To read",
  reading: "Reading",
  read: "Read",
};

// Selectable options (values must match the backend DB enums).
export const BOOK_CONDITIONS: { value: BookCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

export const BOOK_SOURCES: { value: BookSource; label: string }[] = [
  { value: "purchased", label: "Purchased" },
  { value: "gift", label: "Gift" },
  { value: "borrowed", label: "Borrowed" },
  { value: "other", label: "Other" },
];

// Tailwind classes for the status badge (background + text).
export const READING_STATUS_CLASS: Record<ReadingStatus, string> = {
  to_read: "bg-stone/15 text-stone",
  reading: "bg-amber/15 text-amber",
  read: "bg-sage/15 text-sage",
};

export const READING_STATUSES: ReadingStatus[] = ["to_read", "reading", "read"];

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "EUR" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

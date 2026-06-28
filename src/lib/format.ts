import { useLangStore } from "@/features/i18n/store";
import { GENRE_CODES } from "@/types/api";
import type { BookCondition, BookSource, ReadingStatus } from "@/types/api";

// Tailwind classes for the status badge (background + text).
export const READING_STATUS_CLASS: Record<ReadingStatus, string> = {
  to_read: "bg-stone/15 text-stone",
  reading: "bg-amber/15 text-amber",
  read: "bg-sage/15 text-sage",
};

export const READING_STATUSES: ReadingStatus[] = ["to_read", "reading", "read"];

function activeLang(): string {
  return useLangStore.getState().lang;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(activeLang(), { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(activeLang(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const LOAN_WARNING_DAYS = 7;

export type LoanUrgency = "overdue" | "warning" | "normal";

// A loan is "warning" within a week of its due date, "overdue" past it.
export function loanUrgency(dueDate: string | null | undefined): LoanUrgency {
  if (!dueDate) return "normal";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "normal";
  const daysUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= LOAN_WARNING_DAYS) return "warning";
  return "normal";
}

export const LOAN_URGENCY_CLASS: Record<LoanUrgency, string> = {
  overdue: "font-semibold text-danger",
  warning: "font-medium text-amber",
  normal: "text-ink-soft",
};

export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(activeLang(), { style: "currency", currency: "EUR" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function readingStatusLabel(
  status: ReadingStatus,
  t: (key: string) => string,
): string {
  return t(`enums.readingStatus.${status}`);
}

// Translate a normalized genre code; unknown/legacy values fall back to the raw text.
export function genreLabel(genre: string, t: (key: string) => string): string {
  return (GENRE_CODES as readonly string[]).includes(genre) ? t(`enums.genre.${genre}`) : genre;
}

// Autocomplete suggestions for the free-text genre field — guides input toward the
// normalized list without blocking custom values (those get normalized later).
export function genreSuggestions(t: (key: string) => string): string[] {
  return GENRE_CODES.filter((g) => g !== "other")
    .map((g) => t(`enums.genre.${g}`))
    .sort((a, b) => a.localeCompare(b));
}

export function bookConditionLabel(
  condition: BookCondition,
  t: (key: string) => string,
): string {
  return t(`enums.bookCondition.${condition}`);
}

export function bookSourceLabel(
  source: BookSource,
  t: (key: string) => string,
): string {
  return t(`enums.bookSource.${source}`);
}

export function bookConditions(
  t: (key: string) => string,
): { value: BookCondition; label: string }[] {
  return [
    { value: "new", label: t("enums.bookCondition.new") },
    { value: "good", label: t("enums.bookCondition.good") },
    { value: "fair", label: t("enums.bookCondition.fair") },
    { value: "poor", label: t("enums.bookCondition.poor") },
  ];
}

export function bookSources(
  t: (key: string) => string,
): { value: BookSource; label: string }[] {
  return [
    { value: "purchased", label: t("enums.bookSource.purchased") },
    { value: "gift", label: t("enums.bookSource.gift") },
    { value: "borrowed", label: t("enums.bookSource.borrowed") },
    { value: "other", label: t("enums.bookSource.other") },
  ];
}

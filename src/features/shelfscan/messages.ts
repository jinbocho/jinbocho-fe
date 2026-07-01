import type { ShelfScanReason } from "@/types/api";

// Maps an unavailable scan/audit reason to an i18n key, so the user sees why it
// failed — a misconfigured model is an admin fix, not a "retry later". `scope`
// selects the scan vs audit key namespace (identical sub-keys under each).
export function reasonMessageKey(reason: ShelfScanReason, scope: "shelfScan" | "shelfAudit"): string {
  switch (reason) {
    case "unsupported":
      return `books.${scope}.unsupportedModel`;
    case "disabled":
      return `books.${scope}.notConfigured`;
    default:
      // "error" (transient) — and any unknown value — fall back to "try again".
      return `books.${scope}.unavailable`;
  }
}

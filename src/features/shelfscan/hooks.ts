import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AI_REQUEST_TIMEOUT_MS, api } from "@/lib/api";
import { INGESTION } from "@/lib/paths";
import type {
  ShelfAuditRequest,
  ShelfAuditResponse,
  ShelfScanConfirmRequest,
  ShelfScanConfirmResponse,
  ShelfScanRequest,
  ShelfScanResponse,
} from "@/types/api";

import { bookKeys } from "@/features/books/hooks";

// Reads spines from a shelf photo. One vision LLM call, so it uses the extended
// AI timeout rather than the default; nothing is persisted here.
export function useScanShelf() {
  return useMutation({
    mutationFn: (body: ShelfScanRequest) =>
      api
        .post(`${INGESTION}/shelf-scan`, { json: body, timeout: AI_REQUEST_TIMEOUT_MS })
        .json<ShelfScanResponse>(),
  });
}

// Reconciles a shelf's catalogued books against a fresh photo. Read-only, so
// no cache invalidation; one vision LLM call like the scan.
export function useAuditShelf() {
  return useMutation({
    mutationFn: (body: ShelfAuditRequest) =>
      api
        .post(`${INGESTION}/shelf-scan/audit`, { json: body, timeout: AI_REQUEST_TIMEOUT_MS })
        .json<ShelfAuditResponse>(),
  });
}

// Bulk-creates the reviewed books on the scanned shelf. Invalidates the book
// list so the catalog and bookcase map reflect the new copies immediately.
export function useConfirmShelfScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ShelfScanConfirmRequest) =>
      api
        .post(`${INGESTION}/shelf-scan/confirm`, { json: body })
        .json<ShelfScanConfirmResponse>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}

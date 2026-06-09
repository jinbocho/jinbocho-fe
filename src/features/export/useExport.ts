import { useState } from "react";

import { api } from "@/lib/api";
import { EXPORT } from "@/lib/paths";

type ExportFormat = "csv" | "json";

// The export endpoints require the bearer token, so a plain <a href> can't be
// used — we fetch the blob through the authenticated client and trigger a
// download from an object URL.
export function useExport() {
  const [isExporting, setIsExporting] = useState(false);

  async function exportBooks(format: ExportFormat) {
    setIsExporting(true);
    try {
      const blob = await api.get(`${EXPORT}/books.${format}`).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `books.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return { exportBooks, isExporting };
}

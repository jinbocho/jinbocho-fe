import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useExport } from "@/features/export/useExport";
import { useToast } from "@/components/ui/Toast";

export function ExportMenu({ disabled = false }: { disabled?: boolean }) {
  const { exportBooks, isExporting } = useExport();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  async function run(format: "csv" | "json") {
    setOpen(false);
    try {
      await exportBooks(format);
    } catch {
      toast.error("Export failed. Please try again.");
    }
  }

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || isExporting}
        loading={isExporting}
        onClick={() => setOpen((o) => !o)}
      >
        Export
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-md border border-line bg-surface shadow-card">
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
              onClick={() => run("csv")}
            >
              Download CSV
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
              onClick={() => run("json")}
            >
              Download JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}

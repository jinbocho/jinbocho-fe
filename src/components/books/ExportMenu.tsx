import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useExport } from "@/features/export/useExport";
import { useToast } from "@/components/ui/Toast";

export function ExportMenu({
  disabled = false,
  align = "right",
}: {
  disabled?: boolean;
  // "right" anchors the menu's right edge to the trigger (use when the trigger
  // sits at the right end of a row); "left" anchors the left edge instead, so
  // the menu doesn't spill past the screen edge when the trigger sits at the left.
  align?: "left" | "right";
}) {
  const { t } = useTranslation();
  const { exportBooks, isExporting } = useExport();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  async function run(format: "csv" | "json") {
    setOpen(false);
    try {
      await exportBooks(format);
    } catch {
      toast.error(t("export.failed"));
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
        {t("export.button")}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className={`absolute z-20 mt-1 w-32 overflow-hidden rounded-md border border-line bg-surface shadow-card ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
              onClick={() => run("csv")}
            >
              {t("export.downloadCsv")}
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
              onClick={() => run("json")}
            >
              {t("export.downloadJson")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

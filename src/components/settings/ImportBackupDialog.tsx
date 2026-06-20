import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ImportStepError, parseBackupFile, useImportFullBackup } from "@/features/export/useExport";
import { formatDateTime } from "@/lib/format";
import type { FullBackupExport } from "@/types/api";

export function ImportBackupDialog() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<FullBackupExport | null>(null);
  const importBackup = useImportFullBackup();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      setPending(parseBackupFile(text));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.backup.invalidFile"));
    }
  }

  async function handleConfirm() {
    if (!pending) return;
    try {
      const result = await importBackup.importFullBackup(pending);
      const skipped = result.owned_books_deduped + result.rooms_deduped + result.records_deduped;
      toast.success(
        skipped > 0
          ? `${t("settings.backup.importSuccess")} ${result.owned_books_imported} ${t("settings.backup.countBooks")}, ${result.rooms_imported} ${t("settings.backup.countRooms")} (${skipped} ${t("settings.backup.alreadyPresent")}).`
          : `${t("settings.backup.importSuccess")} ${result.owned_books_imported} ${t("settings.backup.countBooks")}, ${result.rooms_imported} ${t("settings.backup.countRooms")}.`,
      );
      setPending(null);
      // Import touches nearly everything in the catalog and the user roster —
      // a blanket invalidate is simpler and safer than tracking every key.
      await queryClient.invalidateQueries();
    } catch (err) {
      if (err instanceof ImportStepError) {
        toast.error(
          err.step === "users"
            ? t("settings.backup.importFailedUsers")
            : t("settings.backup.importFailedLibrary"),
        );
      } else {
        toast.error(t("common.somethingWentWrong"));
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
        {t("settings.backup.importButton")}
      </Button>

      {pending && (
        <Modal
          open
          onClose={() => setPending(null)}
          title={t("settings.backup.confirmTitle")}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setPending(null)}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" loading={importBackup.isImporting} onClick={() => void handleConfirm()}>
                {t("settings.backup.confirmButton")}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-ink">
              {t("settings.backup.confirmFamily")} <strong>{pending.family.name}</strong>
            </p>
            <p className="text-ink-soft">
              {t("settings.backup.confirmExportedAt")} {formatDateTime(pending.exported_at)}
            </p>
            <ul className="grid grid-cols-2 gap-1 rounded-md bg-paper p-3 text-ink-soft">
              <li>{pending.users.length} {t("settings.backup.countUsers")}</li>
              <li>{pending.rooms.length} {t("settings.backup.countRooms")}</li>
              <li>{pending.owned_books.length} {t("settings.backup.countBooks")}</li>
              <li>{pending.book_loans.length} {t("settings.backup.countLoans")}</li>
            </ul>
            <p className="text-xs text-danger">{t("settings.backup.mergeWarning")}</p>
          </div>
        </Modal>
      )}
    </>
  );
}

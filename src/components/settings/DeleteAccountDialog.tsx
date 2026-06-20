import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { DeleteAccountStepError, useDeleteFamilyAccount } from "@/features/family/hooks";
import type { Family } from "@/types/api";

export function DeleteAccountDialog({ family }: { family: Family }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [password, setPassword] = useState("");
  const { deleteAccount, isDeleting } = useDeleteFamilyAccount();

  const nameMatches = confirmName === family.name;

  function reset() {
    setOpen(false);
    setConfirmName("");
    setPassword("");
  }

  async function handleConfirm() {
    try {
      await deleteAccount({ password, confirm_family_name: confirmName });
      toast.success(t("settings.dangerZone.deleted"));
    } catch (err) {
      if (err instanceof DeleteAccountStepError && err.step === "confirm") {
        toast.error(t("settings.dangerZone.wrongConfirmation"));
        return;
      }
      if (err instanceof DeleteAccountStepError && err.step === "catalog") {
        toast.error(t("settings.dangerZone.failedCatalogStep"));
        return;
      }
      toast.error(t("settings.dangerZone.failedFamilyStep"));
      return;
    }
    reset();
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {t("settings.dangerZone.deleteButton")}
      </Button>

      {open && (
        <Modal
          open
          onClose={reset}
          title={t("settings.dangerZone.confirmTitle")}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={reset}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={isDeleting}
                disabled={!nameMatches || !password}
                onClick={() => void handleConfirm()}
              >
                {t("settings.dangerZone.confirmButton")}
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-sm">
            <p className="text-danger">{t("settings.dangerZone.warning")}</p>
            <ul className="list-inside list-disc space-y-1 text-ink-soft">
              <li>{t("settings.dangerZone.warningFamily")}</li>
              <li>{t("settings.dangerZone.warningLibrary")}</li>
              <li>{t("settings.dangerZone.warningIrreversible")}</li>
            </ul>
            <Input
              label={`${t("settings.dangerZone.typeNameLabel")} "${family.name}"`}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
            />
            <Input
              label={t("settings.dangerZone.passwordLabel")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </Modal>
      )}
    </>
  );
}

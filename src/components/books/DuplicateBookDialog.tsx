import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLocationLabel } from "@/features/locations/hooks";
import { useReaderName } from "@/features/users/hooks";
import type { DuplicateBookConflict } from "@/types/api";

// Shown by AddBookPage and ShelfAddPage when POST /v1/books/ returns 409
// duplicate_book. The check is family-wide (not scoped to an owner — owning
// two copies under different family members is a legitimate, common case),
// so showing who already has it and where helps the user decide whether to
// add a separate copy anyway or skip it.
export function DuplicateBookDialog({
  conflict,
  loading,
  onConfirm,
  onCancel,
}: {
  conflict: DuplicateBookConflict | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const ownerName = useReaderName(conflict?.existing_owner_id ?? null);
  const locationLabel = useLocationLabel({
    room_id: conflict?.existing_room_id ?? undefined,
    bookcase_id: conflict?.existing_bookcase_id ?? undefined,
    section_id: conflict?.existing_section_id ?? undefined,
    shelf_id: conflict?.existing_shelf_id ?? undefined,
  });

  if (!conflict) return null;

  const book = conflict.main_author ? `${conflict.title} (${conflict.main_author})` : conflict.title;
  const reason =
    conflict.conflict_type === "isbn_match"
      ? t("books.add.duplicateReasonIsbn")
      : conflict.conflict_type === "fuzzy_match"
        ? t("books.add.duplicateReasonFuzzy")
        : t("books.add.duplicateReasonTitleAuthor");

  return (
    <Modal
      open
      onClose={onCancel}
      title={t("books.add.duplicateTitle")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {t("books.add.duplicateCancel")}
          </Button>
          <Button size="sm" loading={loading} onClick={onConfirm}>
            {t("books.add.duplicateConfirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-2 text-sm">
        <p className="text-ink">
          {t("books.add.duplicateMessage")} <strong>&quot;{book}&quot;</strong> ({reason}).
        </p>
        <p className="text-ink-soft">
          {t("books.add.duplicateOwnerLabel")} {ownerName ?? t("books.add.duplicateNoOwner")}
        </p>
        <p className="text-ink-soft">
          {t("books.add.duplicateLocationLabel")} {locationLabel ?? t("books.add.duplicateNoLocation")}
        </p>
        {conflict.match_reason && (
          <p className="italic text-ink-soft">
            {t("books.add.duplicateAiReasonLabel")} {conflict.match_reason}
          </p>
        )}
        <p className="text-ink-soft">{t("books.add.duplicateQuestion")}</p>
      </div>
    </Modal>
  );
}

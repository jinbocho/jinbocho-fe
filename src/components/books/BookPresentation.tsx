import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  useGenerateIncipitAI,
  useIncipit,
  useSetIncipit,
} from "@/features/records/hooks";
import { useAiUsable } from "@/features/system/hooks";
import { isAiFeatureDisabledError } from "@/lib/api";
import type { BibliographicRecord } from "@/types/api";

function sourceLabel(source: string | null, t: (key: string) => string): string {
  if (source === "manual") return t("books.detail.presentation.sourceManual");
  if (source === "ai") return t("books.detail.presentation.sourceAI");
  return t("books.detail.presentation.sourceEditorial");
}

export function BookPresentation({
  record,
  canEdit,
}: {
  record: BibliographicRecord;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const incipit = useIncipit(record.id);
  const setIncipit = useSetIncipit();
  const generateAI = useGenerateIncipitAI();
  const aiUsable = useAiUsable();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const text = incipit.data?.text ?? null;
  const busy = setIncipit.isPending || generateAI.isPending;

  async function handleGenerate() {
    try {
      const result = await generateAI.mutateAsync(record.id);
      if (!result.text) {
        toast.error(t("common.defaultErrorMessage"));
        return;
      }
      toast.success(t("books.detail.presentation.generated"));
    } catch (err) {
      toast.error(isAiFeatureDisabledError(err) ? t("common.aiFeatureNotEnabled") : t("common.defaultErrorMessage"));
    }
  }

  async function handleSaveManual() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await setIncipit.mutateAsync({ id: record.id, text: trimmed, source: "manual" });
    setEditing(false);
    toast.success(t("books.detail.presentation.saved"));
  }

  return (
    <Card className="mt-6 p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold">
          {t("books.detail.presentation.title")}
        </h2>
        {!editing && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {text && (
              <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-ink-soft">
                {sourceLabel(incipit.data?.source ?? null, t)}
              </span>
            )}
            {canEdit && (
              <>
                {aiUsable && (
                  <button
                    type="button"
                    className="text-sm text-ink-soft transition-colors hover:text-brand disabled:opacity-40"
                    onClick={() => text ? setConfirmOverwrite(true) : void handleGenerate()}
                    disabled={busy}
                  >
                    {generateAI.isPending
                      ? t("books.detail.presentation.generating")
                      : t("books.detail.presentation.generateAI")}
                  </button>
                )}
                <button
                  type="button"
                  className="text-sm text-brand hover:underline disabled:opacity-40"
                  onClick={() => { setDraft(text ?? ""); setEditing(true); }}
                  disabled={busy}
                >
                  {t("books.detail.presentation.edit")}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {incipit.isLoading ? (
        <Skeleton className="h-16" />
      ) : editing ? (
        <div className="space-y-3">
          <Textarea
            rows={5}
            value={draft}
            placeholder={t("books.detail.presentation.placeholder")}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveManual} disabled={busy || !draft.trim()}>
              {t("books.detail.presentation.save")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
              {t("books.detail.presentation.cancel")}
            </Button>
          </div>
        </div>
      ) : text ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{text}</p>
      ) : (
        <p className="text-sm text-ink-soft">{t("books.detail.presentation.empty")}</p>
      )}

      <ConfirmDialog
        open={confirmOverwrite}
        title={t("books.detail.presentation.overwriteTitle")}
        message={t("books.detail.presentation.overwriteMessage")}
        confirmLabel={t("books.detail.presentation.overwriteConfirm")}
        loading={generateAI.isPending}
        onConfirm={() => { setConfirmOverwrite(false); void handleGenerate(); }}
        onClose={() => setConfirmOverwrite(false)}
      />
    </Card>
  );
}

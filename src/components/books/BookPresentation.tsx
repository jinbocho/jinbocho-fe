import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  useGenerateIncipitAI,
  useIncipit,
  useSetIncipit,
} from "@/features/records/hooks";
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

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const text = incipit.data?.text ?? null;
  const busy = setIncipit.isPending || generateAI.isPending;

  async function handleGenerate() {
    const result = await generateAI.mutateAsync({
      title: record.title,
      main_author: record.main_author,
      genre: record.genre,
      language: record.language,
    });
    if (!result.text) {
      toast.show(t("books.detail.presentation.aiUnavailable"), "info");
      return;
    }
    await setIncipit.mutateAsync({ id: record.id, text: result.text, source: "ai" });
    toast.success(t("books.detail.presentation.generated"));
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">
          {t("books.detail.presentation.title")}
        </h2>
        {text && !editing && (
          <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-ink-soft">
            {sourceLabel(incipit.data?.source ?? null, t)}
          </span>
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
      ) : (
        <>
          {text ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{text}</p>
          ) : (
            <p className="text-sm text-ink-soft">{t("books.detail.presentation.empty")}</p>
          )}
          {canEdit && (
            <div className="mt-4 flex flex-wrap gap-2">
              {!text && (
                <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={busy} loading={generateAI.isPending}>
                  {generateAI.isPending
                    ? t("books.detail.presentation.generating")
                    : t("books.detail.presentation.generateAI")}
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDraft(text ?? "");
                  setEditing(true);
                }}
                disabled={busy}
              >
                {t("books.detail.presentation.edit")}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

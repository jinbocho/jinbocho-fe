import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LocationPicker, type LocationSelection } from "@/components/locations/LocationPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useLocationLabel } from "@/features/locations/hooks";
import { downscaleToBase64 } from "@/features/shelfscan/image";
import { readShelfLocation } from "@/features/shelfscan/deeplink";
import { reasonMessageKey } from "@/features/shelfscan/messages";
import { useAuditShelf } from "@/features/shelfscan/hooks";
import type { ShelfAuditResponse } from "@/types/api";

export function ShelfAuditPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audit = useAuditShelf();

  const [searchParams] = useSearchParams();
  const [location, setLocation] = useState<LocationSelection>(() => readShelfLocation(searchParams));
  const [result, setResult] = useState<ShelfAuditResponse | null>(null);
  const label = useLocationLabel(location);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !location.shelf_id) return;
    try {
      const { image_base64, media_type } = await downscaleToBase64(file);
      const res = await audit.mutateAsync({ shelf_id: location.shelf_id, image_base64, media_type });
      if (!res.available) {
        toast.error(t(reasonMessageKey(res.reason, "shelfAudit")));
        return;
      }
      setResult(res);
    } catch {
      toast.error(t("books.shelfAudit.failed"));
    }
  }

  if (result) {
    const clean = result.missing.length === 0 && result.unexpected.length === 0;
    return (
      <>
        <PageHeader
          title={t("books.shelfAudit.title")}
          description={label ?? undefined}
          actions={
            <button type="button" onClick={() => setResult(null)} className="text-sm text-brand hover:underline">
              {t("books.shelfAudit.retakeLink")}
            </button>
          }
        />

        {clean ? (
          <Card className="p-5">
            <p className="text-sm font-medium text-sage">{t("books.shelfAudit.allMatch")}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {t("books.shelfAudit.presentCount", { count: result.present.length })}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              {t("books.shelfAudit.presentCount", { count: result.present.length })}
            </p>

            {result.missing.length > 0 && (
              <Card className="p-5">
                <h2 className="mb-1 font-display text-base font-semibold text-amber">
                  {t("books.shelfAudit.missingTitle", { count: result.missing.length })}
                </h2>
                <p className="mb-3 text-xs text-ink-soft">{t("books.shelfAudit.missingHint")}</p>
                <ul className="divide-y divide-line">
                  {result.missing.map((b) => (
                    <li key={b.owned_book_id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.title}</p>
                        {b.main_author && <p className="truncate text-xs text-ink-soft">{b.main_author}</p>}
                      </div>
                      <Link to={`/books/${b.owned_book_id}`} className="shrink-0 text-xs text-brand hover:underline">
                        {t("books.shelfAudit.viewBook")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {result.unexpected.length > 0 && (
              <Card className="p-5">
                <h2 className="mb-1 font-display text-base font-semibold text-brand">
                  {t("books.shelfAudit.unexpectedTitle", { count: result.unexpected.length })}
                </h2>
                <p className="mb-3 text-xs text-ink-soft">{t("books.shelfAudit.unexpectedHint")}</p>
                <ul className="divide-y divide-line">
                  {result.unexpected.map((s, i) => (
                    <li key={`${s.position}-${i}`} className="py-2">
                      <p className="text-sm font-medium">{s.title}</p>
                      {s.author && <p className="text-xs text-ink-soft">{s.author}</p>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("books.shelfAudit.title")} description={t("books.shelfAudit.subtitle")} />
      <Card className="space-y-5 p-5">
        <div>
          <h2 className="mb-3 font-display text-base font-semibold">{t("books.shelfAudit.selectShelf")}</h2>
          <LocationPicker value={location} onChange={setLocation} />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!location.shelf_id}
            loading={audit.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("books.shelfAudit.captureButton")}
          </Button>
          <Link to="/books">
            <Button type="button" variant="secondary">
              {t("common.cancel")}
            </Button>
          </Link>
        </div>

        {audit.isPending && (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Spinner className="h-4 w-4" /> {t("books.shelfAudit.reading")}
          </p>
        )}
        {!location.shelf_id && <p className="text-xs text-ink-soft">{t("books.shelfAudit.setupHint")}</p>}
      </Card>
    </>
  );
}

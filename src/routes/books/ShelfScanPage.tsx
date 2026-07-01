import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LocationPicker, type LocationSelection } from "@/components/locations/LocationPicker";
import { BookCover } from "@/components/ui/BookCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useLocationLabel } from "@/features/locations/hooks";
import { downscaleToBase64 } from "@/features/shelfscan/image";
import { readShelfLocation } from "@/features/shelfscan/deeplink";
import { reasonMessageKey } from "@/features/shelfscan/messages";
import { useConfirmShelfScan, useScanShelf } from "@/features/shelfscan/hooks";
import { coverUrlOf, type ReviewItem, toConfirmItem, toReviewItem } from "@/features/shelfscan/review";
import type { ShelfScanStatus } from "@/types/api";

const STATUS_STYLES: Record<ShelfScanStatus, string> = {
  matched: "bg-sage/15 text-sage",
  uncertain: "bg-amber/15 text-amber",
  not_found: "bg-stone/15 text-ink-soft",
};

function CandidateRow({
  item,
  onToggle,
  onEdit,
}: {
  item: ReviewItem;
  onToggle: () => void;
  onEdit: (patch: Partial<Pick<ReviewItem, "title" | "author">>) => void;
}) {
  const { t } = useTranslation();
  const coverUrl = coverUrlOf(item);

  return (
    <li
      className={`rounded-md border p-3 shadow-card transition-colors ${
        item.selected ? "border-brand bg-surface" : "border-line bg-paper"
      }`}
    >
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0 accent-brand"
          aria-label={t("books.shelfScan.selectAria", { title: item.title })}
        />
        <BookCover url={coverUrl} title={item.title} className="h-14 w-10 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
              {t(`books.shelfScan.status.${item.status}`)}
            </span>
            {item.alreadyOwned && (
              <span className="rounded bg-stone/15 px-1.5 py-0.5 text-xs font-medium text-ink-soft">
                {t("books.shelfScan.alreadyOwned")}
              </span>
            )}
            <span className="font-mono text-xs text-ink-soft">
              {t("books.shelfScan.spineLabel")}: {item.title}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label={t("common.title")}
              value={item.title}
              onChange={(e) => onEdit({ title: e.target.value })}
            />
            <Input
              aria-label={t("books.add.author")}
              placeholder={t("books.add.author")}
              value={item.author}
              onChange={(e) => onEdit({ author: e.target.value })}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

export function ShelfScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scan = useScanShelf();
  const confirm = useConfirmShelfScan();

  // Deep-linked from a shelf in the bookcase map: pre-select the whole chain so
  // the user goes straight to capture. Falls back to the picker when absent.
  const [searchParams] = useSearchParams();
  const [location, setLocation] = useState<LocationSelection>(() => readShelfLocation(searchParams));
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const label = useLocationLabel(location);

  async function processFile(file: File, shelfId: string) {
    try {
      const { image_base64, media_type } = await downscaleToBase64(file);
      const result = await scan.mutateAsync({ shelf_id: shelfId, image_base64, media_type });
      if (!result.available) {
        toast.error(t(reasonMessageKey(result.reason, "shelfScan")));
        return;
      }
      if (result.candidates.length === 0) {
        toast.error(t("books.shelfScan.noSpines"));
        return;
      }
      setItems(result.candidates.map(toReviewItem));
    } catch {
      toast.error(t("books.shelfScan.scanFailed"));
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !location.shelf_id) return;
    void processFile(file, location.shelf_id);
  }

  // When arriving straight from the "photograph shelf" chooser, the photo was
  // already captured there (a real user gesture — reliable on iOS); process it
  // immediately so the flow lands on the review screen with no extra tap.
  const routerState = useLocation().state as { capturedFile?: File } | null;
  const capturedFile = routerState?.capturedFile;
  const consumedCaptureRef = useRef(false);
  const [autoProcessing, setAutoProcessing] = useState(Boolean(capturedFile));
  useEffect(() => {
    if (!capturedFile || !location.shelf_id) {
      setAutoProcessing(false);
      return;
    }
    if (consumedCaptureRef.current) return;
    consumedCaptureRef.current = true;
    void processFile(capturedFile, location.shelf_id).finally(() => setAutoProcessing(false));
    // processFile is a stable one-shot call guarded by consumedCaptureRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedFile, location.shelf_id]);

  async function handleConfirm() {
    if (!location.shelf_id || !items) return;
    const selected = items.filter((it) => it.selected && it.title.trim());
    if (selected.length === 0) {
      toast.error(t("books.shelfScan.nothingSelected"));
      return;
    }
    try {
      const result = await confirm.mutateAsync({
        shelf_id: location.shelf_id,
        items: selected.map(toConfirmItem),
      });
      const created = result.created_book_ids.length;
      const skipped = result.skipped_titles.length;
      toast.success(
        skipped > 0
          ? t("books.shelfScan.confirmedWithSkips", { created, skipped })
          : t("books.shelfScan.confirmed", { created }),
      );
      if (location.bookcase_id) {
        navigate(`/locations/bookcase/${location.bookcase_id}`);
      } else {
        navigate("/books");
      }
    } catch {
      toast.error(t("books.shelfScan.confirmFailed"));
    }
  }

  // ── Review phase ────────────────────────────────────────────────────────────
  if (items) {
    const selectedCount = items.filter((it) => it.selected && it.title.trim()).length;
    return (
      <>
        <PageHeader
          title={t("books.shelfScan.title")}
          description={label ?? t("books.shelfScan.reviewSubtitle")}
          actions={
            <button
              type="button"
              onClick={() => setItems(null)}
              className="text-sm text-brand hover:underline"
            >
              {t("books.shelfScan.retakeLink")}
            </button>
          }
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-4 py-2 shadow-card">
          <p className="text-sm text-ink-soft">
            {t("books.shelfScan.reviewCount", { total: items.length, selected: selectedCount })}
          </p>
          <Button type="button" loading={confirm.isPending} disabled={selectedCount === 0} onClick={() => void handleConfirm()}>
            {t("books.shelfScan.confirmButton", { count: selectedCount })}
          </Button>
        </div>

        <ul className="space-y-2">
          {items.map((item, index) => (
            <CandidateRow
              key={item.key}
              item={item}
              onToggle={() =>
                setItems((prev) =>
                  prev!.map((it, i) => (i === index ? { ...it, selected: !it.selected } : it)),
                )
              }
              onEdit={(patch) =>
                setItems((prev) => prev!.map((it, i) => (i === index ? { ...it, ...patch } : it)))
              }
            />
          ))}
        </ul>
      </>
    );
  }

  // ── Auto-processing the photo captured in the chooser ───────────────────────
  if (autoProcessing) {
    return (
      <>
        <PageHeader title={t("books.shelfScan.title")} description={label ?? undefined} />
        <Card className="p-5">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Spinner className="h-4 w-4" /> {t("books.shelfScan.reading")}
          </p>
        </Card>
      </>
    );
  }

  // ── Setup phase ─────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader title={t("books.shelfScan.title")} description={t("books.shelfScan.subtitle")} />
      <Card className="space-y-5 p-5">
        <div>
          <h2 className="mb-3 font-display text-base font-semibold">{t("books.shelfScan.selectShelf")}</h2>
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
            loading={scan.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("books.shelfScan.captureButton")}
          </Button>
          <Link to="/books/add">
            <Button type="button" variant="secondary">
              {t("common.cancel")}
            </Button>
          </Link>
        </div>

        {scan.isPending && (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Spinner className="h-4 w-4" /> {t("books.shelfScan.reading")}
          </p>
        )}
        {!location.shelf_id && <p className="text-xs text-ink-soft">{t("books.shelfScan.setupHint")}</p>}
      </Card>
    </>
  );
}

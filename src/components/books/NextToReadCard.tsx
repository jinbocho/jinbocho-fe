import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shuffle } from "lucide-react";

import { BookCover } from "@/components/ui/BookCover";
import { Card } from "@/components/ui/Card";
import { genreLabel } from "@/lib/format";
import type { BookView } from "@/types/api";

// A random pick from books this specific member hasn't read yet (see
// DashboardPage's unreadByMe), always available via "Mi sento fortunato" to
// re-roll. Deliberately has no AI involved — see AiPickCard for that, kept
// as a separate, manually-triggered card so it never fires automatically.
export function NextToReadCard({ pick, onShuffle }: { pick: BookView | null; onShuffle: () => void }) {
  const { t } = useTranslation();

  return (
    <Card className="min-w-0 p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">{t("dashboard.nextReadTitle")}</h2>

      {pick ? (
        <div className="flex gap-4">
          <BookCover url={pick.record?.cover_url} title={pick.record?.title} className="h-28 w-20 shrink-0" />
          <div className="min-w-0 flex-1">
            <Link to={`/books/${pick.book.id}`} className="block font-medium leading-snug text-ink hover:text-brand">
              {pick.record?.title ?? t("common.untitled")}
            </Link>
            {pick.record?.main_author && <p className="mt-1 text-sm text-ink-soft">{pick.record.main_author}</p>}
            {pick.record?.genre && (
              <p className="mt-1 text-xs text-ink-soft/70">{genreLabel(pick.record.genre, t)}</p>
            )}
            <button onClick={onShuffle} className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline">
              <Shuffle size={12} />{t("dashboard.nextReadShuffle")}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">{t("dashboard.nextReadEmpty")}</p>
      )}
    </Card>
  );
}

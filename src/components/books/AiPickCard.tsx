import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { BookCover } from "@/components/ui/BookCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { useBookViews } from "@/features/books/hooks";
import { useMarkRecommendationAccepted, useRecommendations } from "@/features/recommendations/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useAiUsable } from "@/features/system/hooks";

// Personalized AI picks, kept as its own card and never fetched on mount —
// this hits an LLM, so it only runs once the user explicitly asks for it
// (avoids burning tokens on every dashboard visit). Hidden entirely when AI
// isn't usable (module not licensed, or no LLM configured) since there'd be
// nothing to show regardless of asking.
export function AiPickCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const myId = useAuthStore((s) => s.user?.id);
  const aiUsable = useAiUsable();
  const [requested, setRequested] = useState(false);
  const recommendations = useRecommendations(requested);
  const markAccepted = useMarkRecommendationAccepted();
  const bookViews = useBookViews();
  // Local only — a reacted-to pick disappears from THIS list immediately,
  // but the real source of truth (excluded from future requests) is the
  // backend's suggestion history, not this component's state.
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  if (!aiUsable) return null;

  const mine = (recommendations.data?.recommendations ?? []).filter(
    (r) => r.user_id === myId && !resolvedIds.has(r.suggestion_id ?? r.owned_book_id),
  );
  const viewByBookId = new Map(bookViews.data.map((v) => [v.book.id, v]));
  const asked = requested || recommendations.data !== undefined;

  function react(suggestionId: string | null, accepted: boolean) {
    if (!suggestionId) return;
    setResolvedIds((prev) => new Set(prev).add(suggestionId));
    markAccepted.mutate(
      { suggestionId, accepted },
      {
        onSuccess: () => toast.success(t("dashboard.recommendationsFeedbackSaved")),
        onError: () => toast.error(t("common.defaultErrorMessage")),
      },
    );
  }

  return (
    <Card className="min-w-0 p-5">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold">{t("dashboard.recommendationsTitle")}</h2>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
          {t("dashboard.recommendationsBadge")}
        </span>
      </div>

      {!asked ? (
        <div>
          <p className="mb-3 text-sm text-ink-soft">{t("dashboard.recommendationsPrompt")}</p>
          <Button size="sm" variant="secondary" onClick={() => setRequested(true)}>
            {t("dashboard.recommendationsAskButton")}
          </Button>
        </div>
      ) : recommendations.isLoading ? (
        <div>
          <p className="mb-2 text-sm text-ink-soft">{t("dashboard.recommendationsLoading")}</p>
          <div
            role="progressbar"
            aria-label={t("dashboard.recommendationsLoading")}
            className="h-1.5 overflow-hidden rounded-full bg-brand/15"
          >
            <div className="h-full w-1/3 animate-loading-bar rounded-full bg-brand" />
          </div>
        </div>
      ) : mine.length > 0 ? (
        <ul className="space-y-4">
          {mine.map((rec) => {
            const view = viewByBookId.get(rec.owned_book_id);
            return (
              <li key={rec.suggestion_id ?? rec.owned_book_id} className="flex min-w-0 gap-3">
                <BookCover url={view?.record?.cover_url} title={view?.record?.title} className="h-16 w-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link to={`/books/${rec.owned_book_id}`} className="block truncate font-medium text-ink hover:text-brand">
                    {view?.record?.title ?? t("common.untitled")}
                  </Link>
                  {view?.record?.main_author && (
                    <p className="truncate text-sm text-ink-soft">{view.record.main_author}</p>
                  )}
                  <p className="mt-1 text-xs text-ink-soft">{rec.reason}</p>
                </div>
                {rec.suggestion_id && (
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      label={t("dashboard.recommendationsLike")}
                      onClick={() => react(rec.suggestion_id, true)}
                    >
                      👍
                    </IconButton>
                    <IconButton
                      label={t("dashboard.recommendationsDislike")}
                      onClick={() => react(rec.suggestion_id, false)}
                    >
                      👎
                    </IconButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">{t("dashboard.recommendationsEmpty")}</p>
      )}
    </Card>
  );
}

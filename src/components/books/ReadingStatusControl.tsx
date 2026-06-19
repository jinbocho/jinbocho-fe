import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import { useUpdateReadingStatus } from "@/features/books/hooks";
import { useAuthStore } from "@/features/auth/store";
import { READING_STATUS_CLASS, READING_STATUSES, readingStatusLabel } from "@/lib/format";
import type { ReadingStatus } from "@/types/api";

// Display-only badge for viewers; an inline status changer (optimistic) for
// admin/editor.
export function ReadingStatusControl({
  bookId,
  status,
}: {
  bookId: string;
  status: ReadingStatus;
}) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";
  const mutation = useUpdateReadingStatus();

  if (!canEdit) {
    return <Badge tone={READING_STATUS_CLASS[status]}>{readingStatusLabel(status, t)}</Badge>;
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <select
        aria-label="Reading status"
        value={status}
        disabled={mutation.isPending}
        onChange={(e) => mutation.mutate({ id: bookId, status: e.target.value as ReadingStatus })}
        className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${READING_STATUS_CLASS[status]}`}
      >
        {READING_STATUSES.map((s) => (
          <option key={s} value={s}>
            {readingStatusLabel(s, t)}
          </option>
        ))}
      </select>
      {mutation.isPending && (
        <span
          aria-hidden="true"
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent text-ink-soft"
        />
      )}
    </span>
  );
}

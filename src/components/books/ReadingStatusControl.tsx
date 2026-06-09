import { Badge } from "@/components/ui/Badge";
import { useUpdateReadingStatus } from "@/features/books/hooks";
import { useAuthStore } from "@/features/auth/store";
import { READING_STATUS_CLASS, READING_STATUS_LABEL, READING_STATUSES } from "@/lib/format";
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
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";
  const mutation = useUpdateReadingStatus();

  if (!canEdit) {
    return <Badge tone={READING_STATUS_CLASS[status]}>{READING_STATUS_LABEL[status]}</Badge>;
  }

  return (
    <select
      aria-label="Reading status"
      value={status}
      disabled={mutation.isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => mutation.mutate({ id: bookId, status: e.target.value as ReadingStatus })}
      className={`shrink-0 rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${READING_STATUS_CLASS[status]}`}
    >
      {READING_STATUSES.map((s) => (
        <option key={s} value={s}>
          {READING_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { StarRating } from "@/components/ui/StarRating";
import { useToast } from "@/components/ui/Toast";
import { BookRatingForm } from "@/components/books/BookRatingForm";
import { useDeleteBookRating } from "@/features/ratings/hooks";
import { formatDate } from "@/lib/format";
import type { BookRating, User } from "@/types/api";

interface BookRatingsListProps {
  bookId: string;
  ratings: BookRating[];
  currentUserId: string | undefined;
  users: User[];
  canRate: boolean;
}

export function BookRatingsList({ bookId, ratings, currentUserId, users, canRate }: BookRatingsListProps) {
  const toast = useToast();
  const del = useDeleteBookRating(bookId);
  const [editing, setEditing] = useState<BookRating | null>(null);

  const nameOf = (userId: string) =>
    users.find((u) => u.id === userId)?.full_name ?? "Membro famiglia";

  if (ratings.length === 0) {
    return <p className="text-sm text-ink-soft">Nessuna recensione disponibile.</p>;
  }

  return (
    <>
      <ul className="space-y-4">
        {ratings.map((r) => {
          const isOwn = r.user_id === currentUserId;
          return (
            <li key={r.id} className="border-b border-line pb-4 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">{nameOf(r.user_id)}</span>
                  <StarRating value={r.rating} readOnly size="sm" />
                </div>
                <span className="shrink-0 text-xs text-ink-soft">{formatDate(r.created_at)}</span>
              </div>
              {r.review && (
                <p className="mt-2 text-sm text-ink">{r.review}</p>
              )}
              {isOwn && canRate && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-brand hover:underline"
                    onClick={() => setEditing(r)}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="text-xs text-danger hover:underline"
                    disabled={del.isPending}
                    onClick={async () => {
                      try {
                        await del.mutateAsync(r.id);
                        toast.success("Recensione eliminata.");
                      } catch {
                        toast.error("Errore nell'eliminazione.");
                      }
                    }}
                  >
                    Elimina
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Modal open={editing !== null} title="Modifica recensione" onClose={() => setEditing(null)}>
        {editing && (
          <BookRatingForm
            bookId={bookId}
            existing={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}

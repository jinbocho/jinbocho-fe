import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useCreateBookRating, useUpdateBookRating } from "@/features/ratings/hooks";
import type { BookRating } from "@/types/api";

interface FormValues {
  review: string;
}

interface BookRatingFormProps {
  bookId: string;
  existing?: BookRating;
  onDone: () => void;
}

export function BookRatingForm({ bookId, existing, onDone }: BookRatingFormProps) {
  const toast = useToast();
  const [stars, setStars] = useState(existing?.rating ?? 0);

  const create = useCreateBookRating(bookId);
  const update = useUpdateBookRating(bookId);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { review: existing?.review ?? "" },
  });

  const isPending = create.isPending || update.isPending || isSubmitting;

  const onSubmit = handleSubmit(async (v) => {
    if (stars < 1) {
      toast.error("Seleziona almeno una stella.");
      return;
    }
    try {
      if (existing) {
        await update.mutateAsync({
          ratingId: existing.id,
          body: { rating: stars, review: v.review.trim() || null },
        });
      } else {
        await create.mutateAsync({ rating: stars, review: v.review.trim() || null });
      }
      toast.success(existing ? "Recensione aggiornata." : "Recensione aggiunta.");
      onDone();
    } catch {
      toast.error("Errore nel salvataggio della recensione.");
    }
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase text-ink-soft">
          Voto
        </label>
        <StarRating value={stars} onChange={setStars} size="lg" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase text-ink-soft">
          Recensione (opzionale)
        </label>
        <Textarea
          {...register("review")}
          rows={4}
          maxLength={4000}
          placeholder="Scrivi la tua recensione..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone} disabled={isPending}>
          Annulla
        </Button>
        <Button type="submit" disabled={isPending}>
          {existing ? "Aggiorna" : "Salva recensione"}
        </Button>
      </div>
    </form>
  );
}

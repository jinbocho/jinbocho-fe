interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };

export function StarRating({ value, onChange, readOnly = false, size = "md" }: StarRatingProps) {
  return (
    <div className="inline-flex gap-0.5" role={readOnly ? undefined : "group"} aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          className={`${sizes[size]} leading-none transition-colors disabled:cursor-default ${
            star <= value
              ? "text-amber"
              : "text-ink-soft/30"
          } ${!readOnly ? "hover:text-amber cursor-pointer" : ""}`}
          onClick={() => onChange?.(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

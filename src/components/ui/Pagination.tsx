import { Button } from "@/components/ui/Button";

interface PaginationProps {
  offset: number;
  limit: number;
  count: number; // items in the current page
  onChange: (offset: number) => void;
}

// Offset-based prev/next. We don't know the total, so "next" is enabled while
// the current page is full.
export function Pagination({ offset, limit, count, onChange }: PaginationProps) {
  const page = Math.floor(offset / limit) + 1;
  const hasPrev = offset > 0;
  const hasNext = count >= limit;
  if (!hasPrev && !hasNext) return null;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={!hasPrev}
        onClick={() => onChange(Math.max(0, offset - limit))}
      >
        ← Previous
      </Button>
      <span className="text-sm text-ink-soft">Page {page}</span>
      <Button
        variant="secondary"
        size="sm"
        disabled={!hasNext}
        onClick={() => onChange(offset + limit)}
      >
        Next →
      </Button>
    </div>
  );
}

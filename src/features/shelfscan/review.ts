import type {
  ShelfScanCandidate,
  ShelfScanConfirmItem,
  ShelfScanStatus,
} from "@/types/api";

// View-model for the review screen: a candidate the user can toggle and edit
// before it becomes a real book.
export interface ReviewItem {
  key: string;
  status: ShelfScanStatus;
  alreadyOwned: boolean;
  selected: boolean;
  title: string;
  author: string;
  position: number;
  metadata: Record<string, unknown> | null;
}

function metaStr(meta: Record<string, unknown> | null, key: string): string | null {
  const value = meta?.[key];
  return typeof value === "string" && value ? value : null;
}

export function toReviewItem(candidate: ShelfScanCandidate, index: number): ReviewItem {
  return {
    key: `${index}-${candidate.spine_title}`,
    status: candidate.status,
    alreadyOwned: candidate.already_owned,
    // Pre-select confident matches; leave unread spines and owned copies for the
    // user to opt in, so the default confirm never re-adds what's already there.
    selected: candidate.status !== "not_found" && !candidate.already_owned,
    title: metaStr(candidate.metadata, "title") ?? candidate.spine_title,
    author: metaStr(candidate.metadata, "main_author") ?? candidate.spine_author ?? "",
    position: candidate.position,
    metadata: candidate.metadata,
  };
}

export function toConfirmItem(item: ReviewItem): ShelfScanConfirmItem {
  const meta = item.metadata;
  const num = (key: string): number | null => {
    const value = meta?.[key];
    return typeof value === "number" ? value : null;
  };
  return {
    title: item.title,
    main_author: item.author || null,
    isbn: metaStr(meta, "isbn"),
    publisher: metaStr(meta, "publisher"),
    publication_year: num("publication_year"),
    language: metaStr(meta, "language"),
    genre: metaStr(meta, "genre"),
    cover_url: metaStr(meta, "cover_url"),
    position: item.position,
  };
}

export function coverUrlOf(item: ReviewItem): string | null {
  return metaStr(item.metadata, "cover_url");
}

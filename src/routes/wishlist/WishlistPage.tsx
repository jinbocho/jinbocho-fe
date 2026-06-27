import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bookmark } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { BookCover } from "@/components/ui/BookCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/features/auth/store";
import { useUsers } from "@/features/users/hooks";
import { useRemoveFromWishlist, useWishlist } from "@/features/wishlist/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import type { WishlistItem } from "@/types/api";

const PRIORITY_STRIPE: Record<number, string> = {
  1: "bg-danger/35",
  2: "bg-amber/35",
  3: "bg-sage/35",
};

const PRIORITY_LABEL_CLASS: Record<number, string> = {
  1: "text-danger/70",
  2: "text-amber/80",
  3: "text-sage/80",
};

const PRIORITY_I18N: Record<number, string> = {
  1: "wishlist.priorityHigh",
  2: "wishlist.priorityMedium",
  3: "wishlist.priorityLow",
};

export function WishlistPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);

  const wishlist = useWishlist();
  const users = useUsers();
  const removeItem = useRemoveFromWishlist();

  const [pendingRemove, setPendingRemove] = useState<WishlistItem | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [memberFilter, setMemberFilter] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [priorityFilter, memberFilter].filter(Boolean).length;

  function memberName(userId: string) {
    if (userId === currentUserId) return t("common.you");
    return users.data?.find((u) => u.id === userId)?.full_name ?? "…";
  }

  function canRemove(item: WishlistItem) {
    return item.user_id === currentUserId || role === "admin";
  }

  // Member options for the dropdown: deduplicate from wishlist items
  const memberOptions = useMemo(() => {
    if (!wishlist.data || !users.data) return [];
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const item of wishlist.data) {
      if (!seen.has(item.user_id)) {
        seen.add(item.user_id);
        opts.push({ value: item.user_id, label: memberName(item.user_id) });
      }
    }
    return opts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist.data, users.data, currentUserId]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return (wishlist.data ?? []).filter((item) => {
      if (priorityFilter) {
        const p = Number(priorityFilter);
        if (p === 0 ? item.priority !== null : item.priority !== p) return false;
      }
      if (memberFilter && item.user_id !== memberFilter) return false;
      if (q) {
        const hay = `${item.record.title} ${item.record.main_author ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [wishlist.data, debouncedQuery, priorityFilter, memberFilter]);

  function clearFilters() {
    setPriorityFilter("");
    setMemberFilter("");
  }

  async function onConfirmRemove() {
    if (!pendingRemove) return;
    try {
      await removeItem.mutateAsync(pendingRemove.id);
      toast.success(t("wishlist.removeSuccess"));
    } catch {
      toast.error(t("wishlist.removeFailed"));
    } finally {
      setPendingRemove(null);
    }
  }

  if (wishlist.isError) return <ErrorState message={t("wishlist.loadError")} onRetry={wishlist.refetch} />;

  return (
    <>
      <PageHeader
        title={t("wishlist.title")}
        description={
          wishlist.isLoading
            ? undefined
            : `${wishlist.data?.length ?? 0} ${t("wishlist.booksCount")}`
        }
        actions={
          <Button onClick={() => navigate("/wishlist/add")}>
            {t("wishlist.addButton")}
          </Button>
        }
      />

      {wishlist.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : wishlist.data?.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={44} strokeWidth={1.5} />}
          title={t("wishlist.emptyTitle")}
          description={t("wishlist.emptyDescription")}
          action={
            <Button onClick={() => navigate("/wishlist/add")}>
              {t("wishlist.addButton")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Search + filter toggle */}
          <div className="flex gap-3">
            <SearchInput
              label={t("wishlist.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
              className="shrink-0"
            >
              {t("wishlist.filtersToggle")} {filtersOpen ? "▴" : "▾"}
              {activeFilterCount > 0 && (
                <Badge tone="bg-brand/10 text-brand">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>

          {/* Collapsible filters */}
          {filtersOpen && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                aria-label={t("wishlist.filterPriority")}
                placeholder={t("wishlist.filterPriority")}
                value={priorityFilter}
                options={[
                  { value: "1", label: t("wishlist.priorityHigh") },
                  { value: "2", label: t("wishlist.priorityMedium") },
                  { value: "3", label: t("wishlist.priorityLow") },
                  { value: "0", label: t("wishlist.priorityNone") },
                ]}
                onChange={(e) => setPriorityFilter(e.target.value)}
              />
              {memberOptions.length > 1 && (
                <Select
                  aria-label={t("wishlist.filterMember")}
                  placeholder={t("wishlist.filterMember")}
                  value={memberFilter}
                  options={memberOptions}
                  onChange={(e) => setMemberFilter(e.target.value)}
                />
              )}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-brand hover:underline sm:col-span-2 lg:col-span-4"
                >
                  {t("wishlist.clearFilters")}
                </button>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">
              {t("wishlist.noSearchResults")}
            </p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => (
                <li key={item.id}>
                  <Card className="flex overflow-hidden p-0">
                    {item.priority && (
                      <div
                        aria-hidden="true"
                        className={`w-1 shrink-0 ${PRIORITY_STRIPE[item.priority]}`}
                      />
                    )}

                    <div className="min-w-0 flex-1 p-3">
                      {/* Info row */}
                      <div className="flex items-start gap-3">
                        <BookCover
                          url={item.record.cover_url}
                          title={item.record.title}
                          className="h-16 w-12 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 font-medium leading-snug text-ink">
                            {item.record.title}
                          </p>
                          {item.record.main_author && (
                            <p className="mt-0.5 truncate text-sm text-ink-soft">
                              {item.record.main_author}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-stone">
                            {t("wishlist.wantedBy")} {memberName(item.user_id)}
                          </p>
                          {item.notes && (
                            <p className="mt-0.5 line-clamp-1 text-xs italic text-ink-soft">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        {/* Priority label — top-right, muted tone */}
                        {item.priority && (
                          <span
                            className={`shrink-0 text-xs font-medium ${PRIORITY_LABEL_CLASS[item.priority]}`}
                          >
                            {/* non-null safe: guarded by item.priority && */}
                            {t(PRIORITY_I18N[item.priority]!)}
                          </span>
                        )}
                      </div>

                      {/* Action row — text links, no heavy buttons */}
                      <div className="mt-3 flex items-center justify-end gap-5 border-t border-line/50 pt-2">
                        {canRemove(item) && (
                          <button
                            type="button"
                            className="text-xs text-stone transition-colors hover:text-danger"
                            onClick={() => setPendingRemove(item)}
                          >
                            {t("wishlist.remove")}
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-sm font-medium text-brand transition-colors hover:text-brand-soft"
                          onClick={() =>
                            navigate(
                              `/books/add?record_id=${item.bibliographic_record_id}&from_wishlist=${item.id}`,
                            )
                          }
                        >
                          {t("wishlist.acquire")} →
                        </button>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingRemove !== null}
        title={t("wishlist.confirmRemoveTitle")}
        message={t("wishlist.confirmRemoveDescription", {
          title: pendingRemove?.record.title ?? "",
        })}
        confirmLabel={t("wishlist.remove")}
        onConfirm={() => void onConfirmRemove()}
        onClose={() => setPendingRemove(null)}
        loading={removeItem.isPending}
      />
    </>
  );
}

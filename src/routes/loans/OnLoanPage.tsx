import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import { BookCover } from "@/components/ui/BookCover";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/features/auth/store";
import { sortLoansByDueDate, useActiveLoans, useAllLoans, useBookViews, useReturnBook } from "@/features/books/hooks";
import { formatDate, loanUrgency, LOAN_URGENCY_CLASS, type LoanUrgency } from "@/lib/format";

export function OnLoanPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "admin" || role === "editor";

  const loans = useActiveLoans();
  const allLoans = useAllLoans();
  const books = useBookViews();
  const returnBook = useReturnBook();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LoanUrgency | "">("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = statusFilter ? 1 : 0;

  const items = useMemo(() => {
    if (!loans.data || !books.data) return [];
    return sortLoansByDueDate(loans.data).map((loan) => ({
      loan,
      view: books.data.find((v) => v.book.id === loan.owned_book_id) ?? null,
    }));
  }, [loans.data, books.data]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter(({ loan, view }) => {
      if (statusFilter && loanUrgency(loan.due_date) !== statusFilter) return false;
      if (normalized) {
        const haystack = `${loan.borrower_name} ${view?.record?.title ?? ""}`.toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }
      return true;
    });
  }, [items, query, statusFilter]);

  const overdueCount = useMemo(
    () => items.filter(({ loan }) => loanUrgency(loan.due_date) === "overdue").length,
    [items],
  );

  const returnedItems = useMemo(() => {
    if (!allLoans.data || !books.data) return [];
    return allLoans.data
      .filter((loan) => loan.returned_at !== null)
      .sort((a, b) => new Date(b.returned_at!).getTime() - new Date(a.returned_at!).getTime())
      .map((loan) => ({
        loan,
        view: books.data.find((v) => v.book.id === loan.owned_book_id) ?? null,
      }));
  }, [allLoans.data, books.data]);

  const isLoading = loans.isLoading || books.isLoading;
  const isError = loans.isError || books.isError;

  if (isError) return <ErrorState message={t("loans.loadError")} onRetry={loans.refetch} />;

  async function onBookBack(bookId: string) {
    try {
      await returnBook.mutateAsync({ bookId });
      toast.success(t("loans.returnSuccess"));
    } catch {
      toast.error(t("loans.returnFailed"));
    }
  }

  return (
    <>
      <PageHeader
        title={t("loans.title")}
        description={isLoading ? undefined : `${items.length} ${items.length === 1 ? t("loans.bookLabel") : t("loans.booksLabel")} ${t("loans.description")}`}
        actions={
          overdueCount > 0 ? (
            <Badge tone="bg-danger/10 text-danger">
              {overdueCount} {overdueCount === 1 ? t("loans.overdueBadgeOne") : t("loans.overdueBadgeMany")}
            </Badge>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📚"
          title={t("loans.emptyTitle")}
          description={t("loans.emptyDescription")}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            <SearchInput
              label={t("loans.searchPlaceholder")}
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
              {t("loans.filtersToggle")} {filtersOpen ? "▴" : "▾"}
              {activeFilterCount > 0 && (
                <Badge tone="bg-brand/10 text-brand">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>

          {filtersOpen && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                aria-label="Filter by status"
                placeholder={t("loans.filterStatus")}
                value={statusFilter}
                options={[
                  { value: "overdue", label: t("loans.statusOverdue") },
                  { value: "warning", label: t("loans.statusWarning") },
                  { value: "normal", label: t("loans.statusNormal") },
                ]}
                onChange={(e) => setStatusFilter(e.target.value as LoanUrgency | "")}
              />
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("")}
                  className="text-sm text-brand hover:underline sm:col-span-2 lg:col-span-4"
                >
                  {t("loans.clearFilters")}
                </button>
              )}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">{t("loans.noSearchResults")}</p>
          ) : (
            <ul className="space-y-3">
              {filteredItems.map(({ loan, view }) => {
                const urgency = loanUrgency(loan.due_date);
                const isReturning = returnBook.isPending && returnBook.variables?.bookId === loan.owned_book_id;
                return (
                  <li key={loan.id}>
                    <Card className="flex items-center gap-3 p-3">
                      <BookCover
                        url={view?.record?.cover_url}
                        title={view?.record?.title}
                        className="h-16 w-12 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/books/${loan.owned_book_id}`}
                          className="block truncate font-medium text-ink hover:text-brand"
                        >
                          {view?.record?.title ?? "Untitled"}
                        </Link>
                        {view?.record?.main_author && (
                          <p className="truncate text-sm text-ink-soft">{view.record.main_author}</p>
                        )}
                        <p className="mt-0.5 text-sm text-amber">📤 {loan.borrower_name}</p>
                        <p className="text-xs text-ink-soft">{t("loans.since")} {formatDate(loan.loaned_at)}</p>
                        {loan.due_date && (
                          <p className={`text-xs ${LOAN_URGENCY_CLASS[urgency]}`}>
                            {t("loans.due")} {formatDate(loan.due_date)}{urgency === "overdue" ? ` · ${t("loans.overdue")}` : ""}
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="shrink-0"
                          loading={isReturning}
                          onClick={() => void onBookBack(loan.owned_book_id)}
                        >
                          {t("loans.markReturnedAction")}
                        </Button>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {!isLoading && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-ink-soft">{t("loans.historyTitle")}</h2>
          {allLoans.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : returnedItems.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("loans.noHistory")}</p>
          ) : (
            <ul className="space-y-3">
              {returnedItems.map(({ loan, view }) => (
                <li key={loan.id}>
                  <Card className="flex items-center gap-3 p-3">
                    <BookCover
                      url={view?.record?.cover_url}
                      title={view?.record?.title}
                      className="h-16 w-12 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/books/${loan.owned_book_id}`}
                        className="block truncate font-medium text-ink hover:text-brand"
                      >
                        {view?.record?.title ?? "Untitled"}
                      </Link>
                      {view?.record?.main_author && (
                        <p className="truncate text-sm text-ink-soft">{view.record.main_author}</p>
                      )}
                      <p className="mt-0.5 text-sm text-ink-soft">📤 {loan.borrower_name}</p>
                      <p className="text-xs text-ink-soft">
                        {t("loans.since")} {formatDate(loan.loaned_at)} · {t("loans.returnedOn")} {formatDate(loan.returned_at!)}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

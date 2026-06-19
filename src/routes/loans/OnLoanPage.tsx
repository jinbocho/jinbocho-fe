import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { BookCover } from "@/components/ui/BookCover";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { sortLoansByDueDate, useActiveLoans, useBookViews } from "@/features/books/hooks";
import { formatDate, loanUrgency, LOAN_URGENCY_CLASS } from "@/lib/format";

export function OnLoanPage() {
  const { t } = useTranslation();
  const loans = useActiveLoans();
  const books = useBookViews();

  const items = useMemo(() => {
    if (!loans.data || !books.data) return [];
    return sortLoansByDueDate(loans.data).map((loan) => ({
      loan,
      view: books.data.find((v) => v.book.id === loan.owned_book_id) ?? null,
    }));
  }, [loans.data, books.data]);

  const isLoading = loans.isLoading || books.isLoading;
  const isError = loans.isError || books.isError;

  if (isError) return <ErrorState message={t("loans.loadError")} onRetry={loans.refetch} />;

  return (
    <>
      <PageHeader
        title={t("loans.title")}
        description={isLoading ? undefined : `${items.length} ${items.length === 1 ? t("loans.bookLabel") : t("loans.booksLabel")} ${t("loans.description")}`}
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
        <ul className="space-y-3">
          {items.map(({ loan, view }) => {
            const urgency = loanUrgency(loan.due_date);
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
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

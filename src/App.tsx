import { createBrowserRouter, Link, RouterProvider } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { GlobalLoadingBar } from "@/components/ui/GlobalLoadingBar";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RequireAuth, RequireRole } from "@/features/auth/guards";
import { useBootSession } from "@/features/auth/hooks";
import { LoginPage } from "@/routes/auth/LoginPage";
import { RegisterPage } from "@/routes/auth/RegisterPage";
import { ForgotPasswordPage } from "@/routes/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/routes/auth/ResetPasswordPage";
import { DashboardPage } from "@/routes/DashboardPage";
import { BookCatalogPage } from "@/routes/books/BookCatalogPage";
import { AddBookPage } from "@/routes/books/AddBookPage";
import { ShelfAddPage } from "@/routes/books/ShelfAddPage";
import { BookDetailPage } from "@/routes/books/BookDetailPage";
import { LocationsPage } from "@/routes/locations/LocationsPage";
import { BookcaseMapPage } from "@/routes/locations/BookcaseMapPage";
import { UsersPage } from "@/routes/users/UsersPage";
import { SettingsPage } from "@/routes/settings/SettingsPage";
import { OnLoanPage } from "@/routes/loans/OnLoanPage";
import { StatsBookListPage } from "@/routes/stats/StatsBookListPage";
import { StatsPage } from "@/routes/stats/StatsPage";

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <EmptyState
        title={t("common.pageNotFound")}
        description={t("common.pageNotFoundDesc")}
        action={
          <Link to="/">
            <Button>{t("common.goHome")}</Button>
          </Link>
        }
      />
    </div>
  );
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/books", element: <BookCatalogPage /> },
      {
        path: "/books/add",
        element: (
          <RequireRole roles={["admin", "editor"]}>
            <AddBookPage />
          </RequireRole>
        ),
      },
      {
        path: "/books/add/shelf",
        element: (
          <RequireRole roles={["admin", "editor"]}>
            <ShelfAddPage />
          </RequireRole>
        ),
      },
      { path: "/books/:id", element: <BookDetailPage /> },
      { path: "/loans", element: <OnLoanPage /> },
      { path: "/stats", element: <StatsPage /> },
      { path: "/stats/books", element: <StatsBookListPage /> },
      { path: "/locations", element: <LocationsPage /> },
      { path: "/locations/bookcase/:id", element: <BookcaseMapPage /> },
      { path: "/settings", element: <SettingsPage /> },
      {
        path: "/users",
        element: (
          <RequireRole roles={["admin"]}>
            <UsersPage />
          </RequireRole>
        ),
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export function App() {
  // Resolve a stored session (refresh-on-boot) before guarded routes settle.
  useBootSession();
  return (
    <>
      <GlobalLoadingBar />
      <RouterProvider router={router} />
    </>
  );
}

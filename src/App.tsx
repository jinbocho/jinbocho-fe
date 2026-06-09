import { createBrowserRouter, Link, RouterProvider } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RequireAuth, RequireRole } from "@/features/auth/guards";
import { useBootSession } from "@/features/auth/hooks";
import { LoginPage } from "@/routes/auth/LoginPage";
import { RegisterPage } from "@/routes/auth/RegisterPage";
import { DashboardPage } from "@/routes/DashboardPage";
import { BookCatalogPage } from "@/routes/books/BookCatalogPage";
import { AddBookPage } from "@/routes/books/AddBookPage";
import { BookDetailPage } from "@/routes/books/BookDetailPage";
import { LocationsPage } from "@/routes/locations/LocationsPage";
import { BookcaseMapPage } from "@/routes/locations/BookcaseMapPage";
import { UsersPage } from "@/routes/users/UsersPage";
import { SettingsPage } from "@/routes/settings/SettingsPage";

function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Link to="/">
            <Button>Go home</Button>
          </Link>
        }
      />
    </div>
  );
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
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
      { path: "/books/:id", element: <BookDetailPage /> },
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
  return <RouterProvider router={router} />;
}

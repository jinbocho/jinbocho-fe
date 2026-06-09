import { Link, NavLink, Outlet } from "react-router-dom";

import { IconButton } from "@/components/ui/IconButton";
import { useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/books", label: "Books", icon: "📚" },
  { to: "/locations", label: "Rooms", icon: "🗄" },
  { to: "/users", label: "Users", icon: "👥", adminOnly: true },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const items = NAV.filter((i) => !i.adminOnly || user?.role === "admin");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      {/* Sidebar (md+) */}
      <aside className="hidden border-r border-line bg-surface md:flex md:flex-col">
        <div className="px-5 py-5">
          <Link to="/" className="inline-block hover:opacity-80">
            <span className="font-display text-xl font-semibold text-brand">Jinbocho</span>
          </Link>
          <p className="mt-0.5 text-xs text-ink-soft">Home library</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand/10 text-brand" : "text-ink-soft hover:bg-paper hover:text-ink"
                }`
              }
            >
              <span aria-hidden="true" className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user.email}</p>
              <p className="text-xs capitalize text-ink-soft">{user.role}</p>
            </div>
            <IconButton label="Log out" onClick={() => logout.mutate()}>
              ⏻
            </IconButton>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Top bar (mobile only) */}
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <Link to="/" className="inline-block hover:opacity-80">
            <span className="font-display text-lg font-semibold text-brand">Jinbocho</span>
          </Link>
          <IconButton label="Log out" onClick={() => logout.mutate()}>
            ⏻
          </IconButton>
        </header>

        <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 pb-24 md:pb-6">
          <Outlet />
        </main>

        {/* Bottom nav (mobile only) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface md:hidden">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? "text-brand" : "text-ink-soft"
                }`
              }
            >
              <span aria-hidden="true" className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

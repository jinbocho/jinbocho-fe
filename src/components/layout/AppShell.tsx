import { useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { IconButton } from "@/components/ui/IconButton";
import { useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useLangStore } from "@/features/i18n/store";
import { useThemeStore } from "@/features/theme/store";
import { useCurrentUser } from "@/features/users/hooks";

export function AppShell() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setLang = useLangStore((s) => s.setLang);
  const setName = useThemeStore((s) => s.setName);
  const setPref = useThemeStore((s) => s.setPref);
  const me = useCurrentUser();

  // Sync language from backend on app boot — backend is the cross-device source of truth.
  useEffect(() => {
    if (me.data?.language) setLang(me.data.language);
  }, [me.data?.language, setLang]);

  // Sync theme from backend on app boot.
  useEffect(() => {
    if (me.data?.theme_name) setName(me.data.theme_name);
    if (me.data?.theme_mode) setPref(me.data.theme_mode);
  }, [me.data?.theme_name, me.data?.theme_mode, setName, setPref]);
  const logout = useLogout();

  const NAV = [
    { to: "/", label: t("nav.home"), icon: "🏠", end: true },
    { to: "/books", label: t("nav.books"), icon: "📚" },
    { to: "/loans", label: t("nav.onLoan"), icon: "📤" },
    { to: "/locations", label: t("nav.rooms"), icon: "🗄" },
    { to: "/stats", label: t("nav.stats"), icon: "📊" },
    { to: "/users", label: t("nav.users"), icon: "👥", adminOnly: true },
    { to: "/settings", label: t("nav.settings"), icon: "⚙️" },
  ];

  const items = NAV.filter((i) => !i.adminOnly || user?.role === "admin");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      {/* Sidebar (md+) */}
      <aside className="hidden border-r border-line bg-surface md:flex md:flex-col">
        <div className="px-5 py-5">
          <Link to="/" className="inline-block hover:opacity-80">
            <span className="font-display text-xl font-semibold text-brand">{t("common.appName")}</span>
          </Link>
          <p className="mt-0.5 text-xs text-ink-soft">{t("common.appSubtitle")}</p>
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
            <IconButton label={t("common.logout")} onClick={() => logout.mutate()}>
              ⏻
            </IconButton>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Top bar (mobile only) */}
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <Link to="/" className="inline-block hover:opacity-80">
            <span className="font-display text-lg font-semibold text-brand">{t("common.appName")}</span>
          </Link>
          <IconButton label={t("common.logout")} onClick={() => logout.mutate()}>
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

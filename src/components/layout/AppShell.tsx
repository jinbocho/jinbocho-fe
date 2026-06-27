import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  BookOpen,
  BookUp,
  Bookmark,
  Home,
  LogOut,
  MapPin,
  Menu,
  Settings,
  Users,
} from "lucide-react";

import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { IconButton } from "@/components/ui/IconButton";
import { useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useLangStore } from "@/features/i18n/store";
import { useAiFeatureEnabled } from "@/features/system/hooks";
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
  const aiEnabled = useAiFeatureEnabled();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const NAV = [
    { to: "/", label: t("nav.home"), icon: <Home size={18} />, end: true },
    { to: "/books", label: t("nav.books"), icon: <BookOpen size={18} /> },
    { to: "/loans", label: t("nav.onLoan"), icon: <BookUp size={18} /> },
    { to: "/wishlist", label: t("nav.wishlist"), icon: <Bookmark size={18} /> },
    { to: "/locations", label: t("nav.rooms"), icon: <MapPin size={18} /> },
    { to: "/stats", label: t("nav.stats"), icon: <BarChart3 size={18} /> },
    { to: "/users", label: t("nav.users"), icon: <Users size={18} />, adminOnly: true },
    { to: "/settings", label: t("nav.settings"), icon: <Settings size={18} /> },
  ];

  const items = NAV.filter((i) => !i.adminOnly || user?.role === "admin");

  return (
    <div className="min-h-dvh md:grid md:h-dvh md:grid-cols-[15rem_1fr] md:overflow-hidden">
      {/* Sidebar (md+) — fixed height; nav scrolls internally so the upgrade
          banner and profile/logout stay genuinely pinned at the bottom and
          are never pushed off-screen on a short viewport. */}
      <aside className="hidden border-r border-line bg-surface md:flex md:h-dvh md:flex-col">
        {/* md:h-dvh (not h-full): the grid row would otherwise auto-size to
            this column's natural content height instead of clamping to the
            viewport, defeating the nav's internal scroll below. */}
        <div className="px-5 py-5">
          <Link to="/" className="inline-flex items-center gap-2 hover:opacity-80">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-full" />
            <span className="font-display text-xl font-semibold text-brand">{t("common.appName")}</span>
          </Link>
          <p className="mt-0.5 text-xs text-ink-soft">{t("common.appSubtitle")}</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
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
        {!aiEnabled && (
          <a
            href="https://jinbocho.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-3 mb-3 block rounded-md bg-brand/10 px-3 py-2 text-center text-sm font-medium text-brand hover:bg-brand/15"
          >
            {t("nav.aiUpgrade")}
          </a>
        )}
        {user && (
          <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user.email}</p>
              <p className="text-xs capitalize text-ink-soft">{user.role}</p>
            </div>
            <IconButton label={t("common.logout")} loading={logout.isPending} onClick={() => logout.mutate()}>
              <LogOut size={16} />
            </IconButton>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-col md:h-dvh md:overflow-y-auto">
        {/* Top bar (mobile only) */}
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <IconButton
            label={t("common.menu")}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </IconButton>
          <Link to="/" className="inline-flex items-center gap-2 hover:opacity-80">
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-full" />
            <span className="font-display text-lg font-semibold text-brand">{t("common.appName")}</span>
          </Link>
          <IconButton label={t("common.logout")} loading={logout.isPending} onClick={() => logout.mutate()}>
            <LogOut size={16} />
          </IconButton>
        </header>

        <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={items}
        user={user}
        onLogout={() => logout.mutate()}
        loggingOut={logout.isPending}
      />
    </div>
  );
}

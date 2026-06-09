import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-semibold text-brand">Jinbocho</h1>
          <p className="mt-1 text-sm text-ink-soft">Your family library</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          <p className="mb-5 mt-1 text-sm text-ink-soft">{subtitle}</p>
          {children}
        </div>
        <p className="mt-4 text-center text-sm text-ink-soft">{footer}</p>
      </div>
    </div>
  );
}

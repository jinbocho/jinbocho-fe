import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  // Pass status colour classes (bg + text) or any utility classes.
  tone?: string;
}

export function Badge({ tone = "bg-line text-ink-soft", className = "", ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone} ${className}`}
      {...rest}
    />
  );
}

import { initials } from "@/lib/format";

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand ${className}`}
    >
      {initials(name) || "?"}
    </span>
  );
}

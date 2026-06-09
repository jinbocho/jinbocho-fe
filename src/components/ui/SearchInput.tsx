import type { InputHTMLAttributes } from "react";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

// Controlled search box. Debounce at the call site with useDebounce.
export function SearchInput({ label = "Search", className = "", ...rest }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone">
        ⌕
      </span>
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        className="h-11 w-full rounded-md border border-line bg-paper pl-9 pr-3 text-base text-ink placeholder:text-stone"
        {...rest}
      />
    </div>
  );
}

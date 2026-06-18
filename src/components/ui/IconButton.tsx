import { forwardRef, type ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Required for accessibility — icon-only buttons need a name.
  label: string;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, loading = false, disabled, className = "", children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={`inline-grid h-9 w-9 place-items-center rounded-md text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:opacity-50 ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        children
      )}
    </button>
  ),
);
IconButton.displayName = "IconButton";

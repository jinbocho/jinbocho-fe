import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
}

const fieldClass =
  "h-11 w-full rounded-md border bg-paper px-3 text-base text-ink placeholder:text-stone disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          className={`${fieldClass} ${error ? "border-danger" : "border-line"} ${className}`}
          {...rest}
        />
        {error ? (
          <p className="mt-1 text-sm text-danger">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-sm text-ink-soft">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

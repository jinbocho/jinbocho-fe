import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  /** Free text stays valid input, but these show up as native autocomplete suggestions. */
  suggestions?: string[];
}

const fieldClass =
  "h-11 w-full rounded-md border bg-paper px-3 text-base text-ink placeholder:text-stone disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, suggestions, id, className = "", ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const listId = suggestions ? `${fieldId}-suggestions` : undefined;
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
          list={listId}
          aria-invalid={error ? true : undefined}
          className={`${fieldClass} ${error ? "border-danger" : "border-line"} ${className}`}
          {...rest}
        />
        {suggestions && (
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
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

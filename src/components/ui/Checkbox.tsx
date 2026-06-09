import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className = "", ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <label htmlFor={fieldId} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          className={`h-4 w-4 rounded border-line text-brand focus:ring-brand ${className}`}
          {...rest}
        />
        {label}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

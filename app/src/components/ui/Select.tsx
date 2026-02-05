import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, id, className = "", children, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="mb-2 block text-sm font-medium text-ke-primary"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`w-full rounded-lg border bg-ke-surface px-4 py-2 text-ke-primary transition-colors focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus ${error ? "border-ke-negative" : "border-ke-border"} ${className}`}
          {...props}
        >
          {children}
        </select>
        {hint && !error && (
          <p className="mt-1 text-sm text-ke-muted">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-sm text-ke-negative">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select, type SelectProps };

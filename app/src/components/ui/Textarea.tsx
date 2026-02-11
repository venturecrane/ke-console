import { forwardRef, type TextareaHTMLAttributes, type ReactNode } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, id, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-2 block text-sm font-medium text-ke-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={`w-full rounded-lg border bg-ke-surface px-4 py-2 text-ke-primary placeholder-ke-muted transition-colors focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus ${error ? 'border-ke-negative' : 'border-ke-border'} ${className}`}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-sm text-ke-muted">{hint}</p>}
        {error && <p className="mt-1 text-sm text-ke-negative">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea, type TextareaProps }

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

function EmptyState({ title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-ke-border bg-ke-surface px-ke-card py-12 text-center ${className}`}
    >
      <h3 className="text-ke-body-lg font-medium text-ke-primary">{title}</h3>
      {description && <p className="mt-2 text-ke-caption text-ke-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export { EmptyState, type EmptyStateProps }

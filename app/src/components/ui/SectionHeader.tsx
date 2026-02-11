interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  className?: string
}

function SectionHeader({ title, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-ke-muted">{title}</h2>
      {action}
    </div>
  )
}

export { SectionHeader, type SectionHeaderProps }

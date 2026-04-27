import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-ke-bg border-t border-ke-border py-10 px-4 sm:px-ke-card">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-5">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <span className="text-ke-body font-semibold text-ke-primary">Kid Expenses</span>
          <p className="text-ke-muted text-ke-label">© {year} Kid Expenses. All rights reserved.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-6">
          <a
            href="#waitlist"
            className="text-ke-caption text-ke-secondary hover:text-ke-primary transition-colors"
          >
            Join the list
          </a>
          <Link
            href="/demo"
            className="text-ke-caption text-ke-secondary hover:text-ke-primary transition-colors"
          >
            See a demo
          </Link>
        </nav>
      </div>
    </footer>
  )
}

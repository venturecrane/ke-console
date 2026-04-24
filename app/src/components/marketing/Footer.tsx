import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-ke-bg border-t border-ke-border py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-5">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <span className="text-base font-semibold text-ke-primary">Kid Expenses</span>
          <p className="text-ke-muted text-xs">© {year} Kid Expenses. All rights reserved.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-6">
          <a
            href="#waitlist"
            className="text-sm text-ke-secondary hover:text-ke-primary transition-colors"
          >
            Join the list
          </a>
          <Link
            href="/sign-in"
            className="text-sm text-ke-secondary hover:text-ke-primary transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/demo"
            className="text-sm text-ke-secondary hover:text-ke-primary transition-colors"
          >
            See a demo
          </Link>
        </nav>
      </div>
    </footer>
  )
}

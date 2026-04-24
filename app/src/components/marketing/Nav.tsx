import Link from 'next/link'

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ke-bg/90 backdrop-blur-sm border-b border-ke-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-ke-accent text-ke-inverse text-sm font-semibold">
            KE
          </span>
          <span className="text-lg font-semibold text-ke-primary tracking-tight">Kid Expenses</span>
        </Link>
        <div className="flex items-center gap-5">
          <a
            href="#waitlist"
            className="hidden sm:inline text-sm text-ke-secondary hover:text-ke-primary transition-colors"
          >
            Join the list
          </a>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-ke-accent hover:text-ke-accent-hover transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  )
}

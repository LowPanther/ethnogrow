import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-paper-border bg-paper mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-ink-faint">
          © {new Date().getFullYear()} ethnogrow. All rights reserved.
        </p>
        <nav className="flex items-center gap-6">
          <Link href="/faq" className="text-sm text-ink-muted hover:text-ink transition-colors">
            FAQ
          </Link>
          <Link href="/privacy" className="text-sm text-ink-muted hover:text-ink transition-colors">
            Privacy policy
          </Link>
          <Link href="/terms" className="text-sm text-ink-muted hover:text-ink transition-colors">
            Terms of use
          </Link>
        </nav>
      </div>
    </footer>
  )
}

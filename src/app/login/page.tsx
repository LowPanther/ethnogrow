'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Footer } from '@/components/Footer'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">

      {/* Nav */}
      <nav className="border-b border-paper-border">
        <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
          <Link href="/" className="font-display font-normal text-ink text-lg tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            Ethnogrow
          </Link>
          <p className="text-sm text-ink-muted">
            No account?{' '}
            <Link href="/signup" className="text-ink font-medium hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          <h1
            className="font-display font-light text-ink mb-2 text-center"
            style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
          >
            Welcome back
          </h1>
          <p className="text-sm text-ink-muted text-center mb-10">
            Sign in to your account
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link href="/forgot-password" className="text-xs text-ink-muted hover:text-ink transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-lobster-dark bg-lobster-pale border border-lobster/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>Sign in <ArrowRight size={15} /></>
              )}
            </button>
          </form>

        </div>
      </div>

      <Footer />
    </div>
  )
}

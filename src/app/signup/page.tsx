'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Footer } from '@/components/Footer'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <nav className="border-b border-paper-border">
          <div className="max-w-7xl mx-auto px-8 h-14 flex items-center">
            <Link href="/" className="font-display font-normal text-ink text-lg tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              Ethnogrow
            </Link>
          </div>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="w-full max-w-sm">
            <h2
              className="font-display font-light text-ink mb-3"
              style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
            >
              Check your email
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              We sent a confirmation link to <strong className="text-ink font-medium">{email}</strong>.
              Click it to activate your account and start building.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    )
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
            Have an account?{' '}
            <Link href="/login" className="text-ink font-medium hover:underline">
              Sign in
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
            Create your account
          </h1>
          <p className="text-sm text-ink-muted text-center mb-10">
            Free plan, no credit card required
          </p>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="input"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

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
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="8+ characters"
                required
                minLength={8}
                autoComplete="new-password"
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
                <>Create account <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-xs text-ink-faint text-center mt-6 leading-relaxed">
            By creating an account you agree to our{' '}
            <Link href="/terms-of-use" className="underline underline-offset-2 hover:text-ink-muted transition-colors">Terms of Use</Link>
            {' '}and{' '}
            <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-ink-muted transition-colors">Privacy Policy</Link>.
          </p>

        </div>
      </div>

      <Footer />
    </div>
  )
}

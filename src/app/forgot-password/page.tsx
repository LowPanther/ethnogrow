'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { Layers, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { Footer } from '@/components/Footer'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 justify-center mb-10">
            <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <span className="font-display font-semibold text-ink text-lg tracking-tight">Ethnogrow</span>
          </div>

          {sent ? (
            <div className="card-elevated p-8 text-center">
              <div className="w-14 h-14 bg-teal-pale rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                ✦
              </div>
              <h2 className="font-display font-semibold text-ink text-xl mb-2">Check your email</h2>
              <p className="text-sm text-ink-muted leading-relaxed mb-6">
                We sent a password reset link to <strong className="text-ink">{email}</strong>. Check your inbox and follow the link to reset your password.
              </p>
              <Link href="/login" className="btn-secondary w-full justify-center">
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <div className="card-elevated p-8">
              <h1 className="font-display font-semibold text-ink text-xl mb-1 text-center">
                Forgot your password?
              </h1>
              <p className="text-sm text-ink-muted text-center mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                {error && (
                  <p className="text-sm text-lobster-dark bg-lobster-pale border border-lobster/20 rounded px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5"
                >
                  {loading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          <p className="text-center text-sm text-ink-muted mt-4">
            <Link href="/login" className="text-ink font-medium hover:underline flex items-center justify-center gap-1">
              <ArrowLeft size={13} />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}

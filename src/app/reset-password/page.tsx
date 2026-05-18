'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Layers, ArrowRight, Loader2 } from 'lucide-react'
import { Footer } from '@/components/Footer'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <div className="w-14 h-14 bg-teal-pale rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              ✦
            </div>
            <h2 className="font-display font-semibold text-ink text-xl mb-2">Password updated</h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Your password has been changed. Redirecting you to the dashboard...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    )
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

          <div className="card-elevated p-8">
            <h1 className="font-display font-semibold text-ink text-xl mb-1 text-center">
              Set a new password
            </h1>
            <p className="text-sm text-ink-muted text-center mb-6">
              Choose a strong password of at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">New password</label>
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

              <div>
                <label className="label">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Repeat your password"
                  required
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
                className="btn-primary w-full justify-center py-2.5"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    Update password
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

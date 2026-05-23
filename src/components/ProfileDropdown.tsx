'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useTheme } from '@/components/ThemeProvider'
import { LogOut, Moon, Sun, Trash2, CreditCard, ArrowUpCircle } from 'lucide-react'

interface ProfileDropdownProps {
  email: string
  initials: string
  plan: string
}

export function ProfileDropdown({ email, initials, plan }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme, toggle } = useTheme()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleCloseAccount() {
    if (confirmText.toLowerCase() !== 'delete') return
    setClosing(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      router.push('/?closed=1')
    } catch {
      setClosing(false)
      alert('Something went wrong. Please try again or contact support@ethnogrow.com.')
    }
  }

  const isFree = plan === 'free'
  const isPro = plan === 'pro'

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-medium hover:opacity-80 transition-opacity focus:outline-none"
        aria-label="Account menu"
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-paper border border-paper-border rounded shadow-float z-[100] animate-slide-down overflow-hidden">

          {/* Email label */}
          <div className="px-4 py-3 border-b border-paper-border">
            <p className="text-xs text-ink-faint truncate">{email}</p>
            <p className="text-xs font-medium text-ink-muted capitalize mt-0.5">{plan} plan</p>
          </div>

          <div className="py-1">

            {/* Upgrade — hidden on Pro */}
            {!isPro && (
              <button
                onClick={() => { setOpen(false); router.push('/dashboard/upgrade') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-muted hover:bg-paper-warm hover:text-ink transition-colors text-left"
              >
                <ArrowUpCircle size={14} className="text-sage-DEFAULT" />
                Upgrade plan
              </button>
            )}

            {/* Cancel subscription — hidden on Free */}
            {!isFree && (
              <button
                onClick={() => { setOpen(false); setShowCancelModal(true) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-muted hover:bg-paper-warm hover:text-ink transition-colors text-left"
              >
                <CreditCard size={14} />
                Cancel subscription
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-muted hover:bg-paper-warm hover:text-ink transition-colors text-left"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>

          </div>

          <div className="border-t border-paper-border py-1">

            {/* Close account */}
            <button
              onClick={() => { setOpen(false); setShowCloseModal(true) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-lobster-pale transition-colors text-left"
              style={{ color: '#c93638' }}
            >
              <Trash2 size={14} />
              Close account
            </button>

            {/* Log out */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-muted hover:bg-paper-warm hover:text-ink transition-colors text-left"
            >
              <LogOut size={14} />
              Log out
            </button>

          </div>
        </div>
      )}

      {/* Cancel subscription modal */}
      {showCancelModal && (
        <Modal onClose={() => setShowCancelModal(false)}>
          <h2 className="font-display font-medium text-ink text-lg mb-2">Cancel subscription</h2>
          <p className="text-sm text-ink-muted leading-relaxed mb-6">
            To cancel your subscription, email us at{' '}
            <a href="mailto:support@ethnogrow.com" className="text-ink underline underline-offset-2">
              support@ethnogrow.com
            </a>{' '}
            and we'll sort it within 24 hours. Your plan will remain active until the end of your current billing period.
          </p>
          <div className="flex justify-end">
            <button onClick={() => setShowCancelModal(false)} className="btn-secondary text-sm px-5 py-2">
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Close account modal */}
      {showCloseModal && (
        <Modal onClose={() => { setShowCloseModal(false); setConfirmText('') }}>
          <h2 className="font-display font-medium text-ink text-lg mb-2">Close your account</h2>
          <p className="text-sm text-ink-muted leading-relaxed mb-4">
            This will permanently delete all your projects, responses, and reports. This cannot be undone.
          </p>
          <p className="text-sm text-ink-muted mb-2">
            Type <span className="font-mono font-medium text-ink">delete</span> to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="delete"
            className="w-full text-sm border border-paper-border rounded px-3 py-2 bg-paper text-ink outline-none focus:border-ink/30 mb-5"
            autoComplete="off"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowCloseModal(false); setConfirmText('') }}
              className="btn-secondary text-sm px-5 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleCloseAccount}
              disabled={confirmText.toLowerCase() !== 'delete' || closing}
              className="text-sm px-5 py-2 rounded font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#c93638' }}
            >
              {closing ? 'Closing account…' : 'Close account'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-paper rounded-lg shadow-float w-full max-w-md p-6 animate-slide-up">
        {children}
      </div>
    </div>
  )
}

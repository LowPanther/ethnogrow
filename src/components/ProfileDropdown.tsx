'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { useTheme } from '@/components/ThemeProvider'
import { LogOut, Moon, Sun, Trash2, CreditCard, ArrowUpCircle } from 'lucide-react'
import { createPortal } from 'react-dom'

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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const [mounted, setMounted] = useState(false)
  const avatarRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme, toggle } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        avatarRef.current && !avatarRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleToggle() {
    if (!open && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(prev => !prev)
  }

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

  const dropdown = open && mounted ? createPortal(
    <div
      ref={dropdownRef}
      className="w-64 bg-paper border border-paper-border rounded shadow-float animate-slide-down overflow-hidden"
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        right: dropdownPos.right,
        zIndex: 9999,
      }}
    >
      <div className="px-4 py-3 border-b border-paper-border">
        <p className="text-xs text-ink-faint truncate">{email}</p>
        <p className="text-xs font-medium text-ink-muted capitalize mt-0.5">{plan} plan</p>
      </div>

      <div className="py-1">
        {!isPro && (
          <button
            onClick={() => { setOpen(false); router.push('/dashboard/upgrade') }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-muted hover:bg-paper-warm hover:text-ink transition-colors text-left"
          >
            <ArrowUpCircle size={14} className="text-teal" />
            Upgrade plan
          </button>
        )}

        {!isFree && (
          <button
            onClick={() => { setOpen(false); setShowCancelModal(true) }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-muted hover:bg-paper-warm hover:text-ink transition-colors text-left"
          >
            <CreditCard size={14} />
            Cancel subscription
          </button>
        )}

        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-muted hover:bg-paper-warm hover:text-ink transition-colors text-left"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>

      <div className="border-t border-paper-border py-1">
        <button
          onClick={() => { setOpen(false); setShowCloseModal(true) }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-lobster-pale transition-colors text-left"
          style={{ color: '#c93638' }}
        >
          <Trash2 size={14} />
          Close account
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-muted hover:bg-paper-warm hover:text-ink transition-colors text-left"
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        ref={avatarRef}
        onClick={handleToggle}
        className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-medium hover:opacity-80 transition-opacity focus:outline-none"
        aria-label="Account menu"
      >
        {initials}
      </button>

      {dropdown}

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
    </>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-paper rounded-lg shadow-float w-full max-w-md p-6 animate-slide-up">
        {children}
      </div>
    </div>
  )
}

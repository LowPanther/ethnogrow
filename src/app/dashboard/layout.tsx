import { redirect } from 'next/navigation'
import { createServerSideClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import { Footer } from '@/components/Footer'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSideClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (profile?.email?.[0] || 'R').toUpperCase()

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Top nav */}
      <nav className="border-b border-paper-border bg-paper/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-ink rounded flex items-center justify-center">
              <Layers size={14} className="text-white" />
            </div>
            <span className="font-display font-semibold text-ink text-lg tracking-tight">
              ethnogrow
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted hidden sm:block">
              {profile?.email}
            </span>
            <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-medium">
              {initials}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1">
        {children}
      </div>

      <Footer />
    </div>
  )
}

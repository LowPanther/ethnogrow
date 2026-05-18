import { redirect } from 'next/navigation'
import { createServerSideClient } from '@/lib/supabase-server'

export default async function HomePage() {
  const supabase = createServerSideClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}

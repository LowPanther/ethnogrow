import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = createServerSideClient()
    await supabase.auth.exchangeCodeForSession(code)

    // If this is a password recovery, send to reset page
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/reset-password`)
    }

    // Otherwise send to dashboard
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Fallback
  return NextResponse.redirect(`${origin}/login`)
}
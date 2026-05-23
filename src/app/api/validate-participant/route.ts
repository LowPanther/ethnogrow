import { createServerSideClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

function emailMatchesAllowlist(email: string, allowlist: string[]): boolean {
  const normalised = email.trim().toLowerCase()
  const domain = normalised.split('@')[1]

  return allowlist.some(entry => {
    const e = entry.trim().toLowerCase().replace(/^@/, '')
    // Full email match
    if (e.includes('@')) return normalised === e
    // Domain match — exact only, no subdomain matching
    return domain === e
  })
}

export async function POST(req: NextRequest) {
  try {
    const { project_id, email } = await req.json()

    if (!project_id || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createServerSideClient()
    const { data: project, error } = await supabase
      .from('projects')
      .select('allowed_emails, status')
      .eq('id', project_id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.status !== 'active') {
      return NextResponse.json({ allowed: false, message: 'This questionnaire is no longer accepting responses.' }, { status: 200 })
    }

    // No allowlist set — everyone is allowed
    if (!project.allowed_emails || project.allowed_emails.length === 0) {
      return NextResponse.json({ allowed: true }, { status: 200 })
    }

    const allowed = emailMatchesAllowlist(email, project.allowed_emails)

    if (!allowed) {
      return NextResponse.json({
        allowed: false,
        message: 'This questionnaire is only available to specific participants. If you believe this is an error, please contact the researcher.',
      }, { status: 200 })
    }

    return NextResponse.json({ allowed: true }, { status: 200 })
  } catch (err) {
    console.error('Validate participant error:', err)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}
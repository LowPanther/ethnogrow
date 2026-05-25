/**
 * POST /api/export/report
 *
 * Generates and streams an AI report PDF for a given project.
 * Requires the researcher to be authenticated and to own the project.
 *
 * Body: { projectId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateReportPDF } from '@/lib/generateReportPDF'

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Fetch project — RLS ensures researcher can only access their own
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, description, user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch the AI report
    const { data: report, error: reportError } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'No AI report found for this project' }, { status: 404 })
    }

    // Format date
    const generatedDate = new Date(report.generated_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Generate PDF
    const pdfBuffer = await generateReportPDF({
      reportData:         report,
      projectTitle:       project.title,
      projectDescription: project.description ?? undefined,
      generatedDate,
      responseCount:      report.response_count ?? 0,
    })

    // Slugify title for filename
    const slug = project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${slug}-report.pdf"`,
        'Content-Length':      String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('[export/report]', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase-server'
import { Question, ParticipantResponse, QuestionResponse } from '@/types'

const PLAN_REPORT_LIMITS: Record<string, number> = {
  free:    1,
  starter: 2,
  pro:     5,
}

export async function POST(req: NextRequest) {
  try {
    const { project_id } = await req.json()
    if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    const supabase = createServerSideClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('researcher_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch responses — exclude researcher-excluded ones
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('project_id', project_id)
      .neq('flag_status', 'reviewed_excluded')
      .order('submitted_at', { ascending: true })

    if (responsesError) throw responsesError

    if (!responses || responses.length < 1) {
      return NextResponse.json({ error: 'No responses to analyse' }, { status: 400 })
    }

    // ── Fetch and validate usage ──────────────────────────────

    let { data: usage } = await supabase
      .from('researcher_usage')
      .select('*')
      .eq('researcher_id', user.id)
      .single()

    if (!usage) {
      const { data: newUsage } = await supabase
        .from('researcher_usage')
        .insert({ researcher_id: user.id })
        .select()
        .single()
      usage = newUsage
    }

    const plan = usage?.plan ?? 'free'
    const reportLimit = PLAN_REPORT_LIMITS[plan] ?? 1

    // Reset monthly count if we're in a new month
    const resetAt = usage?.reports_reset_at ? new Date(usage.reports_reset_at) : new Date()
    const now = new Date()
    const isNewMonth =
      now.getFullYear() > resetAt.getFullYear() ||
      now.getMonth() > resetAt.getMonth()

    let reportsThisMonth = usage?.reports_this_month ?? 0

    if (isNewMonth) {
      // Reset the counter
      await supabase
        .from('researcher_usage')
        .update({
          reports_this_month: 0,
          reports_reset_at: now.toISOString(),
        })
        .eq('researcher_id', user.id)
      reportsThisMonth = 0
    }

    // ── Enforce the limit ─────────────────────────────────────

    if (reportsThisMonth >= reportLimit) {
      return NextResponse.json({
        error: 'report_limit_reached',
        message: `You've used all ${reportLimit} AI report${reportLimit !== 1 ? 's' : ''} included in your ${plan} plan this month. Upgrade to generate more.`,
        reports_used: reportsThisMonth,
        report_limit: reportLimit,
        plan,
      }, { status: 403 })
    }

    // ── Cap responses sent to Claude ──────────────────────────

    const responseCap = usage?.response_cap ?? 50
    const cappedResponses = responses.slice(0, responseCap)
    const isCapped = responses.length > responseCap
    const questions = project.questions as Question[]

    // ── Build the prompt ──────────────────────────────────────

    const prompt = buildPrompt(
      project.title,
      project.description,
      questions,
      cappedResponses as ParticipantResponse[],
      isCapped,
      responses.length,
      responseCap
    )

    // ── Call Anthropic API ────────────────────────────────────

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `You are a research analyst who writes reports for everyday people — not just academics or experts. Your job is to take questionnaire data and explain what it means in plain, simple English that anyone can understand.

Rules for your writing:
- Write like you are explaining findings to a smart friend who knows nothing about research
- Use short sentences. Avoid jargon. Never use words like "respondents", "cohort", "statistically significant", "findings indicate" — say "people said", "most people", "the data shows"
- Be specific with numbers — say "7 out of 10 people" or "67%" rather than "most people"
- Every insight should answer the question: so what does this mean?
- Detect the primary language used in the open text responses and write the entire report in that language
- You always respond with valid JSON only, no markdown, no preamble`,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error('Anthropic error:', err)
      throw new Error('AI analysis failed')
    }

    const anthropicData = await anthropicRes.json()
    const rawText = anthropicData.content?.[0]?.text || ''

    let reportData
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      reportData = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse AI response:', rawText)
      throw new Error('Failed to parse AI response')
    }

    // ── Save report ───────────────────────────────────────────

    const { data: savedReport, error: saveError } = await supabase
      .from('ai_reports')
      .upsert({
        project_id,
        summary: reportData.summary,
        themes: reportData.themes || [],
        key_findings: reportData.key_findings || [],
        question_insights: reportData.question_insights || [],
        sample_note: reportData.sample_note || null,
        response_count: cappedResponses.length,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'project_id' })
      .select()
      .single()

    if (saveError) throw saveError

    // ── Increment report count ────────────────────────────────

    await supabase
      .from('researcher_usage')
      .update({
        reports_this_month: reportsThisMonth + 1,
        responses_analysed: cappedResponses.length,
        updated_at: new Date().toISOString(),
      })
      .eq('researcher_id', user.id)

    return NextResponse.json({
      report: savedReport,
      capped: isCapped,
      total_responses: responses.length,
      analysed_responses: cappedResponses.length,
      response_cap: responseCap,
      reports_used: reportsThisMonth + 1,
      report_limit: reportLimit,
    })

  } catch (err: any) {
    console.error('Report generation error:', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  title: string,
  description: string | null,
  questions: Question[],
  responses: ParticipantResponse[],
  isCapped: boolean = false,
  totalResponses: number = 0,
  responseCap: number = 50
): string {
  const responseCount = responses.length

  const questionSummaries = questions.map(q => {
    const allAnswers = responses
      .flatMap(r => r.responses || [])
      .filter((r: QuestionResponse) => r.question_id === q.id)

    const answers = allAnswers.filter((r: QuestionResponse) => r.value !== '__NA__')
    const naCount = allAnswers.length - answers.length

    if (answers.length === 0) return null

    let dataBlock = ''

    if (q.type === 'scale') {
      const values = answers.map((a: QuestionResponse) => Number(a.value)).filter(v => !isNaN(v))
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const distribution: Record<number, number> = {}
      values.forEach(v => { distribution[v] = (distribution[v] || 0) + 1 })
      dataBlock = `Type: Scale (${(q as any).min}–${(q as any).max})
Average: ${avg.toFixed(2)}
Min: ${Math.min(...values)}, Max: ${Math.max(...values)}
Distribution: ${Object.entries(distribution).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => `${k}: ${v} responses`).join(', ')}`
    }

    else if (q.type === 'multiple_choice') {
      const counts: Record<string, number> = {}
      answers.forEach((a: QuestionResponse) => {
        const vals = Array.isArray(a.value) ? a.value : [a.value]
        vals.forEach((v: any) => { counts[String(v)] = (counts[String(v)] || 0) + 1 })
      })
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
      dataBlock = `Type: Multiple choice
Responses: ${answers.length}
Results:
${sorted.map(([opt, count]) => `  - "${opt}": ${count} (${Math.round(count / answers.length * 100)}%)`).join('\n')}`
    }

    else if (q.type === 'yes_no') {
      const yes = answers.filter((a: QuestionResponse) => a.value === true || a.value === 'true' || a.value === 'Yes').length
      const no = answers.length - yes
      dataBlock = `Type: Yes/No
Yes: ${yes} (${Math.round(yes / answers.length * 100)}%)
No: ${no} (${Math.round(no / answers.length * 100)}%)`
    }

    else if (q.type === 'open_text') {
      const texts = answers.map((a: QuestionResponse) => String(a.value).trim()).filter(v => v.length > 0)
      dataBlock = `Type: Open text
Responses (${texts.length}):
${texts.map((t, i) => `  ${i + 1}. "${t}"`).join('\n')}`
    }

    const naNote = naCount > 0 ? `\nNote: ${naCount} participant(s) marked this question as N/A — excluded from analysis.` : ''
    const coverageNote = answers.length < responseCount ? `\nCOVERAGE: Only ${answers.length} of ${responseCount} participants answered this question.` : ''

    return `QUESTION: "${q.text}"
${dataBlock}${naNote}${coverageNote}`
  }).filter(Boolean)

  const cappedNote = isCapped
    ? `\nNOTE: This project has ${totalResponses} total responses but the researcher's plan allows analysis of ${responseCap}. This report is based on the first ${responseCap} responses only. Mention this clearly in your sample_note.`
    : ''

  return `You are analysing responses to a research questionnaire.

PROJECT: "${title}"
${description ? `DESCRIPTION: ${description}` : ''}
TOTAL RESPONSES COLLECTED: ${totalResponses || responseCount}
RESPONSES INCLUDED IN THIS ANALYSIS: ${responseCount}${cappedNote}

Here is the data for each question:

${questionSummaries.join('\n\n---\n\n')}

---

Produce a research report as a JSON object with this exact structure:

{
  "summary": "3-4 sentence executive summary of the most important findings. Plain language. Specific, not vague.",
  "question_insights": [
    {
      "question": "exact question text",
      "type": "scale|multiple_choice|yes_no|open_text",
      "response_count": number,
      "total_responses": number,
      "coverage_note": "only if response_count differs from total_responses",
      "headline": "one sentence plain-language finding",
      "detail": "2-3 sentences expanding on what the data means. Include specific numbers."
    }
  ],
  "themes": [
    {
      "label": "short theme name (2-4 words)",
      "description": "one sentence describing this theme",
      "frequency": number,
      "supporting_quotes": ["quote 1", "quote 2"]
    }
  ],
  "key_findings": [
    "Finding 1 — specific, actionable, backed by data",
    "Finding 2 — specific, actionable, backed by data",
    "Finding 3 — specific, actionable, backed by data"
  ],
  "sample_note": "one sentence about the sample size and what that means for confidence in these findings"
}

Rules:
- Write in the same language as the open text responses
- Themes only from open text responses — include 3-5 if open text questions exist, otherwise omit
- Key findings are the 3 most important things someone making a decision would want to know
- Be specific with numbers — never say "most respondents"
- Exclude N/A responses from analysis
- If sample size is under 10, note findings should be treated as early signals
- Return only valid JSON, nothing else`
}
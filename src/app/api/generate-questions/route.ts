import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSideClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { topic, goal, audience, context, question_count = 8 } = await req.json()

    if (!topic || !goal) {
      return NextResponse.json({ error: 'Topic and goal are required' }, { status: 400 })
    }

    const prompt = buildPrompt(topic, goal, audience, context, question_count)

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `You are a research design expert who helps people create effective questionnaires. You write clear, unbiased questions that get honest, useful answers. You understand both qualitative and quantitative research. You always respond with valid JSON only, no markdown, no preamble.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      throw new Error('AI question generation failed')
    }

    const anthropicData = await anthropicRes.json()
    const rawText = anthropicData.content?.[0]?.text || ''

    let parsed
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      throw new Error('Failed to parse AI response')
    }

    return NextResponse.json(parsed)

  } catch (err: any) {
    console.error('Question generation error:', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}

function buildPrompt(
  topic: string,
  goal: string,
  audience: string | undefined,
  context: string | undefined,
  questionCount: number
): string {
  return `A researcher wants to create a questionnaire. Here is what they've told us:

TOPIC: ${topic}
WHAT THEY WANT TO FIND OUT: ${goal}
${audience ? `WHO THEY ARE ASKING: ${audience}` : ''}
${context ? `ADDITIONAL CONTEXT: ${context}` : ''}

Design ${questionCount} questions that will genuinely help them find the answers they are looking for.

Guidelines:
- Mix question types thoughtfully — use open text when you need to understand WHY, scale when measuring degree or satisfaction, multiple choice when options are predictable, yes/no for clear binary decisions
- Start with broader, easier questions and move to more specific or personal ones
- Avoid leading questions — write neutrally so responses reflect real opinions
- Each question should serve a clear purpose — no filler
- Write in plain, everyday language — no jargon
- For multiple choice questions, include realistic options and always consider whether "Other" is needed
- For scale questions, suggest sensible min/max labels
- Write questions in the same language as the topic was written in

Respond with this exact JSON structure:
{
  "title": "A suggested project title based on the topic",
  "description": "A 1-2 sentence description suitable for participants to read before starting",
  "questions": [
    {
      "text": "The question text",
      "type": "open_text|scale|multiple_choice|yes_no",
      "required": true,
      "rationale": "One sentence explaining why this question is included and what it will reveal",
      "config": {
        // For scale: { "min": 1, "max": 5, "min_label": "Not at all", "max_label": "Very much" }
        // For multiple_choice: { "options": ["Option 1", "Option 2"], "allow_multiple": false }
        // For yes_no: { "yes_label": "Yes", "no_label": "No" }
        // For open_text: { "placeholder": "Type your answer here...", "max_length": 500 }
      }
    }
  ]
}`
}
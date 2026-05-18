import Link from 'next/link'
import { Layers, ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/Footer'

export const metadata = { title: 'FAQ' }

const FAQS = [
  {
    category: 'Getting started',
    questions: [
      {
        q: 'What is Ethnogrow?',
        a: 'Ethnogrow is an AI-powered qualitative research tool. You build questionnaires, share them with participants through a clean mobile-first interface, and receive AI-generated reports and analytics on the responses.'
      },
      {
        q: 'Do I need to create an account to use Ethnogrow?',
        a: 'Researchers need an account to build questionnaires and view results. Participants do not — they access your questionnaire through a unique link and can respond without signing up.'
      },
      {
        q: 'How do I get started?',
        a: 'Create a free account, build your first questionnaire using the drag-and-drop builder, publish it, and share the participant link. Responses start appearing in your dashboard in real time.'
      },
    ]
  },
  {
    category: 'Questionnaires',
    questions: [
      {
        q: 'What question types are available?',
        a: 'Ethnogrow supports five question types: open text, multiple choice, scale rating, yes/no, and numeric. Each has its own settings — required toggles, custom labels, character limits, and more.'
      },
      {
        q: 'Can I use AI to help build my questionnaire?',
        a: 'Yes. The AI question generator takes a study brief — your topic, goal, audience, and context — and suggests a full set of questions with rationale. You review and select the ones you want.'
      },
      {
        q: 'Can I edit a questionnaire after publishing it?',
        a: 'Yes, but with care. Editing questions after responses have been collected can affect how those responses are analysed. Adding new questions is safe — existing responses simply won\'t have answers for the new questions.'
      },
      {
        q: 'How do I close a questionnaire?',
        a: 'From your project dashboard, use the "Close responses" button in the tab bar. This stops new responses from being collected but preserves all existing data. You can reopen at any time.'
      },
    ]
  },
  {
    category: 'Responses and analysis',
    questions: [
      {
        q: 'How does AI report generation work?',
        a: 'Once you have responses, go to the AI Report tab and generate a report. The AI analyses your responses and produces a structured report with a summary, themes, key findings, and supporting quotes. Reports are stored so you can return to them at any time.'
      },
      {
        q: 'What counts as a response analysed?',
        a: 'Each time a participant completes your questionnaire, that counts as one response. Your plan\'s cap applies to how many responses are included in AI analysis — data collection is never blocked regardless of your plan.'
      },
      {
        q: 'What happens when I hit my analysis cap?',
        a: 'New responses continue to be collected and stored. They just won\'t be included in AI reports until you upgrade your plan or purchase additional token credits.'
      },
      {
        q: 'Are participant responses anonymous?',
        a: 'Yes. Participants are anonymous by default. No personally identifiable information is collected unless you explicitly ask for it in your questionnaire.'
      },
    ]
  },
  {
    category: 'Plans and billing',
    questions: [
      {
        q: 'What plans are available?',
        a: 'Ethnogrow offers three plans: Free ($0/month, 1 AI report per month), Starter ($9/month, 5 AI reports per month), and Pro ($19/month, 20 AI reports per month). Additional reports can be purchased as token add-ons on paid plans.'
      },
      {
        q: 'Can I upgrade or downgrade at any time?',
        a: 'Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period.'
      },
      {
        q: 'Do unused reports roll over to the next month?',
        a: 'No — the monthly cap resets each billing cycle. Token add-ons do not expire.'
      },
    ]
  },
  {
    category: 'Data and privacy',
    questions: [
      {
        q: 'Where is my data stored?',
        a: 'Data is stored securely using Supabase, which runs on AWS infrastructure. All data is encrypted at rest and in transit.'
      },
      {
        q: 'Is my data used to train AI models?',
        a: 'No. Your response data is never used to train AI models. It is only used to generate reports and analysis within your account.'
      },
      {
        q: 'Can I delete my data?',
        a: 'Yes. You can delete individual projects and all associated responses from your dashboard. To delete your account entirely, contact us at hello@ethnogrow.com.'
      },
    ]
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="flex-1">
        {/* Nav */}
        <nav className="border-b border-paper-border">
          <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-ink rounded flex items-center justify-center">
                <Layers size={14} className="text-white" />
              </div>
              <span className="font-display font-semibold text-ink text-sm tracking-tight">Ethnogrow</span>
            </Link>
            <Link href="/login" className="text-sm text-ink-muted hover:text-ink transition-colors">
              Sign in
            </Link>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-8 py-12">
          <div className="mb-10">
            <h1 className="font-display font-semibold text-ink text-3xl mb-3">Frequently asked questions</h1>
            <p className="text-ink-muted">
              Can't find what you're looking for? Email us at{' '}
              <a href="mailto:hello@ethnogrow.com" className="text-ink font-medium hover:underline">
                hello@ethnogrow.com
              </a>
            </p>
          </div>

          <div className="space-y-12">
            {FAQS.map(section => (
              <div key={section.category}>
                <h2 className="font-display font-semibold text-ink text-xl mb-6 pb-3 border-b border-paper-border">
                  {section.category}
                </h2>
                <div className="space-y-6">
                  {section.questions.map(({ q, a }) => (
                    <div key={q}>
                      <h3 className="font-medium text-ink mb-2">{q}</h3>
                      <p className="text-ink-muted leading-relaxed">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

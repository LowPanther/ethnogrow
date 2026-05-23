import Link from 'next/link'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Ethnogrow — AI-powered qualitative research',
  description: 'Build questionnaires, collect responses from participants, and receive AI-generated analysis reports. Qualitative research without the complexity.',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">

      {/* Nav */}
      <nav className="border-b border-paper-border">
        <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
          <span className="font-display font-normal text-ink text-lg tracking-tight">Ethnogrow</span>
          <div className="flex items-center gap-7">
            <Link href="#pricing" className="text-sm text-ink-muted hover:text-ink transition-colors">Pricing</Link>
            <Link href="/faq" className="text-sm text-ink-muted hover:text-ink transition-colors">FAQ</Link>
            <Link href="/login" className="text-sm text-ink-muted hover:text-ink transition-colors">Log in</Link>
            <Link href="/signup" className="btn-primary text-sm py-2 px-5">Get started free</Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-8 pt-24 pb-20">
          <p className="text-xs font-medium tracking-widest uppercase text-ink-faint mb-6">
            Qualitative research platform
          </p>
          <h1 className="font-display font-light text-ink leading-none tracking-tight mb-7" style={{ fontSize: '58px', letterSpacing: '-0.03em', lineHeight: 1.08 }}>
            Build. Collect.<br /><em className="italic">Understand.</em>
          </h1>
          <p className="text-lg text-ink-muted leading-relaxed max-w-lg mb-10" style={{ lineHeight: '1.7' }}>
            Ethnogrow is a qualitative research tool for researchers who need depth without complexity. Build questionnaires, collect responses, and let the AI do the analysis.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/signup" className="btn-primary px-7 py-3">Start for free</Link>
            <Link href="#how-it-works" className="btn-secondary px-7 py-3">See how it works</Link>
          </div>
          <p className="mt-4 text-xs text-ink-faint">Free plan available &nbsp;·&nbsp; No credit card required</p>
        </section>

        {/* What it is */}
        <section className="border-t border-paper-border">
          <div className="max-w-7xl mx-auto px-8 py-16 grid grid-cols-[200px_1fr] gap-12 items-start">
            <p className="text-xs font-medium tracking-widest uppercase text-ink-faint pt-1 sticky top-6">What it is</p>
            <div>
              <h2 className="font-display font-light text-ink mb-5" style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                One tool for the full research workflow
              </h2>
              <p className="text-ink-muted leading-relaxed max-w-xl mb-5" style={{ lineHeight: '1.75' }}>
                Ethnogrow covers questionnaire design, participant data collection, and AI-powered analysis in a single platform. No stitching together multiple tools, no learning curve measured in days.
              </p>
              <p className="text-ink-muted leading-relaxed max-w-xl" style={{ lineHeight: '1.75' }}>
                The AI analysis is built on Claude — producing structured reports with themes, key findings, and supporting quotes drawn directly from your data.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-paper-border">
          <div className="max-w-7xl mx-auto px-8 py-16 grid grid-cols-[200px_1fr] gap-12 items-start">
            <p className="text-xs font-medium tracking-widest uppercase text-ink-faint pt-1 sticky top-6">How it works</p>
            <div>
              <h2 className="font-display font-light text-ink mb-5" style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                From brief to insight<br />in four steps
              </h2>
              <ol className="mt-10 border-t border-paper-border">
                {[
                  {
                    num: '01',
                    title: 'Build your questionnaire',
                    desc: 'Use the drag-and-drop builder with five question types, or describe your study and let the AI generate questions from your brief.',
                  },
                  {
                    num: '02',
                    title: 'Share with participants',
                    desc: 'Publish and send a link. Participants respond on any device through a clean, mobile-first interface — no login required on their end.',
                  },
                  {
                    num: '03',
                    title: 'Collect responses in real time',
                    desc: "Responses arrive in your dashboard as they come in. Close data collection when you're ready, without losing anything.",
                  },
                  {
                    num: '04',
                    title: 'Generate your report',
                    desc: 'One click triggers an AI analysis. Themes, key findings, and verbatim quotes — structured and ready to share or export as PDF.',
                  },
                ].map(({ num, title, desc }) => (
                  <li key={num} className="grid grid-cols-[36px_1fr] gap-5 py-6 border-b border-paper-border items-start">
                    <span className="font-display font-light text-ink-faint text-xs tracking-wide pt-0.5">{num}</span>
                    <div>
                      <p className="font-display font-normal text-ink mb-1.5" style={{ fontSize: '17px', letterSpacing: '-0.01em' }}>{title}</p>
                      <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-paper-border">
          <div className="max-w-7xl mx-auto px-8 py-16 grid grid-cols-[200px_1fr] gap-12 items-start">
            <p className="text-xs font-medium tracking-widest uppercase text-ink-faint pt-1 sticky top-6">Pricing</p>
            <div>
              <h2 className="font-display font-light text-ink mb-5" style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                Simple, honest pricing
              </h2>
              <p className="text-ink-muted leading-relaxed max-w-xl mb-10" style={{ lineHeight: '1.75' }}>
                Data collection is always unlimited. You pay for AI analysis — and only when you need it.
              </p>

              <div className="grid grid-cols-3 border border-paper-border rounded divide-x divide-paper-border overflow-hidden">

                {/* Free */}
                <div className="p-8 bg-paper space-y-6">
                  <div>
                    <p className="font-display font-light text-ink text-xl tracking-tight mb-1">Free</p>
                    <p className="text-xs text-ink-muted leading-relaxed">For occasional studies and exploring the tool.</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-light text-ink" style={{ fontSize: '38px', letterSpacing: '-0.04em' }}>$0</span>
                    <span className="text-xs text-ink-faint">/month</span>
                  </div>
                  <hr className="border-paper-border" />
                  <ul className="space-y-2.5">
                    {[
                      '1 AI report per month',
                      'Unlimited questionnaires',
                      'Unlimited responses collected',
                      'All question types',
                      'CSV export',
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-ink-muted">
                        <span className="text-sage-DEFAULT mt-0.5 text-sm">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="block w-full text-center btn-secondary py-2.5 text-sm">
                    Get started free
                  </Link>
                </div>

                {/* Starter */}
                <div className="p-8 bg-ink space-y-6">
                  <div>
                    <p className="font-display font-light text-[#FAFAF8] text-xl tracking-tight mb-1">Starter</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(250,250,248,0.42)' }}>For researchers running regular studies.</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-light text-[#FAFAF8]" style={{ fontSize: '38px', letterSpacing: '-0.04em' }}>$5</span>
                    <span className="text-xs" style={{ color: 'rgba(250,250,248,0.35)' }}>/month</span>
                  </div>
                  <hr style={{ borderColor: 'rgba(250,250,248,0.1)' }} />
                  <ul className="space-y-2.5">
                    {[
                      '2 AI reports per month',
                      'Everything in Free',
                      'PDF report export',
                      'Follow-up question suggestions',
                      'Priority support',
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(250,250,248,0.6)' }}>
                        <span className="text-sage-DEFAULT mt-0.5 text-sm">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="block w-full text-center py-2.5 text-sm font-medium rounded bg-[#FAFAF8] text-ink" style={{ borderRadius: '3px' }}>
                    Get started
                  </Link>
                </div>

                {/* Pro */}
                <div className="p-8 bg-paper space-y-6">
                  <div>
                    <p className="font-display font-light text-ink text-xl tracking-tight mb-1">Pro</p>
                    <p className="text-xs text-ink-muted leading-relaxed">For active researchers who need more every month.</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-light text-ink" style={{ fontSize: '38px', letterSpacing: '-0.04em' }}>$9</span>
                    <span className="text-xs text-ink-faint">/month</span>
                  </div>
                  <hr className="border-paper-border" />
                  <ul className="space-y-2.5">
                    {[
                      '5 AI reports per month',
                      'Everything in Starter',
                      'AI question generation',
                      'Token add-on bundles',
                      'Early access to new features',
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-ink-muted">
                        <span className="text-sage-DEFAULT mt-0.5 text-sm">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="block w-full text-center btn-secondary py-2.5 text-sm">
                    Get started
                  </Link>
                </div>

              </div>

              <p className="mt-5 text-xs text-ink-faint">
                All plans include unlimited data collection. AI reports are the only gated feature.
              </p>
            </div>
          </div>
        </section>

        {/* Pull quote */}
        <section className="border-t border-paper-border">
          <div className="max-w-7xl mx-auto px-8 py-20">
            <blockquote className="font-display font-light italic text-ink max-w-2xl mb-5" style={{ fontSize: '28px', letterSpacing: '-0.015em', lineHeight: '1.5' }}>
              "The barrier to qualitative research has never been methodology — it's always been the software."
            </blockquote>
            <p className="text-xs text-ink-faint">Justin &nbsp;·&nbsp; Founder, Ethnogrow</p>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="border-t border-paper-border">
          <div className="max-w-7xl mx-auto px-8 py-20">
            <h2 className="font-display font-light text-ink mb-4" style={{ fontSize: '40px', letterSpacing: '-0.025em', lineHeight: '1.15', maxWidth: '440px' }}>
              Start your first study today
            </h2>
            <p className="text-ink-muted leading-relaxed mb-8" style={{ maxWidth: '420px', lineHeight: '1.65' }}>
              Free plan, no credit card required. Build a questionnaire, share a link, get an AI report — in under ten minutes.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/signup" className="btn-primary px-7 py-3">Create a free account</Link>
              <Link href="/faq" className="btn-secondary px-7 py-3">Read the FAQ</Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />

    </div>
  )
}

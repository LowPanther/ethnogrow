import { createServerSideClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Zap } from 'lucide-react'

export const metadata = { title: 'Upgrade — Ethnogrow' }

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'For occasional studies and exploring the tool.',
    features: [
      '1 AI report per month',
      'Unlimited questionnaires',
      'Unlimited responses collected',
      'All question types',
      'CSV export',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 5,
    description: 'For researchers running regular studies.',
    features: [
      '2 AI reports per month',
      'Everything in Free',
      'PDF report export',
      'Follow-up question suggestions',
      'Priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9,
    description: 'For active researchers who need more every month.',
    features: [
      '5 AI reports per month',
      'Everything in Starter',
      'AI question generation',
      'Token add-on bundles',
      'Early access to new features',
    ],
  },
]

export default async function UpgradePage() {
  const supabase = createServerSideClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usage } = await supabase
    .from('researcher_usage')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const currentPlan = usage?.plan ?? 'free'

  return (
    <main className="max-w-7xl mx-auto px-8 py-12">

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors mb-12"
      >
        <ArrowLeft size={14} />
        Back to dashboard
      </Link>

      <div className="grid grid-cols-[200px_1fr] gap-12 items-start">

        <div className="sticky top-6">
          <p className="text-xs font-medium tracking-widest uppercase text-ink-faint">
            Plans
          </p>
        </div>

        <div>
          <h1
            className="font-display font-light text-ink mb-4"
            style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: '1.2' }}
          >
            Choose your plan
          </h1>
          <p className="text-ink-muted leading-relaxed max-w-xl mb-10" style={{ lineHeight: '1.75' }}>
            Data collection is always unlimited. You pay for AI analysis — and only when you need it.
          </p>

          {/* Pricing grid */}
          <div className="grid grid-cols-3 border border-paper-border rounded divide-x divide-paper-border overflow-hidden">

            {PLANS.map(plan => {
              const isCurrent = plan.id === currentPlan
              const isHighlighted = plan.id === 'starter'

              return (
                <div
                  key={plan.id}
                  className="flex flex-col p-8 space-y-6"
                  style={{
                    backgroundColor: isHighlighted ? '#0c1e27' : undefined,
                  }}
                >
                  <div>
                    <p
                      className="font-display font-light text-xl tracking-tight mb-1"
                      style={{ color: isHighlighted ? '#FAFAF8' : undefined }}
                    >
                      {plan.name}
                    </p>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: isHighlighted ? 'rgba(250,250,248,0.42)' : undefined }}
                    >
                      {!isHighlighted && <span className="text-ink-muted">{plan.description}</span>}
                      {isHighlighted && plan.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-display font-light"
                      style={{
                        fontSize: '38px',
                        letterSpacing: '-0.04em',
                        color: isHighlighted ? '#FAFAF8' : '#0c1e27',
                      }}
                    >
                      {plan.price === 0 ? '$0' : `$${plan.price}`}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: isHighlighted ? 'rgba(250,250,248,0.35)' : undefined }}
                    >
                      {plan.price === 0 ? '' : '/month'}
                    </span>
                  </div>

                  <hr style={{ borderColor: isHighlighted ? 'rgba(250,250,248,0.1)' : undefined }} className="border-paper-border" />

                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map(f => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm"
                        style={{ color: isHighlighted ? 'rgba(250,250,248,0.6)' : undefined }}
                      >
                        <span className="text-sage-DEFAULT mt-0.5 text-sm flex-shrink-0">✓</span>
                        {!isHighlighted && <span className="text-ink-muted">{f}</span>}
                        {isHighlighted && f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div
                      className="block w-full text-center py-2.5 text-sm font-medium rounded"
                      style={{
                        border: isHighlighted
                          ? '0.5px solid rgba(250,250,248,0.18)'
                          : '0.5px solid rgba(15,15,15,0.18)',
                        color: isHighlighted ? 'rgba(250,250,248,0.4)' : 'rgba(15,15,15,0.35)',
                        borderRadius: '3px',
                      }}
                    >
                      Current plan
                    </div>
                  ) : (
                    <button
                      disabled
                      className="block w-full text-center py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
                      style={{
                        borderRadius: '3px',
                        backgroundColor: isHighlighted ? '#FAFAF8' : 'transparent',
                        border: isHighlighted ? 'none' : '0.5px solid rgba(15,15,15,0.18)',
                        color: isHighlighted ? '#0c1e27' : 'rgba(15,15,15,0.5)',
                        opacity: 0.6,
                      }}
                      title="Payments coming soon"
                    >
                      Upgrade — coming soon
                    </button>
                  )}
                </div>
              )
            })}

          </div>

          <p className="mt-5 text-xs text-ink-faint">
            All plans include unlimited data collection. AI reports are the only gated feature.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="grid grid-cols-[200px_1fr] gap-12 items-start mt-16 pt-16 border-t border-paper-border">
        <div className="sticky top-6">
          <p className="text-xs font-medium tracking-widest uppercase text-ink-faint">FAQ</p>
        </div>
        <div className="space-y-8 max-w-xl">
          {[
            {
              q: 'What counts as an AI report?',
              a: 'Each time you generate an AI analysis on a project, that uses one report from your monthly allowance. The cap resets at the start of each billing month.',
            },
            {
              q: 'Is data collection really unlimited?',
              a: 'Yes. Participants can always submit responses regardless of your plan. The only thing gated is AI analysis.',
            },
            {
              q: 'Can I upgrade or downgrade at any time?',
              a: 'Yes. Upgrades take effect immediately. Downgrades take effect at the end of your billing period.',
            },
            {
              q: 'When will payments be available?',
              a: 'We\'re finalising our payments setup. Paid plans will be available very soon. In the meantime, enjoy the Free plan.',
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-display font-normal text-ink mb-2" style={{ fontSize: '16px' }}>{q}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

    </main>
  )
}

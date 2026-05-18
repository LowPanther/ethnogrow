import { createServerSideClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Check, Zap, ArrowLeft } from 'lucide-react'
import { clsx } from 'clsx'

export const metadata = { title: 'Upgrade' }

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: null,
    description: 'Try it out with a small study.',
    responseCap: 50,
    features: [
      '50 responses analysed per month',
      'Unlimited data collection',
      'AI report generation',
      'Follow-up question suggestions',
      'All question types',
    ],
    cta: 'Your current plan',
    ctaDisabled: true,
    highlight: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 15,
    period: 'month',
    description: 'For researchers running regular studies.',
    responseCap: 500,
    features: [
      '500 responses analysed per month',
      'Unlimited data collection',
      'AI report generation',
      'Follow-up question suggestions',
      'All question types',
      'Priority support',
    ],
    cta: 'Upgrade to Starter',
    ctaDisabled: false,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    period: 'month',
    description: 'For teams and high-volume research.',
    responseCap: null,
    features: [
      'Unlimited responses analysed',
      'Unlimited data collection',
      'AI report generation',
      'Follow-up question suggestions',
      'All question types',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Upgrade to Pro',
    ctaDisabled: false,
    highlight: true,
  },
]

export default async function UpgradePage() {
  const supabase = createServerSideClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usage } = await supabase
    .from('researcher_usage')
    .select('plan, responses_analysed, response_cap')
    .eq('researcher_id', user.id)
    .single()

  const currentPlan = usage?.plan ?? 'free'

  return (
    <main className="max-w-7xl mx-auto px-8 py-10">
      {/* Back link */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors mb-8">
        <ArrowLeft size={14} />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="max-w-2xl mb-12">
        <h1 className="font-display font-semibold text-ink text-3xl mb-3">
          Choose your plan
        </h1>
        <p className="text-ink-muted leading-relaxed">
          ethnogrow is built for researchers who need reliable, clear insights from their data.
          All plans include unlimited data collection — you only pay for AI analysis.
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan
          return (
            <div
              key={plan.id}
              className={clsx(
                'card p-6 flex flex-col',
                plan.highlight && 'ring-2 ring-ink',
                isCurrent && 'bg-paper-warm'
              )}
            >
              {/* Plan header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-semibold text-ink text-lg">{plan.name}</span>
                  {plan.highlight && (
                    <span className="text-xs font-medium bg-ink text-white px-2 py-0.5 rounded-full">
                      Most popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-xs font-medium bg-teal-pale text-teal px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  {plan.price === 0 ? (
                    <span className="font-display text-3xl font-semibold text-ink">Free</span>
                  ) : (
                    <>
                      <span className="font-display text-3xl font-semibold text-ink">${plan.price}</span>
                      <span className="text-ink-muted text-sm">/ {plan.period}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-ink">
                    <Check size={15} className="text-teal mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className="w-full text-center py-2 text-sm text-ink-muted font-medium">
                  Your current plan
                </div>
              ) : plan.ctaDisabled ? (
                <button disabled className="btn-secondary w-full justify-center opacity-50 cursor-not-allowed">
                  {plan.cta}
                </button>
              ) : (
                <button
                  className={clsx(
                    'w-full justify-center',
                    plan.highlight ? 'btn-primary' : 'btn-secondary'
                  )}
                  // onClick will wire to Lemon Squeezy checkout
                  disabled
                >
                  <Zap size={14} />
                  {plan.cta}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="max-w-2xl space-y-6">
        <h2 className="font-display font-semibold text-ink text-xl">Common questions</h2>
        {[
          {
            q: 'What counts as a response analysed?',
            a: 'Each time a participant completes your questionnaire, that counts as one response. The cap applies to how many of those responses are included in AI analysis — we never stop collecting your data.',
          },
          {
            q: 'Can I upgrade or downgrade at any time?',
            a: 'Yes. You can upgrade immediately and your new cap takes effect right away. Downgrading takes effect at the end of your billing period.',
          },
          {
            q: 'What happens when I hit my cap?',
            a: 'New responses continue to be collected and stored. They just won\'t be included in AI reports until you upgrade or your cap resets.',
          },
          {
            q: 'Do unused responses roll over?',
            a: 'No — the cap resets each billing month. We\'re keeping things simple for now.',
          },
        ].map(({ q, a }) => (
          <div key={q}>
            <h3 className="font-medium text-ink mb-1">{q}</h3>
            <p className="text-sm text-ink-muted leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </main>
  )
}

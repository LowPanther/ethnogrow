'use client'

import { clsx } from 'clsx'
import { Zap, AlertTriangle, CheckCircle2, ArrowUpRight } from 'lucide-react'

interface UsageIndicatorProps {
  responsesAnalysed: number
  responseCap: number
  plan: 'free' | 'starter' | 'pro'
  variant?: 'full' | 'compact'
}

const PLAN_LABELS = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
}

export function UsageIndicator({
  responsesAnalysed,
  responseCap,
  plan,
  variant = 'full',
}: UsageIndicatorProps) {
  const percentage = Math.min((responsesAnalysed / responseCap) * 100, 100)
  const remaining = Math.max(responseCap - responsesAnalysed, 0)
  const isAtCap = responsesAnalysed >= responseCap
  const isWarning = percentage >= 75 && !isAtCap
  const isHealthy = percentage < 75

  const barColor = isAtCap
    ? 'bg-lobster'
    : isWarning
    ? 'bg-amber-signal'
    : 'bg-green-500'

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-paper-mid rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-ink-faint font-mono">
          {responsesAnalysed}/{responseCap}
        </span>
        {isAtCap && <AlertTriangle size={11} className="text-lobster" />}
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap size={13} className="text-ink-muted" />
          <span className="text-sm font-medium text-ink-muted">
            {PLAN_LABELS[plan]} plan
          </span>
        </div>
        {isAtCap ? (
          <span className="flex items-center gap-1 text-xs font-medium text-lobster">
            <AlertTriangle size={11} />
            Cap reached
          </span>
        ) : isWarning ? (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-signal">
            <AlertTriangle size={11} />
            Almost full
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <CheckCircle2 size={11} />
            Good
          </span>
        )}
      </div>

      {/* Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-ink-muted">Responses analysed</span>
          <span className="text-sm font-mono text-ink">
            {responsesAnalysed} <span className="text-ink-faint">/ {responseCap}</span>
          </span>
        </div>
        <div className="h-2 bg-paper-mid rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-700', barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Status message */}
      {isAtCap && (
        <div className="text-sm text-lobster-dark bg-lobster-pale border border-lobster/20 rounded-lg px-3 py-2 leading-relaxed">
          You've reached your analysis limit. New responses are still being collected but won't be included in AI reports until you upgrade.
        </div>
      )}

      {isWarning && (
        <div className="text-sm text-ink bg-amber-pale border border-amber-signal/20 rounded-lg px-3 py-2 leading-relaxed">
          {remaining} response{remaining !== 1 ? 's' : ''} remaining before your analysis cap.
        </div>
      )}

      {isHealthy && plan === 'free' && (
        <p className="text-sm text-ink-faint leading-relaxed">
          {remaining} of {responseCap} responses remaining on your free plan.
        </p>
      )}

      {/* Upgrade CTA */}
      {plan !== 'pro' && (
        <a href="/dashboard/upgrade" className="btn-primary w-full justify-center">
          <Zap size={14} />
          {isAtCap ? 'Upgrade to continue analysing' : 'Upgrade your plan'}
          <ArrowUpRight size={14} />
        </a>
      )}

      {/* Plan limits reference */}
      {plan !== 'pro' && (
        <div className="pt-1 border-t border-paper-border space-y-1.5">
          {[
            { name: 'Free', cap: '50 responses', active: plan === 'free' },
            { name: 'Starter', cap: '500 responses', active: plan === 'starter' },
            { name: 'Pro', cap: 'Unlimited', active: false },
          ].map(tier => (
            <div key={tier.name} className="flex items-center justify-between">
              <span className={clsx('text-sm', tier.active ? 'text-ink font-medium' : 'text-ink-faint')}>
                {tier.name}
              </span>
              <span className={clsx('text-sm font-mono', tier.active ? 'text-ink' : 'text-ink-faint')}>
                {tier.cap}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

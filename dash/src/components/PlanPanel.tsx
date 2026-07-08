import { useQuery } from '@tanstack/react-query'

import { fetchPlans, type PlanUsage } from '@/lib/api'
import { cn, usd } from '@/lib/utils'
import { Card } from '@/components/ui/card'

const PLAN_LABELS: Record<string, string> = {
  'claude-pro': 'Claude Pro',
  'claude-max': 'Claude Max',
  'claude-max-5x': 'Claude Max 5x',
  'cursor-pro': 'Cursor Pro',
  supergrok: 'SuperGrok',
  'supergrok-heavy': 'SuperGrok Heavy',
  custom: 'Plano personalizado',
}

// `spentApiEquivalentUsd` is what the same usage would have cost at API
// rates, not a metered bill — a fixed-price subscription (every preset plan
// except 'custom') never charges overage, so exceeding 100% means the
// subscription is paying for itself, not that money is at risk. Only
// 'custom' plans (a real budget/proxy cap) warn on 'near'/'over'.
function statusStyle(status: PlanUsage['status'], isSubscription: boolean): { bar: string; text: string } {
  if (isSubscription) return { bar: 'bg-primary', text: 'text-tertiary-foreground' }
  if (status === 'over') return { bar: 'bg-[#c8541f]', text: 'text-[#a3441a]' }
  if (status === 'near') return { bar: 'bg-[#d99a3c]', text: 'text-[#8a611f]' }
  return { bar: 'bg-primary', text: 'text-tertiary-foreground' }
}

function PlanRow({ usage }: { usage: PlanUsage }) {
  const isSubscription = usage.plan.id !== 'custom'
  const style = statusStyle(usage.status, isSubscription)
  const barPct = Math.min(100, Math.round(usage.percentUsed))
  const label = PLAN_LABELS[usage.plan.id] ?? usage.plan.id
  const multiplier = usage.budgetUsd > 0 ? usage.spentApiEquivalentUsd / usage.budgetUsd : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn('tabular-nums', style.text)}>
          {isSubscription
            ? `${usd(usage.spentApiEquivalentUsd)} em valor de API (${multiplier.toFixed(1)}x a assinatura)`
            : `${usd(usage.spentApiEquivalentUsd)} de ${usd(usage.budgetUsd)} (${Math.round(usage.percentUsed)}%)`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-interactive-secondary">
        <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${barPct}%` }} />
      </div>
      <div className="flex items-baseline justify-between text-xs text-tertiary-foreground">
        <span>
          {isSubscription
            ? `Assinatura: ${usd(usage.budgetUsd)}/mês`
            : usage.status === 'over'
              ? `Projeção de fim de mês: ${usd(usage.projectedMonthUsd)} — acima do orçamento`
              : `Projeção de fim de mês: ${usd(usage.projectedMonthUsd)}`}
        </span>
        <span>Renova em {usage.daysUntilReset} dia{usage.daysUntilReset === 1 ? '' : 's'}</span>
      </div>
    </div>
  )
}

// Subscription plan tracking (e.g. Claude Pro/Max), configured via `codeburn
// plan set`. Renders nothing when no plan is configured — this stays quiet
// unless the user opted in (ADR: insights are guests, not billboards).
export function PlanPanel() {
  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: fetchPlans,
    staleTime: 60_000,
  })

  if (!data || data.length === 0) return null

  return (
    <Card className="mb-3 px-5 py-4">
      <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-heading">Uso do plano</h3>
      <div className="flex flex-col gap-4">
        {data.map((usage) => (
          <PlanRow key={usage.plan.provider} usage={usage} />
        ))}
      </div>
    </Card>
  )
}

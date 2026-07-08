import { useQuery } from '@tanstack/react-query'

import { fetchJarvis, type Period } from '@/lib/api'
import { cn, fmtNum, usd } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/DataTable'

// Jarvis layer: git-derived effectiveness + heuristic insights. Local device
// only — the API never ships this in shared payloads. This is the page's
// answer-first hero (PRODUCT.md: "is the work landing?" before cost detail).

function HeroStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <h3 className="text-[11px] font-normal uppercase tracking-wider text-tertiary-foreground">{label}</h3>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
        {value}
        {sub ? <span className="ml-1.5 font-normal text-tertiary-foreground">{sub}</span> : null}
      </p>
    </div>
  )
}

export function JarvisPanel({ period, totalCost }: { period: Period; totalCost?: number }) {
  const { data, isError, refetch } = useQuery({
    queryKey: ['jarvis', period],
    queryFn: () => fetchJarvis(period),
    staleTime: 60_000,
  })

  if (isError) {
    return (
      <Card className="mb-3 flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">A efetividade está indisponível agora</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Os dados de uso abaixo não são afetados.</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-interactive-secondary"
        >
          Tentar de novo
        </button>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="mb-3 px-5 py-4" aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-10 w-64" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </Card>
    )
  }

  const eff = data.effectiveness
  if (!eff || eff.evaluatedSessions === 0) {
    return (
      <Card className="mb-3 px-5 py-4">
        <p className="text-sm font-medium text-foreground">Nada pra avaliar neste período ainda</p>
        <p className="mt-0.5 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
          Sessões contam quando editam arquivos dentro de um repositório git. Uma sessão "aterrissa" quando os commits
          feitos durante ela sobrevivem 48 horas, ou até sua próxima sessão naquele repositório.
        </p>
      </Card>
    )
  }

  const didntLand = eff.reverted + eff.noCommit
  const insights = data.insights
  const unevaluatedUSD = totalCost !== undefined ? Math.max(0, totalCost - eff.costEvaluatedUSD) : undefined

  return (
    <div className="mb-3">
      <Card className="mb-3 px-5 pb-4 pt-4">
        <div className="text-xs text-tertiary-foreground">
          {fmtNum(eff.evaluatedSessions)} {eff.evaluatedSessions === 1 ? 'sessão' : 'sessões'} de código avaliada{eff.evaluatedSessions === 1 ? '' : 's'}
          {eff.pendingWindow > 0 ? ` · ${fmtNum(eff.pendingWindow)} ainda em avaliação` : ''}
        </div>
        <h2 className="mt-1 font-display text-4xl font-normal tracking-tight text-primary">
          {fmtNum(eff.successes)} de {fmtNum(eff.evaluatedSessions)} aterrissaram
          {eff.successRate != null && (
            <span className="ml-2 text-2xl text-heading">{Math.round(eff.successRate * 100)}%</span>
          )}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-3.5 sm:grid-cols-3">
          <HeroStat
            label="Custo por sessão que aterrissou"
            value={eff.costPerSuccessUSD == null ? '—' : usd(eff.costPerSuccessUSD)}
          />
          <HeroStat
            label="Não aterrissou"
            value={String(didntLand)}
            sub={`${fmtNum(eff.reverted)} revertida${eff.reverted === 1 ? '' : 's'} · ${fmtNum(eff.noCommit)} sem commit · ${usd(eff.costWastedUSD)}`}
          />
          <HeroStat
            label="Gasto em código"
            value={usd(eff.costEvaluatedUSD)}
            sub={unevaluatedUSD !== undefined && unevaluatedUSD > 0.005 ? `+ ${usd(unevaluatedUSD)} fora de sessões de código` : undefined}
          />
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="px-5 py-4">
          <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-heading">Insights</h3>
          {insights.length === 0 ? (
            <p className="py-6 text-center text-sm text-tertiary-foreground">
              Nada precisa da sua atenção neste período.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {insights.map((ins) => (
                <li key={ins.title} className="flex gap-2.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                      ins.severity === 'warn' ? 'bg-[#c8541f]' : 'bg-primary',
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {ins.severity === 'warn' && (
                        <span className="mr-1.5 rounded border border-[#c8541f]/40 px-1 py-px align-[2px] text-[10px] font-semibold uppercase tracking-wide text-[#a3441a]">
                          Atenção
                        </span>
                      )}
                      {ins.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-tertiary-foreground">{ins.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="px-5 py-4">
          <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-heading">Por projeto</h3>
          <DataTable
            columns={[
              { key: 'name', label: 'Projeto' },
              { key: 'landed', label: 'Aterrissou', num: true },
              { key: 'cost', label: 'Custo', num: true },
            ]}
            rows={data.projects.slice(0, 8).map((p) => ({
              name: p.name,
              landed: `${fmtNum(p.successes)}/${fmtNum(p.sessions)}${p.pending > 0 ? ` (${p.pending} pendente${p.pending === 1 ? '' : 's'})` : ''}`,
              cost: usd(p.costUSD),
            }))}
          />
        </Card>
      </div>

      <p className="mt-2 max-w-[70ch] px-1 text-xs text-muted-foreground">
        Uma sessão aterrissa quando os commits feitos durante ela sobrevivem 48 horas, ou até sua
        próxima sessão naquele repositório.
      </p>
    </div>
  )
}

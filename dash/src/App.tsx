import { useMemo, useState, type ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { fetchUsage, PERIODS, type Period } from '@/lib/api'
import { cn, fmtNum, fmtTokens, usd } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricCard } from '@/components/MetricCard'
import { BarList, type BarItem } from '@/components/BarList'
import { DataTable } from '@/components/DataTable'
import { UsageChart } from '@/components/UsageChart'

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="px-5 py-4">
      <h2 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-tertiary-foreground">{title}</h2>
      {children}
    </Card>
  )
}

export function App() {
  const [period, setPeriod] = useState<Period>('month')
  const [provider, setProvider] = useState('all')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['usage', period, provider],
    queryFn: () => fetchUsage(period, provider),
    placeholderData: keepPreviousData,
  })

  const c = data?.current

  const providerOptions = useMemo(
    () =>
      c
        ? Object.entries(c.providers)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([k]) => k)
        : [],
    [c],
  )

  const toolBars: BarItem[] = c
    ? Object.entries(c.providers)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ name: k, value: v, display: usd(v) }))
    : []
  const modelBars: BarItem[] = c
    ? c.topModels.filter((m) => m.cost > 0).slice(0, 8).map((m) => ({ name: m.name, value: m.cost, display: usd(m.cost) }))
    : []
  const activityBars: BarItem[] = c
    ? c.topActivities.filter((a) => a.cost > 0).map((a) => ({ name: a.name, value: a.cost, display: usd(a.cost) }))
    : []

  return (
    <div className="min-h-screen bg-outer-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none text-primary">&#9650;</span>
            <span className="text-sm font-semibold">CodeBurn</span>
          </div>
          <span className="text-[11px] text-tertiary-foreground">Local usage dashboard. Nothing leaves your machine.</span>
          <span className="ml-auto text-[11px] text-tertiary-foreground">{c?.label ?? ''}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-interactive-secondary p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  period === p.key
                    ? 'bg-active-primary text-foreground shadow-sm ring-1 ring-inset ring-white/10'
                    : 'text-tertiary-foreground hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="ml-auto rounded-lg border border-border bg-interactive-secondary px-3 py-2 text-xs text-foreground outline-none"
          >
            <option value="all">All tools</option>
            {providerOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <Card className="mb-4 overflow-hidden">
          <div className="flex items-end justify-between px-5 pt-4">
            <div>
              <div className="text-xs text-tertiary-foreground">
                {c ? `${fmtNum(c.calls)} calls · ${fmtNum(c.sessions)} sessions` : ' '}
              </div>
              <div className="mt-0.5 text-3xl font-semibold tracking-tight tabular-nums text-primary">
                {c ? usd(c.cost) : <Skeleton className="h-9 w-32" />}
              </div>
            </div>
          </div>
          <div className="mt-3 h-64 px-2 pb-2">
            {isLoading || !data ? (
              <Skeleton className="mx-3 mb-3 h-[228px]" />
            ) : (
              <UsageChart daily={data.history.daily} />
            )}
          </div>
        </Card>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {c ? (
            <>
              <MetricCard label="Cost" value={usd(c.cost)} accent />
              <MetricCard
                label="Tokens"
                value={fmtTokens(c.inputTokens + c.outputTokens)}
                sub={`in ${fmtTokens(c.inputTokens)} / out ${fmtTokens(c.outputTokens)}`}
              />
              <MetricCard label="Calls" value={fmtNum(c.calls)} />
              <MetricCard label="Sessions" value={fmtNum(c.sessions)} />
              <MetricCard label="Cache hit" value={`${(c.cacheHitPercent || 0).toFixed(1)}%`} />
              <MetricCard label="One-shot" value={c.oneShotRate == null ? '—' : `${Math.round(c.oneShotRate * 100)}%`} />
            </>
          ) : (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          )}
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Panel title="By tool">
            <BarList items={toolBars} total={c?.cost} />
          </Panel>
          <Panel title="Top models">
            <BarList items={modelBars} total={c?.cost} />
          </Panel>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Top projects">
            <DataTable
              columns={[
                { key: 'name', label: 'Project' },
                { key: 'cost', label: 'Cost', num: true },
                { key: 'sessions', label: 'Sessions', num: true },
              ]}
              rows={(c?.topProjects ?? []).slice(0, 10).map((p) => ({
                name: p.name,
                cost: usd(p.cost),
                sessions: fmtNum(p.sessions),
              }))}
            />
          </Panel>
          <Panel title="By activity">
            <BarList items={activityBars} total={c?.cost} />
          </Panel>
        </div>

        <Panel title="Tools">
          <DataTable
            columns={[
              { key: 'name', label: 'Tool' },
              { key: 'calls', label: 'Calls', num: true },
            ]}
            rows={(c?.tools ?? []).slice(0, 14).map((t) => ({ name: t.name, calls: fmtNum(t.calls) }))}
          />
        </Panel>

        {isError && (
          <div className="mt-4 text-sm text-tertiary-foreground">Failed to load: {String((error as Error)?.message)}</div>
        )}
      </main>
    </div>
  )
}

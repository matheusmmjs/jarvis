import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { DailyEntry } from '@/lib/api'
import { CHART_COLORS, compactUsd, label, usd } from '@/lib/utils'

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtDay(d: string): string {
  const [, m, day] = String(d).split('-')
  return m && day ? `${Number(day)} ${MONTHS[Number(m)]}` : d
}

const TOP_N = 6

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label: lbl }: any) {
  if (!active || !payload?.length) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = payload.filter((p: any) => p.value > 0).sort((a: any, b: any) => b.value - a.value)
  if (!items.length) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = items.reduce((s: number, p: any) => s + p.value, 0)
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl ring-1 ring-white/5">
      <div className="mb-1.5 font-medium text-foreground">{fmtDay(String(lbl))}</div>
      <div className="flex flex-col gap-1">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {items.slice(0, 6).map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
            <span className="flex-1 truncate text-tertiary-foreground">{label(String(p.dataKey))}</span>
            <span className="tabular-nums text-muted-foreground">{usd(p.value)}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-border pt-1 text-foreground">
          <span>Total</span>
          <span className="font-semibold tabular-nums">{usd(total)}</span>
        </div>
      </div>
    </div>
  )
}

export function UsageChart({ daily }: { daily: DailyEntry[] }) {
  const { rows, series } = useMemo(() => {
    const totals = new Map<string, number>()
    for (const d of daily) for (const m of d.topModels) totals.set(m.name, (totals.get(m.name) ?? 0) + m.cost)
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N).map(([k]) => k)
    const topSet = new Set(top)
    const hasOther = [...totals.keys()].some((k) => !topSet.has(k))
    const seriesKeys = hasOther ? [...top, 'Other'] : top
    const rowData = daily.map((d) => {
      const row: Record<string, number | string> = { period: d.date }
      for (const k of seriesKeys) row[k] = 0
      for (const m of d.topModels) {
        const key = topSet.has(m.name) ? m.name : 'Other'
        row[key] = (row[key] as number) + m.cost
      }
      return row
    })
    return { rows: rowData, series: seriesKeys }
  }, [daily])

  return (
    <div className="relative h-full w-full [&_.recharts-bar-rectangle]:transition-opacity [&_.recharts-bar-rectangle]:duration-75 [&:has(.recharts-bar-rectangle:hover)_.recharts-bar-rectangle:not(:hover)]:opacity-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -6 }} barCategoryGap="16%">
          <CartesianGrid vertical={false} strokeDasharray="2 2" stroke="var(--color-chart-grid-stroke)" />
          <XAxis
            dataKey="period"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="equidistantPreserveStart"
            tick={{ fontSize: 11, fill: 'var(--color-tertiary-foreground)' }}
            tickFormatter={fmtDay}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={50}
            tick={{ fontSize: 11, fill: 'var(--color-tertiary-foreground)' }}
            tickFormatter={(v) => compactUsd(Number(v))}
          />
          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
          {series.map((s, i) => (
            <Bar
              key={s}
              dataKey={s}
              stackId="a"
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              isAnimationActive={false}
              radius={i === series.length - 1 ? [3, 3, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

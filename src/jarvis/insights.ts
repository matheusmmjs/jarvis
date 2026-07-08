import type { EvaluatedSession, JarvisEffectiveness, JarvisInsight, JarvisProjectRow } from './types.js'

const usd = (v: number): string => `$${v.toFixed(2)}`
const pct = (v: number): string => `${Math.round(v * 100)}%`

export function summarizeEffectiveness(sessions: EvaluatedSession[]): JarvisEffectiveness {
  const evaluated = sessions.filter((s) => s.verdict === 'success' || s.verdict === 'reverted' || s.verdict === 'no_commit')
  const successes = evaluated.filter((s) => s.verdict === 'success')
  const reverted = evaluated.filter((s) => s.verdict === 'reverted')
  const noCommit = evaluated.filter((s) => s.verdict === 'no_commit')
  const cost = (list: EvaluatedSession[]) => list.reduce((sum, s) => sum + s.costUSD, 0)

  const costSuccessUSD = cost(successes)
  const costEvaluatedUSD = cost(evaluated)
  return {
    evaluatedSessions: evaluated.length,
    successes: successes.length,
    reverted: reverted.length,
    noCommit: noCommit.length,
    pendingWindow: evaluated.filter((s) => !s.final).length,
    successRate: evaluated.length > 0 ? successes.length / evaluated.length : null,
    costEvaluatedUSD,
    costSuccessUSD,
    costWastedUSD: costEvaluatedUSD - costSuccessUSD,
    costPerSuccessUSD: successes.length > 0 ? costEvaluatedUSD / successes.length : null,
  }
}

export function summarizeProjects(sessions: EvaluatedSession[]): JarvisProjectRow[] {
  const byProject = new Map<string, JarvisProjectRow>()
  for (const s of sessions) {
    if (s.verdict === 'chat' || s.verdict === 'no_repo') continue
    let row = byProject.get(s.project)
    if (!row) {
      row = { name: s.project, sessions: 0, successes: 0, noCommit: 0, reverted: 0, pending: 0, costUSD: 0 }
      byProject.set(s.project, row)
    }
    row.sessions += 1
    row.costUSD += s.costUSD
    if (s.verdict === 'success') row.successes += 1
    else if (s.verdict === 'no_commit') row.noCommit += 1
    else row.reverted += 1
    if (!s.final) row.pending += 1
  }
  return [...byProject.values()].sort((a, b) => b.costUSD - a.costUSD)
}

// ADR-0004: fixed heuristics, recomputed on demand. Ordered warn-first so the
// dashboard card leads with what needs attention.
export function buildInsights(sessions: EvaluatedSession[], eff: JarvisEffectiveness, projects: JarvisProjectRow[]): JarvisInsight[] {
  const insights: JarvisInsight[] = []

  if (eff.evaluatedSessions >= 5 && eff.successRate !== null && eff.successRate < 0.5) {
    insights.push({
      severity: 'warn',
      title: `Taxa de sucesso está em ${pct(eff.successRate)}`,
      detail: `Só ${eff.successes} de ${eff.evaluatedSessions} sessões de código terminaram num commit que sobreviveu. Considere pedidos menores e mais delimitados por sessão.`,
    })
  }

  const noCommitCost = sessions.filter((s) => s.verdict === 'no_commit').reduce((sum, s) => sum + s.costUSD, 0)
  if (eff.costEvaluatedUSD > 0 && noCommitCost / eff.costEvaluatedUSD > 0.2) {
    insights.push({
      severity: 'warn',
      title: `${pct(noCommitCost / eff.costEvaluatedUSD)} do gasto em código não gerou commit`,
      detail: `${usd(noCommitCost)} foi pra sessões que editaram arquivos mas nunca fecharam um commit. Se o trabalho foi real, commite; se foi exploração, um modelo mais barato pode bastar.`,
    })
  }

  if (eff.reverted > 0) {
    const revertedCost = sessions.filter((s) => s.verdict === 'reverted').reduce((sum, s) => sum + s.costUSD, 0)
    insights.push({
      severity: 'warn',
      title: `${eff.reverted} ${eff.reverted === 1 ? 'sessão revertida' : 'sessões revertidas'} (${usd(revertedCost)})`,
      detail: 'Commits dessas sessões foram revertidos depois. Revise o que deu errado antes de tentar tarefas parecidas de novo.',
    })
  }

  const worst = projects.filter((p) => p.sessions >= 3).sort((a, b) => a.successes / a.sessions - b.successes / b.sessions)[0]
  if (worst && worst.successes / worst.sessions < 0.5) {
    insights.push({
      severity: 'warn',
      title: `"${worst.name}" tem a menor taxa de acerto`,
      detail: `${worst.successes}/${worst.sessions} sessões deram certo ali, com ${usd(worst.costUSD)} gastos. Esse repositório pode precisar de mais contexto no CLAUDE.md ou tarefas menores.`,
    })
  }

  if (eff.costPerSuccessUSD !== null) {
    insights.push({
      severity: 'info',
      title: `${usd(eff.costPerSuccessUSD)} por sessão bem-sucedida`,
      detail: `Gasto total em código dividido pelas ${eff.successes} sessões que fecharam commits duráveis.`,
    })
  }

  const priciestMiss = sessions.filter((s) => s.verdict === 'no_commit').sort((a, b) => b.costUSD - a.costUSD)[0]
  if (priciestMiss && priciestMiss.costUSD >= 1) {
    insights.push({
      severity: 'info',
      title: `Sessão mais cara sem commit: ${usd(priciestMiss.costUSD)}`,
      detail: `Em "${priciestMiss.project}" em ${priciestMiss.startISO.slice(0, 10)}. Vale a pena checar o que travou ali.`,
    })
  }

  if (insights.length === 0 && eff.evaluatedSessions > 0) {
    insights.push({
      severity: 'info',
      title: 'Tudo indo bem',
      detail: `${eff.successes}/${eff.evaluatedSessions} sessões de código fecharam commits duráveis. Nenhum padrão de desperdício detectado neste período.`,
    })
  }

  return insights
}

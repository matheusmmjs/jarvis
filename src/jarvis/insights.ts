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
      title: `Success rate is ${pct(eff.successRate)}`,
      detail: `Only ${eff.successes} of ${eff.evaluatedSessions} coding sessions ended in a commit that survived. Consider smaller, more scoped asks per session.`,
    })
  }

  const noCommitCost = sessions.filter((s) => s.verdict === 'no_commit').reduce((sum, s) => sum + s.costUSD, 0)
  if (eff.costEvaluatedUSD > 0 && noCommitCost / eff.costEvaluatedUSD > 0.2) {
    insights.push({
      severity: 'warn',
      title: `${pct(noCommitCost / eff.costEvaluatedUSD)} of coding spend produced no commit`,
      detail: `${usd(noCommitCost)} went into sessions that edited files but never landed a commit. If the work was real, commit it; if it was exploration, a cheaper model may do.`,
    })
  }

  if (eff.reverted > 0) {
    const revertedCost = sessions.filter((s) => s.verdict === 'reverted').reduce((sum, s) => sum + s.costUSD, 0)
    insights.push({
      severity: 'warn',
      title: `${eff.reverted} session${eff.reverted === 1 ? '' : 's'} reverted (${usd(revertedCost)})`,
      detail: 'Commits from these sessions were later reverted. Review what went wrong before re-attempting similar tasks.',
    })
  }

  const worst = projects.filter((p) => p.sessions >= 3).sort((a, b) => a.successes / a.sessions - b.successes / b.sessions)[0]
  if (worst && worst.successes / worst.sessions < 0.5) {
    insights.push({
      severity: 'warn',
      title: `"${worst.name}" has the lowest hit rate`,
      detail: `${worst.successes}/${worst.sessions} sessions succeeded there for ${usd(worst.costUSD)} spent. This repo may need better CLAUDE.md context or smaller tasks.`,
    })
  }

  if (eff.costPerSuccessUSD !== null) {
    insights.push({
      severity: 'info',
      title: `${usd(eff.costPerSuccessUSD)} per successful session`,
      detail: `Total coding spend divided by the ${eff.successes} sessions that landed durable commits.`,
    })
  }

  const priciestMiss = sessions.filter((s) => s.verdict === 'no_commit').sort((a, b) => b.costUSD - a.costUSD)[0]
  if (priciestMiss && priciestMiss.costUSD >= 1) {
    insights.push({
      severity: 'info',
      title: `Priciest session without a commit: ${usd(priciestMiss.costUSD)}`,
      detail: `In "${priciestMiss.project}" on ${priciestMiss.startISO.slice(0, 10)}. Worth checking what stalled it.`,
    })
  }

  if (insights.length === 0 && eff.evaluatedSessions > 0) {
    insights.push({
      severity: 'info',
      title: 'Looking good',
      detail: `${eff.successes}/${eff.evaluatedSessions} coding sessions landed durable commits. No waste patterns detected in this period.`,
    })
  }

  return insights
}

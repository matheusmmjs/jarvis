// Jarvis layer: effectiveness signal (git) + heuristic insights on top of
// CodeBurn's usage data. Kept in its own directory, with its own state dir
// (~/.config/jarvis), so upstream merges never collide with it.

export type SessionVerdict = 'success' | 'reverted' | 'no_commit' | 'chat' | 'no_repo'

export type EvaluatedSession = {
  sessionId: string
  project: string
  projectPath: string
  startISO: string
  endISO: string
  costUSD: number
  verdict: SessionVerdict
  // Whether the revert window has closed (next session in the repo, or 48h).
  // A non-final 'success' can still flip to 'reverted'.
  final: boolean
  commitCount: number
}

export type JarvisProjectRow = {
  name: string
  sessions: number
  successes: number
  noCommit: number
  reverted: number
  pending: number
  costUSD: number
}

export type JarvisInsight = {
  severity: 'info' | 'warn'
  title: string
  detail: string
}

export type JarvisEffectiveness = {
  // Sessions with code activity in a git repo — the denominator.
  evaluatedSessions: number
  successes: number
  reverted: number
  noCommit: number
  // Evaluated sessions whose revert window is still open.
  pendingWindow: number
  successRate: number | null
  costEvaluatedUSD: number
  costSuccessUSD: number
  costWastedUSD: number
  costPerSuccessUSD: number | null
}

export type JarvisReport = {
  generated: string
  effectiveness: JarvisEffectiveness
  projects: JarvisProjectRow[]
  insights: JarvisInsight[]
}
